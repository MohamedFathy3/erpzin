// services/inventoryService.ts

import api from '@/lib/api';
import type {
  InventoryRecord,
  InventoryResponse,
  SingleInventoryResponse,
  CreateInventoryPayload,
  UpdateInventoryPayload,
  UpdateNotePayload,
  InventoryFilters
} from '@/types/inventory';

class InventoryService {
  private baseUrl = '/inventory';

  // جلب جميع سجلات الجرد
  async getAll(filters?: InventoryFilters): Promise<InventoryResponse> {
    try {
      const payload: any = {
        orderBy: 'created_at',
        orderByDirection: 'desc',
        perPage: 100,
        paginate: false
      };

      const filterPayload: any = {};

      if (filters?.warehouse_id) {
        filterPayload.warehouse_id = filters.warehouse_id;
      }

      if (filters?.product_id) {
        filterPayload.product_id = filters.product_id;
      }

      if (filters?.date_from) {
        filterPayload.created_at_from = filters.date_from;
      }

      if (filters?.date_to) {
        filterPayload.created_at_to = filters.date_to;
      }

      if (Object.keys(filterPayload).length > 0) {
        payload.filters = filterPayload;
      }

      const response = await api.post<InventoryResponse>(`${this.baseUrl}/index`, payload);
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory records:', error);
      throw error;
    }
  }

  // جلب تفاصيل سجل جرد واحد
  async getById(id: number): Promise<SingleInventoryResponse> {
    try {
      const response = await api.get<SingleInventoryResponse>(`inventory-logs/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory record:', error);
      throw error;
    }
  }

  // إنشاء جرد جديد
  async create(data: CreateInventoryPayload): Promise<SingleInventoryResponse> {
    try {
      const response = await api.post<SingleInventoryResponse>('/warehouses/inventory-store', data);
      return response.data;
    } catch (error) {
      console.error('Error creating inventory:', error);
      throw error;
    }
  }

  // تحديث الجرد بالكامل
  async update(id: number, data: UpdateInventoryPayload): Promise<SingleInventoryResponse> {
    try {
      const response = await api.put<SingleInventoryResponse>(`inventory-logs/${id}/counted-stock`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  }

  // تحديث الملاحظة فقط
  async updateNote(id: number, data: UpdateNotePayload): Promise<SingleInventoryResponse> {
    try {
      const response = await api.put<SingleInventoryResponse>(`inventory-logs/${id}/counted-stock`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating inventory note:', error);
      throw error;
    }
  }

  // حذف سجل جرد
  async delete(id: number): Promise<{ result: string; message: string }> {
    try {
      const response = await api.delete(`inventory-logs/${id}/delete`);
      return response.data;
    } catch (error) {
      console.error('Error deleting inventory:', error);
      throw error;
    }
  }

  // تحديث المخزون الفعلي بعد الجرد
  async syncStock(id: number): Promise<{ result: string; message: string }> {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/sync-stock`);
      return response.data;
    } catch (error) {
      console.error('Error syncing stock:', error);
      throw error;
    }
  }
}

export const inventoryService = new InventoryService();