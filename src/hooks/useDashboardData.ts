// hooks/useDashboardData.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/contexts/AppContext';
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

// ==================== Custom Hook ====================
export const useDashboardData = () => {
  const { currentBranch } = useApp();

  // Fetch Revenue Report
  const { 
    data: revenueReport, 
    isLoading: loadingRevenue,
    error: revenueError 
  } = useQuery<RevenueReport>({
    queryKey: ['revenue-report', currentBranch?.id],
    queryFn: async () => {
      try {
        const params: any = {};
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
    queryKey: ['recent-sales'],
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
    queryKey: ['recent-purchases'],
    queryFn: async () => {
      const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 3,
        paginate: false
      });
      return response.data?.data || [];
    },
  });

  // Fetch Products for Low Stock
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.post<ProductResponse>('/product/index', {
        paginate: false
      });
      return response.data?.data || [];
    },
  });

  // Calculate Dashboard Metrics
  const dashboardMetrics = useMemo<DashboardMetrics>(() => {
    const todayRevenue = revenueReport?.today_revenue || 0;
    const monthRevenue = revenueReport?.month_revenue || 0;
    const threeMonthsRevenue = revenueReport?.three_months_revenue || 0;
    
    // Low stock products - مع التأكد من وجود البيانات
    const lowStockProducts = products.filter(p => 
      p && p.stock > 0 && p.stock <= (p.reorder_level || 5)
    );
    const lowStockCount = lowStockProducts.length;

    const totalOrders = recentSales.length;

    return {
      todaySales: todayRevenue,
      salesChange: 0,
      totalRevenue: monthRevenue,
      threeMonthsRevenue,
      totalExpenses: 0,
      netProfit: monthRevenue,
      totalOrders,
      lowStockCount,
      avgOrderValue: totalOrders > 0 ? todayRevenue / totalOrders : 0,
    };
  }, [revenueReport, products, recentSales]);

  // Prepare Recent Transactions
  const recentTransactions = useMemo<RecentTransaction[]>(() => {
    // تحويل المبيعات لصيغة موحدة مع التأكد من وجود البيانات
    const sales = (recentSales || []).map(inv => ({
      id: `sale-${inv.id}`,
      type: 'sale' as const,
      reference: inv.invoice_number,
      amount: Number(inv.total_amount) || 0,
      date: inv.created_at || new Date().toISOString(),
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
      date: inv.invoice_date || new Date().toISOString(),
      supplier: inv.supplier?.name || 'Unknown',
      branch: inv.branch || 'Main'
    }));

    // دمج وترتيب
    return [...sales, ...purchases]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [recentSales, recentPurchases]);

  // Get low stock products for alerts
  const lowStockProducts = useMemo(() => {
    return products.filter(p => 
      p && p.stock > 0 && p.stock <= (p.reorder_level || 5)
    );
  }, [products]);

  return {
    // Data
    revenueReport,
    recentSales,
    recentPurchases,
    products,
    
    // Computed
    dashboardMetrics,
    recentTransactions,
    lowStockProducts,
    
    // Loading states
    isLoading: loadingRevenue,
    isSalesLoading: false,
    isPurchasesLoading: false,
    isProductsLoading: false,
    
    // Errors
    errors: {
      revenue: revenueError,
    }
  };
};