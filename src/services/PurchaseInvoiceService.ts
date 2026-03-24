// services/purchaseInvoiceService.ts
import { BaseService } from './baseService';
import api from '@/lib/api';
import type { PurchaseInvoicesResponse, PurchaseInvoice, PaymentPayload, PaymentResponse } from '@/types/PurchaseInvoice';

class PurchaseInvoiceService extends BaseService<PurchaseInvoice> {
    constructor() {
        super('/purchases-invoices');
    }

    /**
     * Get invoices by supplier ID
     */
    async getBySupplierId(supplierId: number | string): Promise<PurchaseInvoicesResponse> {
        if (!supplierId) {
            return {
                data: [],
                links: {
                    first: '',
                    last: '',
                    prev: null,
                    next: null,
                },
                meta: {
                    current_page: 1,
                    from: 0,
                    last_page: 1,
                    per_page: 50,
                    to: 0,
                    total: 0
                },
                result: 'Success',
                message: '',
                status: 200,
            };
        }

        try {
            const response = await api.post<PurchaseInvoicesResponse>(`/purchases-invoices/index`, {
                filters: { supplier_id: supplierId },
                orderBy: 'id',
                orderByDirection: 'desc',
                perPage: 50,
                paginate: false,
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching invoices by supplier:', error);
            throw error;
        }
    }

    /**
     * Pay invoice
     */
    async payInvoice(invoiceId: number | string, data: PaymentPayload): Promise<PaymentResponse> {
        try {
            const response = await api.patch<PaymentResponse>(
                `/purchase-invoices/${invoiceId}/pay`,
                data
            );
            return response.data;
        } catch (error) {
            console.error('Error paying invoice:', error);
            throw error;
        }
    }

    /**
     * Get invoices with filters and pagination
     */
    async getInvoices(params: {
        page?: number;
        showAll?: boolean;
        filters?: {
            search?: string;
            date_from?: string;
            date_to?: string;
            amount_min?: number;
            amount_max?: number;
        };
    }): Promise<PurchaseInvoicesResponse> {
        const { page = 1, showAll = false, filters: filtersInput } = params;

        const payload: any = {
            orderBy: 'id',
            orderByDirection: 'desc',
            perPage: showAll ? 10000 : 10,
            paginate: !showAll,
            page: showAll ? 1 : page,
        };

        const filters: any = {};

        // تحسين الفلترة للبحث في رقم الفاتورة واسم المورد
        if (filtersInput?.search) {
            // يمكن البحث برقم الفاتورة أو اسم المورد
            filters.search = filtersInput.search;
        }

        if (filtersInput?.date_from) {
            filters.date_from = filtersInput.date_from.split('T')[0];
        }

        if (filtersInput?.date_to) {
            filters.date_to = filtersInput.date_to.split('T')[0];
        }

        if (filtersInput?.amount_min !== undefined && filtersInput.amount_min !== null) {
            filters.amount_min = Number(filtersInput.amount_min);
        }

        if (filtersInput?.amount_max !== undefined && filtersInput.amount_max !== null) {
            filters.amount_max = Number(filtersInput.amount_max);
        }

        // إضافة الفلاتر فقط إذا كان هناك أي فلتر
        if (Object.keys(filters).length > 0) {
            payload.filters = filters;
        }

        try {
            const response = await api.post<PurchaseInvoicesResponse>(
                `/purchases-invoices/index`,
                payload
            );

            // التحقق من نجاح الاستجابة
            if (response.data.result === 'Success' || response.data.result === 'success') {
                return response.data;
            }

            throw new Error(response.data.message || 'Failed to fetch invoices');
        } catch (error) {
            console.error('Error fetching invoices:', error);
            throw error;
        }
    }

    /**
     * Get single invoice details
     */
    async getInvoice(id: number | string): Promise<PurchaseInvoice> {
        try {
            const response = await api.get(`/purchases-invoices/${id}`);
            
            if (response.data.result === 'Success' || response.data.result === 'success') {
                return response.data.data;
            }
            
            throw new Error(response.data.message || 'Failed to fetch invoice details');
        } catch (error) {
            console.error('Error fetching invoice details:', error);
            throw error;
        }
    }

    /**
     * Create new invoice
     */
    async createInvoice(data: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> {
        try {
            const response = await api.post('/purchases-invoices/create', data);
            
            if (response.data.result === 'Success' || response.data.result === 'success') {
                return response.data.data;
            }
            
            throw new Error(response.data.message || 'Failed to create invoice');
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    /**
     * Update invoice
     */
    async updateInvoice(id: number | string, data: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> {
        try {
            const response = await api.put(`/purchases-invoices/${id}`, data);
            
            if (response.data.result === 'Success' || response.data.result === 'success') {
                return response.data.data;
            }
            
            throw new Error(response.data.message || 'Failed to update invoice');
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    /**
     * Delete invoice
     */
    async deleteInvoice(id: number | string): Promise<void> {
        try {
            const response = await api.delete(`/purchases-invoices/${id}`);
            
            if (response.data.result !== 'Success' && response.data.result !== 'success') {
                throw new Error(response.data.message || 'Failed to delete invoice');
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            throw error;
        }
    }

    /**
     * Get invoice statistics
     */
    async getStatistics(params?: {
        date_from?: string;
        date_to?: string;
        supplier_id?: number;
    }): Promise<any> {
        try {
            const response = await api.post('/purchases-invoices/statistics', params || {});
            return response.data;
        } catch (error) {
            console.error('Error fetching invoice statistics:', error);
            throw error;
        }
    }
}

// Singleton instance
export const purchaseInvoiceService = new PurchaseInvoiceService();