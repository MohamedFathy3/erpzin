import { useMemo, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw, Receipt, ShoppingBag, TrendingDown, TrendingUp, UserRound, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Invoice { id: number; invoice_number?: string; invoice_date?: string; created_at?: string; total_amount?: number; net_total?: number; paid_amount?: number; status?: string; customer?: { name?: string; name_ar?: string }; }
interface Period { period: string; invoice_count: number; sales_total: number; commission: number; }
interface DashboardData { representative: { name?: string; commission_rate?: number }; summary: { invoice_count: number; sales_total: number; paid_total: number; returns_total: number; net_sales: number; commission_rate: number; commission_total: number }; periods: Period[]; invoices: Invoice[]; returns: { id: number; total_amount?: number; created_at?: string }[]; }
const money = (value: number | undefined) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RepresentativeDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const query = useQuery<DashboardData>({
    queryKey: ['representative-dashboard', from, to],
    queryFn: async () => (await api.get('/sales-representative/dashboard', { params: { from: from || undefined, to: to || undefined } })).data.data,
  });
  const data = query.data;
  const invoices = useMemo(() => (data?.invoices || []).filter(invoice => `${invoice.invoice_number || ''} ${invoice.customer?.name || ''} ${invoice.customer?.name_ar || ''}`.toLowerCase().includes(search.toLowerCase())), [data?.invoices, search]);
  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') : '-';

  return <MainLayout>
    <div className="space-y-5 p-1" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="rounded-2xl bg-gradient-to-l from-emerald-900 via-teal-800 to-cyan-700 p-5 text-white shadow-lg sm:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-sm text-emerald-100">{isArabic ? 'مساحة المندوب' : 'Representative workspace'}</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{isArabic ? `أهلاً ${user?.name || data?.representative?.name || ''}` : `Welcome ${user?.name || data?.representative?.name || ''}`}</h1><p className="mt-2 text-sm text-emerald-50">{isArabic ? 'فواتيرك وأداؤك وعمولاتك في مكان واحد.' : 'Your invoices, performance and commissions in one place.'}</p></div><UserRound className="hidden h-14 w-14 text-cyan-200 sm:block" /></div></div>
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-[120px_120px_minmax(0,1fr)_auto] md:items-end"><div><label className="text-sm font-medium">{isArabic ? 'من' : 'From'}</label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div><div><label className="text-sm font-medium">{isArabic ? 'إلى' : 'To'}</label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isArabic ? 'ابحث برقم الفاتورة أو العميل' : 'Search invoice or customer'} /><Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} /><span className="ms-2">{isArabic ? 'تحديث' : 'Refresh'}</span></Button></CardContent></Card>
      {query.isError ? <Card><CardContent className="py-8 text-center text-destructive">{isArabic ? 'تعذر تحميل تقرير المندوب. تأكد من تشغيل migration وتسجيل الدخول من شاشة المندوب.' : 'Could not load the representative report. Run the migration and sign in from the representative login.'}</CardContent></Card> : <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<Receipt />} title={isArabic ? 'عدد الفواتير' : 'Invoices'} value={data?.summary.invoice_count || 0} /><Metric icon={<TrendingUp />} title={isArabic ? 'صافي المبيعات' : 'Net sales'} value={money(data?.summary.net_sales)} /><Metric icon={<TrendingDown />} title={isArabic ? 'المرتجعات' : 'Returns'} value={money(data?.summary.returns_total)} /><Metric icon={<Wallet />} title={isArabic ? 'العمولة' : 'Commission'} value={`${money(data?.summary.commission_total)} (${data?.summary.commission_rate || 0}%)`} /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<ShoppingBag />} title={isArabic ? 'إجمالي المبيعات' : 'Sales total'} value={money(data?.summary.sales_total)} /><Metric icon={<Wallet />} title={isArabic ? 'المحصل' : 'Collected'} value={money(data?.summary.paid_total)} /><Metric icon={<Receipt />} title={isArabic ? 'عدد المرتجعات' : 'Return count'} value={data?.returns?.length || 0} /><Metric icon={<TrendingUp />} title={isArabic ? 'نسبة العمولة' : 'Commission rate'} value={`${data?.summary.commission_rate || 0}%`} /></div>
      <Card><CardHeader><CardTitle>{isArabic ? 'الأداء الشهري' : 'Monthly performance'}</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3 text-start">{isArabic ? 'الفترة' : 'Period'}</th><th className="p-3 text-start">{isArabic ? 'الفواتير' : 'Invoices'}</th><th className="p-3 text-start">{isArabic ? 'المبيعات' : 'Sales'}</th><th className="p-3 text-start">{isArabic ? 'العمولة' : 'Commission'}</th></tr></thead><tbody>{(data?.periods || []).map(period => <tr key={period.period} className="border-b last:border-0"><td className="p-3">{period.period}</td><td className="p-3">{period.invoice_count}</td><td className="p-3">{money(period.sales_total)}</td><td className="p-3">{money(period.commission)}</td></tr>)}</tbody></table></div></CardContent></Card>
      <Card><CardHeader><CardTitle>{isArabic ? 'فواتيري' : 'My invoices'}</CardTitle></CardHeader><CardContent>{query.isLoading ? <p className="py-8 text-center">{isArabic ? 'جاري التحميل...' : 'Loading...'}</p> : !invoices.length ? <p className="py-8 text-center text-muted-foreground">{isArabic ? 'لا توجد فواتير في الفترة المحددة' : 'No invoices found for the selected period'}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3 text-start">{isArabic ? 'التاريخ' : 'Date'}</th><th className="p-3 text-start">{isArabic ? 'الفاتورة' : 'Invoice'}</th><th className="p-3 text-start">{isArabic ? 'العميل' : 'Customer'}</th><th className="p-3 text-start">{isArabic ? 'الإجمالي' : 'Total'}</th><th className="p-3 text-start">{isArabic ? 'الحالة' : 'Status'}</th></tr></thead><tbody>{invoices.map(invoice => <tr key={invoice.id} className="border-b last:border-0"><td className="p-3">{formatDate(invoice.invoice_date || invoice.created_at)}</td><td className="p-3 font-medium">{invoice.invoice_number || invoice.id}</td><td className="p-3">{isArabic ? invoice.customer?.name_ar || invoice.customer?.name || '-' : invoice.customer?.name || '-'}</td><td className="p-3">{money(invoice.net_total ?? invoice.total_amount)}</td><td className="p-3"><Badge variant="outline">{invoice.status || '-'}</Badge></td></tr>)}</tbody></table></div>}</CardContent></Card></>}
    </div>
  </MainLayout>;
}
function Metric({ icon, title, value }: { icon: React.ReactNode; title: string; value: string | number }) { return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div><div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-xl font-bold">{value}</p></div></CardContent></Card>; }
