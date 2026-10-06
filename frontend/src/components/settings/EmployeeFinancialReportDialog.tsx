import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays, Users, Receipt, Wallet, CircleDollarSign } from 'lucide-react';
import api from '@/lib/api';
import type { Employee } from '@/types/employee';

type Props = { employee: Employee | null; open: boolean; onOpenChange: (open: boolean) => void; language: string };
type Report = { summary: Record<string, number>; customers: Array<{ id: number; name: string }>; invoices: Array<any>; collections: Array<any> };
const money = (value: number) => `${Number(value || 0).toLocaleString()} ج.م`;

export default function EmployeeFinancialReportDialog({ employee, open, onOpenChange, language }: Props) {
  const ar = language === 'ar';
  const query = useQuery<{ data: Report }>({
    queryKey: ['employee-financial-report', employee?.id],
    enabled: open && !!employee,
    queryFn: async () => (await api.get(`/employee/${employee!.id}/financial-report`)).data,
  });
  const report = query.data?.data;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
      <DialogHeader><DialogTitle>{ar ? `كشف حساب الموظف: ${employee?.name}` : `Employee account: ${employee?.name}`}</DialogTitle></DialogHeader>
      {query.isLoading ? <div className="py-12 text-center">{ar ? 'جاري تحميل التقرير...' : 'Loading report...'}</div> : query.isError ? <div className="py-12 text-center text-destructive">{ar ? 'تعذر تحميل التقرير' : 'Unable to load report'}</div> : <ScrollArea className="h-[75vh] pe-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[['invoices_count', Receipt, ar ? 'الفواتير' : 'Invoices'], ['customers_count', Users, ar ? 'العملاء' : 'Customers'], ['collections_total', Wallet, ar ? 'التحصيلات' : 'Collections'], ['remaining_total', CircleDollarSign, ar ? 'المتبقي' : 'Remaining']].map(([key, Icon, label]) => <Card key={String(key)}><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon size={16} />{label}</div><div className="text-xl font-bold mt-2">{key.endsWith('_count') ? report?.summary?.[String(key)] || 0 : money(report?.summary?.[String(key)] || 0)}</div></CardContent></Card>)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-base">{ar ? 'العملاء الذين تعامل معهم' : 'Customers handled'}</CardTitle></CardHeader><CardContent><div className="space-y-2">{report?.customers?.length ? report.customers.map(c => <div key={c.id} className="flex justify-between border-b pb-2"><span>{c.name}</span><Badge variant="outline">#{c.id}</Badge></div>) : <p className="text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</p>}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays size={16} />{ar ? 'سجل التحصيلات' : 'Collection history'}</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead><TableHead>{ar ? 'العميل' : 'Customer'}</TableHead><TableHead>{ar ? 'القيمة' : 'Amount'}</TableHead></TableRow></TableHeader><TableBody>{report?.collections?.map((c, i) => <TableRow key={`${c.source}-${c.id}-${i}`}><TableCell>{c.date || '-'}</TableCell><TableCell>{c.customer?.name || '-'}</TableCell><TableCell className="font-semibold">{money(c.amount)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </div>
        <Card className="mt-4"><CardHeader><CardTitle className="text-base">{ar ? 'الفواتير والمنتجات والأرصدة' : 'Invoices, products and balances'}</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{ar ? 'الفاتورة' : 'Invoice'}</TableHead><TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead><TableHead>{ar ? 'العميل' : 'Customer'}</TableHead><TableHead>{ar ? 'الإجمالي' : 'Total'}</TableHead><TableHead>{ar ? 'المدفوع' : 'Paid'}</TableHead><TableHead>{ar ? 'المتبقي' : 'Remaining'}</TableHead><TableHead>{ar ? 'المنتجات' : 'Products'}</TableHead></TableRow></TableHeader><TableBody>{report?.invoices?.map((invoice, i) => <TableRow key={`${invoice.source}-${invoice.id}-${i}`}><TableCell className="font-medium">{invoice.number || invoice.id}</TableCell><TableCell>{invoice.date || '-'}</TableCell><TableCell>{invoice.customer?.name || '-'}</TableCell><TableCell>{money(invoice.total)}</TableCell><TableCell>{money(invoice.paid)}</TableCell><TableCell className="font-semibold">{money(invoice.remaining)}</TableCell><TableCell>{invoice.items?.map((item: any) => `${item.product?.name || '-'} × ${item.quantity}`).join('، ') || '-'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </ScrollArea>}
    </DialogContent>
  </Dialog>;
}
