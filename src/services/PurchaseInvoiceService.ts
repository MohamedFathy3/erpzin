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
            // Default empty response if no supplier ID
            return {
                data: [],
                links: {},
                meta: { current_page: 1, from: 0, last_page: 1, per_page: 50, to: 0, total: 0 },
                result: 'success',
                message: '',
                status: 200,
            };
        }

        const response = await api.post<PurchaseInvoicesResponse>(`/purchases-invoices/index`, {
            filters: { supplier_id: supplierId },
            orderBy: 'id',
            orderByDirection: 'desc',
            perPage: 50,
            paginate: false,
        });


        return response.data;
    }


    async payInvoice(invoiceId: number | string, data: PaymentPayload): Promise<PaymentResponse> {
        const response = await api.patch<PaymentResponse>(
            `/purchase-invoices/${invoiceId}/pay`,
            data
        );
        return response.data;
    }


    // function to get invoices with filters and pagination    PurchaseInvoicesList 
    async getInvoices(
        params: {
            page?: number;
            showAll?: boolean;
            filters?: {
                search?: string;
                date_from?: string;
                date_to?: string;
                amount_min?: number;
                amount_max?: number;
            };
        }
    ): Promise<PurchaseInvoicesResponse> {
        const { page = 1, showAll = false, filters: filtersInput } = params;

        const payload: any = {
            orderBy: 'id',
            orderByDirection: 'desc',
            perPage: showAll ? 10000 : 10,
            paginate: !showAll,
            page: showAll ? 1 : page,
        };

        const filters: any = {};

        if (filtersInput?.search) {
            filters.invoice_number = filtersInput.search;
        }

        if (filtersInput?.date_from) {
            filters.date_from = filtersInput.date_from.split('T')[0];
        }

        if (filtersInput?.date_to) {
            filters.date_to = filtersInput.date_to.split('T')[0];
        }

        if (filtersInput?.amount_min !== undefined) {
            filters.amount_min = Number(filtersInput.amount_min);
        }

        if (filtersInput?.amount_max !== undefined) {
            filters.amount_max = Number(filtersInput.amount_max);
        }

        if (Object.keys(filters).length > 0) {
            payload.filters = filters;
        }

        const response = await api.post<PurchaseInvoicesResponse>(
            `/purchases-invoices/index`,
            payload
        );

        if (response.data.result === 'Success') {
            return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch invoices');
    }
}

// Singleton instance
export const purchaseInvoiceService = new PurchaseInvoiceService();