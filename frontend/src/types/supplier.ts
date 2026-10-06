export interface Supplier {
  id: number | string;
  name: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  is_active?: boolean;
  active?: number;
  note?: string;
}
export type SupplierFilters = {
  search?: string;
  balance_min?: number;
  balance_max?: number;
};
export interface SupplierFiltersPayload {
  name?: string;
  credit_limit?: number;
  balance?: { max?: number; min?: number };
  active?: boolean;
}

export interface SupplierRequestPayload {
  filters?: SupplierFiltersPayload;
  orderBy: string;
  orderByDirection: 'asc' | 'desc';
  perPage: number;
  paginate: boolean;
}
/**
 * DTO for Create / Update
 */
export interface SupplierDto {
  name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  active: number;
}

interface SupplierResponse {
  result: string;
  data: Supplier;
  message: string;
  status: number;
}

