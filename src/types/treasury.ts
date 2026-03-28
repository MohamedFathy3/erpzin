/**
 * Treasury Types
 * Extracted from TreasuryBankManager form structure
 */

export interface TreasuryCurrency {
    currency_id: number;
    balance: number;
    is_main: boolean;
}

export interface TreasuryFormData {
    name: string;
    code: string;
    branch_id: string;
    currencies: TreasuryCurrency[];
    notes: string;
}

export interface Treasury {
    id: number;
    name: string;
    code: string | null;
    branch_id: number;
    branch: {
        id: number;
        name: string;
    };
    currencies: TreasuryCurrency[];
    is_main: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    total_balance: number;
}

export interface Branch {
    id: number;
    name: string;
    code: string;
    phone: string;
    address: string;
    manager: string;
    active: boolean;
    main_branch: boolean;
}

export interface Currency {
    id: number;
    name: string;
    code: string;
    symbol: string;
    exchange_rate: string;
    active: boolean;
    default: boolean;
}

// Response types
export interface TreasuryResponse {
    data: Treasury[];
    links: Record<string, string>;
    meta: Record<string, unknown>;
    result: string;
    message: string;
    status: number;
}

// Response types
export interface TreasuryResponse {
    data: Treasury[];
    links: Record<string, string>;
    meta: Record<string, unknown>;
    result: string;
    message: string;
    status: number;
}


