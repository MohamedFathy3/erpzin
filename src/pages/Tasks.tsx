import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarClock, CheckCircle2, Clock3, Edit2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { toast } from 'sonner';

type Task = { id: number; title: string; description?: string; due_date?: string; status: string; priority: string; reminders?: { id: number; remind_at: string; channel: string; status: string }[] };
type ApiError = { response?: { data?: { message?: string } } };

const statusLabels: Record<string, string> = { open: 'مفتوحة', in_progress: 'قيد التنفيذ', completed: 'مكتملة', cancelled: 'ملغاة' };
const priorityLabels: Record<string, string> = { low: 'منخفضة', normal: 'عادية', high: 'مرتفعة', urgent: 'عاجلة' };

export default function Tasks() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const [remindAt, setRemindAt] = useState('');
  const [channel, setChannel] = useState('in-app');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const tasksQuery = useQuery<{ data: { data: Task[] } }>({ queryKey: ['tasks'], queryFn: async () => (await api.get('/tasks')).data });
  const notificationsQuery = useQuery<{ data: { data: { id: number; title: string; message: string; is_read: boolean }[] } }>({ queryKey: ['task-notifications'], queryFn: async () => (await api.get('/tasks/notifications?unread=1')).data });
  const tasks = tasksQuery.data?.data?.data ?? [];
  const notifications = notificationsQuery.data?.data?.data ?? [];

  const resetForm = () => { setEditingTaskId(null); setTitle(''); setDescription(''); setDueDate(''); setPriority('normal'); setRemindAt(''); setChannel('in-app'); };
  const createMutation = useMutation({
    mutationFn: async () => { const response = await api.post('/tasks', { title, description: description || undefined, due_date: dueDate || undefined, priority }); if (remindAt) await api.post(`/tasks/${response.data.data.id}/reminders`, { remind_at: remindAt, channel }); return response; },
    onSuccess: () => { toast.success('تم إنشاء المهمة'); resetForm(); queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
    onError: (error: ApiError) => toast.error(error?.response?.data?.message || 'تعذر إنشاء المهمة'),
  });
  const updateMutation = useMutation({
    mutationFn: () => api.put(`/tasks/${editingTaskId}`, { title, description: description || undefined, due_date: dueDate || undefined, priority }),
    onSuccess: () => { toast.success('تم تعديل المهمة'); resetForm(); queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
    onError: (error: ApiError) => toast.error(error?.response?.data?.message || 'تعذر تعديل المهمة'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => { toast.success('تم حذف المهمة'); queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
  });
  const startEditing = (task: Task) => { setEditingTaskId(task.id); setTitle(task.title); setDescription(task.description || ''); setDueDate(task.due_date ? task.due_date.slice(0, 16) : ''); setPriority(task.priority); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <MainLayout activeItem="tasks"><div className="space-y-6" dir="rtl">
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h1 className="text-2xl font-bold">المهام والتذكيرات</h1><p className="text-muted-foreground">نظّم مهام الفريق واربط مواعيدها بالتقويم والتنبيهات.</p></div><Button variant="outline" onClick={() => { tasksQuery.refetch(); notificationsQuery.refetch(); }} disabled={tasksQuery.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${tasksQuery.isFetching ? 'animate-spin' : ''}`} />تحديث</Button></div>
    {notifications.length > 0 && <Card className="border-amber-200 bg-amber-50"><CardHeader><CardTitle className="flex items-center gap-2 text-amber-900"><Bell className="h-5 w-5" />تذكيرات غير مقروءة ({notifications.length})</CardTitle></CardHeader><CardContent className="space-y-2">{notifications.map(item => <div key={item.id} className="rounded border border-amber-200 bg-white p-3"><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.message}</p></div>)}</CardContent></Card>}
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2">{editingTaskId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}{editingTaskId ? 'تعديل المهمة' : 'مهمة جديدة'}</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>العنوان</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: متابعة عرض السعر" /></div><div><Label>الوصف</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div><div><Label>موعد الاستحقاق</Label><Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} dir="ltr" /></div><div><Label>الأولوية</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(priorityLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>{!editingTaskId && <div className="border-t pt-4"><Label>تذكير اختياري</Label><Input className="mt-2" type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)} dir="ltr" />{remindAt && <Select value={channel} onValueChange={setChannel}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in-app">داخل النظام</SelectItem><SelectItem value="email">البريد الإلكتروني</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select>}</div>}<div className="flex gap-2"><Button className="flex-1" disabled={!title || createMutation.isPending || updateMutation.isPending} onClick={() => editingTaskId ? updateMutation.mutate() : createMutation.mutate()}>{editingTaskId ? <Edit2 className="me-2 h-4 w-4" /> : <Plus className="me-2 h-4 w-4" />}{editingTaskId ? 'حفظ التعديل' : 'حفظ المهمة'}</Button>{editingTaskId && <Button type="button" variant="outline" onClick={resetForm}><X className="me-2 h-4 w-4" />إلغاء</Button>}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>قائمة المهام ({tasks.length})</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>المهمة</TableHead><TableHead>الاستحقاق</TableHead><TableHead>الحالة</TableHead><TableHead>الأولوية</TableHead><TableHead>التذكيرات</TableHead><TableHead /></TableRow></TableHeader><TableBody>{tasks.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد مهام بعد</TableCell></TableRow> : tasks.map(task => <TableRow key={task.id}><TableCell><p className="font-medium">{task.title}</p>{task.description && <p className="max-w-xs truncate text-xs text-muted-foreground">{task.description}</p>}</TableCell><TableCell>{task.due_date ? <span className="flex items-center gap-1 text-sm"><CalendarClock className="h-4 w-4" />{new Date(task.due_date).toLocaleString('ar')}</span> : '—'}</TableCell><TableCell><Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>{statusLabels[task.status] || task.status}</Badge></TableCell><TableCell>{priorityLabels[task.priority] || task.priority}</TableCell><TableCell>{task.reminders?.length ? <span className="flex items-center gap-1 text-sm"><Clock3 className="h-4 w-4" />{task.reminders.length}</span> : '—'}</TableCell><TableCell><div className="flex"><Button variant="ghost" size="icon" onClick={() => startEditing(task)}><Edit2 className="h-4 w-4 text-blue-600" /></Button><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(task.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4" />تتم معالجة التذكيرات تلقائيًا كل خمس دقائق من خلال Laravel Scheduler.</div>
  </div></MainLayout>;
}
