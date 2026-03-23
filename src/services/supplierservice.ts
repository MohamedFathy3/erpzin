import { BaseService } from './baseService';
// import type {
//   Supplier,  SupplierDto,  PurchaseInvoicesResponse,  PurchaseOrdersResponse,
//     PaymentPayload,   PaymentResponse,}from '../types/index';
import type { Supplier, SupplierDto, SupplierRequestPayload, SupplierFiltersPayload, SupplierFilters } from '@/types/supplier';
import api from '../lib/api';

class SupplierService extends BaseService<Supplier> {
  constructor() {
    super('/suppliers');
  }

  /**
   * Create Supplier
   */
  async createSupplier(data: SupplierDto) {
    return this.create(data);
  }

  /**
   * Update Supplier
   */
  async updateSupplier(id: number | string, data: SupplierDto) {
    return this.update(id, data);
  }
  /**
   * Toggle Active
   */
  async toggleStatus(id: number | string, active: number) {
    return this.update(id, { active });
  }


  // داخل SupplierService
  async getSupplierDetails(id: number | string) {
    if (!id) throw new Error('No supplier ID');
    const response = await api.get(`/suppliers/${id}`);
    return response.data; // ترجع SupplierResponse
  }

  // داخل SupplierService

  async deleteSupplier(id: number | string) {
    if (!id) throw new Error('No supplier ID provided');
    try {
      const response = await api.delete('/suppliers/delete', {
        data: { items: [id] },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }


  async getSuppliers(filtersInput?: SupplierFilters): Promise<Supplier[]> {
    try {
      const payload: SupplierRequestPayload = {
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false,
      };

      const filters: SupplierFiltersPayload = {
        active: true,
      };

      if (filtersInput?.search) {
        filters.name = filtersInput.search;
      }

      if (filtersInput?.balance_min || filtersInput?.balance_max) {
        if (filtersInput.balance_min) {
          filters.credit_limit = Number(filtersInput.balance_min);
        }
        if (filtersInput.balance_max) {
          filters.balance = {
            max: Number(filtersInput.balance_max),
          };
        }
      }

      if (Object.keys(filters).length > 0) {
        payload.filters = filters;
      }

      const response = await api.post<{ result: string; data: Supplier[] }>('/suppliers/index', payload);

      if (response.data.result === 'Success') {
        return response.data.data || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  }
}

// Singleton instance 
export const supplierService = new SupplierService();
