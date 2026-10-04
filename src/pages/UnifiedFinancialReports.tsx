import React, { useMemo, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, ShoppingCart, Wallet, Receipt, Users, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

type Summary = { sales:number; sales_cost:number; gross_profit:number; purchases:number; purchase_returns:number; expenses:number; revenues:number; net_profit:number; sales_count:number; purchase_count:number; expense_count:number; revenue_count:number; journal_count:number; employee_count:number };
type Report = { summary: Summary; breakdown: { sales:{regular:number;pos:number}; journal:{debit:number;credit:number} }; filters:{from:string;to:string;branch_id:number|null}; employees:Array<{id:number;name:string;branch_id:number|null}> };

export default function UnifiedFinancialReports() {
  const { language } = useLanguage();
  const { branches, userBranch } = useApp();
  const { user } = useAuth();
  const ar = language === 'ar';
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [branchId, setBranchId] = useState(user?.super_admin || String(user?.role || '').toLowerCase() === 'admin' ? 'all' : (userBranch?.id ? String(userBranch.id) : 'all'));
  const isAdmin = Boolean(user?.super_admin || String(user?.role || '').toLowerCase() === 'admin');
  const query = useQuery<Report>({
    queryKey: ['unified-financial-report', from, to, branchId],
    queryFn: async () => (await api.get('/reports/unified-financial', { params: { from, to, ...(branchId !== 'all' ? { branch_id: branchId } : {}) } })).data.data,
  });
  const data = query.data;
  const summary = data?.summary;
  const money = (value:number) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cards = useMemo(() => summary ? [
    { label: ar ? 'المبيعات' : 'Sales', value: summary.sales, icon: ShoppingCart, color: 'text-blue-600' },
    { label: ar ? 'تكلفة المبيعات' : 'Sales Cost', value: summary.sales_cost, icon: Receipt, color: 'text-orange-600' },
    { label: ar ? 'إجمالي الربح' : 'Gross Profit', value: summary.gross_profit, icon: TrendingUp, color: summary.gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: ar ? 'صافي الربح / الخسارة' : 'Net Profit / Loss', value: summary.net_profit, icon: summary.net_profit >= 0 ? TrendingUp : TrendingDown, color: summary.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { label: ar ? 'المصروفات' : 'Expenses', value: summary.expenses, icon: Wallet, color: 'text-red-600' },
    { label: ar ? 'الإيرادات الأخرى' : 'Other Revenues', value: summary.revenues, icon: TrendingUp, color: 'text-teal-600' },
  ] : [], [summary, ar]);
  const exportReport = () => {
    if (!summary) return;
    const rows = Object.entries(summary).map(([key, value]) => ({ metric: key, value }));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Financial Report');
    XLSX.writeFile(workbook, `financial-report-${from}-${to}.xlsx`);
  };
  return <MainLayout activeItem="unified-financial-reports"><div className="space-y-6 p-4 md:p-6" dir={ar ? 'rtl' : 'ltr'}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">{ar ? 'التقرير المالي الموحد' : 'Unified Financial Report'}</h1><p className="text-muted-foreground">{ar ? 'المبيعات والمشتريات والمصروفات والإيرادات والربح حسب الفرع والفترة' : 'Sales, purchases, expenses, revenues and profit by branch and period'}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />{ar ? 'تحديث' : 'Refresh'}</Button><Button variant="outline" onClick={exportReport} disabled={!summary}><Download className="me-2 h-4 w-4" />{ar ? 'تصدير' : 'Export'}</Button></div></div>
    <Card><CardContent className="grid gap-4 p-4 md:grid-cols-3"><div><Label>{ar ? 'من تاريخ' : 'From'}</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div><div><Label>{ar ? 'إلى تاريخ' : 'To'}</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div><div><Label>{ar ? 'الفرع' : 'Branch'}</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{isAdmin && <SelectItem value="all">{ar ? 'كل الفروع' : 'All branches'}</SelectItem>}{(isAdmin ? branches : (userBranch ? [userBranch] : branches)).map(branch => <SelectItem key={branch.id} value={String(branch.id)}>{ar ? branch.name_ar || branch.name : branch.name}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
    {query.isError && <Card className="border-red-300"><CardContent className="p-4 text-red-600">{ar ? 'تعذر تحميل التقرير. راجع صلاحيات الحساب والـAPI.' : 'Could not load the report. Check account permissions and the API.'}</CardContent></Card>}
    {summary && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(card => { const Icon = card.icon; return <Card key={card.label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{card.label}</p><p className={`mt-1 text-2xl font-bold ${card.color}`}>{money(card.value)}</p></div><Icon className={card.color} /></CardContent></Card>; })}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Card><CardHeader><CardTitle>{ar ? 'المشتريات والمرتجعات' : 'Purchases & Returns'}</CardTitle></CardHeader><CardContent className="space-y-3"><Row label={ar ? 'المشتريات' : 'Purchases'} value={summary.purchases} /><Row label={ar ? 'مرتجعات المشتريات' : 'Purchase returns'} value={summary.purchase_returns} /><Row label={ar ? 'عدد فواتير الشراء' : 'Purchase invoices'} value={summary.purchase_count} /></CardContent></Card><Card><CardHeader><CardTitle>{ar ? 'القيود والموظفون' : 'Journals & Employees'}</CardTitle></CardHeader><CardContent className="space-y-3"><Row label={ar ? 'مدين' : 'Debit'} value={data.breakdown.journal.debit} /><Row label={ar ? 'دائن' : 'Credit'} value={data.breakdown.journal.credit} /><Row label={ar ? 'عدد القيود' : 'Journal entries'} value={summary.journal_count} /><Row label={ar ? 'الموظفون' : 'Employees'} value={summary.employee_count} /></CardContent></Card><Card><CardHeader><CardTitle>{ar ? 'تفصيل المبيعات' : 'Sales Breakdown'}</CardTitle></CardHeader><CardContent className="space-y-3"><Row label={ar ? 'مبيعات عادية' : 'Regular sales'} value={data.breakdown.sales.regular} /><Row label="POS" value={data.breakdown.sales.pos} /><Row label={ar ? 'عدد المبيعات' : 'Sales count'} value={summary.sales_count} /></CardContent></Card></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{ar ? 'الموظفون في النطاق المحدد' : 'Employees in selected scope'} <Badge variant="secondary">{summary.employee_count}</Badge></CardTitle></CardHeader><CardContent><div className="grid gap-2 md:grid-cols-3">{data.employees.map(employee => <div className="rounded border p-3" key={employee.id}>{employee.name}</div>)}</div>{!data.employees.length && <p className="text-muted-foreground">{ar ? 'لا يوجد موظفون' : 'No employees found'}</p>}</CardContent></Card>
    </>}
    {query.isLoading && <Card><CardContent className="p-8 text-center">{ar ? 'جاري حساب التقرير...' : 'Calculating report...'}</CardContent></Card>}
  </div></MainLayout>;
}
function Row({ label, value }: { label:string; value:number }) { return <div className="flex items-center justify-between border-b pb-2"><span className="text-muted-foreground">{label}</span><strong>{Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>; }
