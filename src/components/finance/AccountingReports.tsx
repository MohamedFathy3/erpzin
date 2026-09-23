import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type Props = { language: string };
const money = (value: unknown) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const AccountingReports = ({ language }: Props) => {
  const ar = language === 'ar';
  const query = (path: string) => useQuery({ queryKey: ['accounting-report', path], queryFn: async () => (await api.get(path)).data?.data });
  const trial = query('/accounting/reports/trial-balance');
  const income = query('/accounting/reports/income-statement');
  const balance = query('/accounting/reports/balance-sheet');
  const cash = query('/accounting/reports/cash-flow');
  const loading = [trial, income, balance, cash].some(q => q.isLoading);
  if (loading) return <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28"/><Skeleton className="h-28"/><Skeleton className="h-28"/></div>;
  return <Tabs defaultValue="trial" dir={ar ? 'rtl' : 'ltr'}>
    <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="trial">{ar ? 'ميزان المراجعة' : 'Trial balance'}</TabsTrigger><TabsTrigger value="income">{ar ? 'قائمة الدخل' : 'Income statement'}</TabsTrigger><TabsTrigger value="balance">{ar ? 'الميزانية' : 'Balance sheet'}</TabsTrigger><TabsTrigger value="cash">{ar ? 'التدفقات النقدية' : 'Cash flow'}</TabsTrigger></TabsList>
    <TabsContent value="trial"><Card><CardHeader><CardTitle>{ar ? 'ميزان المراجعة — القيود المرحّلة فقط' : 'Trial balance — posted entries only'}</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{ar?'الكود':'Code'}</TableHead><TableHead>{ar?'الحساب':'Account'}</TableHead><TableHead>{ar?'مدين':'Debit'}</TableHead><TableHead>{ar?'دائن':'Credit'}</TableHead></TableRow></TableHeader><TableBody>{(trial.data?.accounts || []).map((row:any)=><TableRow key={row.id}><TableCell>{row.code}</TableCell><TableCell>{ar ? row.name_ar || row.name : row.name}</TableCell><TableCell>{money(row.period_debit)}</TableCell><TableCell>{money(row.period_credit)}</TableCell></TableRow>)}</TableBody></Table><div className="mt-4 flex justify-between font-bold"><span>{ar?'الإجمالي':'Total'}</span><span>{money(trial.data?.totals?.debit)} / {money(trial.data?.totals?.credit)}</span></div></CardContent></Card></TabsContent>
    <TabsContent value="income"><Card><CardHeader><CardTitle>{ar?'قائمة الدخل والأرباح والخسائر':'Income statement'}</CardTitle></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><div className="text-muted-foreground">{ar?'الإيرادات':'Revenue'}</div><div className="text-2xl font-bold">{money(income.data?.revenue)}</div></CardContent></Card><Card><CardContent className="p-5"><div className="text-muted-foreground">{ar?'المصروفات':'Expenses'}</div><div className="text-2xl font-bold">{money(income.data?.expenses)}</div></CardContent></Card><Card><CardContent className="p-5"><div className="text-muted-foreground">{ar?'صافي الربح':'Net profit'}</div><div className="text-2xl font-bold">{money(income.data?.net_profit)}</div></CardContent></Card></div></CardContent></Card></TabsContent>
    <TabsContent value="balance"><Card><CardHeader><CardTitle>{ar?'الميزانية العمومية':'Balance sheet'}</CardTitle></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3"><div className="rounded-lg border p-5"><div>{ar?'الأصول':'Assets'}</div><strong>{money(balance.data?.assets)}</strong></div><div className="rounded-lg border p-5"><div>{ar?'الالتزامات':'Liabilities'}</div><strong>{money(balance.data?.liabilities)}</strong></div><div className="rounded-lg border p-5"><div>{ar?'حقوق الملكية':'Equity'}</div><strong>{money(balance.data?.equity)}</strong></div></div></CardContent></Card></TabsContent>
    <TabsContent value="cash"><Card><CardHeader><CardTitle>{ar?'التدفقات النقدية':'Cash flow'}</CardTitle></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3"><div className="rounded-lg border p-5"><div>{ar?'التدفقات الداخلة':'Inflows'}</div><strong>{money(cash.data?.inflows)}</strong></div><div className="rounded-lg border p-5"><div>{ar?'التدفقات الخارجة':'Outflows'}</div><strong>{money(cash.data?.outflows)}</strong></div><div className="rounded-lg border p-5"><div>{ar?'صافي التدفق':'Net cash flow'}</div><strong>{money(cash.data?.net)}</strong></div></div></CardContent></Card></TabsContent>
  </Tabs>;
};
export default AccountingReports;
