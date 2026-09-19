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
  async createService(payload: Partial<AutomotiveServiceItem>) {
    const response = await api.post('/automotive/services', payload);
    return response.data?.data;
  },
  async updateOrderStatus(id: number, status: string) {
    const response = await api.patch(`/automotive/service-orders/${id}/status`, { status });
    return response.data?.data;
  },
};
