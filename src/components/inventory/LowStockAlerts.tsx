import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, Bell, Package, RefreshCw, XCircle } from 'lucide-react';
import api from '@/lib/api';

type StockAlert = {
  id: number;
  product?: { name?: string; name_ar?: string; sku?: string };
  current_quantity: number;
  threshold_quantity: number;
  alert_type: 'low_stock' | 'out_of_stock';
  created_at?: string;
};

const LowStockAlerts = () => {
  const { language } = useLanguage();
  const arabic = language === 'ar';
  const { data: alerts = [], isLoading, refetch, isFetching } = useQuery<StockAlert[]>({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => (await api.get('/product/low-stock-alerts')).data?.data || [],
  });

  const text = {
    title: arabic ? 'تنبيهات انخفاض المخزون' : 'Low Stock Alerts',
    description: arabic ? 'تنبيهات المخزون حسب الفرع الحالي' : 'Stock alerts for the current branch',
    product: arabic ? 'المنتج' : 'Product', sku: arabic ? 'رمز المنتج' : 'SKU',
    current: arabic ? 'المخزون الحالي' : 'Current Stock', threshold: arabic ? 'الحد' : 'Threshold',
    type: arabic ? 'النوع' : 'Type', date: arabic ? 'التاريخ' : 'Created At',
    low: arabic ? 'مخزون منخفض' : 'Low Stock', out: arabic ? 'نفد المخزون' : 'Out of Stock',
    empty: arabic ? 'لا توجد تنبيهات لهذا الفرع' : 'No alerts for this branch', refresh: arabic ? 'تحديث' : 'Refresh',
    loading: arabic ? 'جاري التحميل...' : 'Loading...', total: arabic ? 'إجمالي التنبيهات' : 'Total Alerts',
  };

  return <div className="space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3"><div className="rounded-lg bg-amber-500/10 p-2"><Bell className="text-amber-500" size={22} /></div><div><h2 className="text-xl font-bold">{text.title}</h2><p className="text-sm text-muted-foreground">{text.description}</p></div></div>
      <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={16} className={`me-2 ${isFetching ? 'animate-spin' : ''}`} />{text.refresh}</Button>
    </div>
    <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Package className="text-amber-500" size={20} /><div><p className="text-sm text-muted-foreground">{text.total}</p><p className="text-2xl font-bold">{alerts.length}</p></div></div></CardContent></Card>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><AlertTriangle size={18} />{text.title}</CardTitle></CardHeader><CardContent className="p-0"><ScrollArea className="h-[400px] w-full"><div className="min-w-[760px]"><Table><TableHeader><TableRow><TableHead>{text.product}</TableHead><TableHead>{text.sku}</TableHead><TableHead>{text.current}</TableHead><TableHead>{text.threshold}</TableHead><TableHead>{text.type}</TableHead><TableHead>{text.date}</TableHead></TableRow></TableHeader><TableBody>{isLoading ? <TableRow><TableCell colSpan={6} className="py-8 text-center">{text.loading}</TableCell></TableRow> : alerts.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{text.empty}</TableCell></TableRow> : alerts.map(alert => <TableRow key={alert.id}><TableCell className="font-medium">{arabic ? alert.product?.name_ar || alert.product?.name || '-' : alert.product?.name || '-'}</TableCell><TableCell>{alert.product?.sku || '-'}</TableCell><TableCell className="font-semibold">{alert.current_quantity}</TableCell><TableCell>{alert.threshold_quantity}</TableCell><TableCell><Badge variant={alert.alert_type === 'out_of_stock' ? 'destructive' : 'secondary'} className="gap-1">{alert.alert_type === 'out_of_stock' ? <XCircle size={12} /> : <AlertTriangle size={12} />}{alert.alert_type === 'out_of_stock' ? text.out : text.low}</Badge></TableCell><TableCell className="text-muted-foreground">{alert.created_at ? formatDate(alert.created_at) : '-'}</TableCell></TableRow>)}</TableBody></Table></div><ScrollBar orientation="horizontal" /></ScrollArea></CardContent></Card>
  </div>;
};

export default LowStockAlerts;
