export interface Role {
    id: number;
    name: string;
}

export interface AddEmployee {
    employee_code: string;
    name: string;
    name_ar?: string | null;
    position?: string | null;
    phone?: string | null;
    email?: string | null;
    salary: number;
    is_active: boolean;
    treasury_id?: number | null;
    branch_id?: number | null;
    role_id?: number;
    password?: string;
}

export interface UpdateEmployee extends Partial<AddEmployee> { id: number; }

export interface DeliveryPerson {
    id: string;
    name: string;
    name_ar?: string;
    phone?: string;
    vehicle_type?: string;
    vehicle_number?: string;
    is_active: boolean;
}

export interface AddDeliveryPerson {
    name: string;
    name_ar?: string;
    phone?: string;
    vehicle_type?: string;
    vehicle_number?: string;
    is_active: boolean;
}


