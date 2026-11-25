import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, CheckCircle2, ClipboardList, Clock3, Factory, Plus, RefreshCw, Search, Settings2, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
type ProductColor = { id: number; color_id: number; color?: { id: number; name?: string; name_ar?: string } };
type ProductUnit = { id: number; unit?: { code?: string; name?: string; name_ar?: string }; colors?: ProductColor[] };
type Product = { id: number; name: string; sku?: string; product_type?: string; stock_unit?: string; units?: ProductUnit[] };
type Bom = { id: number; version: string; status: string; product_id: number; product?: Product };
type Warehouse = { id: number; name: string; branch_id?: number };
type Account = { id: number; name: string; name_ar?: string };
type Operation = {
  id: number;
  sequence: number;
  name: string;
  status: string;
  planned_minutes: number;
  actual_minutes: number;
};
type Material = {
  id: number;
  product_id: number;
  required_quantity: number;
  reserved_quantity: number;
  issued_quantity: number;
  returned_quantity: number;
  scrapped_quantity: number;
  product?: Product;
};
type Inspection = { id: number; result: string; quantity: number; reason?: string; created_at: string };
type StatusChange = { id: number; from_status?: string | null; to_status: string; reason?: string | null; created_at: string };
type RequirementPreview = { bom_item_id: number; product_id: number; required_quantity: number; unit_cost: number };
type InvoiceItem = { id: number; product_id?: number | null; product_name?: string | null; item_type?: string | null; quantity?: number | null; meter_quantity?: number | null };
type InvoiceLookup = { id: number; invoice_number?: string; items?: InvoiceItem[] };
type ManufacturingOrder = {
  id: number;
  order_number: string;
  status: string;
  planned_quantity: number;
  produced_quantity: number;
  reserved_quantity: number;
  actual_cost: number;
  product?: Product;
  product_unit?: ProductUnit;
  color?: { id: number; name?: string; name_ar?: string };
  bom_version?: Bom;
  materials?: Material[];
  operations?: Operation[];
  quality_inspections?: Inspection[];
  status_history?: StatusChange[];
  costs?: Array<{ id: number; cost_type: string; amount: number; notes?: string }>;
  notes?: string;
  dimensions?: { width?: number; height?: number; depth?: number; unit?: string };
};
type AvailabilityItem = {
  product_id: number;
  product_name: string;
  unit?: string | null;
  required: number;
  on_hand: number;
  available: number;
  shortage: number;
};
type OrderOperation = { name: string; equipment_id: string; planned_minutes: string };
const emptyProducts: Product[] = [];
const emptyBoms: Bom[] = [];
const emptyOrders: ManufacturingOrder[] = [];

const emptyOrder = {
  product_id: '',
  bom_version_id: '',
  product_unit_id: '',
  color_id: '',
  warehouse_id: '',
  planned_quantity: '',
  planned_at: '',
  source_invoice_id: '',
  invoice_item_id: '',
  notes: '',
};
const emptyOperation: OrderOperation = { name: '', equipment_id: '', planned_minutes: '' };
const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  planned: 'مخطط',
  reserved: 'تم حجز الخامات',
  in_progress: 'قيد التنفيذ',
  paused: 'متوقف',
  quality_hold: 'موقوف للجودة',
  completed: 'مكتمل',
  closed: 'مغلق',
  cancelled: 'ملغي',
};

function errorMessage(error: ApiError, fallback: string): string {
  const firstValidationError = Object.values(error.response?.data?.errors || {}).flat()[0];
  return firstValidationError || error.response?.data?.message || fallback;
}

