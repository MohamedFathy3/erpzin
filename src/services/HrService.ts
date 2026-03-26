import { AddEmployee, AddDeliveryPerson, DeliveryPerson } from '../types/Hr';



import api from '../lib/api';
import { BaseService } from './baseService';

import type { FilterValues } from '../components/ui/advanced-filter';

export class HrService extends BaseService<AddEmployee> {

    async getEmployees(filters: Record<string, unknown> = {}, page = 1, showAll = false) {
        const payload = {
            orderBy: 'id',
            orderByDirection: 'desc',
            perPage: showAll ? 10000 : 10,
            paginate: !showAll,
            page: showAll ? 1 : page,
            filters,
            with: ['role', 'branch', 'treasury']
        };

        const response = await api.post('/employee/index', payload);
        return response.data.data || [];
    }

    async getEmployeesWithFilters(filters: FilterValues, search: string = '') {
        const apiFilters: Record<string, unknown> = {};

        if (search) {
            apiFilters.name = search;
        }

        if (filters.position && filters.position !== 'all') {
            apiFilters.position = filters.position;
        }

        if (filters.status && filters.status !== 'all') {
            apiFilters.is_active = filters.status === 'active';
        }

        if (filters.salary_min) {
            apiFilters.salary = Number(filters.salary_min);
        }

        if (filters.salary_max) {
            apiFilters.salary_max = Number(filters.salary_max);
        }

        return this.getEmployees(apiFilters);
    }


    constructor() {
        super('/employee');
    }

    async getRoles() {
        const response = await api.post('/role/index', {
            filters: {},
            orderBy: 'name',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: false
        });
        return response.data.data || [];
    }

    async getTreasury() {
        const response = await api.post('/treasury/index', {
            filters: {},
            orderBy: 'name',
            orderByDirection: 'asc',
            perPage: 1000,
            paginate: false
        });
        return response.data.data || [];
    }

    async getBranches() {
        const response = await api.post('/branch/index', {
            filters: {},
            orderBy: 'name',
            orderByDirection: 'asc',
            perPage: 1000,
            paginate: false
        });
        return response.data.data || [];
    }

    async getEmployeeById(id: string | number) {

        const response = await api.get(`/employee/${id}`);
        return response.data.data;
    }


    buildPayload(employee: Partial<AddEmployee>): AddEmployee {
        return {
            employee_code: employee.employee_code!,
            name: employee.name!,
            name_ar: employee.name_ar || null,
            position: employee.position || null,
            phone: employee.phone || null,
            email: employee.email || null,
            salary: typeof employee.salary === 'string' ? parseFloat(employee.salary) : (employee.salary || 0),
            is_active: employee.is_active ?? true,
            treasury_id: employee.treasury_id || null,
            branch_id: employee.branch_id || null,
            role_id: typeof employee.role_id === 'string' ? parseInt(employee.role_id) : employee.role_id || undefined,
            password: employee.password || undefined,
        };
    }

    async createEmployee(employee: Partial<AddEmployee>): Promise<unknown> {
        const payload = this.buildPayload(employee);
        console.log('📤 Adding employee with payload:', payload);
        return this.create(payload); // from BaseService
    }

    async updateEmployee(id: string | number, employee: Partial<AddEmployee>): Promise<unknown> {
        const payload = this.buildPayload(employee);
        console.log('📤 Updating employee:', id, payload);
        const response = await api.patch(`/employee/${id}`, payload);
        return response.data;
    }

    async deleteEmployee(id: string): Promise<unknown> {
        console.log('🗑️ Deleting employee:', id);
        const response = await api.delete('/employee/delete', {
            data: { items: [id] }
        });
        return response.data;
    }

    // ========== Delivery Persons ==========
    async getDeliveryPersons(search: string = ''): Promise<DeliveryPerson[]> {
        const payload: Record<string, unknown> = {
            orderBy: 'id',
            orderByDirection: 'desc',
            perPage: 100,
            paginate: false
        };

        const filters: Record<string, unknown> = {};
        if (search) {
            filters.name = search;
        }

        if (Object.keys(filters).length > 0) {
            payload.filters = filters;
        }

        const response = await api.post('/delevery-man/index', payload);
        return response.data.data || [];
    }


    async createDeliveryPerson(delivery: AddDeliveryPerson) {
        const response = await api.post('/delevery-man', delivery);
        return response.data;
    }

    async updateDeliveryPerson(id: string, delivery: Partial<AddDeliveryPerson>) {
        const response = await api.patch(`/delevery-man/${id}`, delivery);
        return response.data;
    }

    async deleteDeliveryPerson(id: string) {
        const response = await api.delete('/delevery-man/delete', {
            data: { items: [id] }
        });
        return response.data;
    }
}


// Singleton instance - import/use this
export const HrServices = new HrService();

