import { BaseService } from './baseService';
import api from '@/lib/api';
import type { Branch } from '@/types/treasury';


/**
 * Branch Service - For branch CRUD operations
 */
export class BranchService extends BaseService<Branch> {
    constructor() {
        super('/branch');
    }

    /**
     * Get active branches (exact replacement for TreasuryBankManager query)
     */
    async getActiveBranches() {
        const payload = {
            filters: { active: true },
            orderBy: 'name',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: true
        };

        const response = await api.post('/branch/index', payload);
        return response.data.data || [];
    }

    /**
     * Get all branches
     */
    async getAllBranches(filters: Record<string, any> = {}) {
        const payload = {
            filters,
            orderBy: 'name',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: true
        };

        const response = await api.post('/branch/index', payload);
        return response.data;
    }
}

// Singleton - Usage: branchService.getActiveBranches()
export const branchService = new BranchService();

