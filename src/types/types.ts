// lib/types.ts
export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  exchange_rate: string;
  active: boolean;
  default: boolean;
}

export interface Tax {
  id: number;
  name: string;
  rate: string;
  active: boolean;
  default: boolean;
}

export interface ApiResponse<T> {
  data: T;
  result: string;
  message: string;
  status: number;
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: {
    current_page: number;
    from: number;
    last_page: number;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}