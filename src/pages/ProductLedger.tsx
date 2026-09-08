import { useMemo, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownToLine, ArrowUpFromLine, Boxes, RefreshCw, Search, ShoppingCart, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductOption { id: number; name: string; name_ar?: string; code?: string; }
interface LedgerRow { id: number; date?: string; reference?: string | number; quantity?: number; unit_price?: number; total?: number; type?: string; note?: string; customer?: { name?: string; name_ar?: string; phone?: string }; supplier?: { name?: string; name_ar?: string; phone?: string }; warehouse?: { name?: string }; }
interface LedgerData { product?: ProductOption & { stock?: number }; summary?: Record<string, number>; sales?: LedgerRow[]; purchases?: LedgerRow[]; movements?: LedgerRow[]; }

const money = (value: number | undefined) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProductLedger() {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const productsQuery = useQuery<ProductOption[]>({
    queryKey: ['ledger-products', search],
    queryFn: async () => {
      const response = await api.post('/product/index', { filters: search ? { name: search } : {}, paginate: false, perPage: 200 });
      return response.data.data || [];
    },
  });
  const ledgerQuery = useQuery<LedgerData>({
    queryKey: ['product-ledger', productId, from, to],
    enabled: Boolean(productId),
    queryFn: async () => (await api.get(`/product/${productId}/ledger`, { params: { from: from || undefined, to: to || undefined } })).data.data,
  });
  const data = ledgerQuery.data;
  const summary = data?.summary || {};
  const selectedProduct = useMemo(() => productsQuery.data?.find(p => String(p.id) === productId), [productsQuery.data, productId]);
  const label = (row: LedgerRow, field: 'customer' | 'supplier') => {
    const entity = row[field];
    return entity ? (isArabic ? entity.name_ar || entity.name : entity.name) : '-';
  };
  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') : '-';

  return <MainLayout>
    <div className="space-y-5 p-1" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="rounded-2xl bg-gradient-to-l from-slate-900 via-indigo-900 to-violet-800 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm text-indigo-200">{isArabic ? 'المخزون والتتبع' : 'Inventory & Traceability'}</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{isArabic ? 'كشف حركات المنتج' : 'Product Movement Ledger'}</h1><p className="mt-2 max-w-2xl text-sm text-indigo-100">{isArabic ? 'اعرف بعته لمين واشتريته من مين وكل حركة تمت على المنتج.' : 'See who you sold to, who you bought from, and every inventory movement.'}</p></div>
          <Boxes className="hidden h-14 w-14 text-cyan-300 opacity-80 sm:block" />
        </div>
      </div>
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_auto] md:items-end">
        <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? 'المنتج' : 'Product'}</label><Select value={productId} onValueChange={setProductId}><SelectTrigger><SelectValue placeholder={isArabic ? 'اختر المنتج' : 'Select product'} /></SelectTrigger><SelectContent><div className="p-2"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={isArabic ? 'ابحث...' : 'Search...'} /></div>{(productsQuery.data || []).map(product => <SelectItem key={product.id} value={String(product.id)}>{isArabic ? product.name_ar || product.name : product.name} {product.code ? `(${product.code})` : ''}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? 'من' : 'From'}</label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div className="space-y-2"><label className="text-sm font-medium">{isArabic ? 'إلى' : 'To'}</label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button variant="outline" onClick={() => ledgerQuery.refetch()} disabled={!productId || ledgerQuery.isFetching}><RefreshCw className={ledgerQuery.isFetching ? 'animate-spin' : ''} size={16} /><span className="ms-2">{isArabic ? 'تحديث' : 'Refresh'}</span></Button>
      </CardContent></Card>
      {!productId ? <Card><CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><Search size={34} /><p>{isArabic ? 'اختر منتجًا لعرض كشف حركاته' : 'Select a product to view its ledger'}</p></CardContent></Card> : ledgerQuery.isLoading ? <Card><CardContent className="p-8 text-center">{isArabic ? 'جاري تحميل الكشف...' : 'Loading ledger...'}</CardContent></Card> : <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[[isArabic ? 'المخزون الحالي' : 'Current stock', summary.current_stock ?? data?.product?.stock ?? 0], [isArabic ? 'المباع' : 'Sold', summary.sold_quantity ?? 0], [isArabic ? 'المشتريات' : 'Purchased', summary.purchased_quantity ?? 0], [isArabic ? 'إجمالي المبيعات' : 'Sales total', money(summary.sales_total)], [isArabic ? 'إجمالي المشتريات' : 'Purchases total', money(summary.purchases_total)]].map(([title, value]) => <Card key={String(title)}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-xl font-bold">{value}</p></CardContent></Card>)}</div>
        <Card><CardHeader><CardTitle>{isArabic ? data?.product?.name_ar || selectedProduct?.name_ar || data?.product?.name : data?.product?.name || selectedProduct?.name}</CardTitle></CardHeader><CardContent><Tabs defaultValue="sales"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="sales"><ShoppingCart size={15} className="me-1" />{isArabic ? 'المبيعات' : 'Sales'}</TabsTrigger><TabsTrigger value="purchases"><Truck size={15} className="me-1" />{isArabic ? 'المشتريات' : 'Purchases'}</TabsTrigger><TabsTrigger value="movements"><Boxes size={15} className="me-1" />{isArabic ? 'المخزون' : 'Inventory'}</TabsTrigger></TabsList>
          <TabsContent value="sales"><LedgerTable rows={data?.sales || []} kind="sales" isArabic={isArabic} label={label} formatDate={formatDate} /></TabsContent>
          <TabsContent value="purchases"><LedgerTable rows={data?.purchases || []} kind="purchases" isArabic={isArabic} label={label} formatDate={formatDate} /></TabsContent>
          <TabsContent value="movements"><LedgerTable rows={data?.movements || []} kind="movements" isArabic={isArabic} label={label} formatDate={formatDate} /></TabsContent>
        </Tabs></CardContent></Card>
      </>}
    </div>
  </MainLayout>;
}

function LedgerTable({ rows, kind, isArabic, label, formatDate }: { rows: LedgerRow[]; kind: 'sales' | 'purchases' | 'movements'; isArabic: boolean; label: (row: LedgerRow, field: 'customer' | 'supplier') => string; formatDate: (date?: string) => string }) {
  if (!rows.length) return <p className="py-10 text-center text-muted-foreground">{isArabic ? 'لا توجد حركات في الفترة المحددة' : 'No movements for the selected period'}</p>;
  return <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-start text-muted-foreground"><th className="p-3 text-start">{isArabic ? 'التاريخ' : 'Date'}</th><th className="p-3 text-start">{isArabic ? 'المرجع' : 'Reference'}</th><th className="p-3 text-start">{kind === 'sales' ? (isArabic ? 'العميل' : 'Customer') : kind === 'purchases' ? (isArabic ? 'المورد' : 'Supplier') : (isArabic ? 'نوع الحركة' : 'Movement')}</th><th className="p-3 text-start">{isArabic ? 'الكمية' : 'Quantity'}</th><th className="p-3 text-start">{isArabic ? 'الإجمالي' : 'Total'}</th><th className="p-3 text-start">{isArabic ? 'المخزن' : 'Warehouse'}</th></tr></thead><tbody>{rows.map(row => <tr key={`${kind}-${row.id}`} className="border-b last:border-0"><td className="p-3">{formatDate(row.date)}</td><td className="p-3 font-medium">{row.reference || '-'}</td><td className="p-3">{kind === 'sales' ? label(row, 'customer') : kind === 'purchases' ? label(row, 'supplier') : <Badge variant="outline">{row.type || row.note || '-'}</Badge>}</td><td className="p-3">{row.quantity ?? 0}</td><td className="p-3">{money(row.total ?? row.total_cost)}</td><td className="p-3">{row.warehouse?.name || '-'}</td></tr>)}</tbody></table></div>;
}
