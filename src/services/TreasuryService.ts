import { BaseService } from './baseService';
import api from '@/lib/api';
import type { TreasuryFormData, Treasury, TreasuryResponse } from '@/types/treasury';

/**
 * Treasury Service - Generic service for Treasury CRUD operations
 * Extracted logic from TreasuryBankManager.createTreasuryMutation
 */
export class TreasuryService extends BaseService<Treasury> {
    constructor() {
        super('/treasury');
    }

    /**
     * Build exact payload matching backend expectations
     * Copied from TreasuryBankManager mutation logic
     */
    buildCreatePayload(data: TreasuryFormData): Record<string, unknown> {
        if (!data.currency) {
            throw new Error('Currency is required');
        }

        return {
            name: data.name,
            code: data.code || null,
            branch_id: data.branch_id ? parseInt(data.branch_id) : null,
            notes: data.notes || null,
            currency: data.currency,        // ✅ "EGP" مثلاً
            balance: Number(data.balance),  // ✅ رقم
            is_main: data.is_main,
        };
    }

    /**
     * Add new Treasury - Main function requested
     */
    async addTreasury(data: TreasuryFormData): Promise<unknown> {
        const payload = this.buildCreatePayload(data);
        console.log('🚀 TreasuryService.addTreasury PAYLOAD:', payload);
        const response = await this.create(payload);
        return response;
    }

    /**
     * Get all treasuries with pagination support - Direct backend index call
     */
    async getTreasuries(filters: Record<string, unknown> = {}) {
        const payload = {
            filters,
            orderBy: 'name',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: true
        };
        console.log('🔍 TreasuryService.getTreasuries filters:', filters);
        const response = await api.post<TreasuryResponse>('/treasury/index', payload);
        console.log('✅ Treasuries loaded:', response.data.data?.length);
        return response.data;
    }

    /**
     * Update Treasury - EXACTLY matches TreasuryBankManager.updateTreasuryMutation payload
     */
    async updateTreasury(id: number, data: TreasuryFormData): Promise<unknown> {
        const payload = this.buildCreatePayload(data);
        console.log('🚀 TreasuryService.updateTreasury PAYLOAD:', payload);
        const response = await api.put(`/treasury/${id}`, payload);
        return response.data;
    }

    /**
     * Delete Treasury - Matches component deleteTreasuryMutation endpoint
     */
    async deleteTreasury(id: number): Promise<unknown> {
        console.log('🗑️ TreasuryService.deleteTreasury ID:', id);
        const response = await api.delete('/treasury/delete', {
            data: { items: [id] }
        });
        console.log('✅ Treasury deleted:', response);
        return response.data;
    }

    /**
     * Update single column - Matches updateTreasuryColumnMutation
     * Used for is_main toggle in handleMainTreasuryToggle
     */
    async updateTreasuryColumn(id: number, column: string, value: unknown): Promise<unknown> {
        console.log('🔧 TreasuryService.updateTreasuryColumn:', { id, column, value });
        const response = await api.put(`/treasury/${id}`, {
            [column]: value
        });
        console.log('✅ Column updated:', response);
        return response.data;
    }
}

// Singleton instance - Usage: treasuryService.addTreasury(formData)
export const treasuryService = new TreasuryService();

