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
    buildCreatePayload(data: TreasuryFormData): Record<string, any> {
        if (!data.currencies.length) {
            throw new Error('At least one currency is required');
        }

        const firstCurrency = data.currencies[0];

        return {
            name: data.name,
            code: data.code || null,
            branch_id: data.branch_id ? parseInt(data.branch_id) : null,
            notes: data.notes || null,
            // Backend expects these exact fields from original mutation
            currency_id: firstCurrency.currency_id,
            currency: String(firstCurrency.currency_id),
            is_main: firstCurrency.is_main,
            balance: parseFloat(firstCurrency.balance.toString()),
        };
    }

    /**
     * Add new Treasury - Main function requested
     */
    async addTreasury(data: TreasuryFormData): Promise<any> {
        const payload = this.buildCreatePayload(data);
        console.log('🚀 TreasuryService.addTreasury PAYLOAD:', payload);

        const response = await this.create(payload);
        console.log('✅ Treasury created:', response);
        return response;
    }

    /**
     * Get all treasuries with pagination support - Direct backend index call
     */
    async getTreasuries(filters: Record<string, any> = {}) {
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
     * Handles multi-currency with top-level balance/currency_id from first currency
     */
    async updateTreasury(id: number, data: TreasuryFormData): Promise<any> {
        if (!data.currencies.length) {
            throw new Error('At least one currency is required');
        }

        const firstCurrency = data.currencies[0];

        const payload = {
            name: data.name,
            code: data.code || null,
            branch_id: data.branch_id ? Number(data.branch_id) : null,
            notes: data.notes || null,

            currency_id: firstCurrency.currency_id,
            currency: String(firstCurrency.currency_id),
            is_main: firstCurrency.is_main,
            balance: Number(firstCurrency.balance),

            // ✅ مهم جدًا
            currencies: data.currencies.map(c => ({
                currency_id: c.currency_id,
                balance: Number(c.balance),
                is_main: c.is_main,
            })),
        };
        console.log('🚀 FIXED UPDATE PAYLOAD:', payload);

        const response = await api.put(`/treasury/${id}`, payload);
        return response.data;
    }

    /**
     * Delete Treasury - Matches component deleteTreasuryMutation endpoint
     */
    async deleteTreasury(id: number): Promise<any> {
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
    async updateTreasuryColumn(id: number, column: string, value: unknown): Promise<any> {
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

