import { BaseService } from './baseService';
import api from '@/lib/api';
import type { Bank } from '@/types/bank';

/**
 * Bank Service - Complete CRUD for banks + movements
 */
export class BankService extends BaseService<Bank> {
    constructor() {
        super('/bank');
    }

    async createBank(data: Partial<Bank>) {
        const response = await api.post('/bank', data);
        return response.data;
    }

    async updateBank(id: number, data: Partial<Bank>) {
        const response = await api.put(`/bank/${id}`, data);
        return response.data;
    }

    async deleteBank(id: number) {
        const response = await api.delete('/bank/delete', {
            data: { items: [id] }
        });
        return response.data;
    }

    /**
     * Get banks list (exact from component)
     */
    async getBanks() {
        const payload = {
            filters: {},
            orderBy: 'name',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: true
        };
        const response = await api.post('/bank/index', payload);
        return response.data.data || [];
    }



    /**
     * Get bank movements (from bank-movements query)
     */
    async getBankMovements(page = 1, perPage = 10) {
        const payload = {
            filters: {},
            orderBy: 'date',
            orderByDirection: 'desc',
            perPage,
            paginate: true,
            page
        };
        const response = await api.post('/bank-movement/index', payload);
        return response.data;
    }
}

// Singleton
export const bankService = new BankService();

