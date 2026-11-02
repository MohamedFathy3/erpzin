// hooks/useDashboardData.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// ==================== Types ====================
export interface RevenueReport {
  today_revenue: number;
  month_revenue: number;
  three_months_revenue: number;
  top_categories: Array<{
    category_id: number;
    category_name: string;
    total_quantity: number;
  }>;
  branch_revenues: Array<{
    branch_name: string;
    revenue: number;
  }>;
}

export interface SalesInvoice {
  id: number;
  invoice_number: string;
  customer: {
    id: number;
    name: string;
  };
  branch: string;
  total_amount: string;
  created_at: string;
  payment_method: string;
}

export interface SalesInvoiceResponse {
  data: SalesInvoice[];
}

export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: {
    id: number | null;
    name: string | null;
  };
  branch: string;
  total_amount: string;
  invoice_date: string;
}

export interface DashboardTreasury {
  id: number;
  name: string;
  balance: number;
  currency?: string | null;
  branch_id?: number | null;
}

export interface DashboardAttendance {
  id: number;
  employee?: { name?: string | null } | null;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: string | null;
  late_minutes?: number;
  worked_minutes?: number;
}

export interface OpenCashierShift {
  id: number;
  employee?: string;
  status: string;
  opened_at?: string | null;
  opening_balance?: number;
  cash_sales?: number;
  expected_amount?: number;
}

export interface UnifiedFinancialReport {
  summary: {
    sales: number;
    sales_cost: number;
    gross_profit: number;
    purchases: number;
    expenses: number;
    revenues: number;
    net_profit: number;
  };
}

export interface PurchaseInvoiceResponse {
  data: PurchaseInvoice[];
}

export interface Product {
  id: number;
  name: string;
  name_ar?: string;
  stock: number;
  reorder_level: number;
}

export interface ProductResponse {
  data: Product[];
}

export interface DashboardMetrics {
  todaySales: number;
  salesChange: number;
  totalRevenue: number;
  threeMonthsRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  lowStockCount: number;
  avgOrderValue: number;
}

interface DashboardSummary {
  today_sales: number;
  month_sales: number;
  month_purchases: number;
  net_profit_before_overheads: number;
  sales_invoices_count: number;
  purchase_invoices_count: number;
  customers_count: number;
  products_count: number;
  low_stock_count: number;
  supplier_due?: number;
  customer_due?: number;
  top_customer?: { name?: string; total?: number } | null;
  net_profit?: number;
  employees_count?: number;
  daily_expenses?: number;
  expenses?: number;
  credit_sales: number;
  projects_finance: {
    active_count: number;
    contract_value: number;
    budget_cost: number;
    actual_cost: number;
    claims_gross: number;
    claims_net: number;
    claims_paid: number;
    claims_outstanding: number;
    pending_claims: number;
    profit_estimate: number;
  };
  manufacturing_summary: {
    orders_in_progress: number;
    completed_orders: number;
    planned_quantity: number;
    produced_quantity: number;
    scrapped_quantity?: number;
    actual_cost: number;
    planned_cost: number;
  };
}

export interface RecentTransaction {
  id: string;
  type: 'sale' | 'purchase';
  reference: string;
  amount: number;
  date: string;
  customer?: string;
  supplier?: string;
  branch: string;
  payment_method?: string;
}

const normalizeTransactionDate = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : value;
};

