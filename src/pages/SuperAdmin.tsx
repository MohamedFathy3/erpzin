import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, Building2, ChevronDown, Clock3,
  FileSearch, LogIn, Package, Printer, RefreshCw, ShieldCheck, ToggleLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Tenant = {
  id: number; name: string; slug: string; status: string; plan: string;
  admins_count: number; products_count?: number; subscription_status?: string; trial_ends_at?: string;
};
type Module = { module_key: string; is_enabled: boolean };
type Trial = { id: number; name: string; trial_ends_at?: string; days_remaining: number; subscription_status: string; status?: string };
type Overview = { stats: Record<string, number>; recent: Array<{ id: number; description: string; actor_name: string; subject_type: string; subject_id?: number | null; created_at: string }>; tenants: Tenant[] };
type AuditEvent = {
  id: number; retry_of_event_id?: number | null; tenant_id?: number | null; tenant_name?: string | null; tenant_slug?: string | null;
  actor_id?: number | null; actor_type?: string | null; actor_name?: string | null; actor_email?: string | null;
  branch_id?: number | null; event_type: string; outcome: 'success' | 'failed'; http_method: string;
  request_path: string; status_code?: number | null; duration_ms: number; query_data?: Record<string, unknown> | null;
  request_data?: Record<string, unknown> | null; error_summary?: string | null; client_ip?: string | null;
  user_agent?: string | null; created_at: string; retryable?: boolean;
};
type AuditSummary = { total: number; failed: number; successful: number; prints: number; denied: number };
type AuditFilters = { tenant_id: string; outcome: string; event_type: string; method: string; from: string; to: string; q: string };