function makeIdempotencyKey(action: string, orderId: number): string {
  return `${action}:${orderId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function statusTone(status: string): string {
  if (status === 'completed' || status === 'closed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'in_progress') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'paused' || status === 'quality_hold') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'planned' || status === 'reserved') return 'border-violet-200 bg-violet-50 text-violet-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function Manufacturing() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [invoiceLookupRequested, setInvoiceLookupRequested] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [operationsForm, setOperationsForm] = useState<OrderOperation[]>([]);
  const [actualMinutes, setActualMinutes] = useState<Record<number, string>>({});
  const [operationLogs, setOperationLogs] = useState<Record<number, { minutes: string; cost: string }>>({});
  const [qualityForm, setQualityForm] = useState({ result: 'pass', quantity: '', reason: '', manufacturing_operation_id: '' });
  const [receiptForm, setReceiptForm] = useState({ quantity: '' });
  const [materialActionQuantity, setMaterialActionQuantity] = useState<Record<number, string>>({});

  const overviewQuery = useQuery({
    queryKey: ['manufacturing-v2-overview'],
    queryFn: async () => (await api.get('/manufacturing/v2/overview')).data.data,
  });
  const ordersQuery = useQuery<ManufacturingOrder[]>({
    queryKey: ['manufacturing-v2-orders'],
    queryFn: async () => (await api.get('/manufacturing/v2/orders')).data,
  });
  const orderQuery = useQuery<ManufacturingOrder>({
    queryKey: ['manufacturing-v2-order', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => (await api.get(`/manufacturing/v2/orders/${selectedId}`)).data,
  });
  const availabilityQuery = useQuery<{ available: boolean; items: AvailabilityItem[] }>({
    queryKey: ['manufacturing-v2-availability', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => (await api.get(`/manufacturing/v2/orders/${selectedId}/availability`)).data,
  });
  const productsQuery = useQuery<Product[]>({
    queryKey: ['manufacturing-v2-products'],
    queryFn: async () => (await api.get('/manufacturing/v2/products', { params: { per_page: 100 } })).data.data,
  });
  const bomsQuery = useQuery<Bom[]>({
    queryKey: ['manufacturing-v2-boms'],
    queryFn: async () => (await api.get('/manufacturing/v2/boms', { params: { per_page: 100 } })).data.data,
  });
  const warehousesQuery = useQuery<Warehouse[]>({
    queryKey: ['manufacturing-v2-warehouses'],
    queryFn: async () => (await api.post('/warehouse/index', { paginate: false, perPage: 500 })).data.data || [],
  });
  const equipmentQuery = useQuery<Array<{ id: number; code: string; name: string }>>({
    queryKey: ['manufacturing-v2-equipment'],
    queryFn: async () => (await api.get('/manufacturing/v2/equipment', { params: { per_page: 100 } })).data.data,
  });
  const invoiceQuery = useQuery<InvoiceLookup>({
    queryKey: ['manufacturing-invoice-lookup', orderForm.source_invoice_id],
    enabled: showCreate && invoiceLookupRequested && Number(orderForm.source_invoice_id) > 0,
    queryFn: async () => (await api.get(`/invoices/${Number(orderForm.source_invoice_id)}`)).data.data,
    staleTime: 60_000,
  });


  const orders = ordersQuery.data ?? emptyOrders;
  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLocaleLowerCase();
    return orders.filter((row) => {
      const statusMatches = statusFilter === 'all'
        || (statusFilter === 'active' && ['planned', 'reserved', 'in_progress', 'paused', 'quality_hold'].includes(row.status))
        || (statusFilter === 'completed' && ['completed', 'closed'].includes(row.status))
        || row.status === statusFilter;
      const searchableText = [row.order_number, row.product?.name, row.product?.sku, row.color?.name, row.color?.name_ar]
        .filter(Boolean).join(' ').toLocaleLowerCase();
      return statusMatches && (!query || searchableText.includes(query));
    });
  }, [orderSearch, orders, statusFilter]);
  const products = productsQuery.data ?? emptyProducts;
  const boms = bomsQuery.data ?? emptyBoms;
  const warehouses = warehousesQuery.data || [];
  const equipment = equipmentQuery.data || [];
  const order = orderQuery.data;
  const invoiceItems = (invoiceQuery.data?.items || []).filter((item) => (item.item_type || 'product') === 'product' && Boolean(item.product_id));
  const selectedInvoiceItem = invoiceItems.find((item) => item.id === Number(orderForm.invoice_item_id));
  const activeBoms = useMemo(
    () => boms.filter((bom) => bom.product_id === Number(orderForm.product_id) && bom.status === 'active'),
    [boms, orderForm.product_id],
  );
  const selectedProduct = products.find((product) => product.id === Number(orderForm.product_id));
  const selectedProductUnit = selectedProduct?.units?.find((unit) => unit.id === Number(orderForm.product_unit_id));
  const variantReady = !selectedProduct?.units?.length
    || Boolean(orderForm.product_unit_id && (!selectedProductUnit?.colors?.length || orderForm.color_id));
  const requirementPreviewQuery = useQuery<RequirementPreview[]>({
    queryKey: ['manufacturing-order-preview', orderForm.product_id, orderForm.bom_version_id, orderForm.planned_quantity, orderForm.product_unit_id, orderForm.color_id],
    enabled: showCreate && Boolean(orderForm.product_id && orderForm.bom_version_id && Number(orderForm.planned_quantity) > 0 && variantReady),
    queryFn: async () => (await api.post('/manufacturing/v2/orders/preview', {
      product_id: Number(orderForm.product_id),
      bom_version_id: Number(orderForm.bom_version_id),
      planned_quantity: Number(orderForm.planned_quantity),
      product_unit_id: orderForm.product_unit_id ? Number(orderForm.product_unit_id) : null,
      color_id: orderForm.color_id ? Number(orderForm.color_id) : null,
    })).data.data,
  });

  const refresh = (orderId?: number) => {
    void queryClient.invalidateQueries({ queryKey: ['manufacturing-v2-orders'] });
    void queryClient.invalidateQueries({ queryKey: ['manufacturing-v2-overview'] });
    if (orderId) {
      void queryClient.invalidateQueries({ queryKey: ['manufacturing-v2-order', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['manufacturing-v2-availability', orderId] });
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const operations = operationsForm
        .filter((operation) => operation.name.trim())
        .map((operation, index) => ({
          name: operation.name.trim(),
          sequence: index + 1,
          equipment_id: operation.equipment_id ? Number(operation.equipment_id) : null,
          planned_minutes: Number(operation.planned_minutes || 0),
        }));
      const payload = {
        product_id: Number(orderForm.product_id),
        bom_version_id: orderForm.bom_version_id ? Number(orderForm.bom_version_id) : null,
        product_unit_id: orderForm.product_unit_id ? Number(orderForm.product_unit_id) : null,
        color_id: orderForm.color_id ? Number(orderForm.color_id) : null,
        warehouse_id: Number(orderForm.warehouse_id),
        planned_quantity: Number(orderForm.planned_quantity),
        planned_at: orderForm.planned_at || null,
        notes: orderForm.notes || null,
        operations,
      };
      if (orderForm.source_invoice_id && orderForm.invoice_item_id) {
        return api.post(`/manufacturing/v2/orders/from-invoice/${Number(orderForm.source_invoice_id)}`, {
          invoice_item_id: Number(orderForm.invoice_item_id),
          warehouse_id: payload.warehouse_id,
          product_unit_id: payload.product_unit_id,
          color_id: payload.color_id,
          operations,
        });
      }
      return api.post('/manufacturing/v2/orders', payload);
    },
    onSuccess: () => {
      toast.success('تم إنشاء أمر الإنتاج');
      setOrderForm(emptyOrder);
      setOperationsForm([]);
      setShowCreate(false);
      refresh();
    },
    onError: (error: ApiError) => toast.error(errorMessage(error, 'تعذر إنشاء أمر الإنتاج')),
  });

  const actionMutation = useMutation({
    mutationFn: async (input: {
      orderId: number;
      action: string;
      payload?: Record<string, unknown>;
      operationId?: number;
    }) => {
      const path = input.operationId
        ? `/manufacturing/v2/orders/${input.orderId}/operations/${input.operationId}`
        : `/manufacturing/v2/orders/${input.orderId}/${input.action}`;
      const payload = {
        ...input.payload,
        idempotency_key: makeIdempotencyKey(input.action, input.orderId),
      };
      return api.post(path, payload);
    },
    onSuccess: (_response, variables) => {
      toast.success('تم تسجيل العملية بنجاح');
      if (variables.action === 'receive') setReceiptForm({ quantity: '' });
      if (variables.action === 'quality') setQualityForm({ result: 'pass', quantity: '', reason: '', manufacturing_operation_id: '' });
      refresh(variables.orderId);
    },
    onError: (error: ApiError) => toast.error(errorMessage(error, 'تعذر تنفيذ العملية')),
  });

  const submitMaterialAction = (action: 'return' | 'scrap', material: Material) => {
    if (!selectedId) return;
    const quantity = Number(materialActionQuantity[material.id] || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('أدخل كمية صحيحة');
      return;
    }
    const reason = action === 'scrap' ? window.prompt('سبب الهالك:') : null;
    if (action === 'scrap' && (!reason || reason.trim().length < 3)) return toast.error('سجّل سبب الهالك (3 أحرف على الأقل)');
    const operation = order?.operations?.find((item) => item.status === 'in_progress');
    actionMutation.mutate({
      orderId: selectedId,
      action,
      payload: { items: [{ material_id: material.id, quantity }], ...(action === 'scrap' ? { reason: reason?.trim(), operation_id: operation?.id ?? null } : {}) },
    });
  };

  const submitOperationAction = (operation: Operation, action: 'start' | 'complete' | 'labor' | 'machine') => {
    if (!selectedId) return;
    const log = operationLogs[operation.id] || { minutes: '', cost: '' };
    actionMutation.mutate({
      orderId: selectedId,
      action,
      operationId: operation.id,
      payload: action === 'complete'
        ? { action, actual_minutes: Number(actualMinutes[operation.id] || operation.planned_minutes || 0) }
        : action === 'labor' || action === 'machine'
          ? { action, minutes: Number(log.minutes), cost: Number(log.cost) }
          : { action },
    });
  };

  const fromInvoice = Boolean(
    orderForm.source_invoice_id
    && invoiceQuery.data?.id === Number(orderForm.source_invoice_id)
    && selectedInvoiceItem,
  );
  const createOrderDisabled = createMutation.isPending
    || (!fromInvoice && (!orderForm.product_id || !orderForm.bom_version_id))
    || (!fromInvoice && !variantReady)
    || !orderForm.warehouse_id
    || (!fromInvoice && Number(orderForm.planned_quantity) <= 0)
    || (Boolean(orderForm.source_invoice_id) && !fromInvoice)
    || (!orderForm.source_invoice_id && Boolean(orderForm.invoice_item_id));

  const latestInspection = order?.quality_inspections?.at(-1);
  const remainingProduction = Math.max(0, Number(order?.planned_quantity || 0) - Number(order?.produced_quantity || 0));
  const inspectionQuantity = Number(qualityForm.quantity || remainingProduction);
  const latestInspectionExceedsPlan = Boolean(order && latestInspection && Number(latestInspection.quantity) > Number(order.planned_quantity));
  const overview = overviewQuery.data?.kpis;

  return (
    <MainLayout activeItem="manufacturing">
      <div className="space-y-6 p-2" dir="rtl">
        <section className="rounded-2xl bg-gradient-to-l from-[#101a3b] to-[#5b21b6] p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Factory size={32} />
              <div>
                <h1 className="text-2xl font-extrabold">التصنيع والإنتاج</h1>
                <p className="text-violet-100">من تخطيط الخامات والحجز إلى التشغيل والجودة والتكلفة والاستلام.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/manufacturing/setup">
                <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                  <Settings2 size={16} /> إعدادات التصنيع
                </Button>
              </Link>
              <Button onClick={() => setShowCreate((visible) => !visible)} className="bg-white text-violet-800 hover:bg-violet-50">
                <Plus size={16} /> أمر إنتاج جديد
              </Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ['أوامر نشطة', overview?.active_orders ?? 0],
              ['إجمالي الكميات المخططة', overview?.planned_qty ?? 0],
              ['المكتمل اليوم', overview?.completed_today ?? 0],
              ['بنود خامات ناقصة', overview?.material_shortage ?? 0],
              ['معدل الهالك', `${overview?.scrap_rate ?? 0}%`],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.09] p-3 shadow-sm backdrop-blur-sm">
                <p className="text-xs text-violet-100">{label}</p>
                <p className="mt-1 text-2xl font-bold">{overviewQuery.isLoading || overviewQuery.isError ? '—' : value}</p>
                <p className="mt-1 text-[10px] text-violet-200">{overviewQuery.isError ? 'تعذر تحميل المؤشر' : overviewQuery.isLoading ? 'جارٍ التحميل' : 'من بيانات التصنيع'}</p>
              </div>
            ))}
          </div>
        </section>

        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                إنشاء أمر إنتاج
                <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X size={16} /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Select value={orderForm.product_id} onValueChange={(value) => setOrderForm({ ...orderForm, product_id: value, bom_version_id: '', product_unit_id: '', color_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="المنتج النهائي" /></SelectTrigger>
                  <SelectContent>
                    {products.filter((product) => product.product_type !== 'service').map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={orderForm.bom_version_id || 'none'} onValueChange={(value) => setOrderForm({ ...orderForm, bom_version_id: value === 'none' ? '' : value })}>
                  <SelectTrigger><SelectValue placeholder={activeBoms.length ? "اختر إصدار BOM فعال" : "لا يوجد BOM فعال لهذا المنتج"} /></SelectTrigger>
                  <SelectContent>{activeBoms.map((bom) => <SelectItem key={bom.id} value={String(bom.id)}>الإصدار {bom.version}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={orderForm.warehouse_id} onValueChange={(value) => setOrderForm({ ...orderForm, warehouse_id: value })}>
                  <SelectTrigger><SelectValue placeholder="مخزن الإنتاج" /></SelectTrigger>
                  <SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={String(warehouse.id)}>{warehouse.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min="0.000001" step="0.001" placeholder="الكمية المخططة" value={orderForm.planned_quantity} onChange={(event) => setOrderForm({ ...orderForm, planned_quantity: event.target.value })} />
              </div>
              {selectedProduct?.units?.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={orderForm.product_unit_id || 'none'} onValueChange={(value) => setOrderForm({ ...orderForm, product_unit_id: value === 'none' ? '' : value, color_id: '' })}>
                    <SelectTrigger><SelectValue placeholder="مقاس / وحدة المنتج" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">اختر المقاس / الوحدة</SelectItem>
                      {selectedProduct.units.map((unit) => <SelectItem key={unit.id} value={String(unit.id)}>{unit.unit?.name_ar || unit.unit?.name || unit.unit?.code || `خيار #${unit.id}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedProductUnit?.colors?.length ? (
                    <Select value={orderForm.color_id || 'none'} onValueChange={(value) => setOrderForm({ ...orderForm, color_id: value === 'none' ? '' : value })}>
                      <SelectTrigger><SelectValue placeholder="لون المنتج" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">اختر اللون</SelectItem>
                        {selectedProductUnit.colors.map((entry) => <SelectItem key={entry.color_id} value={String(entry.color_id)}>{entry.color?.name_ar || entry.color?.name || `لون #${entry.color_id}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
              ) : null}
              {!fromInvoice && orderForm.product_id && !variantReady && <p className="text-sm text-destructive">اختر المقاس واللون قبل إنشاء أمر الإنتاج؛ سيُخزَّن الناتج منفصلًا لهذا الخيار.</p>}
              <div className="grid gap-3 md:grid-cols-3">
                <Input type="date" value={orderForm.planned_at} onChange={(event) => setOrderForm({ ...orderForm, planned_at: event.target.value })} />
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input type="number" min="1" aria-label="معرّف الفاتورة" placeholder="معرّف الفاتورة (اختياري)" value={orderForm.source_invoice_id} onChange={(event) => {
                    setOrderForm({ ...orderForm, source_invoice_id: event.target.value, invoice_item_id: '' });
                    setInvoiceLookupRequested(false);
                  }} />
                  <Button type="button" variant="outline" disabled={!orderForm.source_invoice_id || invoiceQuery.isFetching} onClick={() => {
                    if (invoiceLookupRequested) void invoiceQuery.refetch();
                    else setInvoiceLookupRequested(true);
                  }}>
                    {invoiceQuery.isFetching ? 'جارٍ التحميل...' : invoiceLookupRequested ? 'إعادة تحميل البنود' : 'تحميل البنود'}
                  </Button>
                </div>
                <Select value={orderForm.invoice_item_id || 'none'} disabled={!invoiceQuery.data || invoiceItems.length === 0} onValueChange={(value) => setOrderForm({ ...orderForm, invoice_item_id: value === 'none' ? '' : value })}>
                  <SelectTrigger aria-label="اختر بند منتج من الفاتورة"><SelectValue placeholder={invoiceQuery.isLoading ? 'جارٍ جلب البنود...' : 'اختر بند منتج من الفاتورة'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">اختر بندًا من الفاتورة</SelectItem>
                    {invoiceItems.map((item) => {
                      const quantity = item.meter_quantity ?? item.quantity;
                      return <SelectItem key={item.id} value={String(item.id)}>{item.product_name || `منتج #${item.product_id}`} · بند #{item.id} · كمية {quantity ?? '—'}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              {orderForm.source_invoice_id && !invoiceLookupRequested && <p className="text-xs text-muted-foreground">اضغط «تحميل البنود» لعرض البنود التابعة لهذه الفاتورة واختيار المنتج المراد تصنيعه.</p>}
              {orderForm.source_invoice_id && invoiceQuery.isError && <p role="alert" className="text-sm text-destructive">تعذر تحميل الفاتورة. تأكد من المعرّف وأنها ضمن الفرع ومساحة العمل المصرح بها.</p>}
              {invoiceQuery.data && invoiceItems.length === 0 && <p className="text-sm text-amber-700">هذه الفاتورة لا تحتوي بنود منتجات مخزنية قابلة للتصنيع.</p>}
              {selectedInvoiceItem && <p className="text-xs text-emerald-700">تم التحقق من البند #{selectedInvoiceItem.id} ضمن الفاتورة {invoiceQuery.data?.invoice_number || `#${invoiceQuery.data?.id}`}.</p>}
              <Input placeholder="ملاحظات أمر الإنتاج" value={orderForm.notes} onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })} />
              {orderForm.bom_version_id && Number(orderForm.planned_quantity) > 0 && (
                <section className="space-y-2 rounded-lg border p-3">
                  <h3 className="font-semibold">احتياج الخامات للكمية المخططة</h3>
                  <p className="text-xs text-muted-foreground">الكميات معروضة بوحدة المخزون بعد تطبيق معامل الهالك والتحويل بين الوحدات. الحجز لا يخصم المخزون؛ الخصم يتم عند صرف الخامات.</p>
                  {requirementPreviewQuery.isLoading ? <p className="text-sm">جارٍ حساب الاحتياج...</p>
                    : requirementPreviewQuery.isError ? <p className="text-sm text-destructive">تعذر حساب الاحتياج؛ راجع الوحدات ومكونات BOM.</p>
                      : requirementPreviewQuery.data?.length ? requirementPreviewQuery.data.map((requirement) => {
                        const material = products.find((product) => product.id === requirement.product_id);
                        return <div key={`${requirement.bom_item_id}-${requirement.product_id}`} className="flex flex-wrap justify-between gap-2 rounded border bg-muted/30 p-2 text-sm">
                          <span>{material?.name || `مادة #${requirement.product_id}`}</span>
                          <span className="font-semibold">{Number(requirement.required_quantity).toLocaleString()} {material?.stock_unit || ''}</span>
                        </div>;
                      }) : <p className="text-sm text-destructive">لا توجد خامات معرفة لهذا الخيار من المنتج.</p>}
                </section>
              )}
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">مراحل التشغيل بالترتيب</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => setOperationsForm([...operationsForm, { ...emptyOperation }])}><Plus size={14} /> إضافة مرحلة</Button>
                </div>
                {operationsForm.map((operation, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_0.7fr_auto]">
                    <Input placeholder={`اسم المرحلة ${index + 1}`} value={operation.name} onChange={(event) => setOperationsForm(operationsForm.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} />
                    <Select value={operation.equipment_id || 'none'} onValueChange={(value) => setOperationsForm(operationsForm.map((row, rowIndex) => rowIndex === index ? { ...row, equipment_id: value === 'none' ? '' : value } : row))}>
                      <SelectTrigger><SelectValue placeholder="المعدة (اختياري)" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">بدون معدة</SelectItem>{equipment.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min="0" placeholder="دقائق مخططة" value={operation.planned_minutes} onChange={(event) => setOperationsForm(operationsForm.map((row, rowIndex) => rowIndex === index ? { ...row, planned_minutes: event.target.value } : row))} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setOperationsForm(operationsForm.filter((_, rowIndex) => rowIndex !== index))}><X size={15} /></Button>
                  </div>
                ))}
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createOrderDisabled}>
                {createMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ أمر الإنتاج'}
              </Button>
              {orderForm.source_invoice_id && invoiceQuery.data && invoiceItems.length > 0 && !orderForm.invoice_item_id && <p className="text-sm text-destructive">اختر بندًا من القائمة أعلاه قبل حفظ أمر الإنتاج.</p>}
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2"><span className="rounded-lg bg-violet-100 p-2 text-violet-700"><Boxes size={19} /></span> أوامر الإنتاج</CardTitle>
              <Button variant="outline" size="sm" onClick={() => void ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
                <RefreshCw size={15} className={ordersQuery.isFetching ? 'animate-spin' : ''} /> <span className="mr-2">تحديث القائمة</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center">
              <div className="relative">
                <Search aria-hidden="true" size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="ابحث في أوامر الإنتاج" className="pr-10" placeholder="ابحث برقم الأمر أو اسم المنتج أو SKU" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="تصفية حسب حالة أمر الإنتاج"><SlidersHorizontal size={15} className="ml-2 text-muted-foreground" /><SelectValue placeholder="كل الحالات" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="active">الأوامر النشطة</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="planned">مخطط</SelectItem>
                  <SelectItem value="reserved">تم حجز الخامات</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="paused">متوقف</SelectItem>
                  <SelectItem value="quality_hold">موقوف للجودة</SelectItem>
                  <SelectItem value="completed">مكتمل / مغلق</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground md:text-left">عرض {filteredOrders.length} من {orders.length} أمر محمّل</p>
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <ClipboardList size={15} className="mt-0.5 shrink-0" /> البحث والفلاتر على أحدث 100 أمر يعيدها النظام حاليًا.
            </p>
            {ordersQuery.isLoading ? (
              <div className="space-y-3" aria-label="جارٍ تحميل أوامر الإنتاج">
                {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl border bg-muted/40" />)}
              </div>
            ) : ordersQuery.isError ? (
              <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                <p className="font-semibold text-destructive">تعذر تحميل أوامر الإنتاج.</p>
                <p className="mt-1 text-sm text-muted-foreground">تحقق من الاتصال ثم أعد المحاولة.</p>
                <Button className="mt-3" variant="outline" onClick={() => void ordersQuery.refetch()}>إعادة المحاولة</Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Factory size={22} /></div>
                <p className="font-semibold">لا توجد أوامر إنتاج حتى الآن</p>
                <p className="mt-1 text-sm text-muted-foreground">أنشئ أول أمر لتبدأ متابعة الخامات ومراحل التشغيل والجودة.</p>
                <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus size={16} className="ml-2" /> إنشاء أمر إنتاج</Button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-9 text-center">
                <Search className="mx-auto mb-2 text-muted-foreground" size={22} />
                <p className="font-semibold">لا توجد نتائج مطابقة</p>
                <p className="mt-1 text-sm text-muted-foreground">جرّب كلمة بحث أخرى أو غيّر تصفية الحالة.</p>
                <Button className="mt-3" variant="ghost" onClick={() => { setOrderSearch(''); setStatusFilter('all'); }}>مسح البحث والفلاتر</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((row) => {
                  const planned = Number(row.planned_quantity || 0);
                  const produced = Number(row.produced_quantity || 0);
                  const progress = planned > 0 ? Math.min(100, Math.max(0, (produced / planned) * 100)) : 0;
                  return (
                    <article key={row.id} className={`rounded-xl border p-4 transition-all hover:border-violet-200 hover:shadow-sm ${selectedId === row.id ? 'border-violet-300 bg-violet-50/30 ring-1 ring-violet-100' : 'bg-card'}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900">{row.order_number}</p>
                            <Badge variant="outline" className={statusTone(row.status)}>{statusLabels[row.status] || row.status}</Badge>
                          </div>
                          <p className="mt-1 truncate text-sm font-medium text-slate-700">{row.product?.name || 'منتج'}{row.product?.sku ? ` · ${row.product.sku}` : ''}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {row.product_unit?.unit && `${row.product_unit.unit.name_ar || row.product_unit.unit.name || row.product_unit.unit.code}`}
                            {row.product_unit?.unit && row.color ? ' · ' : ''}{row.color && (row.color.name_ar || row.color.name)}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:min-w-[260px]">
                          <div><p className="text-xs text-muted-foreground">المخطط</p><p className="font-semibold">{planned.toLocaleString()}</p></div>
                          <div><p className="text-xs text-muted-foreground">المستلم</p><p className="font-semibold">{produced.toLocaleString()}</p></div>
                          <div className="col-span-2 flex items-center justify-between gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`تقدم أمر ${row.order_number}`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                              <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">{Math.round(progress)}%</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 lg:min-w-[215px] lg:flex-col lg:items-end lg:border-0 lg:pt-0">
                          <p className="text-sm text-muted-foreground">التكلفة الفعلية <span className="font-semibold text-slate-800">{Number(row.actual_cost || 0).toFixed(2)}</span></p>
                          <Button size="sm" variant={selectedId === row.id ? 'default' : 'outline'} onClick={() => setSelectedId(selectedId === row.id ? null : row.id)}>
                            {selectedId === row.id ? 'إخفاء التفاصيل' : 'تفاصيل وإجراءات'}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedId && (
          <Card className="overflow-hidden border-violet-100 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-l from-violet-50/80 to-background">
              <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2"><span className="rounded-lg bg-violet-100 p-2 text-violet-700"><ClipboardList size={18} /></span> تفاصيل أمر الإنتاج {order?.order_number || ''}</span>
                <div className="flex items-center gap-2">
                  {order && <Badge variant="outline" className={statusTone(order.status)}>{statusLabels[order.status] || order.status}</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => void orderQuery.refetch()} disabled={orderQuery.isFetching} aria-label="تحديث تفاصيل الأمر"><RefreshCw size={15} className={orderQuery.isFetching ? 'animate-spin' : ''} /></Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4 md:p-5">
              {orderQuery.isLoading ? <div className="space-y-3" aria-label="جارٍ تحميل التفاصيل"><div className="h-24 animate-pulse rounded-xl bg-muted/50" /><div className="h-40 animate-pulse rounded-xl bg-muted/50" /></div> : orderQuery.isError || !order ? (
                <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                  <p className="font-semibold text-destructive">تعذر تحميل تفاصيل الأمر.</p>
                  <Button className="mt-3" variant="outline" onClick={() => void orderQuery.refetch()}>إعادة المحاولة</Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border bg-background p-4"><p className="text-xs text-muted-foreground">الكمية المخططة</p><p className="mt-1 text-xl font-bold">{Number(order.planned_quantity).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">{order.product?.stock_unit || ''}</span></p></div>
                    <div className="rounded-xl border bg-background p-4"><p className="text-xs text-muted-foreground">الكمية المستلمة</p><p className="mt-1 text-xl font-bold text-emerald-700">{Number(order.produced_quantity).toLocaleString()}</p></div>
                    <div className="rounded-xl border bg-background p-4"><p className="text-xs text-muted-foreground">المتبقي للإنتاج</p><p className="mt-1 text-xl font-bold">{remainingProduction.toLocaleString()}</p></div>
                    <div className="rounded-xl border bg-background p-4"><p className="text-xs text-muted-foreground">التكلفة الفعلية</p><p className="mt-1 text-xl font-bold">{Number(order.actual_cost || 0).toFixed(2)}</p></div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">تقدم الإنتاج</span><span className="text-muted-foreground">{order.planned_quantity ? Math.round(Math.min(100, Number(order.produced_quantity || 0) / Number(order.planned_quantity) * 100)) : 0}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="نسبة إنجاز أمر الإنتاج" aria-valuenow={order.planned_quantity ? Math.round(Math.min(100, Number(order.produced_quantity || 0) / Number(order.planned_quantity) * 100)) : 0} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-gradient-to-l from-violet-600 to-sky-500 transition-all" style={{ width: `${order.planned_quantity ? Math.min(100, Math.max(0, Number(order.produced_quantity || 0) / Number(order.planned_quantity) * 100)) : 0}%` }} />
                    </div>
                  </div>
                  {order.dimensions && <div className="rounded-xl border bg-background p-4"><p className="text-xs text-muted-foreground">مقاسات أمر التشغيل (عرض × ارتفاع × عمق)</p><p className="mt-1 font-semibold">{[order.dimensions.width, order.dimensions.height, order.dimensions.depth].map((value) => value ?? '—').join(' × ')} {order.dimensions.unit || ''}</p></div>}
                  {(order.product_unit || order.color) && <p className="rounded-md border bg-muted/30 p-3 text-sm">
                    خيار المنتج المصنّع:
                    {order.product_unit?.unit && ` ${order.product_unit.unit.name_ar || order.product_unit.unit.name || order.product_unit.unit.code}`}
                    {order.color && ` · ${order.color.name_ar || order.color.name}`}
                  </p>}
                  <section className="space-y-3 rounded-xl border p-4 md:p-5">
                    <h3 className="flex items-center gap-2 border-b pb-3 font-bold"><Clock3 size={17} className="text-violet-700" /> سجل حالات أمر الإنتاج</h3>
                    {order.status_history?.length ? <ol className="space-y-2 border-r-2 pr-4">
                      {order.status_history.map((event) => <li key={event.id} className="relative rounded-md border p-2 text-sm">
                        <span className="font-semibold">{event.from_status ? `${statusLabels[event.from_status] || event.from_status} ← ` : ''}{statusLabels[event.to_status] || event.to_status}</span>
                        <span className="mr-2 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                        {event.reason && <p className="mt-1 text-muted-foreground">{event.reason}</p>}
                      </li>)}
                    </ol> : <p className="text-sm text-muted-foreground">لا يوجد سجل حالات مسجل لهذا الأمر.</p>}
                  </section>

                  <section className="space-y-3 rounded-xl border p-4 md:p-5">
                    <h3 className="border-b pb-3 font-bold">توافر وحجز الخامات</h3>
                    {!order.materials?.some((material) => Boolean(material.product && material.product.product_type !== 'service')) && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">هذا الأمر القديم لا يحتوي خامات من BOM؛ لا يمكن حجز خاماته. أنشئ أمرًا جديدًا بعد تفعيل BOM صحيح.</p>}
                    {availabilityQuery.isLoading ? <p className="text-sm text-muted-foreground">جارٍ حساب توافر الخامات...</p> : availabilityQuery.isError ? <div className="flex flex-wrap items-center gap-2 text-sm text-destructive"><span>تعذر تحميل توافر الخامات.</span><Button size="sm" variant="outline" onClick={() => void availabilityQuery.refetch()}>إعادة المحاولة</Button></div> : availabilityQuery.data?.items?.length ? (
                      <div className="space-y-2">
                        {availabilityQuery.data.items.map((item) => (
                          <div key={item.product_id} className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm md:grid-cols-5">
                            <span className="font-medium">{item.product_name}</span><span>المطلوب: {item.required} {item.unit || ''}</span><span>بالمخزن: {item.on_hand}</span><span>متاح: {item.available}</span><span className={item.shortage > 0 ? 'text-destructive' : 'text-green-700'}>العجز: {item.shortage}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">لا توجد خامات مخزنية مرتبطة بالأمر.</p>}
                    <div className="flex flex-wrap gap-2">
                      {['draft', 'planned', 'in_progress'].includes(order.status) && (
                        <Button variant="outline" disabled={actionMutation.isPending || availabilityQuery.data?.available === false || !order.materials?.some((material) => Boolean(material.product && material.product.product_type !== 'service'))} onClick={() => actionMutation.mutate({ orderId: order.id, action: 'reserve' })}>
                          حجز الخامات
                        </Button>
                      )}
                      {order.status === 'reserved' && (
                        <Button variant="outline" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ orderId: order.id, action: 'start' })}>
                          بدء الإنتاج
                        </Button>
                      )}
                      {['reserved', 'in_progress'].includes(order.status) && (
                        <Button disabled={actionMutation.isPending || !order.materials?.length} onClick={() => {
                          const items = (order.materials || []).map((material) => ({
                            material_id: material.id,
                            quantity: Math.max(0, Number(material.required_quantity) - Number(material.issued_quantity) + Number(material.returned_quantity)),
                          })).filter((item) => item.quantity > 0);
                          if (!items.length) return toast.error('لا توجد كمية متبقية للصرف');
                          actionMutation.mutate({ orderId: order.id, action: 'issue', payload: { items } });
                        }}>
                          صرف الكميات المتبقية
                        </Button>
                      )}
                    </div>
                    {order.materials?.length ? (
                      <div className="space-y-2">
                        {order.materials.map((material) => {
                          const service = material.product?.product_type === 'service';
                          return (
                            <div key={material.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.3fr_repeat(3,0.7fr)_1fr_auto_auto] md:items-center">
                              <span className="font-medium">{material.product?.name || `مادة #${material.product_id}`}{service ? ' (خدمة)' : ''}</span>
                              <span className="text-sm">مطلوب: {material.required_quantity} {material.product?.stock_unit || ''}</span>
                              <span className="text-sm">محجوز: {material.reserved_quantity}</span>
                              <span className="text-sm">مصروف: {material.issued_quantity}</span>
                              <Input type="number" min="0.000001" step="0.001" placeholder="الكمية" value={materialActionQuantity[material.id] || ''} disabled={service} onChange={(event) => setMaterialActionQuantity({ ...materialActionQuantity, [material.id]: event.target.value })} />
                              <Button size="sm" variant="outline" disabled={service || actionMutation.isPending} onClick={() => submitMaterialAction('return', material)}>مرتجع</Button>
                              <Button size="sm" variant="outline" disabled={service || actionMutation.isPending} onClick={() => submitMaterialAction('scrap', material)}>هالك</Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>

                  <section className="space-y-3 rounded-xl border p-4 md:p-5">
                    <h3 className="border-b pb-3 font-bold">مراحل التشغيل</h3>
                    {order.operations?.length ? order.operations.map((operation) => (
                      <div key={operation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{operation.sequence}. {operation.name}</p>
                          <p className="text-xs text-muted-foreground">المخطط {operation.planned_minutes} دقيقة · الفعلي {operation.actual_minutes} دقيقة · {statusLabels[operation.status] || operation.status}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {operation.status === 'pending' && <Button size="sm" variant="outline" disabled={actionMutation.isPending || order.status === 'planned'} onClick={() => submitOperationAction(operation, 'start')}>بدء المرحلة</Button>}
                          {operation.status === 'in_progress' && <>
                            <Input className="w-28" type="number" min="0" placeholder="دقائق فعلية" value={actualMinutes[operation.id] || ''} onChange={(event) => setActualMinutes({ ...actualMinutes, [operation.id]: event.target.value })} />
                            <Button size="sm" disabled={actionMutation.isPending} onClick={() => submitOperationAction(operation, 'complete')}>إنهاء المرحلة</Button>
                          </>}
                          {['reserved', 'in_progress'].includes(order.status) && <>
                            <Input className="w-24" type="number" min="0" placeholder="دقائق" value={operationLogs[operation.id]?.minutes || ''} onChange={(event) => setOperationLogs({ ...operationLogs, [operation.id]: { ...(operationLogs[operation.id] || { minutes: '', cost: '' }), minutes: event.target.value } })} />
                            <Input className="w-24" type="number" min="0" placeholder="التكلفة" value={operationLogs[operation.id]?.cost || ''} onChange={(event) => setOperationLogs({ ...operationLogs, [operation.id]: { ...(operationLogs[operation.id] || { minutes: '', cost: '' }), cost: event.target.value } })} />
                            <Button size="sm" variant="outline" disabled={actionMutation.isPending || !operationLogs[operation.id]?.minutes} onClick={() => submitOperationAction(operation, 'labor')}>تسجيل عمالة</Button>
                            <Button size="sm" variant="outline" disabled={actionMutation.isPending || !operationLogs[operation.id]?.minutes} onClick={() => submitOperationAction(operation, 'machine')}>تسجيل ماكينة</Button>
                          </>}
                        </div>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">لا توجد مراحل معرفة لهذا الأمر.</p>}
                  </section>

                  <section className="space-y-3 rounded-xl border p-4 md:p-5">
                    <h3 className="border-b pb-3 font-bold">فحص الجودة والاستلام</h3>
                    {latestInspection && <p className={`text-sm ${latestInspectionExceedsPlan ? 'text-destructive' : ''}`}>آخر فحص: {latestInspection.result === 'pass' ? 'مقبول' : latestInspection.result === 'reject' ? 'مرفوض' : 'إعادة تشغيل'} · الكمية {latestInspection.quantity}{latestInspection.reason ? ` · ${latestInspection.reason}` : ''}{latestInspectionExceedsPlan ? ' — الكمية أكبر من خطة الأمر؛ أعد الفحص بالكمية المتبقية.' : ''}</p>}
                    {['in_progress', 'quality_hold'].includes(order.status) && (
                      <div className="grid gap-2 md:grid-cols-[1fr_0.8fr_1fr_1.5fr_auto]">
                        <Select value={qualityForm.result} onValueChange={(value) => setQualityForm({ ...qualityForm, result: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="pass">قبول</SelectItem><SelectItem value="reject">رفض</SelectItem><SelectItem value="rework">إعادة تشغيل</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" min="0.000001" max={remainingProduction} step="0.001" placeholder={`الكمية المفحوصة (متبقي ${remainingProduction})`} value={qualityForm.quantity} onChange={(event) => setQualityForm({ ...qualityForm, quantity: event.target.value })} />
                        <Select value={qualityForm.manufacturing_operation_id || 'whole-order'} onValueChange={(value) => setQualityForm({ ...qualityForm, manufacturing_operation_id: value === 'whole-order' ? '' : value })}><SelectTrigger><SelectValue placeholder="مرحلة الفحص" /></SelectTrigger><SelectContent><SelectItem value="whole-order">فحص نهائي</SelectItem>{order.operations?.map((operation) => <SelectItem key={operation.id} value={String(operation.id)}>{operation.sequence}. {operation.name}</SelectItem>)}</SelectContent></Select>
                        <Input placeholder="سبب الفحص / الرفض" value={qualityForm.reason} onChange={(event) => setQualityForm({ ...qualityForm, reason: event.target.value })} />
                        <Button disabled={actionMutation.isPending || inspectionQuantity <= 0 || inspectionQuantity > remainingProduction} onClick={() => actionMutation.mutate({ orderId: order.id, action: 'quality', payload: { result: qualityForm.result, quantity: inspectionQuantity, reason: qualityForm.reason || null, manufacturing_operation_id: qualityForm.manufacturing_operation_id ? Number(qualityForm.manufacturing_operation_id) : null } })}>تسجيل الفحص</Button>
                      </div>
                    )}
                    {order.status === 'in_progress' && (
                      <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto]">
                        <Input type="number" min="0.000001" step="0.001" placeholder={`كمية الاستلام (متبقي ${remainingProduction})`} value={receiptForm.quantity} onChange={(event) => setReceiptForm({ quantity: event.target.value })} />
                        <div className="flex items-center rounded-md bg-muted/40 px-3 text-sm text-muted-foreground">القيد المحاسبي يُسجَّل تلقائيًا على حساب مخزون الإنتاج التام وحساب الإنتاج تحت التشغيل.</div>
                        <Button disabled={actionMutation.isPending || !receiptForm.quantity || latestInspection?.result !== 'pass' || latestInspectionExceedsPlan} onClick={() => actionMutation.mutate({
                          orderId: order.id,
                          action: 'receive',
                          payload: { quantity: Number(receiptForm.quantity) },
                        })}>استلام المنتج التام</Button>
                      </div>
                    )}
                  </section>

                  {order.costs?.length ? (
                    <section className="space-y-2 rounded-xl border p-4 md:p-5">
                      <h3 className="border-b pb-3 font-bold">تفاصيل التكلفة</h3>
                      {order.costs.map((cost) => <div key={cost.id} className="flex justify-between rounded border p-2 text-sm"><span>{cost.notes || cost.cost_type}</span><span>{Number(cost.amount).toFixed(2)}</span></div>)}
                    </section>
                  ) : null}

                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    {['reserved', 'in_progress'].includes(order.status) && <Button variant="outline" disabled={actionMutation.isPending} onClick={() => { const reason = window.prompt('سبب إيقاف أمر التشغيل:'); if (reason && reason.trim().length >= 3) actionMutation.mutate({ orderId: order.id, action: 'pause', payload: { reason: reason.trim() } }); }}><X size={16} /> إيقاف الأمر</Button>}
                    {order.status === 'paused' && <Button disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ orderId: order.id, action: 'resume' })}><CheckCircle2 size={16} /> استئناف الأمر</Button>}
                    {order.status === 'completed' && <Button disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ orderId: order.id, action: 'close' })}><CheckCircle2 size={16} /> إغلاق وتسوية الأمر</Button>}
                    {['draft', 'planned', 'reserved', 'in_progress', 'quality_hold', 'paused'].includes(order.status) && <Button variant="destructive" disabled={actionMutation.isPending} onClick={() => {
                      if (window.confirm('هل تريد إلغاء أمر الإنتاج وعكس الخامات المفتوحة؟')) actionMutation.mutate({ orderId: order.id, action: 'cancel' });
                    }}>إلغاء الأمر</Button>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
