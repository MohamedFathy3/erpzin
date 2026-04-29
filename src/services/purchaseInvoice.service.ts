/* eslint-disable @typescript-eslint/no-explicit-any */
// services/purchaseInvoice.service.ts
import api from '@/lib/api';
import { PurchaseInvoicePayload, ApiPurchaseInvoice } from '@/types/purchaseform';

class PurchaseInvoiceService {
  private static instance: PurchaseInvoiceService;
  
  private constructor() {}
  
  static getInstance(): PurchaseInvoiceService {
    if (!PurchaseInvoiceService.instance) {
      PurchaseInvoiceService.instance = new PurchaseInvoiceService();
    }
    return PurchaseInvoiceService.instance;
  }
  
  async createInvoice(payload: PurchaseInvoicePayload): Promise<any> {
    const response = await api.post('/purchases-invoices/store', payload);
    return response.data;
  }
  
  async updateInvoice(id: number, payload: PurchaseInvoicePayload): Promise<any> {
    const response = await api.put(`/purchases-invoices/update/${id}`, payload);
    return response.data;
  }
  
  async getInvoices(filters?: any): Promise<any> {
    const response = await api.post('/purchases-invoices/index', filters);
    return response.data;
  }
  
  async getInvoiceById(id: number): Promise<any> {
    const response = await api.get(`/purchases-invoices/${id}`);
    return response.data; // بيرجع { data, result, message, status }
  }
  
  async deleteInvoice(id: number): Promise<void> {
    await api.delete(`/purchases-invoices/delete/${id}`);
  }
}

export const purchaseInvoiceService = PurchaseInvoiceService.getInstance();