const labels: Record<string, string> = {
  crm: 'CRM', email: 'Email', whatsapp: 'WhatsApp', google_calendar: 'Google Calendar', google_drive: 'Google Drive',
  tasks: 'Tasks & Reminders', inventory: 'Inventory', manufacturing: 'Manufacturing', sales: 'Sales', purchasing: 'Purchasing',
  finance: 'Finance', hr: 'HR', pos: 'POS', reports: 'Reports', employee_financial_reports: 'التقارير المالية للموظفين',
  warehouse_reports: 'تقارير المخازن', projects: 'Projects', workflow: 'Workflow', settings: 'Settings', dashboard: 'Dashboard',
  industries: 'القطاعات والوحدات', manufacturing_setup: 'Manufacturing Setup', product_ledger: 'كشف حركات المنتج',
  inventory_transfer_requests: 'طلبات نقل المخزون', representative: 'مساحة المندوب', access_control: 'الأدوار والصلاحيات',
  ai_assistant: 'مساعد الذكاء الاصطناعي', automotive_service: 'خدمة السيارات',
};
const statLabels: Record<string, string> = {
  tenants: 'كل العملاء', active_tenants: 'عملاء نشطون', trial_tenants: 'تجارب مجانية', admins: 'مديرو العملاء',
  users: 'المستخدمون', employees: 'الموظفون', products: 'المنتجات', sales_invoices: 'فواتير المبيعات',
  activities_30d: 'نشاط آخر 30 يومًا', logins_30d: 'دخول آخر 30 يومًا',
};
const emptyFilters: AuditFilters = { tenant_id: '', outcome: '', event_type: '', method: '', from: '', to: '', q: '' };
const eventLabels: Record<string, string> = {
  read: 'عرض / قراءة', create: 'إنشاء', update: 'تعديل', delete: 'حذف', login: 'محاولة دخول', print: 'طباعة', action: 'إجراء',
};
const apiErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
};
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('ar-EG') : '—';
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export default function SuperAdmin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'overview' | 'tenants' | 'trials' | 'modules' | 'audit'>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary>({ total: 0, failed: 0, successful: 0, prints: 0, denied: 0 });
  const [auditFilters, setAuditFilters] = useState<AuditFilters>(emptyFilters);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLastPage, setAuditLastPage] = useState(1);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [overviewResponse, tenantsResponse, trialsResponse] = await Promise.all([
        api.get('/super-admin/overview'), api.get('/super-admin/tenants'), api.get('/super-admin/trials'),
      ]);
      setOverview(overviewResponse.data.data);
      setTenants(tenantsResponse.data.data ?? []);
      setTrials(trialsResponse.data.data ?? []);
    } catch {
      toast.error('تعذر تحميل لوحة الإدارة');
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async (page = 1, filters = auditFilters) => {
    setAuditLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
      const response = await api.get('/super-admin/audit-trail', { params: { ...params, page, per_page: 50 } });
      const paginator = response.data?.data;
      setAuditEvents(paginator?.data ?? []);
      setAuditPage(paginator?.current_page ?? page);
      setAuditLastPage(paginator?.last_page ?? 1);
      setAuditSummary(response.data?.summary ?? { total: paginator?.total ?? 0, failed: 0, successful: 0, prints: 0, denied: 0 });
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'تعذر تحميل سجل التدقيق'));
    } finally {
      setAuditLoading(false);
    }
  };

  const loadModules = async (tenant: Tenant) => {
    setSelected(tenant);
    setTab('modules');
    try {
      const response = await api.get(`/super-admin/tenants/${tenant.id}/modules`);
      setModules(response.data.data ?? []);
    } catch {
      toast.error('تعذر تحميل الموديولات');
    }
  };

  useEffect(() => { if (user?.super_admin) load(); }, [user?.super_admin]);
  // loadAudit reads the current filter state and should run only when opening the audit tab.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user?.super_admin && tab === 'audit') loadAudit(1); }, [tab, user?.super_admin]);

  const trialAction = async (id: number, action: 'extend' | 'activate' | 'suspend') => {
    try {
      const days = action === 'extend' ? Number(window.prompt('عدد الأيام الإضافية؟', '7')) : undefined;
      if (action === 'extend' && (!days || days < 1)) return;
      await api.post(`/super-admin/trials/${id}/${action}`, action === 'extend' ? { days } : {});
      toast.success('تم تحديث التجربة');
      load();
    } catch {
      toast.error('تعذر تحديث حالة التجربة');
    }
  };

  const updateTenantStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/super-admin/tenants/${id}/status`, { status });
      toast.success('تم تحديث حالة الشركة');
      load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'تعذر تحديث حالة الشركة'));
    }
  };

  const toggle = async (module: Module) => {
    if (!selected) return;
    const next = !module.is_enabled;
    setModules((items) => items.map((item) => item.module_key === module.module_key ? { ...item, is_enabled: next } : item));
    try {
      await api.patch(`/super-admin/tenants/${selected.id}/modules/${module.module_key}`, { is_enabled: next });
      toast.success('تم تحديث الموديول');
    } catch {
      setModules((items) => items.map((item) => item.module_key === module.module_key ? { ...item, is_enabled: !next } : item));
      toast.error('فشل تحديث الموديول');
    }
  };

  const createTenant = async () => {
    const name = window.prompt('اسم الشركة؟', 'شركة جديدة')?.trim();
    if (!name) return;
    const slug = window.prompt('الرابط المختصر؟', name.toLowerCase().replace(/\s+/g, '-'))?.trim();
    if (!slug) return;
    const adminEmail = window.prompt('إيميل مدير الشركة (اختياري)؟')?.trim();
    const adminPassword = adminEmail ? window.prompt('كلمة مرور مدير الشركة (8 أحرف على الأقل)؟')?.trim() : undefined;
    if (adminEmail && !adminPassword) return;
    try {
      await api.post('/super-admin/tenants', { name, slug, admin_email: adminEmail || undefined, admin_password: adminPassword || undefined });
      toast.success('تم إنشاء الشركة وربط بياناتها تلقائياً');
      load();
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'تعذر إنشاء الشركة'));
    }
  };

  const retryEvent = async (event: AuditEvent) => {
    if (!event.retryable || retryingId !== null) return;
    const method = event.http_method.toUpperCase();
    const isWrite = ['POST', 'PUT', 'PATCH'].includes(method);
    if (isWrite && !window.confirm(`ستعيد إرسال ${method} إلى ${event.request_path} للعميل ${event.tenant_name || `#${event.tenant_id ?? 'غير محدد'}`} بنفس البيانات المسجلة. قد تكون العملية حُفظت بالفعل وقد يؤدي التكرار إلى فاتورة أو قيد مكرر. راجع التفاصيل أولًا، ثم أكد المتابعة.`)) return;
    const url = event.request_path.replace(/^api\/?/, '');
    const retryData = event.request_data ? { ...event.request_data } : undefined;
    if (isWrite && retryData && event.tenant_id && !retryData.tenant_id) retryData.tenant_id = event.tenant_id;
    setRetryingId(event.id);
    try {
      await api.request({
        method,
        url,
        params: event.query_data ?? undefined,
        data: retryData,
        headers: {
          'X-Audit-Retry-Event': String(event.id),
          ...(event.tenant_slug ? { 'X-Tenant-Slug': event.tenant_slug } : {}),
        },
      });
      toast.success('نجحت إعادة المحاولة للطلب');
      await loadAudit(auditPage);
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'فشلت إعادة المحاولة؛ راجع تفاصيل الحدث'));
      await loadAudit(auditPage);
    } finally {
      setRetryingId(null);
    }
  };

  if (!user) return null;
  if (!user.super_admin) return <Navigate to="/" replace />;

  return <MainLayout><div className="space-y-6" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="text-primary" /> مركز تحكم Super Admin</h1>
        <p className="text-muted-foreground">تحكم ومراجعة مركزية للعملاء والمستخدمين والعمليات والأخطاء ومحاولات الدخول والطباعة.</p>
      </div>
      <Button variant="outline" onClick={() => tab === 'audit' ? loadAudit(auditPage) : load()}>
        <RefreshCw className="ml-2 h-4 w-4" /> تحديث البيانات
      </Button>
    </div>

    <div className="flex flex-wrap gap-2 border-b pb-3">
      <Button variant={tab === 'overview' ? 'default' : 'ghost'} onClick={() => setTab('overview')}><BarChart3 className="ml-2 h-4 w-4" />نظرة عامة</Button>
      <Button variant={tab === 'tenants' ? 'default' : 'ghost'} onClick={() => setTab('tenants')}><Building2 className="ml-2 h-4 w-4" />العملاء</Button>
      <Button variant={tab === 'trials' ? 'default' : 'ghost'} onClick={() => setTab('trials')}><Activity className="ml-2 h-4 w-4" />التجارب</Button>
      <Button variant={tab === 'audit' ? 'default' : 'ghost'} onClick={() => setTab('audit')}><FileSearch className="ml-2 h-4 w-4" />سجل التدقيق</Button>
      {selected && <Button variant={tab === 'modules' ? 'default' : 'ghost'} onClick={() => setTab('modules')}><ToggleLeft className="ml-2 h-4 w-4" />موديولات {selected.name}</Button>}
    </div>

    {loading && tab === 'overview' ? <Card><CardContent className="py-16 text-center">جاري تحميل مركز الإدارة...</CardContent></Card> : null}

    {tab === 'overview' && !loading && overview && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(overview.stats).map(([key, value]) => <Card key={key}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{statLabels[key] ?? key}</p><p className="mt-2 text-3xl font-black">{value.toLocaleString('ar-EG')}</p></CardContent></Card>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><LogIn className="h-5 w-5" />آخر النشاطات والدخولات</CardTitle></CardHeader><CardContent className="space-y-3">
          {overview.recent.map((activity) => <div key={activity.id} className="flex items-center justify-between border-b pb-3 text-sm"><div><p className="font-medium">{activity.actor_name} · {activity.description}</p><p className="text-xs text-muted-foreground">{activity.subject_type?.split('\\').pop()} #{activity.subject_id}</p></div><span className="text-xs text-muted-foreground">{formatDate(activity.created_at)}</span></div>)}
          {!overview.recent.length && <p className="text-muted-foreground">لا توجد نشاطات مسجلة.</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />ملخص العملاء والمنتجات</CardTitle></CardHeader><CardContent className="space-y-3">
          {overview.tenants.slice(0, 8).map((tenant) => <div key={tenant.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-semibold">{tenant.name}</p><p className="text-xs text-muted-foreground">{tenant.slug} · {tenant.admins_count} مستخدم · {tenant.products_count ?? 0} منتج</p></div><Badge>{tenant.status}</Badge></div>)}
        </CardContent></Card>
      </div>
    </>}

    {tab === 'tenants' && <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>كل العملاء ومساحات العمل ({tenants.length})</CardTitle><Button size="sm" onClick={createTenant}><Building2 className="ml-2 h-4 w-4" />إنشاء شركة</Button></div></CardHeader><CardContent className="space-y-3">
      {tenants.map((tenant) => <div key={tenant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-semibold">{tenant.name}</p><p className="text-xs text-muted-foreground">{tenant.slug} · {tenant.admins_count} مستخدم · {tenant.products_count ?? 0} منتج · الخطة {tenant.plan}</p></div><div className="flex items-center gap-2"><Badge>{tenant.status}</Badge><select className="h-9 rounded-md border bg-background px-2 text-sm" value={tenant.status} onChange={(event) => updateTenantStatus(tenant.id, event.target.value)} aria-label={`حالة ${tenant.name}`}><option value="active">نشطة</option><option value="suspended">موقوفة</option><option value="trial">تجريبية</option><option value="expired">منتهية</option></select><Button size="sm" variant="outline" onClick={() => loadModules(tenant)}>إدارة الموديولات <ChevronDown className="mr-1 h-4 w-4" /></Button></div></div>)}
    </CardContent></Card>}

    {tab === 'modules' && selected && <Card><CardHeader><CardTitle>الموديولات الظاهرة للعميل: {selected.name}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((module) => <div key={module.module_key} className="flex items-center justify-between rounded-lg border p-3"><span>{labels[module.module_key] ?? module.module_key}</span><Switch checked={module.is_enabled} onCheckedChange={() => toggle(module)} aria-label={`تفعيل ${module.module_key}`} /></div>)}
    </CardContent></Card>}

    {tab === 'trials' && <Card><CardHeader><CardTitle>إدارة التجارب والشركات الموقوفة ({trials.length})</CardTitle></CardHeader><CardContent className="space-y-3">
      {trials.map((trial) => <div key={trial.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-semibold">{trial.name}</p><p className="text-xs text-muted-foreground">الحالة: {trial.status || trial.subscription_status}{trial.trial_ends_at ? ` · تنتهي ${new Date(trial.trial_ends_at).toLocaleDateString('ar-EG')} · متبقي ${trial.days_remaining} يوم` : ''}</p></div><div className="flex gap-2">{trial.status !== 'suspended' && trial.subscription_status !== 'suspended' && <Button size="sm" variant="outline" onClick={() => trialAction(trial.id, 'extend')}>تمديد</Button>}<Button size="sm" onClick={() => trialAction(trial.id, 'activate')}>تفعيل</Button>{trial.status !== 'suspended' && trial.subscription_status !== 'suspended' && <Button size="sm" variant="destructive" onClick={() => trialAction(trial.id, 'suspend')}>تعليق</Button>}</div></div>)}
      {!trials.length && <p className="text-muted-foreground">لا توجد تجارب أو شركات موقوفة.</p>}
    </CardContent></Card>}

    {tab === 'audit' && <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'الأحداث المطابقة', value: auditSummary.total, icon: FileSearch },
          { label: 'عمليات فشلت', value: auditSummary.failed, icon: AlertTriangle },
          { label: 'عمليات نجحت', value: auditSummary.successful, icon: Activity },
          { label: 'محاولات طباعة', value: auditSummary.prints, icon: Printer },
          { label: 'دخول مرفوض', value: auditSummary.denied, icon: LogIn },
        ].map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-primary" /><div><p className="text-xl font-bold">{Number(value ?? 0).toLocaleString('ar-EG')}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>)}
      </div>

      <Card>
        <CardHeader><CardTitle>كل تحركات النظام حسب العميل والمستخدم</CardTitle><p className="text-sm text-muted-foreground">تُسجل طلبات API والنتائج وأسباب الخطأ وتوقيت التنفيذ، بالإضافة إلى محاولات فتح نافذة الطباعة.</p></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={auditFilters.tenant_id} onChange={(event) => setAuditFilters({ ...auditFilters, tenant_id: event.target.value })} aria-label="فلترة حسب العميل"><option value="">كل العملاء</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={auditFilters.outcome} onChange={(event) => setAuditFilters({ ...auditFilters, outcome: event.target.value })} aria-label="فلترة حسب النتيجة"><option value="">كل النتائج</option><option value="failed">فشل</option><option value="success">نجاح</option></select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={auditFilters.event_type} onChange={(event) => setAuditFilters({ ...auditFilters, event_type: event.target.value })} aria-label="فلترة حسب نوع الحدث"><option value="">كل أنواع النشاط</option>{Object.entries(eventLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={auditFilters.method} onChange={(event) => setAuditFilters({ ...auditFilters, method: event.target.value })} aria-label="فلترة حسب نوع الطلب"><option value="">كل الطلبات</option>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => <option key={method} value={method}>{method}</option>)}</select>
            <Input type="date" aria-label="من تاريخ" value={auditFilters.from} onChange={(event) => setAuditFilters({ ...auditFilters, from: event.target.value })} />
            <Input type="date" aria-label="إلى تاريخ" value={auditFilters.to} onChange={(event) => setAuditFilters({ ...auditFilters, to: event.target.value })} />
            <Input placeholder="ابحث باسم المستخدم أو المسار أو سبب الخطأ" value={auditFilters.q} onChange={(event) => setAuditFilters({ ...auditFilters, q: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') loadAudit(1); }} />
            <div className="flex gap-2"><Button className="flex-1" onClick={() => loadAudit(1)}>تطبيق الفلاتر</Button><Button variant="outline" onClick={() => { setAuditFilters(emptyFilters); loadAudit(1, emptyFilters); }}>مسح</Button></div>
          </div>
          <div className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
            طلبات القراءة تعاد مباشرة. أما إنشاء/تعديل الفواتير والمدفوعات والقيود فيُعاد إرسالها فقط بعد تأكيدك الصريح، بنفس البيانات المسجلة؛ تحقق أولًا من أن العملية لم تُحفظ، لأن الإعادة قد تنشئ سجلًا مكررًا. الحذف والدخول والطباعة والطلبات ذات البيانات السرية/الملفات لا تُعاد من هنا.
          </div>
        </CardContent>
      </Card>

      <Card><CardContent className="space-y-3 p-4">
        {auditLoading ? <div className="py-10 text-center text-muted-foreground">جاري تحميل سجل التدقيق...</div> : null}
        {!auditLoading && !auditEvents.length ? <div className="py-10 text-center text-muted-foreground">لا توجد أحداث مطابقة للفلاتر.</div> : null}
        {auditEvents.map((event) => <div key={event.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={event.outcome === 'success' ? 'secondary' : 'destructive'}>{event.outcome === 'success' ? 'نجاح' : 'فشل'}</Badge>
                <Badge variant="outline">{eventLabels[event.event_type] ?? event.event_type}</Badge>
                <span className="font-mono text-xs">{event.http_method} · HTTP {event.status_code ?? '—'}</span>
              </div>
              <p className="mt-2 break-all font-mono text-sm">{event.request_path}</p>
              <p className="mt-1 text-sm"><strong>{event.actor_name || 'مستخدم غير معروف'}</strong>{event.actor_email ? ` · ${event.actor_email}` : ''}{event.actor_id ? ` · #${event.actor_id}` : ''}</p>
              <p className="text-sm text-muted-foreground">العميل: {event.tenant_name || (event.tenant_id ? `#${event.tenant_id}` : 'عام / غير محدد')} {event.branch_id ? `· الفرع #${event.branch_id}` : ''}</p>
              {event.retry_of_event_id && <p className="text-xs text-muted-foreground">إعادة إرسال للحدث الأصلي #{event.retry_of_event_id}</p>}
              {event.error_summary && <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">السبب / الخطأ: {event.error_summary}</p>}
            </div>
            <div className="flex min-w-[180px] flex-col items-end gap-2 text-left text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock3 size={14} />{formatDate(event.created_at)}</span>
              <span>{event.duration_ms} ms · IP {event.client_ip || '—'}</span>
              <div className="flex gap-2">
                {event.retryable && <Button size="sm" variant="outline" disabled={retryingId !== null} onClick={() => retryEvent(event)}>{retryingId === event.id ? 'جارٍ...' : 'إعادة المحاولة'}</Button>}
                <Button size="sm" variant="ghost" onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}>{expandedEvent === event.id ? 'إخفاء التفاصيل' : 'التفاصيل'}</Button>
              </div>
            </div>
          </div>
          {expandedEvent === event.id && <div className="mt-4 grid gap-3 border-t pt-4 lg:grid-cols-2">
            <div><p className="mb-1 text-sm font-semibold">بيانات الطلب (الأسرار محجوبة)</p><pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs" dir="ltr">{pretty({ query: event.query_data, body: event.request_data })}</pre></div>
            <div><p className="mb-1 text-sm font-semibold">بيانات تشخيصية</p><pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs" dir="ltr">{pretty({ user_agent: event.user_agent, actor_type: event.actor_type, branch_id: event.branch_id, tenant_id: event.tenant_id })}</pre></div>
          </div>}
        </div>)}
        {!auditLoading && auditLastPage > 1 && <div className="flex items-center justify-between border-t pt-4"><Button variant="outline" disabled={auditPage <= 1} onClick={() => loadAudit(auditPage - 1)}>السابق</Button><span className="text-sm text-muted-foreground">صفحة {auditPage} من {auditLastPage}</span><Button variant="outline" disabled={auditPage >= auditLastPage} onClick={() => loadAudit(auditPage + 1)}>التالي</Button></div>}
      </CardContent></Card>
    </div>}
  </div></MainLayout>;
}
