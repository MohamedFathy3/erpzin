import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Building2, Package, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '@/lib/api';

interface ProductRow { id: number; name: string; sku?: string; quantity: number; cost_price: number; selling_price: number; cost_value: number; selling_value: number; expected_profit: number; }
interface WarehouseReport { id: number; name: string; branch?: { id: number; name: string } | null; products: ProductRow[]; totals: { quantity: number; cost_value: number; selling_value: number; expected_profit: number }; }
interface Movement { id: number; type: string; product?: { id: number; name: string; sku?: string }; warehouse?: { id: number; name: string }; user?: { id: number; name: string }; quantity: number; quantity_delta: number; balance_before: number | null; balance_after: number | null; unit_cost: number; cost_value: number; selling_value: number; reference?: number; reference_type?: string; note?: string; created_at: string; }
interface MovementAnalytics { date: string; movement_count: number; net_quantity: number; added_quantity: number; removed_quantity: number; cost_value: number; selling_value: number; expected_profit: number; }
interface MovementResponse { data: Movement[]; analytics: MovementAnalytics[]; }

const money = (value: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
const dateTime = (value: string) => new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const chartDate = (value: string) => new Intl.DateTimeFormat('ar-EG', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`));
const movementLabels: Record<string, string> = { receipt: 'إضافة / استلام', issue: 'خروج / صرف', sale: 'مبيعات', purchase: 'مشتريات', return: 'مرتجع', transfer_in: 'استلام تحويل', transfer_out: 'تحويل صادر', adjustment: 'تسوية', opening_balance: 'رصيد افتتاحي', other: 'أخرى' };

export default function WarehouseReports() {
  const [warehouseId, setWarehouseId] = useState('all');
  const [productId, setProductId] = useState('all');
  const [movementType, setMovementType] = useState('all');
  const [userId, setUserId] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const inventoryQuery = useQuery({
    queryKey: ['warehouse-inventory-report', warehouseId],
    queryFn: async () => (await api.get<{ data: WarehouseReport[] }>('/reports/warehouse-inventory', { params: warehouseId === 'all' ? {} : { warehouse_id: warehouseId } })).data.data,
  });
  const movementQuery = useQuery({
    queryKey: ['warehouse-movement-report', warehouseId, productId, movementType, userId, from, to],
    queryFn: async () => {
      const filters: Record<string, string> = {};
      if (warehouseId !== 'all') filters.warehouse_id = warehouseId;
      if (productId !== 'all') filters.product_id = productId;
      if (movementType !== 'all') filters.movement_type = movementType;
      if (userId !== 'all') filters.created_by = userId;
      if (from) filters.date_from = from;
      if (to) filters.date_to = to;
      return (await api.get<MovementResponse>('/reports/warehouse-movements', { params: { filters, perPage: 500 } })).data;
    },
  });

  const warehouses = inventoryQuery.data || [];
  const products = useMemo(() => warehouses.flatMap((warehouse) => warehouse.products.map((product) => ({ ...product, warehouseName: warehouse.name }))), [warehouses]);
  const movements = movementQuery.data?.data || [];
  const analytics = movementQuery.data?.analytics || [];
  const users = useMemo(() => Array.from(new Map(movements.filter((m) => m.user).map((m) => [m.user!.id, m.user!])).values()), [movements]);
  const totals = useMemo(() => warehouses.reduce((sum, warehouse) => ({ quantity: sum.quantity + warehouse.totals.quantity, cost_value: sum.cost_value + warehouse.totals.cost_value, selling_value: sum.selling_value + warehouse.totals.selling_value, expected_profit: sum.expected_profit + warehouse.totals.expected_profit }), { quantity: 0, cost_value: 0, selling_value: 0, expected_profit: 0 }), [warehouses]);

  return <MainLayout activeItem="warehouse-reports">
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">تقارير المخازن</h1><p className="text-muted-foreground">الرصيد والقيمة والحركات الفعلية لكل مخزن</p></div><Button variant="outline" onClick={() => { inventoryQuery.refetch(); movementQuery.refetch(); }}><RefreshCw className="ml-2 h-4 w-4" /> تحديث البيانات</Button></div>
      <div className="grid gap-4 md:grid-cols-4"><SummaryCard title="إجمالي الكمية" value={totals.quantity} icon={<Package />} /><SummaryCard title="قيمة التكلفة" value={totals.cost_value} icon={<Wallet />} /><SummaryCard title="قيمة البيع" value={totals.selling_value} icon={<Building2 />} /><SummaryCard title="الربح المتوقع" value={totals.expected_profit} icon={<TrendingUp />} /></div>
      <Card><CardHeader><CardTitle>تصفية التقرير</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-6"><FilterSelect label="المخزن" value={warehouseId} onChange={setWarehouseId} options={warehouses.map((w) => [String(w.id), w.name])} /><FilterSelect label="المنتج" value={productId} onChange={setProductId} options={products.map((p) => [String(p.id), p.name])} /><FilterSelect label="نوع الحركة" value={movementType} onChange={setMovementType} options={Object.entries(movementLabels).map(([id, name]) => [id, name])} /><FilterSelect label="المستخدم" value={userId} onChange={setUserId} options={users.map((u) => [String(u.id), u.name])} /><div><Label>من تاريخ</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div><Label>إلى تاريخ</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div></CardContent></Card>
      <Tabs defaultValue="stock"><TabsList><TabsTrigger value="stock">أرصدة المخازن والمنتجات</TabsTrigger><TabsTrigger value="movements">حركة المخزن والتحليل</TabsTrigger></TabsList><TabsContent value="stock" className="space-y-4">{warehouses.map((warehouse) => <Card key={warehouse.id}><CardHeader><div className="flex items-center justify-between"><CardTitle>{warehouse.name}</CardTitle><Badge variant="secondary">الفرع: {warehouse.branch?.name || 'غير محدد'}</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>SKU</TableHead><TableHead>الكمية</TableHead><TableHead>التكلفة</TableHead><TableHead>سعر البيع</TableHead><TableHead>قيمة التكلفة</TableHead><TableHead>قيمة البيع</TableHead><TableHead>الربح المتوقع</TableHead></TableRow></TableHeader><TableBody>{warehouse.products.map((product) => <TableRow key={product.id}><TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.sku || '-'}</TableCell><TableCell>{product.quantity}</TableCell><TableCell>{money(product.cost_price)}</TableCell><TableCell>{money(product.selling_price)}</TableCell><TableCell>{money(product.cost_value)}</TableCell><TableCell>{money(product.selling_value)}</TableCell><TableCell className="text-emerald-600">{money(product.expected_profit)}</TableCell></TableRow>)}<TableRow className="bg-muted/50 font-bold"><TableCell colSpan={2}>الإجمالي</TableCell><TableCell>{warehouse.totals.quantity}</TableCell><TableCell colSpan={2}></TableCell><TableCell>{money(warehouse.totals.cost_value)}</TableCell><TableCell>{money(warehouse.totals.selling_value)}</TableCell><TableCell>{money(warehouse.totals.expected_profit)}</TableCell></TableRow></TableBody></Table>{warehouse.products.length === 0 && <p className="py-6 text-center text-muted-foreground">لا توجد منتجات برصيد حالي في هذا المخزن</p>}</CardContent></Card>)}</TabsContent><TabsContent value="movements" className="space-y-4"><AnalyticsCharts data={analytics} /><Card><CardHeader><CardTitle>سجل حركات المخازن ({movements.length})</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الحركة</TableHead><TableHead>المنتج</TableHead><TableHead>المخزن</TableHead><TableHead>الكمية</TableHead><TableHead>قبل</TableHead><TableHead>بعد</TableHead><TableHead>قيمة التكلفة</TableHead><TableHead>المستخدم</TableHead><TableHead>المستند</TableHead></TableRow></TableHeader><TableBody>{movements.map((movement) => <TableRow key={movement.id}><TableCell className="whitespace-nowrap">{dateTime(movement.created_at)}</TableCell><TableCell><Badge variant={movement.quantity_delta < 0 ? 'destructive' : 'default'}>{movementLabels[movement.type] || movement.type}</Badge></TableCell><TableCell>{movement.product?.name || '-'}</TableCell><TableCell>{movement.warehouse?.name || '-'}</TableCell><TableCell className={movement.quantity_delta < 0 ? 'text-red-600' : 'text-emerald-600'}>{movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}</TableCell><TableCell>{movement.balance_before ?? '-'}</TableCell><TableCell>{movement.balance_after ?? '-'}</TableCell><TableCell>{money(movement.cost_value)}</TableCell><TableCell>{movement.user?.name || '-'}</TableCell><TableCell>{movement.reference ? `${movement.reference_type || 'مستند'} #${movement.reference}` : '-'}</TableCell></TableRow>)}</TableBody></Table>{movements.length === 0 && <p className="py-8 text-center text-muted-foreground">لا توجد حركات مطابقة للفلاتر</p>}</CardContent></Card></TabsContent></Tabs>
    </div>
  </MainLayout>;
}

function AnalyticsCharts({ data }: { data: MovementAnalytics[] }) {
  const chartData = data.map((item) => ({ ...item, label: chartDate(item.date) }));
  if (!chartData.length) return <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد بيانات زمنية للفترة والفلاتر المحددة</CardContent></Card>;
  return <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>تطور الكميات اليومية</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={290}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value: number) => value.toLocaleString('ar-EG')} /><Legend /><Line type="monotone" dataKey="added_quantity" name="الإضافات" stroke="#16a34a" strokeWidth={2} /><Line type="monotone" dataKey="removed_quantity" name="المنصرف" stroke="#dc2626" strokeWidth={2} /><Line type="monotone" dataKey="net_quantity" name="الصافي" stroke="#2563eb" strokeWidth={3} /></LineChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle>قيمة الحركات اليومية</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={290}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis tickFormatter={(value) => money(Number(value))} /><Tooltip formatter={(value: number) => money(value)} /><Legend /><Bar dataKey="cost_value" name="قيمة التكلفة" fill="#7c3aed" radius={[4, 4, 0, 0]} /><Bar dataKey="selling_value" name="قيمة البيع" fill="#0891b2" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card><Card className="xl:col-span-2"><CardHeader><CardTitle>تطور الربح المتوقع من الحركات</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={290}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis tickFormatter={(value) => money(Number(value))} /><Tooltip formatter={(value: number) => money(value)} /><Area type="monotone" dataKey="expected_profit" name="الربح المتوقع" stroke="#16a34a" fill="#86efac" fillOpacity={0.45} strokeWidth={2} /></AreaChart></ResponsiveContainer></CardContent></Card></div>;
}
function SummaryCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) { return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 text-xl font-bold">{money(value)}</p></div><div className="rounded-full bg-primary/10 p-3 text-primary">{icon}</div></CardContent></Card>; }
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <div><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={label} /></SelectTrigger><SelectContent><SelectItem value="all">الكل</SelectItem>{options.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>; }
