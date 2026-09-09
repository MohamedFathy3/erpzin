import { useState } from 'react';
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

type Message = {
  id: number; customer_id: number; to_phone: string; type: 'text' | 'template'; template_name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'; error_message?: string;
  provider_message_id?: string; created_at: string; customer?: { name: string };
};
type Customer = { id: number; name?: string; name_ar?: string; phone?: string | null };

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

  const customersQuery = useQuery<{ data: Customer[] }>({
    queryKey: ['whatsapp-customers'],
    queryFn: async () => (await api.post('/customer/index', { paginate: false, perPage: 500, orderBy: 'name', orderByDirection: 'asc' })).data,
  });
  const customers = customersQuery.data?.data ?? [];
  const selectedCustomer = customers.find(customer => String(customer.id) === customerId);

  const messagesQuery = useQuery<{ data: { data: Message[] } }>({
    queryKey: ['whatsapp-messages', statusFilter],
    queryFn: async () => (await api.get(`/crm/whatsapp/messages${statusFilter === 'all' ? '' : `?status=${statusFilter}`}`)).data,
    refetchInterval: 15000,
  });
  const messages = messagesQuery.data?.data?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { type };
      if (type === 'text') payload.body = body;
      else {
        payload.template_name = templateName;
        payload.language_code = languageCode;
        if (components.trim()) payload.components = JSON.parse(components);
      }
      return api.post(`/crm/customers/${customerId}/send-whatsapp`, payload);
    },
    onSuccess: () => {
      toast.success('تم إرسال الرسالة إلى Meta بنجاح');
      setBody(''); setTemplateName(''); setComponents('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'تعذر إرسال رسالة WhatsApp'),
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
      <TabsList><TabsTrigger value="send">إرسال رسالة</TabsTrigger><TabsTrigger value="messages">سجل الرسائل ({messages.length})</TabsTrigger><TabsTrigger value="connection">إعداد الربط</TabsTrigger></TabsList>
      <TabsContent value="send"><Card><CardHeader><CardTitle>إرسال عبر WhatsApp Cloud API</CardTitle></CardHeader><CardContent className="max-w-2xl space-y-4">
        <div><Label>العميل</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue placeholder={customersQuery.isLoading ? 'جاري تحميل العملاء...' : 'اختر العميل'} /></SelectTrigger><SelectContent>{customers.map(customer => <SelectItem key={customer.id} value={String(customer.id)}>{customer.name_ar || customer.name || `#${customer.id}`} — {customer.phone || 'بدون رقم'}</SelectItem>)}</SelectContent></Select>{selectedCustomer && <p className={`mt-1 text-xs ${selectedCustomer.phone?.trim().startsWith('+') ? 'text-emerald-600' : 'text-destructive'}`} dir="ltr">{selectedCustomer.phone || 'لا يوجد رقم'}{!selectedCustomer.phone?.trim().startsWith('+') && ' — يجب حفظه بصيغة +رمز الدولة ثم الرقم'}</p>}</div>
        <div><Label>نوع الرسالة</Label><Select value={type} onValueChange={value => setType(value as 'text' | 'template')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="template">Template معتمدة</SelectItem><SelectItem value="text">نص حر داخل نافذة 24 ساعة</SelectItem></SelectContent></Select></div>
        {type === 'text' ? <div><Label>النص</Label><Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="اكتب الرسالة..." /></div> : <><div><Label>اسم القالب المعتمد</Label><Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="welcome_message" dir="ltr" /></div><div><Label>رمز اللغة</Label><Input value={languageCode} onChange={e => setLanguageCode(e.target.value)} placeholder="ar" dir="ltr" /></div><div><Label>مكونات القالب JSON — اختياري</Label><Textarea value={components} onChange={e => setComponents(e.target.value)} rows={3} dir="ltr" placeholder='[{"type":"body","parameters":[]}]' /></div></>}
        <Button disabled={!customerId || !selectedCustomer?.phone?.trim().match(/^\+[1-9]\d{7,14}$/) || (type === 'text' ? !body : !templateName || !languageCode) || sendMutation.isPending} onClick={() => sendMutation.mutate()}><Send className="me-2 h-4 w-4" />{sendMutation.isPending ? 'جاري الإرسال...' : 'إرسال إلى Meta'}</Button>
      </CardContent></Card></TabsContent>
      <TabsContent value="messages"><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>حالات الرسائل</CardTitle><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem>{Object.entries(statuses).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent></Select></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>العميل</TableHead><TableHead>الرقم</TableHead><TableHead>النوع</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead><TableHead>التفاصيل</TableHead></TableRow></TableHeader><TableBody>{messagesQuery.isLoading ? <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow> : messages.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد رسائل</TableCell></TableRow> : messages.map(message => <TableRow key={message.id}><TableCell>{message.customer?.name || `#${message.customer_id}`}</TableCell><TableCell dir="ltr">{message.to_phone}</TableCell><TableCell>{message.type === 'template' ? `Template: ${message.template_name}` : 'نص حر'}</TableCell><TableCell><StatusBadge status={message.status} /></TableCell><TableCell dir="ltr">{new Date(message.created_at).toLocaleString('ar')}</TableCell><TableCell className="max-w-56 text-sm text-red-600">{message.error_message || message.provider_message_id || '—'}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card></TabsContent>
      <TabsContent value="connection"><Card><CardHeader><CardTitle>إعداد وربط Meta</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><p>بيانات الربط السرية محفوظة في إعدادات الخادم ولا يتم عرضها في المتصفح.</p><div className="rounded-lg border bg-muted/40 p-4"><p className="font-medium">رابط Webhook الذي يجب تسجيله في Meta:</p><code className="mt-2 block break-all" dir="ltr">{window.location.origin}/api/integrations/whatsapp/webhook</code></div><div className="grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-3"><p className="font-medium">المطلوب من Meta</p><p className="text-muted-foreground">Phone Number ID، Business Account ID، Permanent Access Token، App Secret.</p></div><div className="rounded-lg border p-3"><p className="font-medium">مهم</p><p className="text-muted-foreground">لا يوجد بحث عام رسمي عن أرقام WhatsApp؛ التحقق يكون بصيغة E.164 ونتيجة Template معتمدة.</p></div></div></CardContent></Card></TabsContent>
    </Tabs>
  </div></MainLayout>;
}