// ==================== Custom Hook ====================
export const useDashboardData = (filters?: { from?: string; to?: string }) => {
  const { currentBranch } = useApp();
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? null;

  const { data: dashboardSummary, isLoading: loadingSummary, error: summaryError } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', tenantId, currentBranch?.id, filters?.from, filters?.to],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary', { params: { ...(currentBranch?.id ? { branch_id: currentBranch.id } : {}), from: filters?.from, to: filters?.to } });
      return response.data?.data;
    },
    refetchInterval: 60000,
  });

  // Fetch Revenue Report
  const { 
    data: revenueReport, 
    isLoading: loadingRevenue,
    error: revenueError 
  } = useQuery<RevenueReport>({
    queryKey: ['revenue-report', tenantId, currentBranch?.id],
    queryFn: async () => {
      try {
        const params: Record<string, number> = {};
        if (currentBranch?.id) {
          params.branch_id = currentBranch.id;
        }
        
        const response = await api.get('/reports/revenue', { params });
        
        // تأكد من صحة البيانات
        return {
          today_revenue: response.data?.today_revenue || 0,
          month_revenue: response.data?.month_revenue || 0,
          three_months_revenue: response.data?.three_months_revenue || 0,
          top_categories: response.data?.top_categories?.filter(cat => cat && cat.category_name) || [],
          branch_revenues: response.data?.branch_revenues?.filter(branch => branch && branch.branch_name) || []
        };
      } catch (error) {
        console.error('Error fetching revenue report:', error);
        return {
          today_revenue: 0,
          month_revenue: 0,
          three_months_revenue: 0,
          top_categories: [],
          branch_revenues: []
        };
      }
    },
    refetchInterval: 60000,
  });

  // Fetch Recent Sales
  const { data: recentSales = [] } = useQuery<SalesInvoice[]>({
    queryKey: ['recent-sales', tenantId, currentBranch?.id],
    queryFn: async () => {
      const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 5,
        paginate: false
      });
      return response.data?.data || [];
    },
  });

  // Fetch Recent Purchases
  const { data: recentPurchases = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ['recent-purchases', tenantId, currentBranch?.id],
    queryFn: async () => {
      const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 5,
        paginate: false
      });
      return response.data?.data || [];
    },
    refetchInterval: 60000,
  });

  const { data: treasuries = [] } = useQuery<DashboardTreasury[]>({
    queryKey: ['dashboard-treasuries', tenantId, currentBranch?.id],
    queryFn: async () => {
      const response = await api.post('/treasury/index', { filters: {}, perPage: 100, paginate: false });
      const rows = response.data?.data || [];
      return currentBranch?.id ? rows.filter((row: DashboardTreasury) => !row.branch_id || row.branch_id === currentBranch.id) : rows;
    },
    refetchInterval: 60000,
  });

  const { data: attendanceRecords = [] } = useQuery<DashboardAttendance[]>({
    queryKey: ['dashboard-attendance', tenantId, currentBranch?.id],
    queryFn: async () => {
      const response = await api.get('/attendance/dashboard-today', {
        params: currentBranch?.id ? { branch_id: currentBranch.id } : {},
      });
      return response.data?.data || [];
    },
    refetchInterval: 60000,
  });

  const { data: openCashierShifts = [] } = useQuery<OpenCashierShift[]>({
    queryKey: ['dashboard-open-cashier-shifts', tenantId],
    queryFn: async () => {
      const response = await api.get('/shifts', { params: { status: 'open' } });
      return response.data?.data || [];
    },
    refetchInterval: 30000,
  });

  const { data: financialReport, isLoading: loadingFinancialReport } = useQuery<UnifiedFinancialReport>({
    queryKey: ['dashboard-unified-financial', tenantId, currentBranch?.id, filters?.from, filters?.to],
    queryFn: async () => {
      const response = await api.get('/reports/unified-financial', {
        params: { from: filters?.from, to: filters?.to, ...(currentBranch?.id ? { branch_id: currentBranch.id } : {}) },
      });
      return response.data?.data;
    },
    refetchInterval: 60000,
  });

  // Fetch Products for Low Stock
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['dashboard-products', tenantId, currentBranch?.id],
    queryFn: async () => {
      const response = await api.post<ProductResponse>('/product/index', {
        paginate: false
      });
      return response.data?.data || [];
    },
  });

  // Calculate Dashboard Metrics
  const dashboardMetrics = useMemo<DashboardMetrics>(() => {
    const todayRevenue = dashboardSummary?.today_sales ?? revenueReport?.today_revenue ?? 0;
    const monthRevenue = dashboardSummary?.month_sales ?? revenueReport?.month_revenue ?? 0;
    const threeMonthsRevenue = revenueReport?.three_months_revenue || 0;
    
    // Low stock products - مع التأكد من وجود البيانات
    const lowStockProducts = products.filter(p =>
      p && p.stock <= (p.reorder_level || 5)
    );
    const lowStockCount = lowStockProducts.length;

    const totalOrders = dashboardSummary?.sales_invoices_count ?? recentSales.length;

    return {
      todaySales: todayRevenue,
      salesChange: 0,
      totalRevenue: monthRevenue,
      threeMonthsRevenue,
      totalExpenses: dashboardSummary?.month_purchases ?? 0,
      netProfit: dashboardSummary?.net_profit_before_overheads ?? (monthRevenue - (dashboardSummary?.month_purchases ?? 0)),
      totalOrders,
      lowStockCount,
      avgOrderValue: totalOrders > 0 ? todayRevenue / totalOrders : 0,
    };
  }, [revenueReport, dashboardSummary, products, recentSales]);

  // Prepare Recent Transactions
  const recentTransactions = useMemo<RecentTransaction[]>(() => {
    // تحويل المبيعات لصيغة موحدة مع التأكد من وجود البيانات
    const sales = (recentSales || []).map(inv => ({
      id: `sale-${inv.id}`,
      type: 'sale' as const,
      reference: inv.invoice_number,
      amount: Number(inv.total_amount) || 0,
      date: normalizeTransactionDate(inv.created_at),
      customer: inv.customer?.name || 'Unknown',
      branch: inv.branch || 'Main',
      payment_method: inv.payment_method
    }));

    // تحويل المشتريات لصيغة موحدة مع التأكد من وجود البيانات
    const purchases = (recentPurchases || []).map(inv => ({
      id: `purchase-${inv.id}`,
      type: 'purchase' as const,
      reference: inv.invoice_number,
      amount: Number(inv.total_amount) || 0,
      date: normalizeTransactionDate(inv.invoice_date),
      supplier: inv.supplier?.name || 'Unknown',
      branch: inv.branch || 'Main'
    }));

    // دمج وترتيب
    return [...sales, ...purchases]
      .sort((a, b) => {
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [recentSales, recentPurchases]);

  // Get low stock products for alerts
  const lowStockProducts = useMemo(() => {
    return products.filter(p =>
      p && p.stock <= (p.reorder_level || 5)
    );
  }, [products]);

  return {
    // Data
    revenueReport,
    recentSales,
    recentPurchases,
    products,
    dashboardSummary,
    treasuries,
    attendanceRecords,
    openCashierShifts,
    financialReport,
    
    // Computed
    dashboardMetrics,
    recentTransactions,
    lowStockProducts,
    
    // Loading states
    isLoading: loadingRevenue || loadingSummary || loadingFinancialReport,
    isSalesLoading: false,
    isPurchasesLoading: false,
    isProductsLoading: false,
    
    // Errors
    errors: {
      revenue: revenueError,
      summary: summaryError,
    }
  };
};
