/* eslint-disable @typescript-eslint/no-explicit-any */
// services/productService.ts
import api from '@/lib/api';
import { Product, Branch, Warehouse } from '../types';

export class ProductService {
  async getProducts(filters: {
    searchQuery?: string;
    branchId?: string;
    warehouseId?: string;
    hasBalance?: boolean;
    beginning_balance?: boolean;
  }): Promise<Product[]> {
    const apiFilters: any = {};
    
    if (filters.beginning_balance === true) {
      apiFilters.beginning_balance = 1;
    }
    if (filters.hasBalance === true) {
      apiFilters.beginning_balance = 1;
    }
    
    // ✅ كل حقل لوحده - مش كله تحت search واحد
    if (filters.searchQuery && filters.searchQuery !== '___empty___') {
      // هنا بنحدد نوع البحث بناءً على شكل النص
      const searchTerm = filters.searchQuery;
      
      // لو النص عبارة عن أرقام فقط -> باركود
      if (/^\d+$/.test(searchTerm)) {
        apiFilters.barcode = searchTerm;
      } 
      // لو النص يحتوي على أرقام وحروف وممكن يكون SKU
      else if (searchTerm.length <= 20 && /^[A-Za-z0-9-]+$/.test(searchTerm)) {
        apiFilters.sku = searchTerm;
      } 
      // غير كده -> اسم
      else {
        apiFilters.name = searchTerm;
      }
    }
    
    if (filters.branchId && filters.branchId !== 'all') {
      apiFilters.branch_id = parseInt(filters.branchId);
    }
    if (filters.warehouseId && filters.warehouseId !== 'all') {
      apiFilters.warehouse_id = parseInt(filters.warehouseId);
    }
    
    const response = await api.post('/product/index', {
      filters: apiFilters,
      orderBy: 'id',
      orderByDirection: 'desc',
      perPage: 100,
      paginate: false
    });
    
    let allProducts = response.data?.data || [];
    
    // If hasBalance is true, filter products with stock > 0
    if (filters.hasBalance === true) {
      return allProducts.filter((p: Product) => p.stock && p.stock > 0);
    }
    
    return allProducts;
  }

  // ✅ دالة للبحث بالاسم فقط
  async searchProductsByName(searchTerm: string): Promise<Product[]> {
    const response = await api.post('/product/index', {
      filters: { name: searchTerm },
      orderBy: 'id',
      orderByDirection: 'desc',
      perPage: 20,
      paginate: false
    });
    return response.data?.data || [];
  }

  // ✅ دالة للبحث بالـ SKU فقط
  async searchProductsBySku(searchTerm: string): Promise<Product[]> {
    const response = await api.post('/product/index', {
      filters: { sku: searchTerm },
      orderBy: 'id',
      orderByDirection: 'desc',
      perPage: 20,
      paginate: false
    });
    return response.data?.data || [];
  }

  // ✅ دالة للبحث بالباركود فقط
  async searchProductsByBarcode(searchTerm: string): Promise<Product[]> {
    const response = await api.post('/product/index', {
      filters: { barcode: searchTerm },
      orderBy: 'id',
      orderByDirection: 'desc',
      perPage: 20,
      paginate: false
    });
    return response.data?.data || [];
  }

  async getProductDetails(productId: number): Promise<Product> {
    const response = await api.get(`/product/${productId}`);
    return response.data?.data || response.data;
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

  // بقية الدوال كما هي...
}