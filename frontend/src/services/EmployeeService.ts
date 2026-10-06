import { BaseService } from './baseService';
import api from '@/lib/api';
import type { EmployeeFormData, ApiRole, ApiResponse, Employee } from '@/types/employee';


/**
 * Branch Service - For branch CRUD operations
 */
export class EmployeeService extends BaseService<Employee> {
    constructor() {
        super('/employee');
    }
    async addEmployee(data: EmployeeFormData) {
        const response = await api.post('/employee', data);
        return response.data;
    }
    async updateEmployee(id: number, data: Partial<EmployeeFormData>) {
        const response = await api.patch(`/employee/${id}`, data);
        return response.data;
    }




    async deleteEmployee(id: number | string) {
        if (!id) throw new Error('No employee ID provided');
        try {
            const response = await api.delete('/employee/delete', {
                data: { items: [id] },
            });
            return response.data;
        } catch (error: Error | unknown) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    }



}

export const employeeService = new EmployeeService();

