// services/purchaseOrderService.ts
import { BaseService } from './baseService';


import api from '@/lib/api';
import type { PurchaseOrder, PurchaseOrdersResponse } from '@/types/PurchaseOrder';

class PurchaseOrderService extends BaseService<PurchaseOrder> {
    constructor() {
        super('/purchases-orders');
    }

    /**
     * Get orders by supplier ID
     */
    async getBySupplierId(supplierId: number | string): Promise<PurchaseOrdersResponse> {
        if (!supplierId) {
            return {
                data: [],
                links: {},
                meta: {},
                result: 'success',
                message: '',
                status: 200
            };
        }

        const response = await api.post<PurchaseOrdersResponse>(`/purchases-orders/index`, {
            filters: { supplier_id: supplierId },
            orderBy: 'id',
            orderByDirection: 'desc',
            perPage: 50,
            paginate: false
        });

        return response.data;
    }
}

// Singleton
export const purchaseOrderService = new PurchaseOrderService();