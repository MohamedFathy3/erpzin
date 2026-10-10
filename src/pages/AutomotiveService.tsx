import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Box, CarFront, CheckCircle2, ClipboardList, Clock3, DollarSign, Edit, Package,
  Plus, RefreshCw, Search as SearchIcon, Tag, Trash2, TrendingUp, UserCog, Users, Wrench, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AutomotiveService as automotiveApi,
  AutomotiveCustomer,
  AutomotiveServiceItem,
  AutomotiveServiceOrder,
  AutomotiveTechnician,
  AutomotiveVehicle,
} from '@/services/AutomotiveService';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';

/* ───────────────────────── ثوابت ───────────────────────── */

const statusLabels: Record<string, string> = {
  checked_in: 'تم الاستقبال',
  diagnosis: 'تشخيص',
  awaiting_approval: 'بانتظار الموافقة',
  approved: 'تمت الموافقة',
  in_progress: 'قيد التنفيذ',
  quality_check: 'فحص الجودة',
  ready_for_delivery: 'جاهزة للتسليم',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

const statusFlow = ['checked_in', 'diagnosis', 'awaiting_approval', 'approved', 'in_progress', 'quality_check', 'ready_for_delivery', 'delivered'];

const statusStyles: Record<string, string> = {
  checked_in: 'bg-slate-100 text-slate-700',
  diagnosis: 'bg-violet-100 text-violet-700',
  awaiting_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-blue-100 text-blue-700',
  quality_check: 'bg-indigo-100 text-indigo-700',
  ready_for_delivery: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-rose-100 text-rose-700',
};

const nextActionLabels: Record<string, string> = {
  checked_in: 'بدء التشخيص',
  diagnosis: 'إرسال للموافقة',
  awaiting_approval: 'تمت الموافقة',
  approved: 'بدء التنفيذ',
  in_progress: 'فحص الجودة',
  quality_check: 'جاهز للتسليم',
  ready_for_delivery: 'تسليم',
};

const vehicleMakes = ['Toyota', 'Hyundai', 'Kia', 'Nissan', 'Honda', 'Mercedes-Benz', 'BMW', 'Ford', 'Chevrolet', 'Volkswagen', 'MG', 'Geely', 'Chery', 'Other'];
const commonModels = ['Corolla', 'Camry', 'Yaris', 'Land Cruiser', 'Elantra', 'Tucson', 'Accent', 'Sportage', 'Cerato', 'Sunny', 'Civic', 'CR-V', 'C-Class', 'E-Class', 'X5', 'F-150', 'Tahoe'];

const selectCls = 'h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30';

const emptyServiceForm = {
  code: '', name: '', name_ar: '',
  item_type: 'service' as 'service' | 'product',
  unit: '',
  selling_price: '', estimated_cost: '',
  small_vehicle_quantity: '', large_vehicle_quantity: '',
  small_vehicle_price: '', large_vehicle_price: '',
  stock_quantity: '',
};
const emptyCustomerForm = { name: '', phone: '', email: '', address: '' };
const emptyVehicleForm = { customer_id: '', make: '', model: '', model_year: '', plate_number: '', vin: '', current_mileage: '' };
const emptyOrderForm = { customer_id: '', vehicle_id: '', technician_id: '', customer_request: '' };
const emptyWarranty = { policy_name: '', starts_at: '', ends_at: '', mileage_limit: '' };

type OrderItemDraft = { service_id: string; quantity: string; custom_price: string };
const emptyOrderItem = (): OrderItemDraft => ({ service_id: '', quantity: '1', custom_price: '' });

/* ───────────────────────── مساعدات ───────────────────────── */

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
const fmt = (n: unknown) => Number(n || 0).toLocaleString('en-US');
const str = (n: unknown) => (n === null || n === undefined || n === '' ? '' : String(n));
const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
// خدمة بدون سعر = الكاشير يدخل السعر يدوياً في POS
const isManualPriced = (s: AutomotiveServiceItem) => s.has_fixed_price === false || !(Number(s.selling_price) > 0);

/* ───────────────────────── مكونات صغيرة ───────────────────────── */

const toneMap = {
  primary: { box: 'bg-primary/10 text-primary', bar: 'bg-primary' },
  amber: { box: 'bg-amber-100 text-amber-600', bar: 'bg-amber-500' },
  emerald: { box: 'bg-emerald-100 text-emerald-600', bar: 'bg-emerald-500' },
  violet: { box: 'bg-violet-100 text-violet-600', bar: 'bg-violet-500' },
} as const;

function StatCard({ label, value, icon: Icon, tone = 'primary', loading }: {
  label: string; value: ReactNode; icon: typeof Wrench; tone?: keyof typeof toneMap; loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <div className={cn('absolute inset-y-0 start-0 w-1', toneMap[tone].bar)} />
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading
            ? <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
            : <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', toneMap[tone].box)}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium', statusStyles[status] || 'bg-muted text-foreground')}>
      {statusLabels[status] || status}
    </span>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Wrench; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Icon className="h-7 w-7" /></div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FormPanel({ title, tone = 'primary', onClose, children }: { title: string; tone?: 'primary' | 'emerald'; onClose: () => void; children: ReactNode }) {
  return (
    <Card className={cn('animate-in fade-in slide-in-from-top-2 border-2', tone === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-primary/25 bg-primary/[0.03]')}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="إغلاق"><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative min-w-[220px]', className)}>
      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="ps-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ConfirmDialog({ open, title, message, onCancel, onConfirm }: { open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel} dir="rtl">
      <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600"><AlertTriangle className="h-6 w-6" /></div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
          <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>تأكيد الحذف</Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── الصفحة ───────────────────────── */

const AutomotiveServicePage = () => {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<AutomotiveVehicle[]>([]);
  const [services, setServices] = useState<AutomotiveServiceItem[]>([]);
  const [orders, setOrders] = useState<AutomotiveServiceOrder[]>([]);
  const [report, setReport] = useState<any>(null);
  const [technicianPerformance, setTechnicianPerformance] = useState<any[]>([]);
  const [customers, setCustomers] = useState<AutomotiveCustomer[]>([]);
  const [technicians, setTechnicians] = useState<AutomotiveTechnician[]>([]);
  const [loading, setLoading] = useState(true);

  // بحث وفلاتر
  const [search, setSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'service' | 'product' | 'custom_priced'>('all');

  // فورمات
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState({ ...emptyServiceForm });
  const [deleteTarget, setDeleteTarget] = useState<AutomotiveServiceItem | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ ...emptyVehicleForm });
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({ ...emptyCustomerForm });
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({ ...emptyOrderForm });
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([emptyOrderItem()]);
  const [warrantyForm, setWarrantyForm] = useState({ ...emptyWarranty });
  const [portalForm, setPortalForm] = useState({ customer_id: 0, email: '', password: '' });
  const [createdCredentials, setCreatedCredentials] = useState<Record<number, { email: string; password: string }>>({});

  /* ── تحميل البيانات ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleData, serviceData, orderData, reportData, customerData, technicianData, perfData] = await Promise.all([
        automotiveApi.vehicles(search),
        automotiveApi.services(),
        automotiveApi.orders(),
        automotiveApi.profitabilityReport(),
        automotiveApi.customers(),
        automotiveApi.technicians(),
        automotiveApi.technicianPerformanceReport().catch(() => []),
      ]);
      setVehicles(vehicleData);
      setServices(serviceData);
      setOrders(orderData);
      setReport(reportData);
      setCustomers(customerData);
      setTechnicians(technicianData);
      setTechnicianPerformance(perfData);
    } catch (error) {
      toast.error(errMsg(error, 'تعذر تحميل بيانات خدمة السيارات'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  /* ── قيم محسوبة ── */
  const totals = useMemo(() => ({
    open: orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length,
    ready: orders.filter((o) => o.status === 'ready_for_delivery').length,
    revenue: orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
  }), [orders]);

  const stats = useMemo(() => ({
    total: services.length,
    services: services.filter((s) => s.item_type === 'service').length,
    products: services.filter((s) => s.item_type === 'product').length,
    customPriced: services.filter(isManualPriced).length,
  }), [services]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatus !== 'all' && o.status !== orderStatus) return false;
      if (!q) return true;
      return [o.order_number, o.customer?.name, o.vehicle?.make, o.vehicle?.model, o.vehicle?.plate_number]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [orders, orderSearch, orderStatus]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.phone, c.email].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [customers, customerSearch]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return services.filter((s) => {
      if (q && !(s.name?.toLowerCase().includes(q) || s.name_ar?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q))) return false;
      if (filterType === 'service' && s.item_type !== 'service') return false;
      if (filterType === 'product' && s.item_type !== 'product') return false;
      if (filterType === 'custom_priced' && !isManualPriced(s)) return false;
      return true;
    });
  }, [services, serviceSearch, filterType]);

  const technicianOptions = useMemo(() => technicians.filter((t) => {
    const role = typeof t.role === 'string' ? t.role : t.role?.name;
    return role?.toLowerCase() === 'technician';
  }), [technicians]);

  const orderTotal = useMemo(() => orderItems.reduce((sum, item) => {
    const svc = services.find((s) => s.id === Number(item.service_id));
    if (!svc) return sum;
    const price = isManualPriced(svc) ? Number(item.custom_price || 0) : Number(svc.selling_price || 0);
    return sum + price * Number(item.quantity || 1);
  }, 0), [orderItems, services]);

  const margin = Number(serviceForm.selling_price || 0) - Number(serviceForm.estimated_cost || 0);
  const priceFilled = Number(serviceForm.selling_price) > 0;

  /* ── الخدمات ── */
  const resetServiceForm = () => { setShowServiceForm(false); setEditingServiceId(null); setServiceForm({ ...emptyServiceForm }); };

  const openServiceForm = (service?: AutomotiveServiceItem) => {
    if (service) {
      setEditingServiceId(service.id);
      setServiceForm({
        code: service.code || '', name: service.name || '', name_ar: service.name_ar || '',
        item_type: service.item_type || 'service', unit: service.unit || '',
        selling_price: str(service.selling_price), estimated_cost: str(service.estimated_cost),
        small_vehicle_quantity: str(service.small_vehicle_quantity), large_vehicle_quantity: str(service.large_vehicle_quantity),
        small_vehicle_price: str(service.small_vehicle_price), large_vehicle_price: str(service.large_vehicle_price),
        stock_quantity: str(service.stock_quantity),
      });
    } else {
      setEditingServiceId(null);
      setServiceForm({ ...emptyServiceForm });
    }
    setShowServiceForm(true);
  };

  const saveService = async () => {
    if (!serviceForm.code.trim() || !serviceForm.name.trim()) return toast.error('أدخل كود واسم الخدمة');
    if (serviceForm.item_type === 'product' && !priceFilled) return toast.error('المنتج يتطلب سعر بيع');
    if (serviceForm.selling_price !== '' && !priceFilled) return toast.error('سعر البيع يجب أن يكون أكبر من صفر، أو اتركه فارغاً ليحدده الكاشير في POS');
    const optNum = (v: string) => (v !== '' ? Number(v) : undefined);
    try {
      const payload = {
        ...serviceForm,
        selling_price: priceFilled ? Number(serviceForm.selling_price) : 0,
        has_fixed_price: serviceForm.item_type === 'product' || priceFilled,
        unit: serviceForm.item_type === 'product' ? 'متر' : serviceForm.unit,
        estimated_cost: Number(serviceForm.estimated_cost || 0),
        small_vehicle_quantity: optNum(serviceForm.small_vehicle_quantity),
        large_vehicle_quantity: optNum(serviceForm.large_vehicle_quantity),
        small_vehicle_price: optNum(serviceForm.small_vehicle_price),
        large_vehicle_price: optNum(serviceForm.large_vehicle_price),
        stock_quantity: optNum(serviceForm.stock_quantity),
      };
      if (editingServiceId) {
        await automotiveApi.updateService(editingServiceId, payload);
        toast.success('تم تحديث الخدمة');
      } else {
        await automotiveApi.createService(payload);
        toast.success('تمت إضافة الخدمة');
      }
      resetServiceForm();
      await load();
    } catch (error) { toast.error(errMsg(error, 'تعذر حفظ الخدمة')); }
  };

  const confirmDeleteService = async () => {
    if (!deleteTarget) return;
    try {
      await automotiveApi.deleteService(deleteTarget.id);
      toast.success('تم حذف الخدمة');
      setDeleteTarget(null);
      await load();
    } catch (error) { toast.error(errMsg(error, 'تعذر حذف الخدمة')); setDeleteTarget(null); }
  };

  /* ── الأوامر والعملاء والسيارات ── */
  const moveOrder = async (order: AutomotiveServiceOrder, status: string) => {
    try { await automotiveApi.updateOrderStatus(order.id, status); toast.success('تم تحديث حالة أمر الخدمة'); await load(); }
    catch (error) { toast.error(errMsg(error, 'تعذر تحديث الحالة')); }
  };

  const createCustomer = async () => {
    if (!customerForm.name.trim()) return toast.error('أدخل اسم العميل');
    try {
      await automotiveApi.createCustomer(customerForm);
      setCustomerForm({ ...emptyCustomerForm }); setShowCustomerForm(false);
      toast.success('تمت إضافة العميل'); await load();
    } catch (error) { toast.error(errMsg(error, 'تعذر إضافة العميل')); }
  };

  const createOrder = async () => {
    const selected = orderItems
      .map((item) => ({ ...item, service: services.find((s) => s.id === Number(item.service_id)) }))
      .filter((item) => item.service);
    if (!orderForm.customer_id || !orderForm.vehicle_id || selected.length === 0) return toast.error('اختر العميل والسيارة وخدمة واحدة على الأقل');
    if (selected.some((i) => isManualPriced(i.service!) && !(Number(i.custom_price) > 0))) return toast.error('أدخل السعر للخدمات ذات السعر اليدوي');
    const short = selected.find((i) => i.service!.item_type === 'product' && Number(i.quantity) > Number(i.service!.stock_quantity || 0));
    if (short) return toast.error(`المخزون لا يكفي لـ "${short.service!.name}": المتاح ${fmt(short.service!.stock_quantity)} متر`);
    try {
      await automotiveApi.createOrder({
        customer_id: Number(orderForm.customer_id),
        vehicle_id: Number(orderForm.vehicle_id),
        technician_ids: orderForm.technician_id ? [Number(orderForm.technician_id)] : [],
        customer_request: orderForm.customer_request || undefined,
        warranty: warrantyForm.policy_name
          ? { ...warrantyForm, mileage_limit: warrantyForm.mileage_limit ? Number(warrantyForm.mileage_limit) : undefined }
          : undefined,
        items: selected.map((item) => ({
          service_id: item.service!.id,
          description: item.service!.name,
          quantity: Number(item.quantity || 1),
          unit_price: isManualPriced(item.service!) ? Number(item.custom_price) : Number(item.service!.selling_price),
          unit_cost: Number(item.service!.estimated_cost || 0),
        })),
      });
      setOrderForm({ ...emptyOrderForm });
      setOrderItems([emptyOrderItem()]);
      setWarrantyForm({ ...emptyWarranty });
      setShowOrderForm(false);
      toast.success('تم إنشاء أمر الخدمة وربط الخدمة بالعميل والسيارة');
      await load();
    } catch (error) { toast.error(errMsg(error, 'تعذر إنشاء أمر الخدمة')); }
  };

  const createCustomerAccount = async () => {
    if (!portalForm.customer_id || !portalForm.email || portalForm.password.length < 8) return toast.error('اختر العميل وأدخل بريدًا وكلمة مرور من 8 أحرف على الأقل');
    try {
      await automotiveApi.createCustomerAccount(portalForm);
      setCreatedCredentials((cur) => ({ ...cur, [portalForm.customer_id]: { email: portalForm.email, password: portalForm.password } }));
      setPortalForm({ customer_id: 0, email: '', password: '' });
      toast.success('تم إنشاء دخول العميل للبوابة');
    } catch (error) { toast.error(errMsg(error, 'تعذر إنشاء حساب العميل')); }
  };

  const createVehicle = async () => {
    if (!vehicleForm.customer_id || !vehicleForm.make || !vehicleForm.model) return toast.error('اختر العميل وأدخل ماركة وموديل السيارة');
    try {
      await automotiveApi.createVehicle({
        ...vehicleForm,
        customer_id: Number(vehicleForm.customer_id),
        model_year: vehicleForm.model_year ? Number(vehicleForm.model_year) : undefined,
        current_mileage: vehicleForm.current_mileage ? Number(vehicleForm.current_mileage) : 0,
      });
      setVehicleForm({ ...emptyVehicleForm }); setShowVehicleForm(false);
      toast.success('تمت إضافة السيارة'); await load();
    } catch (error) { toast.error(errMsg(error, 'تعذر إضافة السيارة')); }
  };

  const updateItem = (index: number, patch: Partial<OrderItemDraft>) =>
    setOrderItems((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const filterChips: { key: typeof filterType; label: string; count: number; icon: typeof Wrench }[] = [
    { key: 'all', label: 'الكل', count: stats.total, icon: Box },
    { key: 'service', label: 'خدمات', count: stats.services, icon: Wrench },
    { key: 'product', label: 'منتجات', count: stats.products, icon: Package },
    { key: 'custom_priced', label: 'سعر يدوي', count: stats.customPriced, icon: Tag },
  ];

  /* ───────────────────────── الواجهة ───────────────────────── */
  return (
    <MainLayout activeItem="automotive">
      <div className="min-h-full space-y-6 p-4 md:p-6" dir="rtl">

        {/* الهيدر */}
        <div className="rounded-2xl border bg-gradient-to-l from-primary/10 via-background to-background p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <CarFront className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Automotive Service Center</p>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">خدمة السيارات</h1>
                <p className="mt-1 text-sm text-muted-foreground">مركز موحد للعملاء والسيارات والخدمات وأوامر الصيانة.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowOrderForm((v) => !v)}><Plus className="ml-2 h-4 w-4" /> أمر خدمة جديد</Button>
              <Button variant="outline" onClick={() => setShowCustomerForm((v) => !v)}><Users className="ml-2 h-4 w-4" /> عميل جديد</Button>
              <Button variant="secondary" onClick={() => navigate('/pos')}><DollarSign className="ml-2 h-4 w-4" /> POS</Button>
              <Button variant="secondary" onClick={() => navigate('/POSRetrun')}><RefreshCw className="ml-2 h-4 w-4" /> مرتجعات POS</Button>
              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn('ml-2 h-4 w-4', loading && 'animate-spin')} /> تحديث
              </Button>
            </div>
          </div>
        </div>

        {/* فورم العميل */}
        {showCustomerForm && (
          <FormPanel title="إضافة عميل جديد" onClose={() => setShowCustomerForm(false)}>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="الاسم *"><Input value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></Field>
              <Field label="الهاتف"><Input dir="ltr" className="text-right" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} /></Field>
              <Field label="البريد الإلكتروني"><Input dir="ltr" className="text-right" type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} /></Field>
              <Field label="العنوان"><Input value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} /></Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCustomerForm(false)}>إلغاء</Button>
              <Button onClick={() => void createCustomer()}>حفظ العميل</Button>
            </div>
          </FormPanel>
        )}

        {/* فورم الأمر */}
        {showOrderForm && (
          <FormPanel title="بيع خدمة وإنشاء أمر صيانة" tone="emerald" onClose={() => setShowOrderForm(false)}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="العميل *">
                <select className={selectCls} value={orderForm.customer_id} onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value, vehicle_id: '' })}>
                  <option value="">اختر العميل</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="السيارة *">
                <select className={selectCls} value={orderForm.vehicle_id} onChange={(e) => setOrderForm({ ...orderForm, vehicle_id: e.target.value })}>
                  <option value="">اختر سيارة العميل</option>
                  {vehicles.filter((v) => !orderForm.customer_id || v.customer_id === Number(orderForm.customer_id)).map((v) => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} · {v.plate_number || 'بدون لوحة'}</option>
                  ))}
                </select>
              </Field>
              <Field label="الفني المسؤول">
                <select className={selectCls} value={orderForm.technician_id} onChange={(e) => setOrderForm({ ...orderForm, technician_id: e.target.value })}>
                  <option value="">اختر الفني</option>
                  {technicianOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            </div>

            {/* الخدمات */}
            <div className="mt-5 rounded-xl border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-sm font-semibold">الخدمات *</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setOrderItems([...orderItems, emptyOrderItem()])}>
                  <Plus className="ml-1 h-3.5 w-3.5" /> إضافة خدمة
                </Button>
              </div>
              <div className="space-y-2">
                {orderItems.map((item, index) => {
                  const svc = services.find((s) => s.id === Number(item.service_id));
                  const custom = !!svc && isManualPriced(svc);
                  return (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <select className={cn(selectCls, 'min-w-[220px] flex-1')} value={item.service_id} onChange={(e) => updateItem(index, { service_id: e.target.value, custom_price: '' })}>
                        <option value="">اختر الخدمة</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} · {isManualPriced(s) ? 'سعر يدوي' : fmt(s.selling_price)}{s.item_type === 'product' ? ` · متاح ${fmt(s.stock_quantity)} م` : ''}</option>
                        ))}
                      </select>
                      {custom && (
                        <Input className="w-28" type="number" min="0" placeholder="السعر" value={item.custom_price} onChange={(e) => updateItem(index, { custom_price: e.target.value })} />
                      )}
                      <Input className="w-24" type="number" min={svc?.item_type === 'product' ? '0.001' : '1'} step={svc?.item_type === 'product' ? '0.001' : '1'} placeholder={svc?.item_type === 'product' ? 'متر' : 'الكمية'} value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} />
                      {orderItems.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="text-rose-600" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== index))} aria-label="حذف البند">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">إجمالي الأمر</span>
                <span className="text-xl font-bold tabular-nums text-emerald-600">{fmt(orderTotal)}</span>
              </div>
            </div>

            {/* الضمان */}
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="mb-3 text-sm font-semibold text-amber-800">ضمان الخدمة (اختياري)</p>
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="اسم الضمان"><Input value={warrantyForm.policy_name} onChange={(e) => setWarrantyForm({ ...warrantyForm, policy_name: e.target.value })} /></Field>
                <Field label="يبدأ في"><Input type="date" value={warrantyForm.starts_at} onChange={(e) => setWarrantyForm({ ...warrantyForm, starts_at: e.target.value })} /></Field>
                <Field label="ينتهي في"><Input type="date" value={warrantyForm.ends_at} onChange={(e) => setWarrantyForm({ ...warrantyForm, ends_at: e.target.value })} /></Field>
                <Field label="حد الممشى"><Input type="number" min="0" value={warrantyForm.mileage_limit} onChange={(e) => setWarrantyForm({ ...warrantyForm, mileage_limit: e.target.value })} /></Field>
              </div>
            </div>

            <Field className="mt-4" label="طلب العميل">
              <Input value={orderForm.customer_request} onChange={(e) => setOrderForm({ ...orderForm, customer_request: e.target.value })} placeholder="وصف العطل أو المطلوب" />
            </Field>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowOrderForm(false)}>إلغاء</Button>
              <Button onClick={() => void createOrder()}><CheckCircle2 className="ml-2 h-4 w-4" /> إنشاء الأمر</Button>
            </div>
          </FormPanel>
        )}

        {/* الإحصائيات */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="أوامر مفتوحة" value={totals.open} icon={ClipboardList} tone="primary" loading={loading} />
          <StatCard label="جاهزة للتسليم" value={totals.ready} icon={Clock3} tone="amber" loading={loading} />
          <StatCard label="إجمالي الإيرادات" value={fmt(totals.revenue)} icon={DollarSign} tone="emerald" loading={loading} />
          <StatCard label="العملاء المسجلون" value={customers.length} icon={Users} tone="violet" loading={loading} />
        </div>

        {/* التقارير */}
        {report && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                { title: 'ربحية الخدمات', rows: report.services, label: (r: any) => r.service, key: (r: any) => `${r.product_id || r.service_id}-${r.service}` },
                { title: 'ربحية الفنيين', rows: report.technicians, label: (r: any) => r.technician, key: (r: any) => r.technician_id },
              ].map((block) => (
                <Card key={block.title}>
                  <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-emerald-600" /> {block.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {block.rows?.slice(0, 8).map((row: any) => (
                      <div key={block.key(row)} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 text-sm">
                        <span>{block.label(row)} <small className="text-muted-foreground">({row.orders} أمر)</small></span>
                        <span className="font-semibold tabular-nums text-emerald-600">{fmt(row.profit)} ربح</span>
                      </div>
                    ))}
                    {!block.rows?.length && <p className="py-4 text-center text-sm text-muted-foreground">لا توجد بيانات</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">تقرير العملاء والأرباح</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {report.customers?.slice(0, 12).map((row: any) => (
                  <div key={row.customer_id} className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm md:grid-cols-4">
                    <span className="font-medium">{row.customer}</span>
                    <span className="text-muted-foreground">{row.orders} أمر</span>
                    <span>إيراد: <b className="tabular-nums">{fmt(row.revenue)}</b></span>
                    <span className="font-semibold tabular-nums text-emerald-600">ربح: {fmt(row.profit)}</span>
                  </div>
                ))}
                {!report.customers?.length && <p className="py-4 text-center text-sm text-muted-foreground">لا توجد بيانات</p>}
              </CardContent>
            </Card>

            {report.inventory?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2"><Package className="h-4 w-4" /> مخزون المنتجات (بالمتر)</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      قيمة المخزون: <b className="tabular-nums">{fmt(report.summary?.inventory_value)}</b> · مشتريات الفترة: <b className="tabular-nums">{fmt(report.summary?.purchases)}</b>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-right">
                        <tr>{['المنتج', 'الرصيد (م)', 'تكلفة المتر', 'قيمة المخزون', 'مشتريات الفترة (م)', 'قيمة المشتريات', 'المباع (م)'].map((h) => <th key={h} className="whitespace-nowrap p-2.5 font-semibold">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {report.inventory.map((row: any) => (
                          <tr key={row.service_id} className="border-t hover:bg-muted/30">
                            <td className="p-2.5 font-medium">{row.service}</td>
                            <td className={cn('p-2.5 tabular-nums', Number(row.stock_meters) <= 5 && 'font-semibold text-rose-600')}>{fmt(row.stock_meters)}</td>
                            <td className="p-2.5 tabular-nums">{fmt(row.cost_per_meter)}</td>
                            <td className="p-2.5 tabular-nums">{fmt(row.stock_value)}</td>
                            <td className="p-2.5 tabular-nums">{fmt(row.purchased_meters)}</td>
                            <td className="p-2.5 tabular-nums">{fmt(row.purchase_value)}</td>
                            <td className="p-2.5 tabular-nums">{fmt(row.sold_meters)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">التقرير التفصيلي للخدمات والسيارات</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted text-right">
                      <tr>{['الأمر', 'العميل', 'السيارة', 'الخدمة/المنتج', 'الكمية', 'الأمتار', 'المتبقي', 'الإيراد', 'الربح'].map((h) => <th key={h} className="whitespace-nowrap p-2.5 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {report.details?.map((row: any, index: number) => (
                        <tr key={`${row.order_id}-${index}`} className="border-t hover:bg-muted/30">
                          <td className="p-2.5 font-medium">{row.order_number}</td>
                          <td className="p-2.5">{row.customer}</td>
                          <td className="p-2.5">{row.vehicle || '—'}</td>
                          <td className="p-2.5">{row.service}</td>
                          <td className="p-2.5 tabular-nums">{row.quantity}</td>
                          <td className="p-2.5 tabular-nums">{row.meter_quantity ? fmt(row.meter_quantity * row.quantity) : '—'}</td>
                          <td className="p-2.5 tabular-nums">{row.stock_remaining !== undefined ? fmt(row.stock_remaining) : '—'}</td>
                          <td className="p-2.5 tabular-nums">{fmt(row.revenue)}</td>
                          <td className="p-2.5 font-semibold tabular-nums text-emerald-600">{fmt(row.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!report.details?.length && <p className="py-8 text-center text-muted-foreground">لا توجد تفاصيل ضمن الفترة الحالية</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* أداء الفنيين */}
        {technicianPerformance.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><UserCog className="h-4 w-4 text-primary" /> لوحة أداء الفنيين — للمدير</CardTitle></CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {(() => {
                const max = Math.max(...technicianPerformance.map((i: any) => Number(i.orders || 0)), 1);
                return technicianPerformance.map((row: any) => (
                  <div key={row.technician_id} className="rounded-xl border bg-muted/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-semibold">{row.technician}</span>
                      <span className="text-xs text-muted-foreground">{row.orders} أمر · {row.done_services} خدمة مكتملة · إيراد {fmt(row.revenue)}</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((Number(row.orders || 0) / max) * 100)}%` }} />
                    </div>
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      <p>السيارات: {row.vehicles?.map((v: any) => v.name).join('، ') || '—'}</p>
                      <p>الخدمات: {row.services?.map((s: any) => s.name).join('، ') || '—'}</p>
                    </div>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        )}

        {/* التابات */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="orders"><Wrench className="ml-1.5 h-4 w-4" /> أوامر الخدمة ({orders.length})</TabsTrigger>
            <TabsTrigger value="vehicles"><CarFront className="ml-1.5 h-4 w-4" /> السيارات ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="customers"><Users className="ml-1.5 h-4 w-4" /> العملاء ({customers.length})</TabsTrigger>
            <TabsTrigger value="technicians"><UserCog className="ml-1.5 h-4 w-4" /> الفنيون ({technicians.length})</TabsTrigger>
            <TabsTrigger value="services"><Tag className="ml-1.5 h-4 w-4" /> الخدمات ({stats.total})</TabsTrigger>
          </TabsList>

          {/* ── أوامر الخدمة ── */}
          <TabsContent value="orders">
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> أوامر الخدمة</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SearchBox className="flex-1" value={orderSearch} onChange={setOrderSearch} placeholder="بحث برقم الأمر أو العميل أو السيارة..." />
                  <select className={cn(selectCls, 'w-auto min-w-[160px]')} value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                    <option value="all">كل الحالات</option>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-right">
                      <tr>{['الأمر', 'العميل', 'السيارة', 'الفني', 'الحالة', 'الإجمالي', 'إجراء'].map((h) => <th key={h} className="whitespace-nowrap p-3 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const idx = statusFlow.indexOf(order.status);
                        const progress = idx >= 0 ? Math.round(((idx + 1) / statusFlow.length) * 100) : 0;
                        const next = idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
                        return (
                          <tr key={order.id} className="border-t transition-colors hover:bg-muted/30">
                            <td className="p-3 font-medium">{order.order_number}</td>
                            <td className="p-3">{order.customer?.name || '—'}</td>
                            <td className="p-3">{order.vehicle ? `${order.vehicle.make} ${order.vehicle.model}` : '—'}</td>
                            <td className="p-3">{order.technicians?.map((t) => t.name).join('، ') || <span className="text-muted-foreground">غير معين</span>}</td>
                            <td className="p-3">
                              <div className="space-y-1.5">
                                <StatusBadge status={order.status} />
                                {idx >= 0 && <div className="h-1 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>}
                              </div>
                            </td>
                            <td className="p-3 font-semibold tabular-nums">{fmt(order.total_amount)}</td>
                            <td className="p-3">
                              {next && (
                                <Button size="sm" variant={next === 'ready_for_delivery' || next === 'delivered' ? 'default' : 'outline'} onClick={() => void moveOrder(order, next)}>
                                  {nextActionLabels[order.status]}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!loading && filteredOrders.length === 0 && (
                    <EmptyState icon={ClipboardList} text={orders.length === 0 ? 'لا توجد أوامر خدمة حتى الآن' : 'لا توجد أوامر مطابقة للبحث'} />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── السيارات ── */}
          <TabsContent value="vehicles">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2"><CarFront className="h-5 w-5" /> سجل السيارات</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <SearchBox value={search} onChange={setSearch} placeholder="بحث باللوحة أو VIN أو الموديل" className="w-72" />
                    <Button onClick={() => setShowVehicleForm((v) => !v)}><Plus className="ml-2 h-4 w-4" /> سيارة جديدة</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showVehicleForm && (
                  <div className="mb-5 grid gap-4 rounded-xl border-2 border-primary/25 bg-primary/[0.03] p-4 md:grid-cols-4">
                    <Field label="العميل *">
                      <select className={selectCls} value={vehicleForm.customer_id} onChange={(e) => setVehicleForm({ ...vehicleForm, customer_id: e.target.value })}>
                        <option value="">اختر العميل</option>
                        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="الماركة *">
                      <select className={selectCls} value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}>
                        <option value="">اختر الماركة</option>
                        {vehicleMakes.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    <Field label="الموديل *">
                      <Input list="common-vehicle-models" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="مثال: Corolla" />
                      <datalist id="common-vehicle-models">{commonModels.map((m) => <option key={m} value={m} />)}</datalist>
                    </Field>
                    <Field label="سنة الصنع"><Input type="number" value={vehicleForm.model_year} onChange={(e) => setVehicleForm({ ...vehicleForm, model_year: e.target.value })} /></Field>
                    <Field label="رقم اللوحة"><Input value={vehicleForm.plate_number} onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })} /></Field>
                    <Field label="VIN"><Input dir="ltr" className="text-right" value={vehicleForm.vin} onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })} /></Field>
                    <Field label="الممشى (كم)"><Input type="number" value={vehicleForm.current_mileage} onChange={(e) => setVehicleForm({ ...vehicleForm, current_mileage: e.target.value })} /></Field>
                    <div className="flex items-end gap-2">
                      <Button variant="ghost" onClick={() => setShowVehicleForm(false)}>إلغاء</Button>
                      <Button className="flex-1" onClick={() => void createVehicle()}>حفظ السيارة</Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="transition-shadow hover:shadow-md">
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CarFront className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{vehicle.make} {vehicle.model} {vehicle.model_year || ''}</p>
                          <p className="truncate text-sm text-muted-foreground">{vehicle.customer?.name || 'بدون عميل'}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            <span className="rounded-md border bg-muted/40 px-2 py-0.5 font-medium">{vehicle.plate_number || 'بدون لوحة'}</span>
                            <span className="rounded-md border bg-muted/40 px-2 py-0.5 tabular-nums">{fmt(vehicle.current_mileage)} كم</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {!loading && vehicles.length === 0 && <EmptyState icon={CarFront} text="لا توجد سيارات مسجلة" />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── العملاء ── */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> العملاء ({filteredCustomers.length})</CardTitle>
                  <SearchBox value={customerSearch} onChange={setCustomerSearch} placeholder="بحث بالاسم أو الهاتف أو البريد" className="w-72" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCustomers.map((customer) => {
                    const mine = portalForm.customer_id === customer.id;
                    return (
                      <Card key={customer.id} className="transition-shadow hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                              {customer.name?.trim().charAt(0) || '؟'}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{customer.name}</p>
                              <p className="truncate text-sm text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{customer.phone || customer.email || 'بدون بيانات اتصال'}</p>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground">عدد السيارات: <b>{vehicles.filter((v) => v.customer_id === customer.id).length}</b></p>

                          <div className="mt-3 space-y-2 border-t pt-3">
                            <p className="text-xs font-semibold">دخول بوابة العميل</p>
                            <Input dir="ltr" className="text-right" placeholder="البريد الإلكتروني" value={mine ? portalForm.email : ''}
                              onChange={(e) => setPortalForm({ customer_id: customer.id, email: e.target.value, password: mine ? portalForm.password : '' })} />
                            <Input type="password" dir="ltr" className="text-right" placeholder="كلمة المرور (8 أحرف)" value={mine ? portalForm.password : ''}
                              onChange={(e) => setPortalForm({ customer_id: customer.id, email: mine ? portalForm.email : '', password: e.target.value })} />
                            <Button size="sm" variant="outline" className="w-full" onClick={() => void createCustomerAccount()}>إنشاء بيانات الدخول</Button>
                            {createdCredentials[customer.id] && (
                              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                                <p className="mb-1 flex items-center gap-1 font-semibold"><CheckCircle2 className="h-4 w-4" /> تم إنشاء بيانات الدخول</p>
                                <p dir="ltr" className="text-left"><span className="font-medium">Email:</span> {createdCredentials[customer.id].email}</p>
                                <p dir="ltr" className="text-left"><span className="font-medium">Password:</span> {createdCredentials[customer.id].password}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {!loading && filteredCustomers.length === 0 && <EmptyState icon={Users} text={customers.length ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء'} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── الفنيون ── */}
          <TabsContent value="technicians">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> الفنيون ({technicians.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {technicians.map((technician) => {
                    const assigned = orders.filter((o) => o.technicians?.some((i) => i.id === technician.id));
                    const active = assigned.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
                    return (
                      <Card key={technician.id} className="transition-shadow hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                              {technician.name?.trim().charAt(0) || '؟'}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{technician.name}</p>
                              <p className="truncate text-sm text-muted-foreground">{technician.phone || technician.email || 'بدون بيانات اتصال'}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="rounded-lg bg-muted/40 p-2"><p className="text-lg font-bold tabular-nums">{assigned.length}</p><p className="text-muted-foreground">أوامر مسندة</p></div>
                            <div className="rounded-lg bg-primary/10 p-2"><p className="text-lg font-bold tabular-nums text-primary">{active}</p><p className="text-muted-foreground">قيد العمل</p></div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {!loading && !technicians.length && <EmptyState icon={UserCog} text="لا يوجد فنيون" />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── الخدمات ── */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>كتالوج الخدمات ({filteredServices.length} من {stats.total})</CardTitle>
                  <Button onClick={() => openServiceForm()}><Plus className="ml-2 h-4 w-4" /> خدمة جديدة</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* البحث والفلاتر */}
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 p-3">
                  <SearchBox className="flex-1" value={serviceSearch} onChange={setServiceSearch} placeholder="بحث بالاسم أو الكود..." />
                  <div className="flex flex-wrap gap-1.5">
                    {filterChips.map(({ key, label, count, icon: Icon }) => (
                      <Button key={key} size="sm" variant={filterType === key ? 'default' : 'outline'} onClick={() => setFilterType(key)}>
                        <Icon className="ml-1.5 h-3.5 w-3.5" /> {label} ({count})
                      </Button>
                    ))}
                  </div>
                </div>

                {/* فورم الإضافة/التعديل */}
                {showServiceForm && (
                  <div className="mb-5 space-y-4 rounded-xl border-2 border-primary/30 bg-primary/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-2 text-lg font-bold">
                        {editingServiceId ? <><Edit className="h-5 w-5" /> تعديل خدمة</> : <><Plus className="h-5 w-5" /> خدمة جديدة</>}
                      </p>
                      <Button size="icon" variant="ghost" onClick={resetServiceForm} aria-label="إغلاق"><X className="h-4 w-4" /></Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <Field label="النوع *">
                        <div className="grid grid-cols-2 gap-1 rounded-lg border bg-background p-1">
                          {([['service', 'خدمة', Wrench], ['product', 'منتج', Package]] as const).map(([val, lbl, Icon]) => (
                            <button key={val} type="button"
                              className={cn('flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
                                serviceForm.item_type === val ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted')}
                              onClick={() => setServiceForm({ ...serviceForm, item_type: val })}>
                              <Icon className="h-4 w-4" /> {lbl}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="الكود *"><Input dir="ltr" className="text-right" value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })} placeholder="WASH-001" /></Field>
                      <Field label="الاسم *"><Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Car Wash" /></Field>
                      <Field label="الاسم العربي"><Input value={serviceForm.name_ar} onChange={(e) => setServiceForm({ ...serviceForm, name_ar: e.target.value })} placeholder="غسيل سيارات" /></Field>
                    </div>

                    {/* التسعير */}
                    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
                      <p className="mb-3 text-sm font-bold text-primary">إعدادات التسعير</p>

                      <div className="grid gap-4 md:grid-cols-4">
                        <Field
                          label={serviceForm.item_type === 'product' ? 'سعر البيع *' : 'سعر البيع (اختياري)'}
                          hint={serviceForm.item_type === 'product' ? 'يظهر في POS تلقائياً' : 'اتركه فارغاً ليدخله الكاشير في POS'}
                        >
                          <Input type="number" min="0" value={serviceForm.selling_price} onChange={(e) => setServiceForm({ ...serviceForm, selling_price: e.target.value })} placeholder={serviceForm.item_type === 'product' ? '100' : 'بدون سعر'} />
                        </Field>
                        <Field label={serviceForm.item_type === 'product' ? 'تكلفة المتر' : 'التكلفة'} hint={priceFilled ? `هامش الربح: ${fmt(margin)}` : undefined}>
                          <Input type="number" min="0" value={serviceForm.estimated_cost} onChange={(e) => setServiceForm({ ...serviceForm, estimated_cost: e.target.value })} />
                        </Field>
                        {serviceForm.item_type === 'product' && (
                          <>
                            <Field label="الوحدة" hint="المنتجات تُدخل وتُباع بالمتر"><Input value="متر" disabled readOnly /></Field>
                            <Field label={editingServiceId ? 'رصيد المخزون الحالي (متر)' : 'الرصيد الافتتاحي (متر)'} hint="الزيادة تتم من المشتريات بعدد الأمتار، والخصم تلقائي عند البيع"><Input type="number" min="0" step="0.001" value={serviceForm.stock_quantity} onChange={(e) => setServiceForm({ ...serviceForm, stock_quantity: e.target.value })} placeholder="50" /></Field>
                          </>
                        )}
                      </div>

                      <div className={cn('mt-4 flex items-start gap-3 rounded-lg border p-3',
                        priceFilled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800' : 'border-amber-500/30 bg-amber-500/10 text-amber-800')}>
                        {priceFilled ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
                        <div>
                          <p className="text-sm font-semibold">{priceFilled ? 'سعر ثابت' : serviceForm.item_type === 'product' ? 'المنتج يتطلب سعر بيع' : 'سعر يدوي'}</p>
                          <p className="text-xs">
                            {priceFilled
                              ? 'السعر يظهر تلقائياً في POS ولن يُطلب من الكاشير.'
                              : serviceForm.item_type === 'product'
                                ? 'أدخل سعر البيع ليُحفظ المنتج.'
                                : 'بدون سعر: الكاشير سيدخل السعر يدوياً في POS عند البيع.'}
                          </p>
                        </div>
                      </div>

                      {serviceForm.item_type === 'product' && (
                        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CarFront className="h-4 w-4" /> الأمتار حسب حجم السيارة</p>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Field label="الصغير: عدد الأمتار"><Input type="number" min="0" value={serviceForm.small_vehicle_quantity} onChange={(e) => setServiceForm({ ...serviceForm, small_vehicle_quantity: e.target.value })} placeholder="12" /></Field>
                            <Field label="سعر الصغير"><Input type="number" min="0" value={serviceForm.small_vehicle_price} onChange={(e) => setServiceForm({ ...serviceForm, small_vehicle_price: e.target.value })} /></Field>
                            <Field label="الكبير: عدد الأمتار"><Input type="number" min="0" value={serviceForm.large_vehicle_quantity} onChange={(e) => setServiceForm({ ...serviceForm, large_vehicle_quantity: e.target.value })} placeholder="15" /></Field>
                            <Field label="سعر الكبير"><Input type="number" min="0" value={serviceForm.large_vehicle_price} onChange={(e) => setServiceForm({ ...serviceForm, large_vehicle_price: e.target.value })} /></Field>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={resetServiceForm}>إلغاء</Button>
                      <Button onClick={() => void saveService()}><CheckCircle2 className="ml-2 h-4 w-4" /> {editingServiceId ? 'تحديث' : 'حفظ'} وإظهار في POS</Button>
                    </div>
                  </div>
                )}

                {/* قائمة الخدمات */}
                {loading && services.length === 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />)}
                  </div>
                ) : filteredServices.length === 0 ? (
                  <EmptyState icon={Tag} text={services.length === 0 ? 'لا توجد خدمات أو منتجات بعد' : 'لا توجد نتائج مطابقة للفلتر'} />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredServices.map((service) => {
                      const isCustom = isManualPriced(service);
                      const isProduct = service.item_type === 'product';
                      const lowStock = isProduct && Number(service.stock_quantity || 0) <= 5;
                      const barColor = isCustom ? 'bg-amber-500' : isProduct ? 'bg-emerald-500' : 'bg-blue-500';
                      const Icon = isProduct ? Package : Wrench;
                      return (
                        <Card key={service.id} className={cn('group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg', isCustom && 'border-amber-500/30')}>
                          <div className={cn('absolute inset-x-0 top-0 h-1', barColor)} />
                          <CardContent className="p-4 pt-5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                  isProduct ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold">{service.name}</p>
                                  {service.name_ar && <p className="truncate text-xs text-muted-foreground">{service.name_ar}</p>}
                                  <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{service.code}</p>
                                </div>
                              </div>
                              {isCustom ? (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700"><Tag className="h-3 w-3" /> سعر يدوي</span>
                              ) : (
                                <span className="whitespace-nowrap text-lg font-bold tabular-nums">{fmt(service.selling_price)}</span>
                              )}
                            </div>

                            <div className="mt-3 space-y-1.5 border-t pt-3 text-xs">
                              {isProduct && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">المخزون</span>
                                  <span className={cn('inline-flex items-center gap-1 font-medium tabular-nums', lowStock && 'text-rose-600')}>
                                    {lowStock && <AlertTriangle className="h-3 w-3" />}
                                    {fmt(service.stock_quantity)} م
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{isProduct ? 'تكلفة المتر' : 'التكلفة'}</span>
                                <span className="font-medium tabular-nums">{fmt(service.estimated_cost)}</span>
                              </div>
                              {!isCustom && Number(service.selling_price) > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">هامش الربح</span>
                                  <span className="font-medium tabular-nums text-emerald-600">{fmt(Number(service.selling_price) - Number(service.estimated_cost || 0))}</span>
                                </div>
                              )}
                              {Number(service.small_vehicle_quantity) > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">سيارة صغيرة</span>
                                  <span className="tabular-nums">{service.small_vehicle_quantity} م / {fmt(service.small_vehicle_price)}</span>
                                </div>
                              )}
                              {Number(service.large_vehicle_quantity) > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">سيارة كبيرة</span>
                                  <span className="tabular-nums">{service.large_vehicle_quantity} م / {fmt(service.large_vehicle_price)}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex gap-2 border-t pt-3">
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => openServiceForm(service)}>
                                <Edit className="ml-1 h-3.5 w-3.5" /> تعديل
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDeleteTarget(service)}>
                                <Trash2 className="ml-1 h-3.5 w-3.5" /> حذف
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف الخدمة"
        message={`هل أنت متأكد من حذف "${deleteTarget?.name ?? ''}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteService()}
      />
    </MainLayout>
  );
};

export default AutomotiveServicePage;