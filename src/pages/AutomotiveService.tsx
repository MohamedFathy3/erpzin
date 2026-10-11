import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Box, CarFront, CheckCircle2, ClipboardList, Clock3, DollarSign, Edit, Package,
  Plus, RefreshCw, Search as SearchIcon, Tag, TrendingUp, UserCog, Users, Wrench, X, ChevronLeft,
  Sparkles, Activity, CircleDot, Gauge, ShieldCheck, ArrowLeft,
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
  checked_in: 'bg-slate-100 text-slate-700 ring-slate-200',
  diagnosis: 'bg-violet-100 text-violet-700 ring-violet-200',
  awaiting_approval: 'bg-amber-100 text-amber-700 ring-amber-200',
  approved: 'bg-sky-100 text-sky-700 ring-sky-200',
  in_progress: 'bg-blue-100 text-blue-700 ring-blue-200',
  quality_check: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  ready_for_delivery: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  delivered: 'bg-green-100 text-green-800 ring-green-200',
  cancelled: 'bg-rose-100 text-rose-700 ring-rose-200',
};

const statusDot: Record<string, string> = {
  checked_in: 'bg-slate-500',
  diagnosis: 'bg-violet-500',
  awaiting_approval: 'bg-amber-500',
  approved: 'bg-sky-500',
  in_progress: 'bg-blue-500',
  quality_check: 'bg-indigo-500',
  ready_for_delivery: 'bg-emerald-500',
  delivered: 'bg-green-600',
  cancelled: 'bg-rose-500',
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

const selectCls = 'h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10';

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
const isManualPriced = (s: AutomotiveServiceItem) => s.has_fixed_price === false || !(Number(s.selling_price) > 0);

/* ───────────────────────── مكونات مساعدة ───────────────────────── */

const toneMap = {
  primary: { box: 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary', bar: 'bg-primary', glow: 'shadow-primary/20' },
  amber: { box: 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600', bar: 'bg-amber-500', glow: 'shadow-amber-500/20' },
  emerald: { box: 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600', bar: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
  violet: { box: 'bg-gradient-to-br from-violet-100 to-violet-50 text-violet-600', bar: 'bg-violet-500', glow: 'shadow-violet-500/20' },
} as const;

function StatCard({ label, value, icon: Icon, tone = 'primary', loading, hint }: {
  label: string; value: ReactNode; icon: typeof Wrench; tone?: keyof typeof toneMap; loading?: boolean; hint?: string;
}) {
  return (
    <Card className={cn(
      'group relative overflow-hidden rounded-2xl border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
      toneMap[tone].glow,
    )}>
      <div className={cn('absolute inset-x-0 top-0 h-1', toneMap[tone].bar)} />
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.12]', toneMap[tone].bar)} />
      <CardContent className="relative flex items-center justify-between p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading
            ? <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-muted" />
            : <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>}
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110', toneMap[tone].box)}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
      statusStyles[status] || 'bg-muted text-foreground ring-border',
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[status] || 'bg-foreground')} />
      {statusLabels[status] || status}
    </span>
  );
}

function EmptyState({ icon: Icon, text, hint }: { icon: typeof Wrench; text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/40">
        <Icon className="h-8 w-8 opacity-60" />
      </div>
      <p className="text-sm font-medium">{text}</p>
      {hint && <p className="text-xs opacity-70">{hint}</p>}
    </div>
  );
}

