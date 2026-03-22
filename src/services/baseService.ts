import api from "@/lib/api";
import type { ApiResponse } from '@/types/types';

// Generic base service for CRUD operations
export class BaseService<T> {
    protected endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    /**
     * Get all records with pagination support
     */
    async getAll(params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T[]>> {
        try {
            const response = await api.get<ApiResponse<T[]>>(this.endpoint, {
                params: params || {}
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${this.endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get single record by ID
     */
    async get(id: number | string): Promise<ApiResponse<T>> {
        try {
            const response = await api.get<ApiResponse<T>>(`${this.endpoint}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${this.endpoint}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Create new record
     */
    async create(data: Partial<T>): Promise<ApiResponse<T>> {
        try {
            const response = await api.post<ApiResponse<T>>(this.endpoint, data);
            return response.data;
        } catch (error) {
            console.error(`Error creating ${this.endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Update existing record
     */
    async update(id: number | string, data: Partial<T>): Promise<ApiResponse<T>> {
        try {
            const response = await api.put<ApiResponse<T>>(`${this.endpoint}/${id}`, data);
            return response.data;
        } catch (error) {
            console.error(`Error updating ${this.endpoint}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete record by ID
     */
    async delete(id: number | string): Promise<ApiResponse<null>> {
        try {
            const response = await api.delete<ApiResponse<null>>(`${this.endpoint}/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error deleting ${this.endpoint}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Bulk delete multiple records
     */
    async bulkDelete(ids: (number | string)[]): Promise<ApiResponse<null>> {
        try {
            const response = await api.post<ApiResponse<null>>(`${this.endpoint}/bulk-delete`, { ids });
            return response.data;
        } catch (error) {
            console.error(`Error bulk deleting ${this.endpoint}:`, error);
            throw error;
        }
    }
}

// Factory function for easy instantiation
export const createService = <T>(endpoint: string): BaseService<T> => {
    return new BaseService<T>(endpoint);
};

// Usage examples:
/*
const supplierService = createService<Supplier>('/suppliers');
const suppliers = await supplierService.getAll();
const supplier = await supplierService.create({ name: 'New Supplier' });
await supplierService.update(1, { name: 'Updated' });
await supplierService.delete(1);
*/
