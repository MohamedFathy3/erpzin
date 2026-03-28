export interface Bank {
    id: number;
    name: string;
    name_ar?: string;
    account_number?: string;
    iban?: string;
    swift_code?: string;
    branch_id?: number;
    branch?: {
        id: number;
        name: string;
    };
    balance: number;
    currency: string;
    contact_person?: string;
    phone?: string;
    address?: string;
    is_active: boolean;
    notes?: string;
}

export interface Movement {
    id: number;
    type: string;
    from: {
        treasury: string | null;
        bank: string | null;
    };
    to: {
        treasury: string | null;
        bank: string | null;
    };
    amount: string;
    currency: string;
    notes: string;
    date: string;
}

export interface MovementResponse {
    data: Movement[];
    links: Record<string, string>;
    meta: Record<string, unknown>;
    result: string;
    message: string;
    status: number;
}
