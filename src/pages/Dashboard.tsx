import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { supabase } from '@/integrations/supabase/client';
import {
  Wallet,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { language, t } = useLanguage();
  const { currentBranch } = useApp();
  const { user } = useAuth();

  // Fetch aggregated dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-summary', currentBranch?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().setDate(1)).toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Today's sales
      let todaySalesQuery = supabase
        .from('sales')
        .select('total_amount')
        .gte('sale_date', today);
      
      if (currentBranch) {
        todaySalesQuery = todaySalesQuery.eq('branch', currentBranch.name);
      }
      
      const { data: todaySalesData } = await todaySalesQuery;
      const todaySales = todaySalesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

      // Yesterday's sales for comparison
      let yesterdaySalesQuery = supabase
        .from('sales')
        .select('total_amount')
        .gte('sale_date', yesterday)
        .lt('sale_date', today);
      
      if (currentBranch) {
        yesterdaySalesQuery = yesterdaySalesQuery.eq('branch', currentBranch.name);
      }
      
      const { data: yesterdaySalesData } = await yesterdaySalesQuery;
      const yesterdaySales = yesterdaySalesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

      // Monthly revenue
      let revenueQuery = supabase
        .from('revenues')
        .select('amount')
        .gte('revenue_date', startOfMonth);
      
      if (currentBranch) {
        revenueQuery = revenueQuery.eq('branch_id', currentBranch.id);
      }
      
      const { data: revenueData } = await revenueQuery;
      const totalRevenue = revenueData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

      // Monthly expenses
      let expenseQuery = supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', startOfMonth);
      
      if (currentBranch) {
        expenseQuery = expenseQuery.eq('branch_id', currentBranch.id);
      }
      
      const { data: expenseData } = await expenseQuery;
      const totalExpenses = expenseData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Monthly orders count
      let ordersQuery = supabase
        .from('sales')
        .select('id')
        .gte('sale_date', startOfMonth);
      
      if (currentBranch) {
        ordersQuery = ordersQuery.eq('branch', currentBranch.name);
      }
      
      const { data: ordersData } = await ordersQuery;
      const totalOrders = ordersData?.length || 0;

      // Low stock alerts
      const { data: lowStockData } = await supabase
        .from('low_stock_alerts')
        .select('id')
        .eq('is_resolved', false);
      
      const lowStockCount = lowStockData?.length || 0;

      // Net profit
      const netProfit = totalRevenue - totalExpenses;

      // Calculate change percentages
      const salesChange = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;

      return {
        todaySales,
        salesChange,
        totalRevenue,
        totalExpenses,
        netProfit,
        totalOrders,
        lowStockCount,
        avgOrderValue: totalOrders > 0 ? todaySales / totalOrders : 0,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US');
  };

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
              {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Quick Access */}
        <QuickAccessGrid />

        {/* KPI Cards */}
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
                value={formatCurrency(dashboardData?.todaySales || 0)}
                currency={t('common.currency')}
                change={dashboardData?.salesChange || 0}
                changeLabel={t('dashboard.vsYesterday')}
                icon={<Wallet size={20} />}
                variant="success"
              />
              <KPICard
                title={t('dashboard.totalRevenue')}
                value={formatCurrency(dashboardData?.totalRevenue || 0)}
                currency={t('common.currency')}
                change={0}
                changeLabel={t('dashboard.thisMonth')}
                icon={<TrendingUp size={20} />}
                variant="primary"
              />
              <KPICard
                title={t('dashboard.netProfit')}
                value={formatCurrency(dashboardData?.netProfit || 0)}
                currency={t('common.currency')}
                change={0}
                changeLabel={t('dashboard.revenueMinusExpenses')}
                icon={(dashboardData?.netProfit || 0) >= 0 ? <DollarSign size={20} /> : <TrendingDown size={20} />}
                variant={(dashboardData?.netProfit || 0) >= 0 ? 'success' : 'default'}
              />
              <KPICard
                title={t('dashboard.totalOrders')}
                value={dashboardData?.totalOrders || 0}
                change={0}
                changeLabel={t('dashboard.thisMonth')}
                icon={<ShoppingCart size={20} />}
                variant="default"
              />
            </>
          )}
        </div>

        {/* Alert Cards */}
        {(dashboardData?.lowStockCount || 0) > 0 && (
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
                  {dashboardData?.lowStockCount} {language === 'ar' ? 'منتج يحتاج إعادة طلب' : 'products need reordering'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SalesTrendChart />
          </div>
          <div>
            <CategoryPerformanceChart />
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <BranchRevenueChart />
          </div>
          <div>
            <LowStockAlerts />
          </div>
          <div>
            <RecentTransactions />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
