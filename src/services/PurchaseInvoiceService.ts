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
}

// Singleton instance
export const purchaseInvoiceService = new PurchaseInvoiceService();