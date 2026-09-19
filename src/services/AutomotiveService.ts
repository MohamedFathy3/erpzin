import api from '@/lib/api';

export interface AutomotiveVehicle {
  id: number;
  customer_id: number;
  customer?: { id: number; name: string; phone?: string | null };
  plate_number?: string | null;
  vin?: string | null;
  make: string;
  model: string;
  model_year?: number | null;
  color?: string | null;
  current_mileage?: number;
}

export interface AutomotiveServiceItem {
  id: number;
  code: string;
  name: string;
  name_ar?: string | null;
  selling_price: number;
  estimated_cost: number;
  estimated_minutes?: number | null;
  warranty_eligible: boolean;
  active: boolean;
}

export interface AutomotiveServiceOrder {
  id: number;
  order_number: string;
  status: string;
  priority: string;
  total_amount: number;
  customer?: { id: number; name: string };
  vehicle?: AutomotiveVehicle;
  technicians?: Array<{ id: number; name: string }>;
  items?: Array<{ id: number; description: string; quantity: number; unit_price: number }>;
}

export interface AutomotiveCustomer { id: number; name: string; phone?: string | null; email?: string | null }
export interface AutomotiveTechnician { id: number; name: string; email?: string | null; phone?: string | null }

export const AutomotiveService = {
  async vehicles(search = ''): Promise<AutomotiveVehicle[]> {
    const response = await api.get('/automotive/vehicles', { params: { search, per_page: 100 } });
    return response.data?.data?.data ?? response.data?.data ?? [];
  },
  async services(): Promise<AutomotiveServiceItem[]> {
    const response = await api.get('/automotive/services', { params: { active: true, per_page: 100 } });
    return response.data?.data?.data ?? response.data?.data ?? [];
  },
  async orders(): Promise<AutomotiveServiceOrder[]> {
    const response = await api.get('/automotive/service-orders', { params: { per_page: 100 } });
    return response.data?.data?.data ?? response.data?.data ?? [];
  },
  async customers(): Promise<AutomotiveCustomer[]> {
    const response = await api.get('/customer', { params: { per_page: 100 } });
    return response.data?.data?.data ?? response.data?.data ?? [];
  },
  async technicians(): Promise<AutomotiveTechnician[]> {
    const response = await api.get('/employee', { params: { per_page: 100 } });
    return response.data?.data?.data ?? response.data?.data ?? [];
  },
  async createCustomerAccount(payload: { customer_id: number; email: string; password: string }) {
    const response = await api.post('/automotive/customer-accounts', payload);
    return response.data?.data;
  },
  async createCustomer(payload: { name: string; phone?: string; email?: string; address?: string }) {
    const response = await api.post('/customer', payload);
    return response.data?.data;
  },
  async createVehicle(payload: Partial<AutomotiveVehicle>) {
    const response = await api.post('/automotive/vehicles', payload);
    return response.data?.data;
  },
  async createService(payload: Partial<AutomotiveServiceItem>) {
    const response = await api.post('/automotive/services', payload);
    return response.data?.data;
  },
  async updateOrderStatus(id: number, status: string) {
    const response = await api.patch(`/automotive/service-orders/${id}/status`, { status });
    return response.data?.data;
  },
  async createOrder(payload: any) {
    const response = await api.post('/automotive/service-orders', payload);
    return response.data?.data;
  },
  async profitabilityReport() {
    const response = await api.get('/automotive/reports/profitability');
    return response.data?.data;
  },
};
