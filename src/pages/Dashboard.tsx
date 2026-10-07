import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import MainLayout from '@/components/layout/MainLayout';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import CategoryPerformanceChart from '@/components/dashboard/CategoryPerformanceChart';
import BranchRevenueChart from '@/components/dashboard/BranchRevenueChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, BarChart3, Boxes, Factory, FileText, Plus, Receipt, ShoppingCart, Users, Wallet, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { currentBranch } = useApp();
  const { formatCurrency } = useRegionalSettings();
  const { revenueReport, dashboardMetrics, recentTransactions, isLoading, dashboardSummary } = useDashboardData();
  const ar = language === 'ar';
  const firstName = user?.email?.split('@')[0] || (ar ? 'المستخدم' : 'there');

  const actions = [
    { label: ar ? 'فاتورة بيع' : 'Sales invoice', icon: Receipt, route: '/sales' },
    { label: ar ? 'إضافة منتج' : 'New product', icon: Boxes, route: '/inventory' },
    { label: ar ? 'مصروف جديد' : 'New expense', icon: Wallet, route: '/finance' },
    { label: ar ? 'تقرير سريع' : 'Quick report', icon: BarChart3, route: '/reports' },
  ];

  const kpis = [
    { label: ar ? 'مبيعات اليوم' : "Today's sales", value: formatCurrency(dashboardMetrics.todaySales), note: ar ? 'مقابل الأمس' : 'vs yesterday', change: dashboardMetrics.salesChange },
    { label: ar ? 'إجمالي الإيرادات' : 'Total revenue', value: formatCurrency(dashboardMetrics.totalRevenue), note: ar ? 'هذا الشهر' : 'This month' },
    { label: ar ? 'طلبات مكتملة' : 'Completed orders', value: dashboardMetrics.totalOrders.toLocaleString(), note: ar ? 'كل الفروع' : 'All branches' },
  ];

  return (
    <MainLayout>
      <div className="dashboard-canvas space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <section className="dashboard-hero">
          <div>
            <p className="dashboard-eyebrow">{ar ? 'نظرة تشغيلية' : 'Operations overview'}</p>
            <h1>{ar ? `أهلًا ${firstName}` : `Good to see you, ${firstName}`}</h1>
            <p className="dashboard-muted">{currentBranch ? (ar ? `أنت تتابع ${currentBranch.name_ar || currentBranch.name}` : `Monitoring ${currentBranch.name}`) : (ar ? 'كل الفروع في شاشة واحدة' : 'All branches in one view')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/reports')} className="dashboard-outline-button"><BarChart3 className="me-2 h-4 w-4" />{ar ? 'مركز التقارير' : 'Reports hub'}</Button>
            <Button onClick={() => navigate('/pos')} className="dashboard-primary-button"><Plus className="me-2 h-4 w-4" />{ar ? 'بدء عملية بيع' : 'Start sale'}</Button>
          </div>
        </section>

        <section className="dashboard-command-grid">
          <div className="dashboard-section-label">{ar ? 'إجراءات متكررة' : 'Frequent actions'}</div>
          <div className="dashboard-actions">
            {actions.map(({ label, icon: Icon, route }) => <button key={route} type="button" onClick={() => navigate(route)} className="dashboard-action"><span className="dashboard-action-icon"><Icon className="h-4 w-4" /></span><span>{label}</span><ArrowUpRight className="ms-auto h-4 w-4 opacity-45" /></button>)}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {kpis.map((kpi, index) => <Card key={kpi.label} className="dashboard-kpi"><CardContent className="p-5"><div className="flex items-start justify-between"><p className="dashboard-label">{kpi.label}</p><span className="dashboard-kpi-index">0{index + 1}</span></div>{isLoading ? <div className="mt-4 h-8 w-32 animate-pulse rounded bg-muted" /> : <p className="dashboard-kpi-value">{kpi.value}</p>}<p className="mt-2 text-xs text-muted-foreground">{kpi.note}{kpi.change !== undefined && <span className={kpi.change >= 0 ? 'ms-2 text-emerald-600' : 'ms-2 text-red-500'}>{kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change).toFixed(1)}%</span>}</p></CardContent></Card>)}
        </section>

        {dashboardSummary && <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><Factory className="h-4 w-4" /></span>{ar ? 'المشروعات والتكلفة' : 'Projects & cost'}<button onClick={() => navigate('/projects')} className="ms-auto text-xs text-primary hover:underline">{ar ? 'فتح' : 'Open'} <ArrowUpRight className="inline h-3 w-3" /></button></CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['العقود', dashboardSummary.projects_finance.contract_value], ['التكلفة', dashboardSummary.projects_finance.actual_cost], ['المستخلصات', dashboardSummary.projects_finance.claims_outstanding], ['الربح التقديري', dashboardSummary.projects_finance.profit_estimate]].map(([label, value]) => <div key={String(label)} className="dashboard-mini-stat"><span>{label}</span><strong>{formatCurrency(Number(value))}</strong></div>)}</div></CardContent></Card>
          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark cyan"><Factory className="h-4 w-4" /></span>{ar ? 'تشغيل المصنع' : 'Manufacturing flow'}<button onClick={() => navigate('/manufacturing')} className="ms-auto text-xs text-primary hover:underline">{ar ? 'فتح' : 'Open'} <ArrowUpRight className="inline h-3 w-3" /></button></CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['قيد التشغيل', dashboardSummary.manufacturing_summary.orders_in_progress], ['مكتملة', dashboardSummary.manufacturing_summary.completed_orders], ['التكلفة المخططة', formatCurrency(dashboardSummary.manufacturing_summary.planned_cost)], ['التكلفة الفعلية', formatCurrency(dashboardSummary.manufacturing_summary.actual_cost)]].map(([label, value]) => <div key={String(label)} className="dashboard-mini-stat"><span>{label}</span><strong>{value}</strong></div>)}</div></CardContent></Card>
        </section>}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="dashboard-data-card lg:col-span-2"><CardHeader><CardTitle><span className="dashboard-card-mark"><BarChart3 className="h-4 w-4" /></span>{ar ? 'حركة المبيعات' : 'Sales movement'}<span className="ms-auto text-xs font-normal text-muted-foreground">{ar ? 'آخر 30 يوم' : 'Last 30 days'}</span></CardTitle></CardHeader><CardContent><SalesTrendChart branchId={undefined} reportData={revenueReport} /></CardContent></Card>
          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><AlertTriangle className="h-4 w-4" /></span>{ar ? 'تنبيهات التشغيل' : 'Attention needed'}</CardTitle></CardHeader><CardContent><div className="space-y-3"><div className="dashboard-alert"><Boxes className="h-4 w-4 text-amber-600" /><span>{ar ? 'مراجعة الأصناف منخفضة المخزون' : 'Review low-stock products'}</span><ChevronLeft className="ms-auto h-4 w-4" /></div><div className="dashboard-alert"><FileText className="h-4 w-4 text-blue-600" /><span>{ar ? 'متابعة التقارير اليومية' : 'Review daily reports'}</span><ChevronLeft className="ms-auto h-4 w-4" /></div><div className="dashboard-alert"><Users className="h-4 w-4 text-violet-600" /><span>{ar ? 'متابعة العملاء الجدد' : 'Follow up new customers'}</span><ChevronLeft className="ms-auto h-4 w-4" /></div></div></CardContent></Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2"><Card className="dashboard-data-card"><CardHeader><CardTitle>{ar ? 'أداء الفئات' : 'Category performance'}</CardTitle></CardHeader><CardContent><CategoryPerformanceChart categories={revenueReport?.top_categories || []} /></CardContent></Card><Card className="dashboard-data-card"><CardHeader><CardTitle>{ar ? 'آخر العمليات' : 'Recent activity'}</CardTitle></CardHeader><CardContent><RecentTransactions transactions={recentTransactions} /></CardContent></Card></section>
        <section className="grid grid-cols-1 gap-4"><Card className="dashboard-data-card"><CardHeader><CardTitle>{ar ? 'الإيراد حسب الفرع' : 'Revenue by branch'}</CardTitle></CardHeader><CardContent><BranchRevenueChart branches={revenueReport?.branch_revenues || []} /></CardContent></Card></section>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
