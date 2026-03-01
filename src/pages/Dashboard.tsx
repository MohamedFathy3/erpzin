import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import MainLayout from '@/components/layout/MainLayout';
import KPICard from '@/components/dashboard/KPICard';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import BranchRevenueChart from '@/components/dashboard/BranchRevenueChart';
import CategoryPerformanceChart from '@/components/dashboard/CategoryPerformanceChart';
import LowStockAlerts from '@/components/dashboard/LowStockAlerts';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import QuickAccessGrid from '@/components/dashboard/QuickAccessGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { formatDateLong } from '@/lib/utils';
import {
  Wallet,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

// ==================== Types ====================
interface RevenueReport {
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

interface SalesInvoice {
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

interface SalesInvoiceResponse {
  data: SalesInvoice[];
}

interface PurchaseInvoice {
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

interface PurchaseInvoiceResponse {
  data: PurchaseInvoice[];
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  stock: number;
  reorder_level: number;
}

interface ProductResponse {
  data: Product[];
}

const Dashboard: React.FC = () => {
  const { language, t } = useLanguage();
  const { currentBranch } = useApp();
  const { user } = useAuth();
  const { formatCurrency } = useRegionalSettings();

  // ==================== Fetch Revenue Report (المصدر الرئيسي) ====================
  const { data: revenueReport, isLoading: loadingRevenue } = useQuery<RevenueReport>({
    queryKey: ['revenue-report', currentBranch?.id],
    queryFn: async () => {
      try {
        const params: any = {};
        if (currentBranch?.id) {
          params.branch_id = currentBranch.id;
        }
        
        const response = await api.get('/reports/revenue', { params });
        return response.data;
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
    refetchInterval: 60000, // Refresh every minute
  });

  // ==================== Fetch Recent Sales (لآخر المعاملات) ====================
  const { data: recentSales = [] } = useQuery<SalesInvoice[]>({
    queryKey: ['recent-sales'],
    queryFn: async () => {
      const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 5,
        paginate: false
      });
      return response.data.data || [];
    },
  });

  // ==================== Fetch Recent Purchases (لآخر المشتريات) ====================
  const { data: recentPurchases = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ['recent-purchases'],
    queryFn: async () => {
      const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 3,
        paginate: false
      });
      return response.data.data || [];
    },
  });

  // ==================== Fetch Products for Low Stock ====================
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.post<ProductResponse>('/product/index', {
        paginate: false
      });
      return response.data.data || [];
    },
  });

  // ==================== Calculate Dashboard Metrics from Revenue Report ====================
  const dashboardData = useMemo(() => {
    // استخدم البيانات من revenue report
    const todayRevenue = revenueReport?.today_revenue || 0;
    const monthRevenue = revenueReport?.month_revenue || 0;
    const threeMonthsRevenue = revenueReport?.three_months_revenue || 0;
    
    // Low stock products
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= (p.reorder_level || 5));
    const lowStockCount = lowStockProducts.length;

    // عدد الطلبات من recent sales
    const totalOrders = recentSales.length;

    // حساب التغير في المبيعات (تقريبي)
    // ملاحظة: لو عاوز تغير دقيق، محتاج بيانات من الشهر الماضي
    const salesChange = 0; // مؤقتاً

    return {
      todaySales: todayRevenue,
      salesChange,
      totalRevenue: monthRevenue,
      threeMonthsRevenue,
      totalExpenses: 0, // مش موجود في revenue report
      netProfit: monthRevenue, // مؤقتاً (صافي الربح = الإيرادات)
      totalOrders,
      lowStockCount,
      avgOrderValue: totalOrders > 0 ? todayRevenue / totalOrders : 0,
    };
  }, [revenueReport, products, recentSales]);

  // ==================== Prepare Recent Transactions ====================
  const recentTransactions = useMemo(() => {
    // تحويل المبيعات لصيغة موحدة
    const sales = recentSales.map(inv => ({
      id: `sale-${inv.id}`,
      type: 'sale' as const,
      reference: inv.invoice_number,
      amount: Number(inv.total_amount),
      date: inv.created_at,
      customer: inv.customer.name,
      branch: inv.branch,
      payment_method: inv.payment_method
    }));

    // تحويل المشتريات لصيغة موحدة
    const purchases = recentPurchases.map(inv => ({
      id: `purchase-${inv.id}`,
      type: 'purchase' as const,
      reference: inv.invoice_number,
      amount: Number(inv.total_amount),
      date: inv.invoice_date,
      supplier: inv.supplier.name || 'Unknown',
      branch: inv.branch
    }));

    // دمج وترتيب
    return [...sales, ...purchases]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [recentSales, recentPurchases]);

  const isLoading = loadingRevenue;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'ar' ? 'صباح الخير' : 'Good Morning';
    if (hour < 18) return language === 'ar' ? 'مساء الخير' : 'Good Afternoon';
    return language === 'ar' ? 'مساء الخير' : 'Good Evening';
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting()}، <span className="text-primary">{user?.email?.split('@')[0] || 'User'}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentBranch 
                ? `${language === 'ar' ? 'فرع' : 'Branch'}: ${language === 'ar' && currentBranch.name_ar ? currentBranch.name_ar : currentBranch.name}`
                : (language === 'ar' ? 'جميع الفروع' : 'All Branches')
              }
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {formatDateLong(new Date(), language)}
            </p>
          </div>
        </div>

        {/* Quick Access */}
        <QuickAccessGrid />

        {/* KPI Cards - من revenue report */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </Card>
              ))}
            </>
          ) : (
            <>
              <KPICard
                title={t('dashboard.todaySales')}
                value={formatCurrency(dashboardData.todaySales)}
                currency={t('common.currency')}
                change={dashboardData.salesChange}
                changeLabel={t('dashboard.vsYesterday')}
                icon={<Wallet size={20} />}
                variant="success"
              />
              <KPICard
                title={t('dashboard.totalRevenue')}
                value={formatCurrency(dashboardData.totalRevenue)}
                currency={t('common.currency')}
                subtitle={language === 'ar' ? 'هذا الشهر' : 'This month'}
                icon={<TrendingUp size={20} />}
                variant="primary"
              />
              <KPICard
                title={language === 'ar' ? 'إيرادات ٣ شهور' : '3 Months Revenue'}
                value={formatCurrency(dashboardData.threeMonthsRevenue)}
                currency={t('common.currency')}
                subtitle={language === 'ar' ? 'آخر ٣ شهور' : 'Last 3 months'}
                icon={<DollarSign size={20} />}
                variant="default"
              />
              <KPICard
                title={t('dashboard.totalOrders')}
                value={dashboardData.totalOrders}
                change={0}
                changeLabel={t('dashboard.thisMonth')}
                icon={<ShoppingCart size={20} />}
                variant="default"
              />
            </>
          )}
        </div>

        {/* Alert Cards - Low Stock */}
        {dashboardData.lowStockCount > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="text-warning" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t('dashboard.lowStock')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dashboardData.lowStockCount} {language === 'ar' ? 'منتج يحتاج إعادة طلب' : 'products need reordering'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row - باستخدام revenue report */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SalesTrendChart 
              branchId={currentBranch?.id ? Number(currentBranch.id) : undefined}
              reportData={revenueReport}  // 👈 تمرير التقرير كامل
            />
          </div>
          <div>
            <CategoryPerformanceChart 
              categories={revenueReport?.top_categories || []}
            />
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <BranchRevenueChart 
              branches={revenueReport?.branch_revenues || []}
            />
          </div>
          <div>
            <RecentTransactions 
              transactions={recentTransactions}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;