function Field({ label, hint, className, children, required }: { label: string; hint?: string; className?: string; children: ReactNode; required?: boolean }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="flex items-center gap-1 text-sm font-medium">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FormPanel({ title, tone = 'primary', onClose, children, icon: Icon }: {
  title: string; tone?: 'primary' | 'emerald'; onClose: () => void; children: ReactNode; icon?: typeof Wrench;
}) {
  return (
    <Card className={cn(
      'animate-in fade-in slide-in-from-top-2 overflow-hidden rounded-2xl border-2 shadow-lg',
      tone === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-emerald-500/5' : 'border-primary/25 bg-primary/[0.02] shadow-primary/5',
    )}>
      <CardHeader className={cn(
        'flex-row items-center justify-between space-y-0 border-b pb-3',
        tone === 'emerald' ? 'bg-emerald-500/[0.04]' : 'bg-primary/[0.04]',
      )}>
        <CardTitle className="flex items-center gap-2 text-lg">
          {Icon && <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg',
            tone === 'emerald' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/15 text-primary')}>
            <Icon className="h-4 w-4" />
          </div>}
          {title}
        </CardTitle>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={onClose} aria-label="إغلاق">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative min-w-[220px]', className)}>
      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-10 rounded-xl border-border/60 ps-9 transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, action }: { icon: typeof Wrench; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
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

  const [search, setSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState({ ...emptyServiceForm });
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
  const [activeTab, setActiveTab] = useState('orders');

  /* ── تحميل البيانات ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleData, serviceData, orderData, reportData, customerData, technicianData, perfData] = await Promise.all([
        automotiveApi.vehicles(search).catch(() => []),
        automotiveApi.services().catch(() => []),
        automotiveApi.orders().catch(() => []),
        automotiveApi.profitabilityReport().catch(() => null),
        automotiveApi.customers().catch(() => []),
        automotiveApi.technicians().catch(() => []),
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

  /* ── إحصائيات ── */
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

  /* ── فلترة ── */
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
    if (!q) return services;
    return services.filter((s) =>
      s.name?.toLowerCase().includes(q) ||
      s.name_ar?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q)
    );
  }, [services, serviceSearch]);

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
  const resetServiceForm = () => {
    setShowServiceForm(false);
    setEditingServiceId(null);
    setServiceForm({ ...emptyServiceForm });
  };

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

  /* ── الأوامر ── */
  const moveOrder = async (order: AutomotiveServiceOrder, status: string) => {
    try { await automotiveApi.updateOrderStatus(order.id, status); toast.success('تم تحديث حالة أمر الخدمة'); await load(); }
    catch (error) { toast.error(errMsg(error, 'تعذر تحديث الحالة')); }
  };

  /* ── العملاء ── */
  const createCustomer = async () => {
    if (!customerForm.name.trim()) return toast.error('أدخل اسم العميل');
    try {
      await automotiveApi.createCustomer(customerForm);
      setCustomerForm({ ...emptyCustomerForm });
      setShowCustomerForm(false);
      toast.success('تمت إضافة العميل');
      await load();
    } catch (error) { toast.error(errMsg(error, 'تعذر إضافة العميل')); }
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

  /* ── السيارات ── */
  const createVehicle = async () => {
    if (!vehicleForm.customer_id || !vehicleForm.make || !vehicleForm.model) return toast.error('اختر العميل وأدخل ماركة وموديل السيارة');
    try {
      await automotiveApi.createVehicle({
        ...vehicleForm,
        customer_id: Number(vehicleForm.customer_id),
        model_year: vehicleForm.model_year ? Number(vehicleForm.model_year) : undefined,
        current_mileage: vehicleForm.current_mileage ? Number(vehicleForm.current_mileage) : 0,
      });
      setVehicleForm({ ...emptyVehicleForm });
      setShowVehicleForm(false);
      toast.success('تمت إضافة السيارة');
      await load();
    } catch (error) { toast.error(errMsg(error, 'تعذر إضافة السيارة')); }
  };

  /* ── الأوامر ── */
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

  const updateItem = (index: number, patch: Partial<OrderItemDraft>) =>
    setOrderItems((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  /* ───────────────────────── الواجهة ───────────────────────── */
  return (
    <MainLayout activeItem="automotive">
      <div className="min-h-full space-y-6 p-4 md:p-6 lg:p-8" dir="rtl">

        {/* ═══════════════ الهيدر ═══════════════ */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/[0.08] via-background to-background p-6 md:p-8">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-xl shadow-primary/30">
                <CarFront className="h-8 w-8" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-background">
                  <Sparkles className="h-3 w-3" />
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Automotive Service Center</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">خدمة السيارات</h1>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  مركز موحد لإدارة العملاء، السيارات، الخدمات، أوامر الصيانة، وتقارير الربحية.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="lg"
                onClick={() => setShowOrderForm((v) => !v)}
                className="rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                <Plus className="ml-2 h-4 w-4" /> أمر خدمة جديد
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl" onClick={() => setShowCustomerForm((v) => !v)}>
                <Users className="ml-2 h-4 w-4" /> عميل جديد
              </Button>
              <Button size="lg" variant="secondary" className="rounded-xl" onClick={() => navigate('/pos')}>
                <DollarSign className="ml-2 h-4 w-4" /> POS
              </Button>
              <Button size="lg" variant="ghost" className="rounded-xl" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn('ml-2 h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* شريط سريع */}
          <div className="relative mt-6 grid gap-3 border-t border-border/40 pt-5 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">أوامر نشطة</p>
                <p className="text-lg font-bold tabular-nums">{totals.open}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">جاهزة للتسليم</p>
                <p className="text-lg font-bold tabular-nums">{totals.ready}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-lg font-bold tabular-nums">{fmt(totals.revenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ فورم العميل ═══════════════ */}
        {showCustomerForm && (
          <FormPanel title="إضافة عميل جديد" onClose={() => setShowCustomerForm(false)} icon={Users}>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="الاسم" required>
                <Input className="h-10 rounded-xl" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
              </Field>
              <Field label="الهاتف">
                <Input className="h-10 rounded-xl" dir="ltr" style={{ textAlign: 'right' }} value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
              </Field>
              <Field label="البريد الإلكتروني">
                <Input className="h-10 rounded-xl" dir="ltr" style={{ textAlign: 'right' }} type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
              </Field>
              <Field label="العنوان">
                <Input className="h-10 rounded-xl" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCustomerForm(false)}>إلغاء</Button>
              <Button onClick={() => void createCustomer()}>
                <CheckCircle2 className="ml-2 h-4 w-4" /> حفظ العميل
              </Button>
            </div>
          </FormPanel>
        )}

        {/* ═══════════════ فورم الأمر ═══════════════ */}
        {showOrderForm && (
          <FormPanel title="بيع خدمة وإنشاء أمر صيانة" tone="emerald" onClose={() => setShowOrderForm(false)} icon={Wrench}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="العميل" required>
                <select className={selectCls} value={orderForm.customer_id} onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value, vehicle_id: '' })}>
                  <option value="">اختر العميل</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="السيارة" required>
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

            <div className="mt-5 rounded-2xl border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Box className="h-4 w-4 text-primary" /> الخدمات المطلوبة
                  <span className="text-rose-500">*</span>
                </Label>
                <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => setOrderItems([...orderItems, emptyOrderItem()])}>
                  <Plus className="ml-1 h-3.5 w-3.5" /> إضافة خدمة
                </Button>
              </div>
              <div className="space-y-2">
                {orderItems.map((item, index) => {
                  const svc = services.find((s) => s.id === Number(item.service_id));
                  const custom = !!svc && isManualPriced(svc);
                  return (
                    <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <select className={cn(selectCls, 'min-w-[220px] flex-1')} value={item.service_id} onChange={(e) => updateItem(index, { service_id: e.target.value, custom_price: '' })}>
                        <option value="">اختر الخدمة</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {isManualPriced(s) ? 'سعر يدوي' : fmt(s.selling_price)}
                            {s.item_type === 'product' ? ` · متاح ${fmt(s.stock_quantity)} م` : ''}
                          </option>
                        ))}
                      </select>
                      {custom && (
                        <Input className="h-10 w-28 rounded-xl" type="number" min="0" placeholder="السعر" value={item.custom_price} onChange={(e) => updateItem(index, { custom_price: e.target.value })} />
                      )}
                      <Input
                        className="h-10 w-24 rounded-xl"
                        type="number"
                        min={svc?.item_type === 'product' ? '0.001' : '1'}
                        step={svc?.item_type === 'product' ? '0.001' : '1'}
                        placeholder={svc?.item_type === 'product' ? 'متر' : 'الكمية'}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      />
                      {orderItems.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== index))} aria-label="حذف البند">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <span className="text-sm font-medium text-emerald-800">إجمالي الأمر</span>
                <span className="text-2xl font-bold tabular-nums text-emerald-600">{fmt(orderTotal)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                <ShieldCheck className="h-4 w-4" /> ضمان الخدمة (اختياري)
              </p>
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="اسم الضمان"><Input className="h-10 rounded-xl" value={warrantyForm.policy_name} onChange={(e) => setWarrantyForm({ ...warrantyForm, policy_name: e.target.value })} /></Field>
                <Field label="يبدأ في"><Input className="h-10 rounded-xl" type="date" value={warrantyForm.starts_at} onChange={(e) => setWarrantyForm({ ...warrantyForm, starts_at: e.target.value })} /></Field>
                <Field label="ينتهي في"><Input className="h-10 rounded-xl" type="date" value={warrantyForm.ends_at} onChange={(e) => setWarrantyForm({ ...warrantyForm, ends_at: e.target.value })} /></Field>
                <Field label="حد الممشى"><Input className="h-10 rounded-xl" type="number" min="0" value={warrantyForm.mileage_limit} onChange={(e) => setWarrantyForm({ ...warrantyForm, mileage_limit: e.target.value })} /></Field>
              </div>
            </div>

            <Field className="mt-4" label="طلب العميل">
              <Input className="h-10 rounded-xl" value={orderForm.customer_request} onChange={(e) => setOrderForm({ ...orderForm, customer_request: e.target.value })} placeholder="وصف العطل أو المطلوب" />
            </Field>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowOrderForm(false)}>إلغاء</Button>
              <Button onClick={() => void createOrder()} className="rounded-xl shadow-lg shadow-primary/20">
                <CheckCircle2 className="ml-2 h-4 w-4" /> إنشاء الأمر
              </Button>
            </div>
          </FormPanel>
        )}

        {/* ═══════════════ الإحصائيات ═══════════════ */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="أوامر مفتوحة" value={totals.open} icon={ClipboardList} tone="primary" loading={loading} hint="قيد العمل حالياً" />
          <StatCard label="جاهزة للتسليم" value={totals.ready} icon={Clock3} tone="amber" loading={loading} hint="بانتظار العميل" />
          <StatCard label="إجمالي الإيرادات" value={fmt(totals.revenue)} icon={DollarSign} tone="emerald" loading={loading} hint="من كل الأوامر" />
          <StatCard label="العملاء المسجلون" value={customers.length} icon={Users} tone="violet" loading={loading} hint="في قاعدة البيانات" />
        </div>

        {/* ═══════════════ التقارير ═══════════════ */}
        {report && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl border-border/60">
              <CardHeader className="border-b bg-gradient-to-l from-emerald-500/[0.06] to-transparent pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  ربحية الخدمات
                  <span className="mr-auto text-xs font-normal text-muted-foreground">أعلى 6</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {report.services?.slice(0, 6).map((row: any, i: number) => (
                  <div key={`${row.product_id || row.service_id}-${row.service}`} className="group flex items-center justify-between rounded-xl border bg-gradient-to-l from-emerald-500/[0.04] to-transparent p-3 text-sm transition-colors hover:from-emerald-500/[0.08]">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-[10px] font-bold text-emerald-700">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium">{row.service}</span>
                      <small className="whitespace-nowrap text-muted-foreground">({row.orders} أمر)</small>
                    </div>
                    <span className="whitespace-nowrap font-semibold tabular-nums text-emerald-600">{fmt(row.profit)}</span>
                  </div>
                ))}
                {!report.services?.length && <EmptyState icon={TrendingUp} text="لا توجد بيانات ربحية بعد" />}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-border/60">
              <CardHeader className="border-b bg-gradient-to-l from-violet-500/[0.06] to-transparent pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600">
                    <UserCog className="h-4 w-4" />
                  </div>
                  ربحية الفنيين
                  <span className="mr-auto text-xs font-normal text-muted-foreground">أعلى 6</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {report.technicians?.slice(0, 6).map((row: any, i: number) => (
                  <div key={row.technician_id} className="flex items-center justify-between rounded-xl border bg-gradient-to-l from-violet-500/[0.04] to-transparent p-3 text-sm transition-colors hover:from-violet-500/[0.08]">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-[10px] font-bold text-violet-700">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium">{row.technician}</span>
                      <small className="whitespace-nowrap text-muted-foreground">({row.orders} أمر)</small>
                    </div>
                    <span className="whitespace-nowrap font-semibold tabular-nums text-violet-600">{fmt(row.profit)}</span>
                  </div>
                ))}
                {!report.technicians?.length && <EmptyState icon={UserCog} text="لا توجد بيانات للفنيين" />}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════ مخزون المنتجات ═══════════════ */}
        {report?.inventory?.length > 0 && (
          <Card className="overflow-hidden rounded-2xl border-border/60">
            <CardHeader className="border-b bg-gradient-to-l from-emerald-500/[0.06] to-transparent pb-3">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                    <Package className="h-4 w-4" />
                  </div>
                  مخزون المنتجات (بالمتر)
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  قيمة المخزون: <b className="tabular-nums text-emerald-600">{fmt(report.summary?.inventory_value)}</b>
                  <span className="mx-2 opacity-30">·</span>
                  مشتريات الفترة: <b className="tabular-nums text-blue-600">{fmt(report.summary?.purchases)}</b>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {report.inventory.map((row: any) => {
                  const low = Number(row.stock_meters) <= 5;
                  return (
                    <div key={row.service_id} className={cn(
                      'group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
                      low ? 'border-rose-300 bg-rose-500/[0.03]' : 'border-border/60',
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{row.service}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">تكلفة المتر: {fmt(row.cost_per_meter)}</p>
                        </div>
                        {low && (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600">
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-muted/40 p-2">
                          <p className={cn('text-lg font-bold tabular-nums', low && 'text-rose-600')}>{fmt(row.stock_meters)}</p>
                          <p className="text-muted-foreground">الرصيد (م)</p>
                        </div>
                        <div className="rounded-xl bg-emerald-500/10 p-2">
                          <p className="text-lg font-bold tabular-nums text-emerald-600">{fmt(row.stock_value)}</p>
                          <p className="text-muted-foreground">قيمة المخزون</p>
                        </div>
                        <div className="rounded-xl bg-blue-500/10 p-2">
                          <p className="text-lg font-bold tabular-nums text-blue-600">{fmt(row.purchased_meters)}</p>
                          <p className="text-muted-foreground">مشتريات (م)</p>
                        </div>
                        <div className="rounded-xl bg-amber-500/10 p-2">
                          <p className="text-lg font-bold tabular-nums text-amber-600">{fmt(row.sold_meters)}</p>
                          <p className="text-muted-foreground">مباع (م)</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════ أداء الفنيين ═══════════════ */}
        {technicianPerformance.length > 0 && (
          <Card className="overflow-hidden rounded-2xl border-primary/20">
            <CardHeader className="border-b bg-gradient-to-l from-primary/[0.06] to-transparent pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <UserCog className="h-4 w-4" />
                </div>
                لوحة أداء الفنيين
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">للمدير</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4 lg:grid-cols-2">
              {(() => {
                const max = Math.max(...technicianPerformance.map((i: any) => Number(i.orders || 0)), 1);
                return technicianPerformance.map((row: any) => (
                  <div key={row.technician_id} className="rounded-2xl border bg-muted/10 p-4 transition-colors hover:bg-muted/20">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-violet-50 text-xs font-bold text-violet-700">
                          {row.technician?.charAt(0) || '؟'}
                        </span>
                        {row.technician}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.orders} أمر · {row.done_services} خدمة · إيراد {fmt(row.revenue)}
                      </span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-primary to-primary/60 transition-all duration-500"
                        style={{ width: `${Math.round((Number(row.orders || 0) / max) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-start gap-1.5">
                        <CarFront className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                        <span className="line-clamp-1">{row.vehicles?.map((v: any) => v.name).join('، ') || '—'}</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Wrench className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                        <span className="line-clamp-1">{row.services?.map((s: any) => s.name).join('، ') || '—'}</span>
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        )}

        {/* ═══════════════ التابات ═══════════════ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border bg-muted/30 p-1.5">
            <TabsTrigger value="orders" className="rounded-xl data-[state=active]:shadow-sm">
              <Wrench className="ml-1.5 h-4 w-4" /> أوامر الخدمة
              <span className="mr-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{orders.length}</span>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="rounded-xl data-[state=active]:shadow-sm">
              <CarFront className="ml-1.5 h-4 w-4" /> السيارات
              <span className="mr-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{vehicles.length}</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="rounded-xl data-[state=active]:shadow-sm">
              <Users className="ml-1.5 h-4 w-4" /> العملاء
              <span className="mr-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{customers.length}</span>
            </TabsTrigger>
            <TabsTrigger value="technicians" className="rounded-xl data-[state=active]:shadow-sm">
              <UserCog className="ml-1.5 h-4 w-4" /> الفنيون
              <span className="mr-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{technicians.length}</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-xl data-[state=active]:shadow-sm">
              <Tag className="ml-1.5 h-4 w-4" /> الخدمات
              <span className="mr-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{stats.total}</span>
            </TabsTrigger>
          </TabsList>

          {/* ── أوامر الخدمة ── */}
          <TabsContent value="orders">
            <Card className="overflow-hidden rounded-2xl border-border/60">
              <CardHeader className="space-y-3 border-b bg-muted/20">
                <SectionTitle icon={Wrench} title="أوامر الخدمة" subtitle={`${filteredOrders.length} من ${orders.length} أمر`} />
                <div className="flex flex-wrap items-center gap-2">
                  <SearchBox className="flex-1" value={orderSearch} onChange={setOrderSearch} placeholder="بحث برقم الأمر أو العميل أو السيارة..." />
                  <select className={cn(selectCls, 'w-auto min-w-[160px]')} value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                    <option value="all">كل الحالات</option>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-right">
                      <tr>
                        {['الأمر', 'العميل', 'السيارة', 'الفني', 'التقدم', 'الإجمالي', 'إجراء'].map((h) => (
                          <th key={h} className="whitespace-nowrap p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const idx = statusFlow.indexOf(order.status);
                        const progress = idx >= 0 ? Math.round(((idx + 1) / statusFlow.length) * 100) : 0;
                        const next = idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
                        return (
                          <tr key={order.id} className="border-t transition-colors hover:bg-muted/30">
                            <td className="p-3">
                              <span className="font-mono text-xs font-medium">{order.order_number}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-medium">{order.customer?.name || '—'}</span>
                            </td>
                            <td className="p-3">
                              {order.vehicle ? (
                                <span className="flex items-center gap-1.5">
                                  <CarFront className="h-3.5 w-3.5 text-muted-foreground" />
                                  {order.vehicle.make} {order.vehicle.model}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="p-3">
                              {order.technicians?.length ? (
                                <span className="flex flex-wrap gap-1">
                                  {order.technicians.map((t) => (
                                    <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700">
                                      <CircleDot className="h-2.5 w-2.5" />
                                      {t.name}
                                    </span>
                                  ))}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">غير معين</span>}
                            </td>
                            <td className="p-3">
                              <div className="space-y-1.5">
                                <StatusBadge status={order.status} />
                                {idx >= 0 && (
                                  <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-gradient-to-l from-primary to-primary/60 transition-all" style={{ width: `${progress}%` }} />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold tabular-nums">{fmt(order.total_amount)}</span>
                            </td>
                            <td className="p-3">
                              {next && (
                                <Button
                                  size="sm"
                                  variant={next === 'ready_for_delivery' || next === 'delivered' ? 'default' : 'outline'}
                                  className="rounded-lg"
                                  onClick={() => void moveOrder(order, next)}
                                >
                                  {nextActionLabels[order.status]}
                                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!loading && filteredOrders.length === 0 && (
                    <EmptyState
                      icon={ClipboardList}
                      text={orders.length === 0 ? 'لا توجد أوامر خدمة حتى الآن' : 'لا توجد أوامر مطابقة للبحث'}
                      hint={orders.length === 0 ? 'ابدأ بإنشاء أمر خدمة جديد من الأعلى' : 'جرب تغيير كلمة البحث أو الفلتر'}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── السيارات ── */}
          <TabsContent value="vehicles">
            <Card className="overflow-hidden rounded-2xl border-border/60">
              <CardHeader className="border-b bg-muted/20">
                <SectionTitle
                  icon={CarFront}
                  title="سجل السيارات"
                  subtitle={`${vehicles.length} سيارة مسجلة`}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <SearchBox value={search} onChange={setSearch} placeholder="بحث باللوحة أو VIN أو الموديل" className="w-72" />
                      <Button onClick={() => setShowVehicleForm((v) => !v)} className="rounded-xl shadow-sm">
                        <Plus className="ml-2 h-4 w-4" /> سيارة جديدة
                      </Button>
                    </div>
                  }
                />
              </CardHeader>
              <CardContent className="pt-5">
                {showVehicleForm && (
                  <div className="mb-5 grid gap-4 rounded-2xl border-2 border-primary/25 bg-primary/[0.03] p-4 md:grid-cols-4">
                    <Field label="العميل" required>
                      <select className={selectCls} value={vehicleForm.customer_id} onChange={(e) => setVehicleForm({ ...vehicleForm, customer_id: e.target.value })}>
                        <option value="">اختر العميل</option>
                        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="الماركة" required>
                      <select className={selectCls} value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}>
                        <option value="">اختر الماركة</option>
                        {vehicleMakes.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                    <Field label="الموديل" required>
                      <Input className="h-10 rounded-xl" list="common-vehicle-models" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="مثال: Corolla" />
                      <datalist id="common-vehicle-models">{commonModels.map((m) => <option key={m} value={m} />)}</datalist>
                    </Field>
                    <Field label="سنة الصنع">
                      <Input className="h-10 rounded-xl" type="number" value={vehicleForm.model_year} onChange={(e) => setVehicleForm({ ...vehicleForm, model_year: e.target.value })} />
                    </Field>
                    <Field label="رقم اللوحة">
                      <Input className="h-10 rounded-xl" value={vehicleForm.plate_number} onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })} />
                    </Field>
                    <Field label="VIN">
                      <Input className="h-10 rounded-xl" dir="ltr" style={{ textAlign: 'right' }} value={vehicleForm.vin} onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })} />
                    </Field>
                    <Field label="الممشى (كم)">
                      <Input className="h-10 rounded-xl" type="number" value={vehicleForm.current_mileage} onChange={(e) => setVehicleForm({ ...vehicleForm, current_mileage: e.target.value })} />
                    </Field>
                    <div className="flex items-end gap-2">
                      <Button variant="ghost" className="rounded-xl" onClick={() => setShowVehicleForm(false)}>إلغاء</Button>
                      <Button className="flex-1 rounded-xl shadow-sm" onClick={() => void createVehicle()}>حفظ السيارة</Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="group overflow-hidden rounded-2xl border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary transition-transform group-hover:scale-110">
                          <CarFront className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{vehicle.make} {vehicle.model} {vehicle.model_year || ''}</p>
                          <p className="truncate text-sm text-muted-foreground">{vehicle.customer?.name || 'بدون عميل'}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 font-medium">
                              <CircleDot className="h-2.5 w-2.5" />
                              {vehicle.plate_number || 'بدون لوحة'}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 tabular-nums">
                              <Gauge className="h-2.5 w-2.5" />
                              {fmt(vehicle.current_mileage)} كم
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {!loading && vehicles.length === 0 && <EmptyState icon={CarFront} text="لا توجد سيارات مسجلة" hint="أضف سيارة جديدة من الزر أعلاه" />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── العملاء ── */}
          <TabsContent value="customers">
            <Card className="overflow-hidden rounded-2xl border-border/60">
              <CardHeader className="border-b bg-muted/20">
                <SectionTitle
                  icon={Users}
                  title="العملاء"
                  subtitle={`${filteredCustomers.length} من ${customers.length} عميل`}
                  action={<SearchBox value={customerSearch} onChange={setCustomerSearch} placeholder="بحث بالاسم أو الهاتف أو البريد" className="w-72" />}
                />
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCustomers.map((customer) => {
                    const mine = portalForm.customer_id === customer.id;
                    return (
                      <Card key={customer.id} className="overflow-hidden rounded-2xl border-border/60 transition-all hover:shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary">
                              {customer.name?.trim().charAt(0) || '؟'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{customer.name}</p>
                              <p className="truncate text-sm text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>
                                {customer.phone || customer.email || 'بدون بيانات اتصال'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                            <CarFront className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">عدد السيارات:</span>
                            <b className="tabular-nums">{vehicles.filter((v) => v.customer_id === customer.id).length}</b>
                          </div>

                          <div className="mt-3 space-y-2 border-t pt-3">
                            <p className="flex items-center gap-1.5 text-xs font-semibold">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              دخول بوابة العميل
                            </p>
                            <Input
                              className="h-9 rounded-lg text-sm"
                              dir="ltr"
                              style={{ textAlign: 'right' }}
                              placeholder="البريد الإلكتروني"
                              value={mine ? portalForm.email : ''}
                              onChange={(e) => setPortalForm({ customer_id: customer.id, email: e.target.value, password: mine ? portalForm.password : '' })}
                            />
                            <Input
                              className="h-9 rounded-lg text-sm"
                              type="password"
                              dir="ltr"
                              style={{ textAlign: 'right' }}
                              placeholder="كلمة المرور (8 أحرف)"
                              value={mine ? portalForm.password : ''}
                              onChange={(e) => setPortalForm({ customer_id: customer.id, email: mine ? portalForm.email : '', password: e.target.value })}
                            />
                            <Button size="sm" variant="outline" className="w-full rounded-lg" onClick={() => void createCustomerAccount()}>
                              إنشاء بيانات الدخول
                            </Button>
                            {createdCredentials[customer.id] && (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
                                <p className="mb-1.5 flex items-center gap-1 font-semibold">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> تم إنشاء بيانات الدخول
                                </p>
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
                {!loading && filteredCustomers.length === 0 && (
                  <EmptyState
                    icon={Users}
                    text={customers.length ? 'لا توجد نتائج مطابقة' : 'لا يوجد عملاء'}
                    hint={customers.length ? 'جرب كلمة بحث أخرى' : 'أضف عميلاً جديداً من الهيدر'}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── الفنيون ── */}
          <TabsContent value="technicians">
            <Card className="overflow-hidden rounded-2xl border-border/60">
              <CardHeader className="border-b bg-muted/20">
                <SectionTitle icon={UserCog} title="الفنيون" subtitle={`${technicians.length} فني`} />
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {technicians.map((technician) => {
                    const assigned = orders.filter((o) => o.technicians?.some((i) => i.id === technician.id));
                    const active = assigned.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
                    return (
                      <Card key={technician.id} className="overflow-hidden rounded-2xl border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-violet-50 text-lg font-bold text-violet-700">
                              {technician.name?.trim().charAt(0) || '؟'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{technician.name}</p>
                              <p className="truncate text-sm text-muted-foreground">
                                {technician.phone || technician.email || 'بدون بيانات اتصال'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="rounded-xl bg-muted/40 p-2.5">
                              <p className="text-lg font-bold tabular-nums">{assigned.length}</p>
                              <p className="text-muted-foreground">أوامر مسندة</p>
                            </div>
                            <div className="rounded-xl bg-primary/10 p-2.5">
                              <p className="text-lg font-bold tabular-nums text-primary">{active}</p>
                              <p className="text-muted-foreground">قيد العمل</p>
                            </div>
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
            <Card className="overflow-hidden rounded-2xl border-border/60">
              <CardHeader className="border-b bg-muted/20">
                <SectionTitle
                  icon={Tag}
                  title="كتالوج الخدمات"
                  subtitle={`${filteredServices.length} من ${stats.total}`}
                  action={<Button onClick={() => openServiceForm()} className="rounded-xl shadow-sm"><Plus className="ml-2 h-4 w-4" /> خدمة جديدة</Button>}
                />
              </CardHeader>
              <CardContent className="pt-5">
                {/* البحث */}
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/20 p-3">
                  <SearchBox className="flex-1" value={serviceSearch} onChange={setServiceSearch} placeholder="بحث بالاسم أو الكود..." />
                  <div className="flex gap-1.5 text-xs">
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-1 font-medium text-blue-700">{stats.services} خدمة</span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700">{stats.products} منتج</span>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-700">{stats.customPriced} سعر يدوي</span>
                  </div>
                </div>

                {/* فورم الإضافة/التعديل */}
                {showServiceForm && (
                  <div className="mb-5 space-y-4 rounded-2xl border-2 border-primary/30 bg-primary/[0.02] p-5">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-2 text-lg font-bold">
                        {editingServiceId
                          ? <><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Edit className="h-4 w-4" /></div> تعديل خدمة</>
                          : <><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Plus className="h-4 w-4" /></div> خدمة جديدة</>}
                      </p>
                      <Button size="icon" variant="ghost" className="rounded-full" onClick={resetServiceForm} aria-label="إغلاق">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <Field label="النوع" required>
                        <div className="grid grid-cols-2 gap-1 rounded-xl border bg-background p-1">
                          {([['service', 'خدمة', Wrench], ['product', 'منتج', Package]] as const).map(([val, lbl, Icon]) => (
                            <button key={val} type="button"
                              className={cn(
                                'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all',
                                serviceForm.item_type === val
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:bg-muted',
                              )}
                              onClick={() => setServiceForm({ ...serviceForm, item_type: val })}>
                              <Icon className="h-4 w-4" /> {lbl}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="الكود" required>
                        <Input className="h-10 rounded-xl" dir="ltr" style={{ textAlign: 'right' }} value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })} placeholder="WASH-001" />
                      </Field>
                      <Field label="الاسم" required>
                        <Input className="h-10 rounded-xl" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Car Wash" />
                      </Field>
                      <Field label="الاسم العربي">
                        <Input className="h-10 rounded-xl" value={serviceForm.name_ar} onChange={(e) => setServiceForm({ ...serviceForm, name_ar: e.target.value })} placeholder="غسيل سيارات" />
                      </Field>
                    </div>

                    <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.03] p-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                        <DollarSign className="h-4 w-4" /> إعدادات التسعير
                      </p>

                      <div className="grid gap-4 md:grid-cols-4">
                        <Field
                          label={serviceForm.item_type === 'product' ? 'سعر البيع' : 'سعر البيع (اختياري)'}
                          required={serviceForm.item_type === 'product'}
                          hint={serviceForm.item_type === 'product' ? 'يظهر في POS تلقائياً' : 'اتركه فارغاً ليدخله الكاشير في POS'}
                        >
                          <Input className="h-10 rounded-xl" type="number" min="0" value={serviceForm.selling_price} onChange={(e) => setServiceForm({ ...serviceForm, selling_price: e.target.value })} placeholder={serviceForm.item_type === 'product' ? '100' : 'بدون سعر'} />
                        </Field>
                        <Field label={serviceForm.item_type === 'product' ? 'تكلفة المتر' : 'التكلفة'} hint={priceFilled ? `هامش الربح: ${fmt(margin)}` : undefined}>
                          <Input className="h-10 rounded-xl" type="number" min="0" value={serviceForm.estimated_cost} onChange={(e) => setServiceForm({ ...serviceForm, estimated_cost: e.target.value })} />
                        </Field>
                        {serviceForm.item_type === 'product' && (
                          <>
                            <Field label="الوحدة" hint="المنتجات تُدخل وتُباع بالمتر">
                              <Input className="h-10 rounded-xl" value="متر" disabled readOnly />
                            </Field>
                            <Field
                              label={editingServiceId ? 'رصيد المخزون الحالي (متر)' : 'الرصيد الافتتاحي (متر)'}
                              hint="الزيادة من المشتريات، والخصم تلقائي عند البيع"
                            >
                              <Input className="h-10 rounded-xl" type="number" min="0" step="0.001" value={serviceForm.stock_quantity} onChange={(e) => setServiceForm({ ...serviceForm, stock_quantity: e.target.value })} placeholder="50" />
                            </Field>
                          </>
                        )}
                      </div>

                      <div className={cn(
                        'mt-4 flex items-start gap-3 rounded-xl border p-3',
                        priceFilled
                          ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-800'
                          : 'border-amber-500/30 bg-amber-500/[0.08] text-amber-800',
                      )}>
                        {priceFilled ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
                        <div>
                          <p className="text-sm font-semibold">
                            {priceFilled ? 'سعر ثابت' : serviceForm.item_type === 'product' ? 'المنتج يتطلب سعر بيع' : 'سعر يدوي'}
                          </p>
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
                        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                            <CarFront className="h-4 w-4" /> الأمتار حسب حجم السيارة
                          </p>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Field label="الصغير: عدد الأمتار">
                              <Input className="h-10 rounded-xl" type="number" min="0" value={serviceForm.small_vehicle_quantity} onChange={(e) => setServiceForm({ ...serviceForm, small_vehicle_quantity: e.target.value })} placeholder="12" />
                            </Field>
                            <Field label="سعر الصغير">
                              <Input className="h-10 rounded-xl" type="number" min="0" value={serviceForm.small_vehicle_price} onChange={(e) => setServiceForm({ ...serviceForm, small_vehicle_price: e.target.value })} />
                            </Field>
                            <Field label="الكبير: عدد الأمتار">
                              <Input className="h-10 rounded-xl" type="number" min="0" value={serviceForm.large_vehicle_quantity} onChange={(e) => setServiceForm({ ...serviceForm, large_vehicle_quantity: e.target.value })} placeholder="15" />
                            </Field>
                            <Field label="سعر الكبير">
                              <Input className="h-10 rounded-xl" type="number" min="0" value={serviceForm.large_vehicle_price} onChange={(e) => setServiceForm({ ...serviceForm, large_vehicle_price: e.target.value })} />
                            </Field>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="rounded-xl" onClick={resetServiceForm}>إلغاء</Button>
                      <Button onClick={() => void saveService()} className="rounded-xl shadow-lg shadow-primary/20">
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                        {editingServiceId ? 'تحديث' : 'حفظ'} وإظهار في POS
                      </Button>
                    </div>
                  </div>
                )}

                {/* قائمة الخدمات */}
                {loading && services.length === 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />)}
                  </div>
                ) : filteredServices.length === 0 ? (
                  <EmptyState
                    icon={Tag}
                    text={services.length === 0 ? 'لا توجد خدمات أو منتجات بعد' : 'لا توجد نتائج مطابقة للبحث'}
                    hint={services.length === 0 ? 'أضف خدمة جديدة من الزر أعلاه' : 'جرب كلمة بحث أخرى'}
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredServices.map((service) => {
                      const isCustom = isManualPriced(service);
                      const isProduct = service.item_type === 'product';
                      const lowStock = isProduct && Number(service.stock_quantity || 0) <= 5;
                      const barColor = isCustom ? 'bg-amber-500' : isProduct ? 'bg-emerald-500' : 'bg-blue-500';
                      const Icon = isProduct ? Package : Wrench;
                      return (
                        <Card key={service.id} className={cn(
                          'group relative overflow-hidden rounded-2xl border-border/60 transition-all hover:-translate-y-1 hover:shadow-xl',
                          isCustom && 'border-amber-500/30',
                        )}>
                          <div className={cn('absolute inset-x-0 top-0 h-1', barColor)} />
                          <CardContent className="p-4 pt-5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <div className={cn(
                                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                                  isProduct
                                    ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600'
                                    : 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600',
                                )}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-semibold">{service.name}</p>
                                  {service.name_ar && <p className="truncate text-xs text-muted-foreground">{service.name_ar}</p>}
                                  <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>{service.code}</p>
                                </div>
                              </div>
                              {isCustom ? (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700">
                                  <Tag className="h-3 w-3" /> سعر يدوي
                                </span>
                              ) : (
                                <span className="whitespace-nowrap text-lg font-bold tabular-nums">{fmt(service.selling_price)}</span>
                              )}
                            </div>

                            <div className="mt-3 space-y-1.5 border-t pt-3 text-xs">
                              {isProduct && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">المخزون</span>
                                  <span className={cn(
                                    'inline-flex items-center gap-1 font-medium tabular-nums',
                                    lowStock && 'text-rose-600',
                                  )}>
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
                                  <span className="font-medium tabular-nums text-emerald-600">
                                    {fmt(Number(service.selling_price) - Number(service.estimated_cost || 0))}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex gap-2 border-t pt-3">
                              <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => openServiceForm(service)}>
                                <Edit className="ml-1 h-3.5 w-3.5" /> تعديل
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
    </MainLayout>
  );
};

export default AutomotiveServicePage;