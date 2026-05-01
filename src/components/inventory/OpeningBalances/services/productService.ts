  // services/productService.ts
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import api from '@/lib/api';
  import { Product, Branch, Warehouse } from '../types';

  export class ProductService {
    async getProductsWithBalance(filters: {
      searchQuery?: string;
      branchId?: string;
      warehouseId?: string;
      page?: number;
      perPage?: number;
    }): Promise<{ data: Product[]; meta: any }> {
      const apiFilters: any = {};
      
      apiFilters.beginning_balance = 1;
      
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
      
      const payload = {
        filters: apiFilters,
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: perPage,
        paginate: true,
        delete: false
      };
      
      console.log('📦 Products With Balance API Payload:', payload);
      
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

    // ✅ دالة البحث العام (للمودال)
    async searchProducts(filters: {
      searchQuery?: string;
      branchId?: string;
      warehouseId?: string;
      searchType?: 'name' | 'sku' | 'barcode';
    }): Promise<Product[]> {
      const apiFilters: any = {};
      
      // البحث حسب النوع
      if (filters.searchQuery && filters.searchQuery !== '___empty___') {
        const searchTerm = filters.searchQuery;
        
        switch (filters.searchType) {
          case 'sku':
            apiFilters.sku = searchTerm;
            break;
          case 'barcode':
            apiFilters.barcode = searchTerm;
            break;
          case 'name':
          default:
            apiFilters.name = searchTerm;
            break;
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
      
      const payload = {
        filters: apiFilters,
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 20,
        paginate: false,
        delete: false
      };
      
      console.log('🔍 Search Products API Payload:', payload);
      
      const response = await api.post('/product/index', payload);
      
      if (response.data.result === 'Success') {
        return response.data.data || [];
      }
      
      return [];
    }

    // ✅ دالة جلب الفروع
    async getBranches(): Promise<Branch[]> {
      const response = await api.post('/branch/index', { 
        filters: { active: true },
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false 
      });
      return response.data?.data || [];
    }

    // ✅ دالة جلب المخازن
    async getWarehouses(branchId?: string): Promise<Warehouse[]> {
      const filters: any = { active: true };
      if (branchId && branchId !== 'all') {
        filters.branch_id = parseInt(branchId);
      }
      const response = await api.post('/warehouse/index', { 
        filters, 
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false 
      });
      return response.data?.data || [];
    }

    async addStock(items: any[]): Promise<any> {
      const response = await api.post('/products/add-stock', { items });
      return response.data;
    }
  }