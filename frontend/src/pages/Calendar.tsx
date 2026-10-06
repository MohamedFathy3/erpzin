import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Link2, Plus, RefreshCw } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const emptyForm = { summary: '', description: '', starts_at: '', ends_at: '' };

export default function Calendar() {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date());
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const eventsQuery = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => (await api.get('/integrations/google/events?per_page=200')).data,
  });
  const statusQuery = useQuery({
    queryKey: ['google-status'],
    queryFn: async () => (await api.get('/integrations/google/status')).data?.data,
  });
  const createMutation = useMutation({
    mutationFn: async () => (await api.post('/integrations/google/events', form)).data,
    onSuccess: () => {
      toast.success('تم حفظ الموعد وربطه بـ Google Calendar');
      setForm(emptyForm);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'تعذر حفظ الموعد'),
  });

  const events = eventsQuery.data?.data?.data || [];
  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [year, month]);
  const eventForDay = (date: Date) => events.filter((event: any) => {
    const starts = new Date(event.starts_at);
    return starts.getFullYear() === date.getFullYear() && starts.getMonth() === date.getMonth() && starts.getDate() === date.getDate();
  });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  return <MainLayout><div className="space-y-6" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="text-primary" /> التقويم والمواعيد</h1><p className="text-muted-foreground">اعرض مواعيدك وأنشئ مواعيد جديدة مرتبطة بـ Google Calendar.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => { eventsQuery.refetch(); statusQuery.refetch(); }}><RefreshCw className="me-2 h-4 w-4" />تحديث</Button><Button onClick={() => setShowForm(value => !value)}><Plus className="me-2 h-4 w-4" />موعد جديد</Button></div></div>
    <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-2">{statusQuery.data?.connected ? <><Badge className="bg-emerald-600">Google متصل</Badge><span className="text-sm text-muted-foreground">{statusQuery.data.google_email}</span></> : <span className="text-sm text-muted-foreground">اربط Google من صفحة تكاملات Google أولًا.</span>}</div><Button variant="outline" asChild><a href="/google-integrations"><Link2 className="me-2 h-4 w-4" />تكاملات Google</a></Button></CardContent></Card>
    {showForm && <Card><CardHeader><CardTitle>إضافة موعد</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><Label>العنوان</Label><Input value={form.summary} onChange={event => update('summary', event.target.value)} placeholder="موعد مع العميل أو المورد" /></div><div><Label>البداية</Label><Input type="datetime-local" value={form.starts_at} onChange={event => update('starts_at', event.target.value)} dir="ltr" /></div><div><Label>النهاية</Label><Input type="datetime-local" value={form.ends_at} onChange={event => update('ends_at', event.target.value)} dir="ltr" /></div><div className="md:col-span-2"><Label>الوصف</Label><Textarea value={form.description} onChange={event => update('description', event.target.value)} /></div><div className="md:col-span-2"><Button disabled={!statusQuery.data?.connected || !form.summary || !form.starts_at || !form.ends_at || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ وربط الموعد'}</Button></div></CardContent></Card>}
    <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>{monthNames[month]} {year}</CardTitle><div className="flex gap-1"><Button size="icon" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronRight className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronLeft className="h-4 w-4" /></Button></div></div></CardHeader><CardContent><div className="grid grid-cols-7 border-s border-t">{['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => <div key={day} className="border-e border-b bg-muted/40 p-2 text-center text-xs font-semibold">{day}</div>)}{days.map(date => { const dayEvents = eventForDay(date); const inMonth = date.getMonth() === month; return <div key={date.toISOString()} className={`min-h-24 border-e border-b p-2 ${inMonth ? 'bg-background' : 'bg-muted/20 text-muted-foreground'}`}><div className="text-xs font-semibold">{date.getDate()}</div><div className="mt-1 space-y-1">{dayEvents.map((event: any) => <a key={event.id} href={event.google_event_id ? `https://calendar.google.com/calendar/u/0/r/eventedit/${event.google_event_id}` : '#'} target="_blank" rel="noreferrer" className="block truncate rounded bg-primary/10 px-1 py-0.5 text-xs text-primary" title={event.summary}>{event.summary}<ExternalLink className="ms-1 inline h-3 w-3" /></a>)}</div></div>; })}</div></CardContent></Card>
  </div></MainLayout>;
}
