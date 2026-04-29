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
    page?: number;
    perPage?: number;
  }): Promise<{ data: Product[]; meta: any }> {
    const apiFilters: any = {};
    
    if (filters.beginning_balance === true) {
      apiFilters.beginning_balance = 1;
    }
    if (filters.hasBalance === true) {
      apiFilters.beginning_balance = 1;
    }
    
    // البحث
    if (filters.searchQuery && filters.searchQuery !== '___empty___') {
      const searchTerm = filters.searchQuery;
      
      if (/^\d+$/.test(searchTerm)) {
        apiFilters.barcode = searchTerm;
      } 
      else if (searchTerm.length <= 20 && /^[A-Za-z0-9-]+$/.test(searchTerm)) {
        apiFilters.sku = searchTerm;
      } 
      else {
        apiFilters.name = searchTerm;
      }
    }
    
    // الفلتر بالفرع
    if (filters.branchId && filters.branchId !== 'all') {
      apiFilters.branch_id = parseInt(filters.branchId);
    }
    
    // الفلتر بالمخزن
    if (filters.warehouseId && filters.warehouseId !== 'all') {
      apiFilters.warehouse_id = parseInt(filters.warehouseId);
    }
    
    const page = filters.page || 1;
    const perPage = filters.perPage || 16;
    
    // ✅ نفس الصيغة اللي انت عاوزها
    const payload = {
      filters: apiFilters,
      orderBy: 'id',
      orderByDirection: 'asc',
      perPage: perPage,
      paginate: true,
      delete: false
    };
    
    console.log('📦 Products API Payload:', payload);
    
    const response = await api.post('/product/index', payload);
    
    if (response.data.result === 'Success') {
      return {
        data: response.data.data || [],
        meta: response.data.meta || {
          current_page: page,
          per_page: perPage,
          total: response.data.data?.length || 0,
          last_page: 1,
          from: 1,
          to: response.data.data?.length || 0
        }
      };
    }
    
    return {
      data: [],
      meta: {
        current_page: 1,
        per_page: perPage,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0
      }
    };
  }

  // دالة للبحث بالاسم فقط
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

  // دالة للبحث بالـ SKU فقط
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

  // دالة للبحث بالباركود فقط
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
}