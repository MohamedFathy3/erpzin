/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CalendarDays, Download, Package, Receipt, Scissors, ShoppingCart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

type Row = { date: string; type: string; label: string; revenue: number; cost: number; profit: number; count: number };
const n = (value: any) => Number(value || 0);
const dateOf = (value: any) => String(value || '').slice(0, 10);
const unwrap = (response: any) => response?.data?.data?.data || response?.data?.data || response?.data || [];

const DailyReportsDashboard: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [to, setTo] = useState(today);
  const [kind, setKind] = useState('all');
  const [activeSection, setActiveSection] = useState('overview');
  const arMode = language === 'ar';
  const text = (arText: string, enText: string) => arMode ? arText : enText;

  const query = useQuery({
    queryKey: ['daily-reports-dashboard', from, to],
    queryFn: async () => {
      const range = { date_from: `${from} 00:00:00`, date_to: `${to} 23:59:59`, paginate: false, perPage: 2000 };
      const [sales, pos, purchases, expenses, revenues, products, services, payrolls] = await Promise.all([
        api.post('/sales-invoices/index', range),
        api.post('/invoices/index', range),
        api.post('/purchases-invoices/index', range),
        api.post('/finance/index', { date_from: from, date_to: to }),
        api.post('/revenue/index', { date_from: from, date_to: to }),
        api.post('/product/index', { paginate: false, perPage: 5000 }),
        api.get('/automotive/reports/profitability', { params: { from, to } }).catch(() => ({ data: { data: { details: [] } } })),
        api.get('/employee-financial-reports', { params: { from, to } }).catch(() => ({ data: { data: { payrolls: [] } } })),
      ]);
      return {
        sales: unwrap(sales), pos: unwrap(pos), purchases: unwrap(purchases), expenses: unwrap(expenses), revenues: unwrap(revenues), products: unwrap(products),
        services: services.data?.data?.details || [], payrolls: payrolls.data?.data?.payrolls || [],
      };
    },
  });

  const data = query.data || { sales: [], pos: [], purchases: [], expenses: [], revenues: [], products: [], services: [], payrolls: [] };
  const productCosts = useMemo(() => new Map(data.products.map((p: any) => [String(p.id), n(p.cost)])), [data.products]);
  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];
    const add = (row: Row) => result.push({ ...row, revenue: n(row.revenue), cost: n(row.cost), profit: n(row.revenue) - n(row.cost) });
    data.sales.forEach((invoice: any) => (invoice.items || []).forEach((item: any) => { const revenue = n(item.total) || n(item.quantity) * n(item.price); const cost = n(item.quantity) * n(productCosts.get(String(item.product_id))); add({ date: dateOf(invoice.created_at || invoice.invoice_date), type: 'sale', label: item.product_name || text('منتج', 'Product'), revenue, cost, profit: revenue - cost, count: 1 }); }));
    data.pos.forEach((invoice: any) => (invoice.items || []).forEach((item: any) => { const revenue = n(item.total) || n(item.quantity) * n(item.price); const cost = n(item.quantity) * n(productCosts.get(String(item.product_id))); add({ date: dateOf(invoice.created_at), type: 'sale', label: item.product_name || text('منتج', 'Product'), revenue, cost, profit: revenue - cost, count: 1 }); }));
    data.purchases.forEach((invoice: any) => add({ date: dateOf(invoice.invoice_date || invoice.created_at), type: 'purchase', label: text('مشتريات', 'Purchases'), revenue: 0, cost: n(invoice.total_amount), profit: -n(invoice.total_amount), count: 1 }));
    data.expenses.forEach((item: any) => add({ date: dateOf(item.date || item.created_at), type: 'expense', label: item.category || text('مصروف', 'Expense'), revenue: 0, cost: n(item.amount), profit: -n(item.amount), count: 1 }));
    data.revenues.forEach((item: any) => add({ date: dateOf(item.date || item.created_at), type: 'revenue', label: item.category || text('إيراد', 'Revenue'), revenue: n(item.amount), cost: 0, profit: n(item.amount), count: 1 }));
    data.services.forEach((item: any) => add({ date: dateOf(item.created_at), type: 'service', label: item.service || text('خدمة', 'Service'), revenue: n(item.revenue), cost: n(item.unit_cost) * n(item.quantity), profit: n(item.profit), count: 1 }));
    data.payrolls.forEach((item: any) => add({ date: dateOf(item.paid_at || item.period_end), type: 'payroll', label: item.employee?.name || text('راتب', 'Payroll'), revenue: 0, cost: n(item.net_salary), profit: -n(item.net_salary), count: 1 }));
    return result.filter((row) => row.date >= from && row.date <= to && (kind === 'all' || row.type === kind));
  }, [data, from, to, kind, productCosts, arMode]);

  const totals = useMemo(() => rows.reduce((sum, row) => ({ revenue: sum.revenue + row.revenue, cost: sum.cost + row.cost, profit: sum.profit + row.profit, count: sum.count + row.count }), { revenue: 0, cost: 0, profit: 0, count: 0 }), [rows]);
  const chart = useMemo(() => Array.from(new Set(rows.map((r) => r.date))).sort().map((date) => { const day = rows.filter((r) => r.date === date); return { date: date.slice(5), revenue: day.reduce((s, r) => s + r.revenue, 0), cost: day.reduce((s, r) => s + r.cost, 0), profit: day.reduce((s, r) => s + r.profit, 0) }; }), [rows]);
  const exportRows = () => { const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({ [text('التاريخ', 'Date')]: r.date, [text('النوع', 'Type')]: r.type, [text('البيان', 'Description')]: r.label, [text('الإيراد', 'Revenue')]: r.revenue, [text('التكلفة', 'Cost')]: r.cost, [text('الربح', 'Profit')]: r.profit }))); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, text('التقرير اليومي', 'Daily Report')); XLSX.writeFile(book, `daily-report-${from}-${to}.xlsx`); };
  const label = (type: string) => ({ sale: text('مبيعات', 'Sales'), purchase: text('مشتريات', 'Purchases'), expense: text('مصروفات', 'Expenses'), revenue: text('إيرادات', 'Revenue'), payroll: text('مرتبات', 'Payroll'), service: text('خدمات', 'Services') } as Record<string, string>)[type] || type;
  const filters = [{ value: 'all', label: text('الكل', 'All') }, { value: 'sale', label: text('المبيعات', 'Sales') }, { value: 'purchase', label: text('المشتريات', 'Purchases') }, { value: 'expense', label: text('المصروفات', 'Expenses') }, { value: 'revenue', label: text('الإيرادات', 'Revenue') }, { value: 'payroll', label: text('المرتبات', 'Payroll') }, { value: 'service', label: text('الخدمات', 'Services') }];

  return <div className="space-y-5">
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5"><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><CalendarDays className="text-primary" size={20} />{text('التقرير اليومي الشامل', 'Daily Business Report')}</CardTitle><p className="text-sm text-muted-foreground mt-1">{text('مبيعات ومشتريات ومصروفات وإيرادات ومرتبات وتكلفة المنتجات والخدمات', 'Sales, purchases, expenses, revenue, payroll, product and service costs')}</p></div><Button variant="outline" onClick={exportRows} className="gap-2"><Download size={16} />{text('تصدير Excel', 'Export Excel')}</Button></div></CardHeader><CardContent><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="text-xs text-muted-foreground">{text('من تاريخ', 'From')}</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div><label className="text-xs text-muted-foreground">{text('إلى تاريخ', 'To')}</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div><div><label className="text-xs text-muted-foreground">{text('نوع الحركة', 'Transaction type')}</label><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{filters.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div></div></CardContent></Card>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[[text('الإيرادات', 'Revenue'), totals.revenue, TrendingUp, 'text-emerald-600'], [text('التكلفة', 'Cost'), totals.cost, ShoppingCart, 'text-amber-600'], [text('صافي النتيجة', 'Net result'), totals.profit, Activity, totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600'], [text('عدد الحركات', 'Transactions'), totals.count, Receipt, 'text-blue-600'], [text('الخدمات', 'Services'), rows.filter((r) => r.type === 'service').length, Scissors, 'text-violet-600']].map(([title, value, Icon, color]: any) => <Card key={String(title)}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><p className="text-xl font-bold mt-1">{typeof value === 'number' && title !== text('عدد الحركات', 'Transactions') && title !== text('الخدمات', 'Services') ? formatCurrency(value) : value}</p></div><Icon size={22} className={color} /></div></CardContent></Card>)}</div>
    <Tabs value={activeSection} onValueChange={setActiveSection}><TabsList><TabsTrigger value="overview" className="gap-2"><Activity size={15} />{text('ملخص ورسوم', 'Summary & charts')}</TabsTrigger><TabsTrigger value="details" className="gap-2"><Package size={15} />{text('التفاصيل اليومية', 'Daily details')}</TabsTrigger></TabsList><TabsContent value="overview" className="space-y-4"><Card><CardHeader><CardTitle className="text-base">{text('الإيراد والتكلفة والنتيجة حسب اليوم', 'Revenue, cost and result by day')}</CardTitle></CardHeader><CardContent><div className="h-[320px]">{chart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Legend /><Bar dataKey="revenue" name={text('الإيراد', 'Revenue')} fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="cost" name={text('التكلفة', 'Cost')} fill="#f59e0b" radius={[4, 4, 0, 0]} /><Bar dataKey="profit" name={text('النتيجة', 'Result')} fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-muted-foreground">{text('لا توجد بيانات في الفترة المحددة', 'No data for this period')}</div>}</div></CardContent></Card></TabsContent><TabsContent value="details"><Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{text('التاريخ', 'Date')}</TableHead><TableHead>{text('النوع', 'Type')}</TableHead><TableHead>{text('البيان', 'Description')}</TableHead><TableHead className="text-end">{text('الإيراد', 'Revenue')}</TableHead><TableHead className="text-end">{text('التكلفة', 'Cost')}</TableHead><TableHead className="text-end">{text('الربح/الخسارة', 'Profit/Loss')}</TableHead></TableRow></TableHeader><TableBody>{rows.length ? rows.map((row, index) => <TableRow key={`${row.date}-${row.type}-${index}`}><TableCell>{row.date}</TableCell><TableCell><Badge variant="outline">{label(row.type)}</Badge></TableCell><TableCell className="font-medium">{row.label}</TableCell><TableCell className="text-end">{formatCurrency(row.revenue)}</TableCell><TableCell className="text-end">{formatCurrency(row.cost)}</TableCell><TableCell className={`text-end font-semibold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(row.profit)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">{text('لا توجد بيانات', 'No data')}</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card></TabsContent></Tabs>
    {query.isFetching && <p className="text-xs text-muted-foreground text-center">{text('جاري تحديث البيانات...', 'Updating data...')}</p>}
  </div>;
};
export default DailyReportsDashboard;
