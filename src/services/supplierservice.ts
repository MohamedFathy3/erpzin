import { BaseService } from './baseService';
// import type {
//   Supplier,  SupplierDto,  PurchaseInvoicesResponse,  PurchaseOrdersResponse,
//     PaymentPayload,   PaymentResponse,}from '../types/index';
import type { Supplier, SupplierDto } from '@/types/supplier';
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


}

// Singleton instance 
export const supplierService = new SupplierService();
