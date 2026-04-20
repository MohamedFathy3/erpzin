/* eslint-disable @typescript-eslint/no-explicit-any */
// services/productService.ts
import api from '@/lib/api';
import { Product, Branch, Warehouse, SelectedProduct, Unit, Color } from '../types';

export class ProductService {
  async getProducts(filters: {
    searchQuery?: string;
    branchId?: string;
    warehouseId?: string;
    hasBalance?: boolean;
    beginning_balance?: boolean; // Add this for backward compatibility
  }): Promise<Product[]> {
    const apiFilters: any = {};
    
   if (filters.beginning_balance === true) {
  apiFilters.beginning_balance = 1;
}
    if (filters.hasBalance === true) {
      apiFilters.beginning_balance = 1; // Use 1 instead of true
    }
    
    if (filters.searchQuery && filters.searchQuery !== '___empty___') {
      apiFilters.name = filters.searchQuery;
    }
    if (filters.branchId && filters.branchId !== 'all') {
      apiFilters.branch_id = parseInt(filters.branchId);
    }
    if (filters.warehouseId && filters.warehouseId !== 'all') {
      apiFilters.warehouse_id = parseInt(filters.warehouseId);
    }
    
    const response = await api.post('/product/index', {
      filters: {...apiFilters,
         beginning_balance: 1 
      },
      orderBy: 'id',
      orderByDirection: 'desc',
      perPage: 100,
      paginate: false
    });
    
    const allProducts = response.data?.data || [];
    
    // If hasBalance is true, filter products with stock > 0
    if (filters.hasBalance === true) {
      return allProducts.filter((p: Product) => p.stock && p.stock > 0);
    }
    
    return allProducts;
  }

  // Get single product with full details (units, colors, etc.)
  async getProductDetails(productId: number): Promise<Product> {
    const response = await api.get(`/product/${productId}`);
    return response.data?.data || response.data;
  }

  // Search products with full details
  async searchProducts(searchTerm: string): Promise<Product[]> {
    const response = await api.post('/product/index', {
      filters: {
        name: searchTerm
      },
      orderBy: 'id',
      orderByDirection: 'desc',
      perPage: 20,
      paginate: false
    });
    
    return response.data?.data || [];
  }

  async getBranches(): Promise<Branch[]> {
    const response = await api.post('/branch/index', { paginate: false });
    return response.data?.data || [];
  }

  async getWarehouses(branchId?: string): Promise<Warehouse[]> {
    const filters: any = {};
    if (branchId && branchId !== 'all') {
      filters.branch_id = parseInt(branchId);
    }
    const response = await api.post('/warehouse/index', { filters, paginate: false });
    return response.data?.data || [];
  }

  // Update product balance (opening balance)
  async updateProductBalance(productId: number, data: {
    stock: number;
    cost: number;
    price: number;
    beginning_balance: boolean;
  }): Promise<void> {
    // Send beginning_balance as 1 for true
    await api.put(`/product/${productId}`, {
      stock: data.stock,
      cost: data.cost,
      price: data.price,
      beginning_balance: data.beginning_balance ? 1 : 0
    });
  }

  // Update variant balance (for products with units/colors)
  async updateVariantBalance(productId: number, unitId: number, colorId: number | null, data: {
    stock: number;
    cost: number;
    price: number;
  }): Promise<void> {
    // This endpoint might need adjustment based on your API
    await api.post(`/product/${productId}/update-variant`, {
      unit_id: unitId,
      color_id: colorId,
      stock: data.stock,
      cost_price: data.cost,
      sell_price: data.price
    });
  }

  // Delete product balance - API expects { items: [id] }
  async deleteProductBalance(productId: number): Promise<void> {
    await api.delete(`/product/delete`, { 
      data: { items: [productId] } 
    });
  }

  // Import products from Excel file
  async importProducts(file: File, onProgress?: (percent: number) => void): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          onProgress(percentCompleted);
        }
      }
    });
    
    return response.data;
  }

async createProductWithBalance(data: {
  name: string;
  name_ar?: string;
  description?: string;
  category_id: number;
  sku: string;
  barcode?: string;
  reorder_level?: number;
  cost: number;
  price: number;
  stock: number;
  beginning_balance: number; // 1 for true
  active?: boolean;
  units?: Array<{
    unit_id: number;
    cost_price: number;
    sell_price: number;
    barcode?: string;
    colors?: Array<{ color_id: number; stock: number }>;
  }>;
}): Promise<Product> {
  const response = await api.post('/product', {
    ...data,
    beginning_balance: 1, // تأكيد
    active: data.active ?? true
  });
  return response.data?.data || response.data;
}
}

export interface ImportResult {
  inserted: number;
  updated: number;
  failed: number;
  errors?: any[];
}