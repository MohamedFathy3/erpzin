import { BaseService } from './baseService';
import api from '@/lib/api';
import type { Currency } from '@/types/treasury'; // Reuse Currency type

/**
 * Currency Service - For TreasuryBankManager currencies query
 */
export class CurrencyService extends BaseService<Currency> {
    constructor() {
        super('/currency');
    }

    /**
     * Get active currencies - Exact TreasuryBankManager query
     */
    async getActiveCurrencies() {
        const payload = {
            filters: { active: true },
            orderBy: 'name',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: true
        };
        console.log('🔍 CurrencyService.getActiveCurrencies filters:', payload.filters);
        const response = await api.post('/currency/index', payload);
        console.log('✅ Currencies loaded:', response.data.data?.length);
        return response.data.data || [];
    }
}

// Singleton
export const currencyService = new CurrencyService();

