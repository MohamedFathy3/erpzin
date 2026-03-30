export interface Employee {
    id: number;
    employee_code: string;
    name: string;
    position: string;
    department?: string | null;
    branch?: {
        id: number;
        name: string;
        name_ar?: string | null;
    } | null;
    treasury?: {
        id: number;
        name: string;
    } | null;
    phone?: string | null;
    email?: string | null;
    salary: number;
    is_active: boolean | null;
    created_at: string;
    role: string | null;
}


export interface ApiResponse<T> {
    result: string;
    data: T[];
    message: string;
    status: number;
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
        from: number;
        to: number;
    };
    links?: any;
}

export interface ApiRole {
    id: number;
    name: string;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface EmployeeFormData {
    employee_code: string;
    name: string;
    position: string;
    role_id: number | '';
    phone: string;
    email: string;
    password?: string;
    salary: number | '';
    is_active: boolean;
    branch_id: number | null;
    treasury_id: number | null;
}