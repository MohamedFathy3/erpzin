// pages/Dashboard.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import QuickAccessGrid from '@/components/dashboard/QuickAccessGrid';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import CategoryPerformanceChart from '@/components/dashboard/CategoryPerformanceChart';
import BranchRevenueChart from '@/components/dashboard/BranchRevenueChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import LowStockAlert from '@/components/dashboard/LowStockAlert';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Factory, FileCheck2, WalletCards, TrendingDown } from 'lucide-react';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

const Dashboard: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const { 
    revenueReport,
    dashboardMetrics,
    recentTransactions,
    lowStockProducts,
    isLoading,
    dashboardSummary
  } = useDashboardData();

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
        <DashboardHeader greeting={getGreeting()} />

        {/* Quick Access */}
        <QuickAccessGrid />

        {/* KPI Cards */}
        <DashboardKPIs metrics={dashboardMetrics} isLoading={isLoading} />

        {dashboardSummary && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="text-orange-600" size={20} /> موقف عقود ومشروعات المقاولات</CardTitle><span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">مالي</span></CardHeader>
            <CardContent><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
              ['قيمة العقود', dashboardSummary.projects_finance.contract_value, WalletCards],
              ['التكلفة الفعلية', dashboardSummary.projects_finance.actual_cost, TrendingDown],
              ['المستخلصات القائمة', dashboardSummary.projects_finance.claims_outstanding, FileCheck2],
              ['ربح تقديري', dashboardSummary.projects_finance.profit_estimate, Building2],
            ].map(([label, value, Icon]) => <div key={String(label)} className="rounded-xl border bg-background/70 p-3"><Icon size={16} className="mb-2 text-orange-600" /><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold">{formatCurrency(Number(value))}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground"><span>مشروعات نشطة: <b className="text-foreground">{dashboardSummary.projects_finance.active_count}</b></span><span>مستخلصات معلقة: <b className="text-foreground">{dashboardSummary.projects_finance.pending_claims}</b></span><span>المحصل: <b className="text-foreground">{formatCurrency(dashboardSummary.projects_finance.claims_paid)}</b></span></div></CardContent>
          </Card>
          <Card className="overflow-hidden border-cyan-200 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0"><CardTitle className="flex items-center gap-2 text-base"><Factory className="text-cyan-600" size={20} /> تكلفة أوامر الإنتاج وخطوط المصنع</CardTitle><span className="rounded-full bg-cyan-100 px-2 py-1 text-xs text-cyan-700">تشغيل</span></CardHeader>
            <CardContent><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
              ['أوامر قيد التشغيل', dashboardSummary.manufacturing_summary.orders_in_progress],
              ['أوامر مكتملة', dashboardSummary.manufacturing_summary.completed_orders],
              ['تكلفة مخططة', formatCurrency(dashboardSummary.manufacturing_summary.planned_cost)],
              ['تكلفة فعلية', formatCurrency(dashboardSummary.manufacturing_summary.actual_cost)],
            ].map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-background/70 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground"><span>المخطط: <b className="text-foreground">{dashboardSummary.manufacturing_summary.planned_quantity}</b></span><span>المنتج التام: <b className="text-foreground">{dashboardSummary.manufacturing_summary.produced_quantity}</b></span></div></CardContent>
          </Card>
        </div>}

        {/* Low Stock Alert */}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SalesTrendChart 
              branchId={undefined}
              reportData={revenueReport}
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
