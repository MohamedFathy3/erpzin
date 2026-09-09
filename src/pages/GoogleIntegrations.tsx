import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Cloud, ExternalLink, Link2, RefreshCw, ShieldCheck, Unlink } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { toast } from 'sonner';

type Connection = { connected: boolean; status?: string; google_email?: string; google_name?: string; scopes?: string[]; connected_at?: string };
type CalendarEvent = { id: number; summary: string; starts_at: string; ends_at: string; google_event_id?: string };
type ApiError = { response?: { data?: { message?: string } } };

export default function GoogleIntegrations() {
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState('اجتماع تجريبي من ERP');
  const [description, setDescription] = useState('تم إنشاؤه من إعدادات Google في النظام.');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') toast.success('تم ربط حساب Google بنجاح');
    if (params.get('google') === 'error') toast.error('تعذر إكمال ربط حساب Google');
    if (params.has('google')) window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const statusQuery = useQuery<{ data: Connection }>({
    queryKey: ['google-status'],
    queryFn: async () => (await api.get('/integrations/google/status')).data,
  });
  const eventsQuery = useQuery<{ data: { data: CalendarEvent[] } }>({
    queryKey: ['google-events'],
    queryFn: async () => (await api.get('/integrations/google/events')).data,
  });
  const connection = statusQuery.data?.data;
  const events = eventsQuery.data?.data?.data ?? [];

  const connectMutation = useMutation({
    mutationFn: async () => (await api.get('/integrations/google/auth-url')).data,
    onSuccess: (response) => { window.location.href = response.data.url; },
    onError: (error: ApiError) => toast.error(error?.response?.data?.message || 'Google OAuth غير مهيأ على الخادم'),
  });
  const disconnectMutation = useMutation({
    mutationFn: () => api.post('/integrations/google/disconnect'),
    onSuccess: () => { toast.success('تم فصل حساب Google'); queryClient.invalidateQueries({ queryKey: ['google-status'] }); },
  });
  const eventMutation = useMutation({
    mutationFn: () => api.post('/integrations/google/events', { summary, description, starts_at: startsAt, ends_at: endsAt }),
    onSuccess: () => { toast.success('تم إنشاء الحدث في Google Calendar'); queryClient.invalidateQueries({ queryKey: ['google-events'] }); },
    onError: (error: ApiError) => toast.error(error?.response?.data?.message || 'تعذر إنشاء الحدث'),
  });

  return <MainLayout activeItem="google-integrations"><div className="space-y-6" dir="rtl">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div><h1 className="text-2xl font-bold">Google Calendar وDrive</h1><p className="text-muted-foreground">اربط حساب Google لمزامنة مواعيد النظام بأمان.</p></div>
      <Button variant="outline" onClick={() => { statusQuery.refetch(); eventsQuery.refetch(); }} disabled={statusQuery.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${statusQuery.isFetching ? 'animate-spin' : ''}`} />تحديث</Button>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-4"><ShieldCheck className="h-8 w-8 text-emerald-600" /><div><p className="font-semibold">OAuth آمن</p><p className="text-sm text-muted-foreground">التوكنات لا تصل للمتصفح</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><CalendarDays className="h-8 w-8 text-blue-600" /><div><p className="font-semibold">Google Calendar</p><p className="text-sm text-muted-foreground">إنشاء ومتابعة الأحداث</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-4"><Cloud className="h-8 w-8 text-slate-600" /><div><p className="font-semibold">Google Drive</p><p className="text-sm text-muted-foreground">صلاحية الملفات التي ينشئها النظام</p></div></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />حساب Google</CardTitle></CardHeader><CardContent className="space-y-4">
      {connection?.connected ? <div className="flex flex-col gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-emerald-600" /><div><p className="font-semibold">متصل: {connection.google_name || connection.google_email}</p><p className="text-sm text-muted-foreground" dir="ltr">{connection.google_email}</p><p className="text-xs text-muted-foreground">الصلاحيات: Calendar Events وDrive Files</p></div></div><Button variant="outline" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}><Unlink className="me-2 h-4 w-4" />فصل الحساب</Button></div> : <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><p className="text-sm text-muted-foreground">لم يتم ربط حساب Google لهذا المستخدم بعد.</p><Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}><Link2 className="me-2 h-4 w-4" />{connectMutation.isPending ? 'جاري التحضير...' : 'Connect with Google'}</Button></div>}
      <p className="text-xs text-muted-foreground">سيطلب النظام فقط صلاحيات أحداث التقويم والملفات التي ينشئها النظام، ولا يطلب قراءة كامل Drive.</p>
    </CardContent></Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>إنشاء Event تجريبي</CardTitle></CardHeader><CardContent className="space-y-4">
        <div><Label>العنوان</Label><Input value={summary} onChange={e => setSummary(e.target.value)} /></div>
        <div><Label>الوصف</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
        <div className="grid gap-3 md:grid-cols-2"><div><Label>البداية</Label><Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} dir="ltr" /></div><div><Label>النهاية</Label><Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} dir="ltr" /></div></div>
        <Button disabled={!connection?.connected || !summary || !startsAt || !endsAt || eventMutation.isPending} onClick={() => eventMutation.mutate()}><CalendarDays className="me-2 h-4 w-4" />{eventMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء في Google Calendar'}</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>الأحداث المنشأة من النظام</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>العنوان</TableHead><TableHead>البداية</TableHead><TableHead>الرابط</TableHead></TableRow></TableHeader><TableBody>{events.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد أحداث بعد</TableCell></TableRow> : events.map(event => <TableRow key={event.id}><TableCell>{event.summary}</TableCell><TableCell dir="ltr">{new Date(event.starts_at).toLocaleString('ar')}</TableCell><TableCell>{event.google_event_id ? <a className="text-primary underline" href={`https://calendar.google.com/calendar/u/0/r/eventedit/${event.google_event_id}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a> : '—'}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    </div>
  </div></MainLayout>;
}
