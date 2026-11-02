import React, { useState } from 'react';
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
import { AlertTriangle, ArrowUpRight, BarChart3, Banknote, Boxes, CalendarCheck, CreditCard, Factory, FileText, Landmark, Package, Plus, Receipt, ShoppingCart, TrendingUp, Users, Wallet } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, enabledModules } = useAuth();
  const { currentBranch } = useApp();
  const { formatCurrency } = useRegionalSettings();
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const { revenueReport, dashboardMetrics, recentTransactions, isLoading, dashboardSummary, lowStockProducts, recentPurchases, treasuries, attendanceRecords, openCashierShifts, financialReport } = useDashboardData({ from, to });
  const ar = language === 'ar';
  const firstName = user?.email?.split('@')[0] || (ar ? 'المستخدم' : 'there');
  const summary = dashboardSummary;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const attendanceToday = attendanceRecords;
  const presentToday = attendanceToday.filter((record) => !['absent', 'غياب'].includes((record.status || '').toLowerCase()));
  const lateToday = attendanceToday.filter((record) => Number(record.late_minutes || 0) > 0 || (record.status || '').toLowerCase() === 'late');
  const currentlyWorking = attendanceToday.filter((record) => Boolean(record.check_in) && !record.check_out);
  const largestTreasury = [...treasuries].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
  const financial = financialReport?.summary;

  const actions = [
    { label: ar ? 'فاتورة بيع' : 'Sales invoice', icon: Receipt, route: '/sales' },
    { label: ar ? 'إضافة منتج' : 'New product', icon: Boxes, route: '/inventory' },
    { label: ar ? 'مصروف جديد' : 'New expense', icon: Wallet, route: '/finance' },
    { label: ar ? 'تقرير سريع' : 'Quick report', icon: BarChart3, route: '/reports' },
  ];

  const kpis = [
    { label: ar ? 'المستحق للموردين' : 'Due to suppliers', value: formatCurrency(Number(summary?.supplier_due || 0)), icon: CreditCard, note: ar ? 'إجمالي الرصيد المستحق' : 'Outstanding balance', color: 'text-rose-600' },
    { label: ar ? 'إجمالي العملاء' : 'Total customers', value: Number(summary?.customers_count || 0).toLocaleString(), icon: Users, note: ar ? 'عملاء المؤسسة' : 'Customers in this tenant', color: 'text-violet-600' },
    { label: ar ? 'المستحق من العملاء' : 'Due from customers', value: formatCurrency(Number(summary?.customer_due || 0)), icon: Wallet, note: ar ? 'إجمالي الرصيد المستحق' : 'Outstanding balance', color: 'text-amber-600' },
    { label: ar ? 'أكبر عميل في المبيعات' : 'Top customer by sales', value: summary?.top_customer?.name || (ar ? 'لا توجد بيانات' : 'No data'), icon: TrendingUp, note: formatCurrency(Number(summary?.top_customer?.total || 0)), color: 'text-blue-600' },
    { label: ar ? 'عدد الموظفين' : 'Employees', value: Number(summary?.employees_count || 0).toLocaleString(), icon: Users, note: ar ? 'الموظفون النشطون' : 'Active employees', color: 'text-cyan-700' },
    { label: ar ? 'المبيعات خلال الفترة' : 'Sales in selected period', value: formatCurrency(Number(summary?.month_sales ?? dashboardMetrics.totalRevenue)), icon: Receipt, note: `${from} — ${to}`, color: 'text-emerald-600' },
    { label: ar ? 'المشتريات خلال الفترة' : 'Purchases in selected period', value: formatCurrency(Number(summary?.month_purchases || 0)), icon: ShoppingCart, note: `${from} — ${to}`, color: 'text-indigo-600' },
    { label: ar ? 'صافي الربح خلال الفترة' : 'Net profit in period', value: formatCurrency(Number(summary?.net_profit ?? dashboardMetrics.netProfit)), icon: TrendingUp, note: ar ? 'بعد تكلفة البضاعة والإيرادات الأخرى والمصروفات' : 'After cost of goods, other income and expenses', color: Number(summary?.net_profit ?? dashboardMetrics.netProfit) >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: ar ? 'مصروفات اليوم' : "Today's expenses", value: formatCurrency(Number(summary?.daily_expenses || 0)), icon: Wallet, note: ar ? 'مصروفات اليوم فقط' : 'Today only', color: 'text-orange-600' },
    { label: ar ? 'منتجات قاربت على النفاد' : 'Low-stock products', value: Number(summary?.low_stock_count ?? dashboardMetrics.lowStockCount).toLocaleString(), icon: Package, note: ar ? 'عند حد إعادة الطلب أو أقل' : 'At or below reorder level', color: 'text-amber-600' },
  ];

  return (
    <MainLayout>
      <div className="dashboard-canvas space-y-6" dir={ar ? 'rtl' : 'ltr'}>
        <section className="dashboard-hero">
          <div>
            <p className="dashboard-eyebrow">{ar ? 'نظرة تشغيلية' : 'Operations overview'}</p>
            <h1>{ar ? `أهلًا ${firstName}` : `Good to see you, ${firstName}`}</h1>
            <p className="dashboard-muted">{currentBranch ? (ar ? `أنت تتابع ${currentBranch.name_ar || currentBranch.name}` : `Monitoring ${currentBranch.name}`) : (ar ? 'بيانات المؤسسة الحالية — كل الفروع' : 'Current tenant — all branches')}</p>
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

        <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div><label className="mb-1 block text-xs text-muted-foreground">{ar ? 'من تاريخ' : 'From'}</label><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-muted-foreground">{ar ? 'إلى تاريخ' : 'To'}</label><input type="date" value={to} min={from} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" /></div>
          <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { const d = new Date(); setFrom(d.toISOString().slice(0, 10)); setTo(d.toISOString().slice(0, 10)); }}>{ar ? 'اليوم' : 'Today'}</Button><Button type="button" variant="outline" onClick={() => { const d = new Date(); setFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)); setTo(d.toISOString().slice(0, 10)); }}>{ar ? 'هذا الشهر' : 'This month'}</Button></div>
          <p className="text-xs text-muted-foreground">{ar ? 'البيانات محصورة بمؤسستك الحالية' : 'Data is restricted to your current tenant'}</p>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map(({ label, value, icon: Icon, note, color }) => <Card key={label} className="dashboard-kpi"><CardContent className="flex min-h-28 items-start gap-3 p-4"><span className={`rounded-xl bg-muted p-3 ${color}`}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="dashboard-label">{label}</p>{isLoading ? <div className="mt-3 h-7 w-32 animate-pulse rounded bg-muted" /> : <p className="dashboard-kpi-value truncate text-xl" title={String(value)}>{value}</p>}<p className="mt-1 truncate text-xs text-muted-foreground" title={String(note)}>{note}</p></div></CardContent></Card>)}
        </section>

        <Card className="dashboard-data-card">
          <CardHeader><CardTitle><span className="dashboard-card-mark"><TrendingUp className="h-4 w-4" /></span>{ar ? 'تقرير الإيرادات والتكلفة والأرباح' : 'Revenue, cost & profit report'}<span className="ms-auto text-xs font-normal text-muted-foreground">{from} — {to}</span></CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {[
                [ar ? 'المبيعات / الإيراد' : 'Sales revenue', financial?.sales],
                [ar ? 'تكلفة البضاعة' : 'Cost of goods', financial?.sales_cost],
                [ar ? 'إجمالي الربح' : 'Gross profit', financial?.gross_profit],
                [ar ? 'إيرادات أخرى' : 'Other income', financial?.revenues],
                [ar ? 'المصروفات' : 'Expenses', financial?.expenses],
                [ar ? 'صافي الربح' : 'Net profit', financial?.net_profit],
              ].map(([label, value]) => <div key={String(label)} className="dashboard-mini-stat"><span>{label}</span><strong className={String(label).includes(ar ? 'الربح' : 'profit') && Number(value || 0) < 0 ? 'text-red-600' : ''}>{financial ? formatCurrency(Number(value || 0)) : '—'}</strong></div>)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3"><p className="text-xs text-muted-foreground">{ar ? 'التقرير للفترة المحددة أعلاه، ومحصور ببيانات المؤسسة الحالية.' : 'Report for the selected date range, restricted to the current tenant.'}</p><Button size="sm" variant="outline" onClick={() => navigate('/reports')}>{ar ? 'فتح التقارير' : 'Open reports'} <ArrowUpRight className="ms-1 h-3 w-3" /></Button></div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><ShoppingCart className="h-4 w-4" /></span>{ar ? 'آخر عمليات الشراء' : 'Latest purchases'}<span className="ms-auto text-xs font-normal text-muted-foreground">{ar ? 'إجمالي الفترة:' : 'Period total:'} {formatCurrency(Number(summary?.month_purchases || 0))}</span></CardTitle></CardHeader><CardContent>
            {recentPurchases.length ? <div className="space-y-2">{recentPurchases.slice(0, 5).map((purchase) => <div key={purchase.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate font-medium">{purchase.supplier?.name || (ar ? 'مورد غير محدد' : 'Unspecified supplier')}</p><p className="text-xs text-muted-foreground">{purchase.invoice_number} · {purchase.invoice_date || '—'}</p></div><strong className="shrink-0 text-sm">{formatCurrency(Number(purchase.total_amount || 0))}</strong></div>)}<Button variant="link" className="px-0" onClick={() => navigate('/purchasing')}>{ar ? 'عرض المشتريات' : 'View purchases'} <ArrowUpRight className="ms-1 h-3 w-3" /></Button></div> : <p className="py-4 text-sm text-muted-foreground">{ar ? 'لا توجد عمليات شراء حديثة' : 'No recent purchases'}</p>}
          </CardContent></Card>

          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><Landmark className="h-4 w-4" /></span>{ar ? 'تقرير الخزائن' : 'Treasury report'}<Button size="sm" variant="link" className="ms-auto" onClick={() => navigate('/finance')}>{ar ? 'المالية' : 'Finance'} <ArrowUpRight className="ms-1 h-3 w-3" /></Button></CardTitle></CardHeader><CardContent>
            {treasuries.length ? <div className="space-y-2">{[...treasuries].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0)).slice(0, 5).map((treasury, index) => <div key={treasury.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><div className="min-w-0"><p className="truncate font-medium">{treasury.name}</p><p className="text-xs text-muted-foreground">{treasury.currency || (ar ? 'العملة الافتراضية' : 'Default currency')}</p></div></div><strong className="shrink-0 text-sm">{formatCurrency(Number(treasury.balance || 0))}</strong></div>)}<p className="text-xs text-muted-foreground">{ar ? 'أعلى خزينة رصيدًا:' : 'Largest balance:'} {largestTreasury?.name || '—'} · {largestTreasury ? formatCurrency(Number(largestTreasury.balance || 0)) : formatCurrency(0)}</p></div> : <p className="py-4 text-sm text-muted-foreground">{ar ? 'لا توجد خزائن مسجلة' : 'No treasuries found'}</p>}
          </CardContent></Card>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><CalendarCheck className="h-4 w-4" /></span>{ar ? 'حضور الموظفين اليوم' : "Today's employee attendance"}<span className="ms-auto text-xs font-normal text-muted-foreground">{today}</span></CardTitle></CardHeader><CardContent>
            <div className="mb-3 grid grid-cols-3 gap-2">{[[ar ? 'سجلات الحضور' : 'Attendance records', attendanceToday.length], [ar ? 'حاضرون' : 'Present', presentToday.length], [ar ? 'لم يسجلوا انصرافًا' : 'Still checked in', currentlyWorking.length]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>
            <p className="mb-2 text-xs text-amber-700">{ar ? `حالات التأخير: ${lateToday.length}` : `Late arrivals: ${lateToday.length}`}</p>
            {attendanceToday.length ? <div className="space-y-2">{attendanceToday.slice(0, 6).map((record) => <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate font-medium">{record.employee?.name || (ar ? 'موظف' : 'Employee')}</p><p className="text-xs text-muted-foreground">{ar ? 'دخول' : 'In'}: {record.check_in || '—'} · {ar ? 'خروج' : 'Out'}: {record.check_out || (ar ? 'لم يسجل' : 'Not recorded')}</p></div><span className={`shrink-0 text-xs font-medium ${Number(record.late_minutes || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{Number(record.late_minutes || 0) > 0 ? (ar ? `متأخر ${record.late_minutes} د` : `Late ${record.late_minutes}m`) : (record.status || (ar ? 'حاضر' : 'Present'))}</span></div>)}</div> : <p className="py-4 text-sm text-muted-foreground">{ar ? 'لا توجد سجلات حضور لهذا اليوم' : 'No attendance records for today'}</p>}
          </CardContent></Card>

          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><Banknote className="h-4 w-4" /></span>{ar ? 'الورديات المفتوحة الآن' : 'Cashier shifts still open'}<span className="ms-auto rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{openCashierShifts.length}</span></CardTitle></CardHeader><CardContent>
            {openCashierShifts.length ? <div className="space-y-2">{openCashierShifts.map((shift) => <div key={shift.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><p className="font-medium">{shift.employee || (ar ? 'موظف غير محدد' : 'Unassigned cashier')}</p><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">{ar ? 'مفتوحة' : 'Open'}</span></div><p className="mt-1 text-xs text-muted-foreground">{ar ? 'بدأت:' : 'Opened:'} {shift.opened_at ? new Date(shift.opened_at).toLocaleString(ar ? 'ar' : 'en') : '—'} · {ar ? 'رصيد البداية:' : 'Opening balance:'} {formatCurrency(Number(shift.opening_balance || 0))}</p></div>)}</div> : <p className="py-4 text-sm text-muted-foreground">{ar ? 'لا توجد ورديات مفتوحة الآن' : 'No open shifts right now'}</p>}
          </CardContent></Card>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><AlertTriangle className="h-4 w-4" /></span>{ar ? 'منتجات قاربت على النفاد' : 'Products running low'}<span className="ms-auto text-xs font-normal text-muted-foreground">{Number(summary?.low_stock_count ?? lowStockProducts.length)} {ar ? 'منتج' : 'products'}</span></CardTitle></CardHeader><CardContent>
            {lowStockProducts.length ? <div className="space-y-2">{lowStockProducts.slice(0, 6).map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="flex min-w-0 items-center gap-2"><Package className="h-4 w-4 shrink-0 text-amber-600" /><span className="truncate font-medium">{ar ? (product.name_ar || product.name) : product.name}</span></div><span className="shrink-0 text-sm text-muted-foreground">{ar ? 'المخزون:' : 'Stock:'} {product.stock} / {ar ? 'حد الطلب:' : 'Reorder:'} {product.reorder_level || 5}</span></div>)}<Button variant="link" className="px-0" onClick={() => navigate('/inventory')}>{ar ? 'فتح المخزون' : 'Open inventory'} <ArrowUpRight className="ms-1 h-3 w-3" /></Button></div> : <p className="py-4 text-sm text-muted-foreground">{isLoading ? (ar ? 'جارٍ تحميل البيانات...' : 'Loading...') : (ar ? 'لا توجد منتجات منخفضة المخزون' : 'No low-stock products')}</p>}
          </CardContent></Card>
          <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><BarChart3 className="h-4 w-4" /></span>{ar ? 'حركة المبيعات' : 'Sales movement'}<span className="ms-auto text-xs font-normal text-muted-foreground">{ar ? 'آخر 30 يوم' : 'Last 30 days'}</span></CardTitle></CardHeader><CardContent><SalesTrendChart branchId={undefined} reportData={revenueReport} /></CardContent></Card>
        </section>

        {summary && <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {enabledModules.includes('projects') && <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark"><Factory className="h-4 w-4" /></span>{ar ? 'المشروعات والتكلفة' : 'Projects & cost'}<button onClick={() => navigate('/projects')} className="ms-auto text-xs text-primary hover:underline">{ar ? 'فتح' : 'Open'} <ArrowUpRight className="inline h-3 w-3" /></button></CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[[ar ? 'العقود' : 'Contracts', summary.projects_finance.contract_value], [ar ? 'التكلفة' : 'Cost', summary.projects_finance.actual_cost], [ar ? 'المستخلصات' : 'Outstanding claims', summary.projects_finance.claims_outstanding], [ar ? 'الربح التقديري' : 'Estimated profit', summary.projects_finance.profit_estimate]].map(([label, value]) => <div key={String(label)} className="dashboard-mini-stat"><span>{label}</span><strong>{formatCurrency(Number(value))}</strong></div>)}</div></CardContent></Card>}
          {enabledModules.includes('manufacturing') && <Card className="dashboard-data-card"><CardHeader><CardTitle><span className="dashboard-card-mark cyan"><Factory className="h-4 w-4" /></span>{ar ? 'تشغيل المصنع' : 'Manufacturing flow'}<button onClick={() => navigate('/manufacturing')} className="ms-auto text-xs text-primary hover:underline">{ar ? 'فتح' : 'Open'} <ArrowUpRight className="inline h-3 w-3" /></button></CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[[ar ? 'قيد التشغيل' : 'In progress', summary.manufacturing_summary.orders_in_progress], [ar ? 'مكتملة' : 'Completed', summary.manufacturing_summary.completed_orders], [ar ? 'المخطط' : 'Planned cost', formatCurrency(summary.manufacturing_summary.planned_cost)], [ar ? 'الفعلي' : 'Actual cost', formatCurrency(summary.manufacturing_summary.actual_cost)], [ar ? 'الهالك' : 'Scrap', summary.manufacturing_summary.scrapped_quantity || 0]].map(([label, value]) => <div key={String(label)} className="dashboard-mini-stat"><span>{label}</span><strong>{value}</strong></div>)}</div></CardContent></Card>}
        </section>}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2"><Card className="dashboard-data-card"><CardHeader><CardTitle>{ar ? 'أداء الفئات' : 'Category performance'}</CardTitle></CardHeader><CardContent><CategoryPerformanceChart categories={revenueReport?.top_categories || []} /></CardContent></Card><Card className="dashboard-data-card"><CardHeader><CardTitle>{ar ? 'آخر العمليات' : 'Recent activity'}</CardTitle></CardHeader><CardContent><RecentTransactions transactions={recentTransactions} /></CardContent></Card></section>
        <section className="grid grid-cols-1 gap-4"><Card className="dashboard-data-card"><CardHeader><CardTitle>{ar ? 'الإيراد حسب الفرع' : 'Revenue by branch'}</CardTitle></CardHeader><CardContent><BranchRevenueChart branches={revenueReport?.branch_revenues || []} /></CardContent></Card></section>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
