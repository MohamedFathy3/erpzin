import { BaseService } from './baseService';
import api from '@/lib/api';

import type {
    PurchaseReturn,
    PurchaseReturnsResponse,
    PurchaseReturnFilters,
    PurchaseInvoiceDetails
} from '@/types/PurcheasRetuern';

class PurchaseReturnService extends BaseService<PurchaseReturn> {
    constructor() {
        super('/purchase-returns');
    }

    /**
     * Get Purchase Returns with Filters
     */
    async getPurchaseReturns(
        filtersInput?: PurchaseReturnFilters
    ): Promise<PurchaseReturnsResponse> {
        const payload: Record<string, unknown> = {
            orderBy: 'id',
            orderByDirection: 'desc',
            perPage: 100,
            paginate: false,
        };

        const backendFilters: Record<string, string | number> = {};

        if (filtersInput?.search) {
            backendFilters.return_number = filtersInput.search;
        }

        if (filtersInput?.date_from) {
            backendFilters.date_from = filtersInput.date_from.split('T')[0];
        }

        if (filtersInput?.date_to) {
            backendFilters.date_to = filtersInput.date_to.split('T')[0];
        }

        if (filtersInput?.amount_min !== undefined) {
            backendFilters.total_amount = Number(filtersInput.amount_min);
        }

        if (Object.keys(backendFilters).length > 0) {
            payload.filters = backendFilters;
        }

        const response = await api.post<PurchaseReturnsResponse>(
            `${this.endpoint}/index`,
            payload
        );

        return response.data;
    }

    async getRetuernDetelis(id: number | string): Promise<PurchaseInvoiceDetails> {
        if (!id) throw new Error('No invoice ID');

        const response = await api.get(`/purchases-invoices/${id}`);

        if (response.data.result === 'Success') {
            return response.data.data;
        }

        throw new Error(response.data.message || 'Failed to fetch invoice');
    }
}
// Singleton
export const purchaseReturnService = new PurchaseReturnService();