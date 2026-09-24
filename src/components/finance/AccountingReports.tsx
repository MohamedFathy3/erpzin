import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, FileBarChart2 } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';

type Props = { language: string };
type ReportLine = {
  id: number; code: string; name: string; name_ar?: string | null; account_type: string;
  level?: number; is_rollup?: boolean; period_debit?: number; period_credit?: number;
  debit_balance?: number; credit_balance?: number;
};
const money = (value: unknown) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = format(new Date(), 'yyyy-MM-dd');
const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

const AccountingReports = ({ language }: Props) => {
  const ar = language === 'ar';
  const { currentBranch } = useApp();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [ledgerAccountId, setLedgerAccountId] = useState('');
  const params = useMemo(() => ({ from: from || undefined, to: to || undefined, branch_id: currentBranch?.id || undefined }), [from, to, currentBranch?.id]);
  const query = (key: string, path: string) => useQuery({
    queryKey: ['accounting-report', key, params],
    queryFn: async () => (await api.get(path, { params })).data?.data,
    staleTime: 30_000,
  });
  const trial = query('trial-balance', '/accounting/reports/trial-balance');
  const income = query('income-statement', '/accounting/reports/income-statement');
  const balance = query('balance-sheet', '/accounting/reports/balance-sheet');
  const cash = query('cash-flow', '/accounting/reports/cash-flow');
  const accountList = useQuery({ queryKey: ['accounting-ledger-accounts'], queryFn: async () => (await api.get('/accounts/flat/tree')).data?.data || [] });
  const ledger = useQuery({
    queryKey: ['accounting-ledger', ledgerAccountId, params],
    queryFn: async () => (await api.get(`/accounting/accounts/${ledgerAccountId}/ledger`, { params })).data?.data,
    enabled: Boolean(ledgerAccountId),
  });
  const allQueries = [trial, income, balance, cash];
  const loading = allQueries.some(q => q.isLoading);
  const failed = allQueries.some(q => q.isError);
  const refresh = () => Promise.all(allQueries.map(q => q.refetch()));

  const AccountTable = ({ rows, kind }: { rows: ReportLine[]; kind: 'trial' | 'statement' }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>{ar ? 'كود الحساب' : 'Account code'}</TableHead>
          <TableHead>{ar ? 'الحساب' : 'Account'}</TableHead>
          {kind === 'trial' ? <>
            <TableHead className="text-end">{ar ? 'حركة مدين' : 'Period debit'}</TableHead>
            <TableHead className="text-end">{ar ? 'حركة دائن' : 'Period credit'}</TableHead>
            <TableHead className="text-end">{ar ? 'رصيد مدين' : 'Debit balance'}</TableHead>
            <TableHead className="text-end">{ar ? 'رصيد دائن' : 'Credit balance'}</TableHead>
          </> : <>
            <TableHead className="text-end">{ar ? 'مدين' : 'Debit'}</TableHead>
            <TableHead className="text-end">{ar ? 'دائن' : 'Credit'}</TableHead>
          </>}
        </TableRow></TableHeader>
        <TableBody>
          {rows.map(row => <TableRow key={row.id} className={row.is_rollup ? 'bg-muted/40 font-semibold' : ''}>
            <TableCell className="font-mono">{row.code}</TableCell>
            <TableCell><span style={{ paddingInlineStart: `${Math.min(row.level || 0, 8) * 16}px` }}>{ar ? row.name_ar || row.name : row.name}</span>{row.is_rollup && <span className="ms-2 text-xs text-muted-foreground">{ar ? '(إجمالي فرعي)' : '(roll-up)'}</span>}</TableCell>
            <TableCell className="text-end">{money(row.period_debit)}</TableCell>
            <TableCell className="text-end">{money(row.period_credit)}</TableCell>
            {kind === 'trial' && <>
              <TableCell className="text-end">{money(row.debit_balance)}</TableCell>
              <TableCell className="text-end">{money(row.credit_balance)}</TableCell>
            </>}
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={kind === 'trial' ? 6 : 4} className="py-8 text-center text-muted-foreground">{ar ? 'لا توجد حركات مرحّلة في هذه الفترة' : 'No posted activity in this period'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );

  const Metric = ({ label, value }: { label: string; value: unknown }) => <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-bold">{money(value)}</div></div>;

  return <div className="space-y-5" dir={ar ? 'rtl' : 'ltr'}>
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2"><FileBarChart2 className="h-5 w-5 text-primary"/><div><h2 className="font-semibold">{ar ? 'التقارير المالية من دفتر الأستاذ' : 'Financial reports from the general ledger'}</h2><p className="text-sm text-muted-foreground">{ar ? 'تعرض التقارير القيود المرحلة فقط وتجمع أرصدة الحسابات الأب من الحسابات التابعة دون مضاعفة الإجماليات.' : 'Reports use posted journal entries. Parent accounts roll up child balances without double-counting totals.'}</p></div></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">{ar ? 'من تاريخ' : 'From'}<input type="date" className="h-9 rounded-md border bg-background px-2 text-sm text-foreground" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-muted-foreground">{ar ? 'إلى تاريخ' : 'To'}<input type="date" className="h-9 rounded-md border bg-background px-2 text-sm text-foreground" value={to} onChange={e => setTo(e.target.value)} /></label>
        {currentBranch && <span className="pb-2 text-xs text-muted-foreground">{ar ? `الفرع: ${currentBranch.name}` : `Branch: ${currentBranch.name}`}</span>}
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="me-2 h-4 w-4"/>{ar ? 'تحديث' : 'Refresh'}</Button>
      </div>
    </div>
    {failed && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>{ar ? 'تعذر تحميل تقرير أو أكثر' : 'One or more reports could not be loaded'}</AlertTitle><AlertDescription>{ar ? 'تحقق من صلاحية التقارير المحاسبية والاتصال بالـAPI ثم أعد المحاولة.' : 'Check report permissions and API connectivity, then retry.'}</AlertDescription></Alert>}
    {loading ? <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28"/><Skeleton className="h-28"/><Skeleton className="h-28"/></div> :
      <Tabs defaultValue="trial" dir={ar ? 'rtl' : 'ltr'}>
        <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="trial">{ar ? 'ميزان المراجعة' : 'Trial balance'}</TabsTrigger>
          <TabsTrigger value="income">{ar ? 'قائمة الدخل' : 'Income statement'}</TabsTrigger>
          <TabsTrigger value="balance">{ar ? 'الميزانية العمومية' : 'Balance sheet'}</TabsTrigger>
          <TabsTrigger value="cash">{ar ? 'التدفقات النقدية' : 'Cash flow'}</TabsTrigger>
          <TabsTrigger value="ledger">{ar ? 'كشف الأستاذ' : 'General ledger'}</TabsTrigger>
        </TabsList>
        <TabsContent value="trial"><Card><CardHeader><CardTitle>{ar ? 'ميزان المراجعة — حسب الفترة والفرع' : 'Trial balance — period and branch'}</CardTitle></CardHeader><CardContent><AccountTable rows={(trial.data?.accounts || []) as ReportLine[]} kind="trial"/><div className="mt-4 flex flex-wrap justify-between gap-3 border-t pt-4 font-bold"><span>{ar ? 'إجمالي الحركات (بدون تكرار تجميع الأب)' : 'Movement totals (parents excluded)'}</span><span>{ar ? 'مدين' : 'Debit'}: {money(trial.data?.totals?.debit)} / {ar ? 'دائن' : 'Credit'}: {money(trial.data?.totals?.credit)} / {ar ? 'الفرق' : 'Difference'}: {money(trial.data?.totals?.difference)}</span></div></CardContent></Card></TabsContent>
        <TabsContent value="income"><Card><CardHeader><CardTitle>{ar ? 'قائمة الدخل والأرباح والخسائر' : 'Income statement'}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Metric label={ar ? 'الإيرادات' : 'Revenue'} value={income.data?.revenue}/><Metric label={ar ? 'المصروفات' : 'Expenses'} value={income.data?.expenses}/><Metric label={ar ? 'صافي الربح / (الخسارة)' : 'Net profit / (loss)'} value={income.data?.net_profit}/></div><AccountTable rows={(income.data?.lines || []) as ReportLine[]} kind="statement"/></CardContent></Card></TabsContent>
        <TabsContent value="balance"><Card><CardHeader><CardTitle>{ar ? 'الميزانية العمومية' : 'Balance sheet'}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Metric label={ar ? 'الأصول' : 'Assets'} value={balance.data?.assets}/><Metric label={ar ? 'الالتزامات' : 'Liabilities'} value={balance.data?.liabilities}/><Metric label={ar ? 'حقوق الملكية' : 'Equity'} value={balance.data?.equity}/></div><AccountTable rows={(balance.data?.lines || []) as ReportLine[]} kind="statement"/></CardContent></Card></TabsContent>
        <TabsContent value="cash"><Card><CardHeader><CardTitle>{ar ? 'التدفقات النقدية' : 'Cash flow'}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Metric label={ar ? 'التدفقات الداخلة' : 'Inflows'} value={cash.data?.inflows}/><Metric label={ar ? 'التدفقات الخارجة' : 'Outflows'} value={cash.data?.outflows}/><Metric label={ar ? 'صافي التدفق النقدي' : 'Net cash flow'} value={cash.data?.net}/></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead><TableHead className="text-end">{ar ? 'داخل' : 'Inflows'}</TableHead><TableHead className="text-end">{ar ? 'خارج' : 'Outflows'}</TableHead></TableRow></TableHeader><TableBody>{(cash.data?.rows || []).map((row: any, index: number) => <TableRow key={`${row.date}-${index}`}><TableCell>{row.date}</TableCell><TableCell className="text-end">{money(row.inflow)}</TableCell><TableCell className="text-end">{money(row.outflow)}</TableCell></TableRow>)}{!(cash.data?.rows || []).length && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">{ar ? 'لا توجد حركات نقدية في هذه الفترة' : 'No cash movements in this period'}</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card></TabsContent>
        <TabsContent value="ledger"><Card><CardHeader><CardTitle>{ar ? 'كشف حساب الأستاذ العام' : 'General ledger account statement'}</CardTitle></CardHeader><CardContent className="space-y-4"><label className="grid max-w-xl gap-1 text-sm">{ar ? 'الحساب' : 'Account'}<select className="h-10 rounded-md border bg-background px-3" value={ledgerAccountId} onChange={e => setLedgerAccountId(e.target.value)}><option value="">{ar ? 'اختر الحساب' : 'Select an account'}</option>{(accountList.data || []).map((a: any) => <option key={a.id} value={a.id}>{a.code} — {ar ? a.name_ar || a.name : a.full_path || a.name}</option>)}</select></label>{ledgerAccountId && (ledger.isLoading ? <Skeleton className="h-40"/> : ledger.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertDescription>{ar ? 'تعذر تحميل كشف الحساب' : 'Unable to load the ledger statement'}</AlertDescription></Alert> : <><div className="flex flex-wrap gap-5 text-sm font-semibold"><span>{ar ? 'الرصيد الافتتاحي' : 'Opening balance'}: {money(ledger.data?.opening_balance)}</span><span>{ar ? 'الرصيد الختامي' : 'Closing balance'}: {money(ledger.data?.balance)}</span></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead><TableHead>{ar ? 'رقم القيد' : 'Entry no.'}</TableHead><TableHead>{ar ? 'البيان' : 'Description'}</TableHead><TableHead className="text-end">{ar ? 'مدين' : 'Debit'}</TableHead><TableHead className="text-end">{ar ? 'دائن' : 'Credit'}</TableHead><TableHead className="text-end">{ar ? 'الرصيد' : 'Balance'}</TableHead></TableRow></TableHeader><TableBody>{(ledger.data?.rows || []).map((row: any) => <TableRow key={`${row.id}-${row.entry_number}`}><TableCell>{row.entry_date}</TableCell><TableCell>{row.entry_number}</TableCell><TableCell>{ar ? row.description_ar || row.description_en : row.description_en || row.description_ar}</TableCell><TableCell className="text-end">{money(row.debit)}</TableCell><TableCell className="text-end">{money(row.credit)}</TableCell><TableCell className="text-end">{money(row.balance)}</TableCell></TableRow>)}{!(ledger.data?.rows || []).length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{ar ? 'لا توجد حركات مرحّلة على الحساب في هذه الفترة' : 'No posted account activity in this period'}</TableCell></TableRow>}</TableBody></Table></div></>)}</CardContent></Card></TabsContent>
      </Tabs>}
  </div>;
};
export default AccountingReports;
