import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, RefreshCw, Save, UserRound } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type AgentSettings = {
  is_enabled: boolean;
  agent_name: string;
  timezone: string;
  business_context: string | null;
  instructions: string | null;
  handoff_message: string;
  enabled_actions: string[] | null;
};
type Conversation = {
  id: number;
  contact_phone: string;
  contact_name: string | null;
  status: 'bot_active' | 'needs_human' | 'resolved';
  updated_at: string;
  messages?: Array<{ id: number; direction: string; body: string | null; created_at: string }>;
};
type AppointmentRequest = {
  id: number;
  contact_phone: string;
  service_summary: string | null;
  requested_time_text: string | null;
  customer_details: string | null;
  status: 'pending' | 'contacted' | 'closed' | 'confirmed';
  scheduled_starts_at: string | null;
  scheduled_ends_at: string | null;
  created_at: string;
};
const initial: AgentSettings = {
  is_enabled: false,
  agent_name: 'مساعد خدمة العملاء',
  timezone: 'UTC',
  business_context: '',
  instructions: '',
  handoff_message: 'سأحوّل محادثتك إلى أحد أعضاء فريقنا لمساعدتك.',
  enabled_actions: ['order_status', 'appointment_request', 'human_handoff'],
};
const apiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
};

export default function WhatsAppAgentSettings() {
  const client = useQueryClient();
  const [form, setForm] = useState<AgentSettings>(initial);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [appointmentTimes, setAppointmentTimes] = useState<Record<number, { starts_at: string; ends_at: string }>>({});
  const settingsQuery = useQuery<{ data: AgentSettings }>({
    queryKey: ['whatsapp-agent-settings'],
    queryFn: async () => (await api.get('/whatsapp/agent/settings')).data,
  });
  useEffect(() => {
    if (settingsQuery.data?.data) setForm({ ...initial, ...settingsQuery.data.data });
  }, [settingsQuery.data]);
  const conversationsQuery = useQuery<{ data: { data: Conversation[] } }>({
    queryKey: ['whatsapp-agent-conversations'],
    queryFn: async () => (await api.get('/whatsapp/agent/conversations?per_page=50')).data,
    refetchInterval: 30000,
  });
  const appointmentsQuery = useQuery<{ data: { data: AppointmentRequest[] } }>({
    queryKey: ['whatsapp-appointment-requests'],
    queryFn: async () => (await api.get('/whatsapp/agent/appointment-requests?per_page=50')).data,
    refetchInterval: 30000,
  });
  const save = useMutation({
    mutationFn: async () => api.put('/whatsapp/agent/settings', {
      ...form,
      enabled_actions: form.enabled_actions || [],
    }),
    onSuccess: async () => {
      toast.success(form.is_enabled ? 'تم حفظ إعدادات وتشغيل وكيل الشركة' : 'تم حفظ إعدادات الوكيل وإيقافه');
      await client.invalidateQueries({ queryKey: ['whatsapp-agent-settings'] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, 'تعذر حفظ إعدادات الوكيل')),
  });
  const updateConversation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Conversation['status'] }) => api.patch(`/whatsapp/agent/conversations/${id}`, { status }),
    onSuccess: async () => {
      toast.success('تم تحديث حالة المحادثة');
      await client.invalidateQueries({ queryKey: ['whatsapp-agent-conversations'] });
    },
    onError: () => toast.error('تعذر تحديث المحادثة'),
  });
  const sendHumanReply = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: string }) => api.post(`/whatsapp/agent/conversations/${id}/send`, { body }),
    onSuccess: async (_result, variables) => {
      setDrafts(current => ({ ...current, [variables.id]: '' }));
      toast.success('تم إرسال رد الموظف');
      await client.invalidateQueries({ queryKey: ['whatsapp-agent-conversations'] });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, 'تعذر إرسال الرد. تحقق من نافذة 24 ساعة.')),
  });
  const updateAppointment = useMutation({
    mutationFn: async ({ id, status, starts_at, ends_at }: { id: number; status: AppointmentRequest['status']; starts_at?: string; ends_at?: string }) => api.patch(`/whatsapp/agent/appointment-requests/${id}`, { status, starts_at, ends_at }),
    onSuccess: async () => {
      toast.success('تم تحديث طلب الموعد');
      await client.invalidateQueries({ queryKey: ['whatsapp-appointment-requests'] });
    },
    onError: () => toast.error('تعذر تحديث طلب الموعد'),
  });
  const toggleAction = (action: string) => {
    const current = form.enabled_actions || [];
    setForm({ ...form, enabled_actions: current.includes(action) ? current.filter(item => item !== action) : [...current, action] });
  };
  const conversations = conversationsQuery.data?.data?.data || [];
  const needsHuman = conversations.filter(item => item.status === 'needs_human');
  const appointments = appointmentsQuery.data?.data?.data || [];

  return <div className="space-y-5" dir="rtl">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />وكيل واتساب الخاص بشركتك</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">إعدادات ومعرفة مستقلة لهذا الـTenant. لا يرى الوكيل بيانات الشركات الأخرى. الرد الآلي يعمل فقط بعد ربط واتساب، وداخل نافذة خدمة العميل البالغة 24 ساعة.</p>
        <label className="flex items-center gap-3 rounded-md border p-3"><input type="checkbox" checked={form.is_enabled} onChange={e => setForm({ ...form, is_enabled: e.target.checked })} /><span><span className="block font-medium">تشغيل الرد الآلي</span><span className="text-xs text-muted-foreground">تأكد من مراجعة معلومات الشركة وتجربة الردود قبل التفعيل.</span></span></label>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="wa-agent-name">اسم المساعد</Label><Input id="wa-agent-name" value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} maxLength={120} /></div>
          <div className="space-y-2"><Label htmlFor="wa-agent-timezone">منطقة الشركة الزمنية (IANA)</Label><Input id="wa-agent-timezone" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} maxLength={64} placeholder="مثال: Asia/Aden" dir="ltr" /><p className="text-xs text-muted-foreground">تُستخدم لتفسير أوقات العميل وتأكيد المواعيد في Google Calendar.</p></div>
          <div className="space-y-2"><Label htmlFor="wa-handoff">رسالة التحويل لموظف</Label><Input id="wa-handoff" value={form.handoff_message} onChange={e => setForm({ ...form, handoff_message: e.target.value })} maxLength={500} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="wa-business-context">معلومات الشركة (مصدر إجابات الوكيل)</Label><Textarea id="wa-business-context" value={form.business_context || ''} onChange={e => setForm({ ...form, business_context: e.target.value })} rows={7} maxLength={12000} placeholder="اكتب الخدمات والمنتجات، الأسعار والسياسات المؤكدة، أوقات العمل، المناطق التي تخدمها، وبيانات التواصل." /><p className="text-xs text-muted-foreground">لا تضع كلمات مرور أو أسرارًا أو بيانات عملاء هنا. لا يجوز للوكيل اختراع معلومات غير موجودة.</p></div>
        <div className="space-y-2"><Label htmlFor="wa-agent-instructions">تعليمات إضافية للشركة</Label><Textarea id="wa-agent-instructions" value={form.instructions || ''} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={3} maxLength={8000} placeholder="مثال: أجب باللهجة اليمنية، واطلب رقم الفاتورة عند الحاجة." /></div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">القدرات المسموحة</legend>
          <div className="grid gap-2 md:grid-cols-3">
            {[
              ['order_status', 'الاستعلام عن فواتير وأوامر الخدمة'],
              ['appointment_request', 'جمع طلب حجز/موعد وإحالته للتأكيد'],
              ['human_handoff', 'تحويل لموظف عند الحاجة'],
            ].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={(form.enabled_actions || []).includes(key)} onChange={() => toggleAction(key)} />{label}</label>)}
          </div>
          <p className="text-xs text-muted-foreground">تعرض الفواتير وأوامر صيانة السيارات المسجلة للعميل عند تطابق رقم واتساب مع رقم العميل داخل نفس الشركة. طلبات المواعيد تُسجّل هنا وتُحال لموظف؛ لا يتم تأكيد موعد تلقائي أو إنشاء حدث تقويم دون مراجعة التوفر والموظف المسؤول.</p>
        </fieldset>
        <Button onClick={() => save.mutate()} disabled={save.isPending || settingsQuery.isLoading}><Save className="me-2 h-4 w-4" />{save.isPending ? 'جارٍ الحفظ...' : 'حفظ إعدادات الوكيل'}</Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>طلبات المواعيد الواردة <Badge className="ms-2">{appointments.filter(item => item.status === 'pending').length} جديد</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {appointmentsQuery.isError && <p role="alert" className="text-sm text-destructive">تعذر تحميل طلبات المواعيد.</p>}
        {appointments.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد طلبات مواعيد مسجلة حتى الآن.</p> : appointments.map(appointment => <div key={appointment.id} className="flex flex-col justify-between gap-3 rounded-md border p-3 sm:flex-row sm:items-center">
          <div><p className="font-medium">{appointment.service_summary || 'طلب موعد'}</p><p dir="ltr" className="text-xs text-muted-foreground">{appointment.contact_phone}</p><p className="mt-1 text-sm">الوقت الذي طلبه العميل: {appointment.requested_time_text || 'لم يحدده'}</p>{appointment.customer_details && <p className="text-sm text-muted-foreground">{appointment.customer_details}</p>}{appointment.status === 'confirmed' && appointment.scheduled_starts_at && <p className="mt-1 text-sm font-medium">تم التأكيد: {new Date(appointment.scheduled_starts_at).toLocaleString()}</p>}<Badge variant="outline" className="mt-2">{appointment.status === 'pending' ? 'بانتظار التواصل' : appointment.status === 'contacted' ? 'تم التواصل' : appointment.status === 'confirmed' ? 'مؤكد في التقويم' : 'مغلق'}</Badge></div>
          {appointment.status === 'pending' && <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><Input aria-label="موعد البداية" type="datetime-local" value={appointmentTimes[appointment.id]?.starts_at || ''} onChange={event => setAppointmentTimes(current => ({ ...current, [appointment.id]: { ...current[appointment.id], starts_at: event.target.value, ends_at: current[appointment.id]?.ends_at || '' } }))} /><Input aria-label="موعد النهاية" type="datetime-local" value={appointmentTimes[appointment.id]?.ends_at || ''} onChange={event => setAppointmentTimes(current => ({ ...current, [appointment.id]: { ...current[appointment.id], starts_at: current[appointment.id]?.starts_at || '', ends_at: event.target.value } }))} /><Button size="sm" disabled={updateAppointment.isPending || !appointmentTimes[appointment.id]?.starts_at || !appointmentTimes[appointment.id]?.ends_at} onClick={() => updateAppointment.mutate({ id: appointment.id, status: 'confirmed', starts_at: appointmentTimes[appointment.id].starts_at, ends_at: appointmentTimes[appointment.id].ends_at })}>تأكيد وحجز في Google</Button><Button size="sm" variant="outline" disabled={updateAppointment.isPending} onClick={() => updateAppointment.mutate({ id: appointment.id, status: 'contacted' })}>تم التواصل</Button><Button size="sm" variant="secondary" disabled={updateAppointment.isPending} onClick={() => updateAppointment.mutate({ id: appointment.id, status: 'closed' })}>إغلاق</Button></div>}
        </div>)}
        <p className="text-xs text-muted-foreground">للتأكيد اختر وقت البداية والنهاية: سيفحص النظام تقويم Google للشركة ويمنع التعارض قبل إنشاء الحدث. يتطلب هذا ربط Google Calendar بنطاق `calendar.events`. تأكيد الموعد في التقويم لا يرسل إشعار تأكيد تلقائيًا للعميل؛ أرسل له رسالة مناسبة يدويًا أو عبر قالب معتمد خارج نافذة 24 ساعة.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />محادثات تحتاج موظفًا <Badge>{needsHuman.length}</Badge></CardTitle><Button variant="outline" size="sm" onClick={() => void conversationsQuery.refetch()} disabled={conversationsQuery.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${conversationsQuery.isFetching ? 'animate-spin' : ''}`} />تحديث</Button></CardHeader>
      <CardContent className="space-y-3">
        {conversationsQuery.isError && <p role="alert" className="text-sm text-destructive">تعذر تحميل المحادثات. شغّل تحديثات الـBackend وقاعدة البيانات أولًا.</p>}
        {needsHuman.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد محادثات معلّقة حاليًا.</p> : needsHuman.map(conversation => <div key={conversation.id} className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{conversation.contact_name || conversation.contact_phone}</p><p dir="ltr" className="text-xs text-muted-foreground">{conversation.contact_phone}</p></div>
            <Button size="sm" variant="outline" disabled={updateConversation.isPending} onClick={() => updateConversation.mutate({ id: conversation.id, status: 'bot_active' })}>إعادة تفعيل الوكيل</Button>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md bg-muted/40 p-3">{[...(conversation.messages || [])].reverse().map(message => <div key={message.id} className={`max-w-[90%] rounded-md p-2 text-sm ${message.direction === 'inbound' ? 'ms-auto bg-background' : 'me-auto bg-primary/10'}`}><p>{message.body || '[رسالة غير نصية]'}</p><time className="mt-1 block text-[10px] text-muted-foreground" dir="ltr">{new Date(message.created_at).toLocaleString()}</time></div>)}</div>
          <div className="flex flex-col gap-2 sm:flex-row"><Textarea value={drafts[conversation.id] || ''} onChange={event => setDrafts(current => ({ ...current, [conversation.id]: event.target.value }))} rows={2} maxLength={4096} placeholder="اكتب رد الموظف..." /><Button className="shrink-0" disabled={!drafts[conversation.id]?.trim() || sendHumanReply.isPending} onClick={() => sendHumanReply.mutate({ id: conversation.id, body: drafts[conversation.id].trim() })}>إرسال رد</Button></div>
        </div>)}
      </CardContent>
    </Card>
  </div>;
}
