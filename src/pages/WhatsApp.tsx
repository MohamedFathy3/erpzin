import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, RefreshCw, Send, ShieldCheck, Webhook, CheckCircle2, Clock3, XCircle, Eye, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import WhatsAppAgentSettings from '@/components/whatsapp/WhatsAppAgentSettings';

type Message = {
  id: number; customer_id: number; to_phone: string; type: 'text' | 'template'; template_name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'; error_message?: string;
  provider_message_id?: string; created_at: string; customer?: { name: string };
};
type Customer = { id: number; name?: string; name_ar?: string; phone?: string | null };
type WhatsAppTemplate = { name: string; language: string; status: string; category?: string; components?: Array<{ type: string; text?: string }> };
type WhatsAppAccount = { connected: boolean; display_phone_number?: string | null; verified_name?: string | null; phone_number_id?: string | null; waba_id?: string | null; webhook_url?: string | null; status?: string | null; last_error?: string | null };
type EmbeddedSignupConfig = { enabled: boolean; app_id: string | null; config_id: string | null; graph_api_version: string };
type EmbeddedSignupSession = { event: string; phone_number_id?: string; waba_id?: string; business_id?: string };
const getApiErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
};

declare global {
  interface Window {
    FB?: {
      init: (options: { appId: string; version: string; autoLogAppEvents?: boolean; xfbml?: boolean }) => void;
      login: (callback: (response: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const statuses = {
  pending: { label: 'قيد المعالجة', icon: Clock3, className: 'bg-amber-100 text-amber-800' },
  sent: { label: 'تم الإرسال', icon: Send, className: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'تم التسليم', icon: Truck, className: 'bg-indigo-100 text-indigo-800' },
  read: { label: 'تمت القراءة', icon: Eye, className: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'فشل', icon: XCircle, className: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }: { status: Message['status'] }) {
  const item = statuses[status] ?? statuses.pending;
  const Icon = item.icon;
  return <Badge className={`gap-1 border-0 ${item.className}`}><Icon className="h-3.5 w-3.5" />{item.label}</Badge>;
}

export default function WhatsApp() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerId, setCustomerId] = useState('');
  const [type, setType] = useState<'text' | 'template'>('template');
  const [body, setBody] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [languageCode, setLanguageCode] = useState('ar');
  const [components, setComponents] = useState('');

  const accountQuery = useQuery<{ data: WhatsAppAccount }>({
    queryKey: ['whatsapp-account'],
    queryFn: async () => (await api.get('/whatsapp/account')).data,
    refetchOnWindowFocus: false,
  });
  const account = accountQuery.data?.data;
  const signupConfigQuery = useQuery<{ data: EmbeddedSignupConfig }>({
    queryKey: ['whatsapp-embedded-signup-config'],
    queryFn: async () => (await api.get('/whatsapp/embedded-signup/config')).data,
    staleTime: 5 * 60 * 1000,
  });
  const signupConfig = signupConfigQuery.data?.data;
  const [sdkReady, setSdkReady] = useState(false);
  const [signupCode, setSignupCode] = useState('');
  const [signupSession, setSignupSession] = useState<EmbeddedSignupSession | null>(null);
  const processedSignupCode = useRef('');
  const testAccountMutation = useMutation({
    mutationFn: async () => api.post('/whatsapp/account/test'),
    onSuccess: () => toast.success('تم اختبار الاتصال بنجاح'),
    onError: (error: unknown) => toast.error(getApiErrorMessage(error) || 'فشل اختبار الاتصال'),
  });
  const embeddedSignupCompleteMutation = useMutation({
    mutationFn: async (payload: { code: string; phone_number_id: string; waba_id: string; business_id?: string; event: string }) =>
      api.post('/whatsapp/embedded-signup/complete', payload),
    onSuccess: async () => {
      toast.success('تم ربط رقم WhatsApp بنجاح');
      setSignupCode(''); setSignupSession(null); processedSignupCode.current = '';
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] }),
        queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] }),
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error) || 'تعذر إكمال ربط WhatsApp عبر Meta');
      setSignupCode(''); setSignupSession(null); processedSignupCode.current = '';
    },
  });

  useEffect(() => {
    if (!signupConfig?.enabled || !signupConfig.app_id) return;
    const initialize = () => {
      window.FB?.init({ appId: signupConfig.app_id!, version: signupConfig.graph_api_version, autoLogAppEvents: true, xfbml: false });
      setSdkReady(Boolean(window.FB));
    };
    window.fbAsyncInit = initialize;
    if (window.FB) {
      initialize();
      return;
    }
    let script = document.getElementById('facebook-jssdk') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.head.appendChild(script);
    }
    script.addEventListener('load', initialize, { once: true });
    return () => script?.removeEventListener('load', initialize);
  }, [signupConfig?.enabled, signupConfig?.app_id, signupConfig?.graph_api_version]);

  useEffect(() => {
    const allowedHosts = new Set(['www.facebook.com', 'web.facebook.com', 'm.facebook.com', 'business.facebook.com']);
    const handleSignupMessage = (event: MessageEvent) => {
      let host = '';
      try { host = new URL(event.origin).hostname; } catch { return; }
      if (!allowedHosts.has(host)) return;
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;
        const session = payload.data || {};
        if (payload.event === 'CANCEL') {
          toast.message('تم إلغاء ربط WhatsApp من نافذة Meta.');
          return;
        }
        if (payload.event === 'ERROR') {
          toast.error('أبلغت Meta عن مشكلة أثناء الربط. راجع بيانات النشاط داخل نافذة Meta ثم حاول مرة أخرى.');
          return;
        }
        if (payload.event !== 'FINISH') {
          toast.error('هذا النوع من تسجيل الأرقام غير مفعّل بعد. استخدم تدفق WhatsApp Cloud API القياسي أو تواصل مع مسؤول النظام.');
          return;
        }
        if (!session.phone_number_id || !session.waba_id) {
          toast.error('لم تستلم المنصة معرّفات رقم WhatsApp من Meta. أعد الربط وتأكد من إكمال خطوة الرقم.');
          return;
        }
        setSignupSession({ event: payload.event, phone_number_id: String(session.phone_number_id), waba_id: String(session.waba_id), business_id: session.business_id ? String(session.business_id) : undefined });
      } catch {
        // Ignore unrelated/non-JSON messages from frames.
      }
    };
    window.addEventListener('message', handleSignupMessage);
    return () => window.removeEventListener('message', handleSignupMessage);
  }, []);

  useEffect(() => {
    if (!signupCode || !signupSession || processedSignupCode.current === signupCode) return;
    processedSignupCode.current = signupCode;
    embeddedSignupCompleteMutation.mutate({ code: signupCode, ...signupSession });
  }, [signupCode, signupSession, embeddedSignupCompleteMutation]);

  const launchEmbeddedSignup = () => {
    if (!signupConfig?.enabled || !signupConfig.config_id || !window.FB) {
      toast.error('إعداد Embedded Signup غير مكتمل. تواصل مع مسؤول النظام.');
      return;
    }
    setSignupCode(''); setSignupSession(null); processedSignupCode.current = '';
    window.FB.login((response) => {
      const code = response.authResponse?.code;
      if (!code) {
        toast.message('لم يكتمل تفويض Meta. يمكنك المحاولة مرة أخرى.');
        return;
      }
      setSignupCode(code);
    }, {
      config_id: signupConfig.config_id,
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {} },
    });
  };

  const customersQuery = useQuery<{ data: Customer[] }>({
    queryKey: ['whatsapp-customers'],
    queryFn: async () => (await api.post('/customer/index', { paginate: false, perPage: 500, orderBy: 'name', orderByDirection: 'asc' })).data,
  });
  const customers = customersQuery.data?.data ?? [];
  const selectedCustomer = customers.find(customer => String(customer.id) === customerId);

  const templatesQuery = useQuery<{ data: WhatsAppTemplate[] }>({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => (await api.get('/whatsapp/templates')).data,
    enabled: Boolean(account?.connected),
  });
  const templates = templatesQuery.data?.data ?? [];
  const sendableTemplates = templates.filter(template => template.status === 'APPROVED' && template.name !== 'hello_world');

  const selectTemplate = (value: string) => {
    const template = templates.find(item => `${item.name}|${item.language}` === value);
    if (!template) return;
    setTemplateName(template.name);
    setLanguageCode(template.language);
    const body = template.components?.find(component => component.type.toLowerCase() === 'body');
    const count = (body?.text?.match(/{{[^}]+}}/g) ?? []).length;
    setComponents(count ? JSON.stringify({ body: { parameters: Array.from({ length: count }, (_, index) => ({ type: 'text', text: `القيمة ${index + 1}` })) } }, null, 2) : '');
  };

  const loadOrderConfirmationExample = () => {
    setTemplateName('order_confirmation');
    setLanguageCode('en_US');
    setComponents(JSON.stringify({
      body: {
        parameters: [
          { type: 'text', parameter_name: 'first_name', text: 'أحمد' },
          { type: 'text', parameter_name: 'order_number', text: 'SKBUP2-4CPIG9' },
        ],
      },
    }, null, 2));
    toast.success('تم تحميل مثال قالب order_confirmation');
  };

  const messagesQuery = useQuery<{ data: { data: Message[] } }>({
    queryKey: ['whatsapp-messages', statusFilter],
    queryFn: async () => (await api.get(`/whatsapp/messages${statusFilter === 'all' ? '' : `?status=${statusFilter}`}`)).data,
    enabled: Boolean(account?.connected),
    refetchInterval: 15000,
  });
  const messages = messagesQuery.data?.data?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { type, phone: selectedCustomer?.phone };
      if (type === 'text') payload.body = body;
      else {
        payload.template_name = templateName;
        payload.language_code = languageCode;
        if (components.trim()) payload.components = JSON.parse(components);
      }
      return api.post(`/whatsapp/customers/${customerId}/send`, payload);
    },
    onSuccess: () => {
      toast.success('تم إرسال الرسالة إلى Meta بنجاح');
      setBody(''); setTemplateName(''); setComponents('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error) || 'تعذر إرسال رسالة WhatsApp'),
  });

  return <MainLayout activeItem="whatsapp"><div className="space-y-6" dir="rtl">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div><h1 className="text-2xl font-bold">WhatsApp Business</h1><p className="text-muted-foreground">إدارة الربط الرسمي مع Meta ومتابعة حالات الرسائل.</p></div>
      <Button variant="outline" onClick={() => messagesQuery.refetch()} disabled={messagesQuery.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${messagesQuery.isFetching ? 'animate-spin' : ''}`} />تحديث الحالات</Button>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><ShieldCheck className="h-8 w-8 text-emerald-600" /><div><p className="font-semibold">Meta Cloud API</p><p className="text-sm text-muted-foreground">تكامل رسمي وآمن</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><Webhook className="h-8 w-8 text-blue-600" /><div><p className="font-semibold">Webhook</p><p className="text-sm text-muted-foreground">تحديث تلقائي للحالات</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><MessageCircle className="h-8 w-8 text-green-600" /><div><p className="font-semibold">نافذة الخدمة</p><p className="text-sm text-muted-foreground">النص الحر خلال 24 ساعة فقط</p></div></CardContent></Card>
    </div>

    <Tabs defaultValue="send" className="space-y-4">
      <TabsList><TabsTrigger value="send">إرسال رسالة</TabsTrigger><TabsTrigger value="messages">سجل الرسائل ({messages.length})</TabsTrigger><TabsTrigger value="connection">إعداد الربط</TabsTrigger><TabsTrigger value="agent">وكيل الذكاء الاصطناعي</TabsTrigger></TabsList>
      <TabsContent value="send"><Card><CardHeader><CardTitle>إرسال عبر WhatsApp Cloud API</CardTitle></CardHeader><CardContent className="max-w-2xl space-y-4">
        <div><Label>العميل</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder={customersQuery.isLoading ? 'جاري تحميل العملاء...' : 'اختر العميل'} /></SelectTrigger><SelectContent>{customers.map(customer => <SelectItem key={customer.id} value={String(customer.id)}>{customer.name_ar || customer.name || `#${customer.id}`} — {customer.phone || 'بدون رقم'}</SelectItem>)}</SelectContent></Select>{selectedCustomer && <p className={`mt-1 text-xs ${selectedCustomer.phone?.trim().startsWith('+') ? 'text-emerald-600' : 'text-destructive'}`} dir="ltr">{selectedCustomer.phone || 'لا يوجد رقم'}{!selectedCustomer.phone?.trim().startsWith('+') && ' — يجب حفظه بصيغة +رمز الدولة ثم الرقم'}</p>}</div>
        <div><Label>نوع الرسالة</Label><Select value={type} onValueChange={value => setType(value as 'text' | 'template')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="template">Template معتمدة</SelectItem><SelectItem value="text">نص حر داخل نافذة 24 ساعة</SelectItem></SelectContent></Select></div>
        {type === 'text' ? <div><Label>النص</Label><Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="اكتب الرسالة..." /></div> : <><div><Label>القالب الموجود في Meta</Label><Select value={templateName && languageCode ? `${templateName}|${languageCode}` : ''} onValueChange={selectTemplate}><SelectTrigger><SelectValue placeholder={templatesQuery.isLoading ? 'جاري تحميل القوالب...' : 'اختر قالبًا معتمدًا'} /></SelectTrigger><SelectContent>{sendableTemplates.map(template => <SelectItem key={`${template.name}|${template.language}`} value={`${template.name}|${template.language}`}>{template.name} — {template.language}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-muted-foreground">يتم تحميل القوالب المعتمدة مباشرة من حساب Meta. قالب hello_world تجريبي ويعمل فقط مع أرقام Meta الاختبارية.</p></div><div className="flex items-end gap-2"><div className="flex-1"><Label>اسم القالب</Label><Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="اختر القالب من القائمة" dir="ltr" /></div><Button type="button" variant="outline" onClick={loadOrderConfirmationExample}>مثال يدوي</Button></div><div><Label>رمز اللغة</Label><Input value={languageCode} onChange={e => setLanguageCode(e.target.value)} placeholder="en_US" dir="ltr" /></div><div><Label>مكونات القالب JSON — اختياري</Label><Textarea value={components} onChange={e => setComponents(e.target.value)} rows={7} dir="ltr" placeholder='{"body":{"parameters":[]}}' /><p className="mt-1 text-xs text-muted-foreground">عدّل قيم parameters فقط إذا كان القالب يحتاج متغيرات.</p></div></>}
        <Button disabled={!account?.connected || !customerId || !selectedCustomer?.phone?.trim().match(/^\+[1-9]\d{7,14}$/) || (type === 'text' ? !body : !templateName || !languageCode) || sendMutation.isPending} onClick={() => sendMutation.mutate()}><Send className="me-2 h-4 w-4" />{sendMutation.isPending ? 'جاري الإرسال...' : 'إرسال إلى Meta'}</Button>
      </CardContent></Card></TabsContent>
      <TabsContent value="messages"><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>حالات الرسائل</CardTitle><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statuses).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent></Select></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>العميل</TableHead><TableHead>الرقم</TableHead><TableHead>النوع</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead><TableHead>التفاصيل</TableHead></TableRow></TableHeader><TableBody>{messagesQuery.isLoading ? <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow> : messages.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد رسائل</TableCell></TableRow> : messages.map(message => <TableRow key={message.id}><TableCell>{message.customer?.name || `#${message.customer_id}`}</TableCell><TableCell dir="ltr">{message.to_phone}</TableCell><TableCell>{message.type === 'template' ? `Template: ${message.template_name}` : 'نص حر'}</TableCell><TableCell><StatusBadge status={message.status} /></TableCell><TableCell dir="ltr">{new Date(message.created_at).toLocaleString('ar')}</TableCell><TableCell className="max-w-56 text-sm text-red-600">{message.error_message || message.provider_message_id || '—'}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></TabsContent>
      <TabsContent value="connection"><Card><CardHeader><CardTitle>ربط WhatsApp بنشاطك</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">اضغط الزر وسجّل الدخول إلى Meta، ثم اختر نشاطك ورقم الهاتف وأكمل التحقق. سيحفظ النظام الاتصال تلقائيًا للشركة الحالية؛ لن تحتاج لنسخ Access Token أو App Secret.</p>
        <div className="flex flex-wrap items-center gap-2"><Badge className={account?.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}>{accountQuery.isLoading ? 'جارٍ تحميل الحالة...' : account?.connected ? 'متصل' : 'غير متصل'}</Badge>{account?.status && <span className="text-muted-foreground">الحالة: {account.status}</span>}{account?.display_phone_number && <span dir="ltr" className="font-medium">{account.display_phone_number}</span>}</div>
        {accountQuery.isError && <p role="alert" className="text-destructive">تعذر تحميل حالة اتصال الشركة.</p>}
        {signupConfigQuery.isError && <p role="alert" className="text-destructive">تعذر تحميل إعدادات Meta؛ أبلغ مسؤول النظام.</p>}
        {account?.last_error && <p role="alert" className="rounded border border-destructive/30 bg-destructive/5 p-3 text-destructive">آخر مشكلة في الإعداد: {account.last_error}</p>}
        {!signupConfigQuery.isLoading && !signupConfig?.enabled && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">لم يجهّز مسؤول النظام تطبيق Meta بعد. لا تدخل أي توكنات هنا؛ يجب تهيئة App ID وConfiguration ID على الخادم ثم النشر عبر HTTPS.</div>}
        <div className="flex flex-wrap gap-2"><Button onClick={launchEmbeddedSignup} disabled={!signupConfig?.enabled || !sdkReady || embeddedSignupCompleteMutation.isPending || accountQuery.isLoading}>{embeddedSignupCompleteMutation.isPending ? 'جارٍ إكمال الربط...' : sdkReady ? (account?.connected ? 'إعادة ربط عبر Meta' : 'ربط واتساب من Meta') : 'تحميل نافذة Meta...'}</Button>{account?.connected && <Button variant="outline" onClick={() => testAccountMutation.mutate()} disabled={testAccountMutation.isPending}>{testAccountMutation.isPending ? 'جارٍ الاختبار...' : 'اختبار الاتصال'}</Button>}</div>
        {account?.connected && <div className="rounded-lg border bg-muted/40 p-3"><p className="font-medium">تم ربط {account.verified_name || 'نشاطك'} بحساب WhatsApp Cloud API.</p>{account.webhook_url && <p className="mt-1 text-xs text-muted-foreground">Webhook: <code dir="ltr">{account.webhook_url}</code></p>}</div>}
        <p className="text-xs text-muted-foreground">قبل إتاحة الربط لجميع العملاء، يجب على المنصة إكمال متطلبات Tech Provider وApp Review لدى Meta. الردود الآلية بالذكاء الاصطناعي لا تُفعّل تلقائيًا بمجرد الربط.</p>
      </CardContent></Card></TabsContent>
      <TabsContent value="agent"><WhatsAppAgentSettings /></TabsContent>
    </Tabs>
  </div></MainLayout>;
}
