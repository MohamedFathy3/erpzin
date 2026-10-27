import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Save, UserRoundCheck } from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

type Employee = { id: number; name: string; employee_code: string; shift_id?: number | null };
type Shift = { id: number; name: string; start_time: string; end_time: string; grace_minutes: number; employees?: Employee[]; employees_count?: number };

export default function ShiftManager({ employees }: { employees: Employee[] }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', start_time: '09:00', end_time: '17:00', grace_minutes: 15 });
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const { data: shifts = [], isFetching } = useQuery<Shift[]>({
    queryKey: ['biometric-shifts'],
    queryFn: async () => (await api.get('/biometric/shifts')).data.data,
  });
  const createShift = useMutation({
    mutationFn: async () => (await api.post('/biometric/shifts', form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biometric-shifts'] }); setForm({ name: '', start_time: '09:00', end_time: '17:00', grace_minutes: 15 }); toast({ title: ar ? 'تم إنشاء الشفت' : 'Shift created' }); },
  });
  const assignShift = useMutation({
    mutationFn: async ({ id, employee_ids }: { id: number; employee_ids: number[] }) => (await api.post(`/biometric/shifts/${id}/assign`, { employee_ids })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biometric-shifts'] }); qc.invalidateQueries({ queryKey: ['employees'] }); toast({ title: ar ? 'تم ربط الموظفين بالشفت' : 'Employees assigned to shift' }); },
  });
  const shiftEmployees = (shift: Shift) => selected[shift.id] ?? shift.employees?.map(employee => employee.id) ?? [];
  const toggleEmployee = (shift: Shift, employeeId: number) => { const current = shiftEmployees(shift); setSelected({ ...selected, [shift.id]: current.includes(employeeId) ? current.filter(id => id !== employeeId) : [...current, employeeId] }); };
  const crossesMidnight = (start: string, end: string) => end <= start;

  return <div className="space-y-4 pt-4">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 size={20} />{ar ? 'إدارة الشفتات' : 'Shift management'}</CardTitle><p className="text-sm text-muted-foreground">{ar ? 'أنشئ شفت صباحي أو مسائي واربطه بموظفين محددين. مثال: 18:00 إلى 01:00 يُحسب كشفت ليلي.' : 'Create day or night shifts and assign them to employees. Example: 18:00 to 01:00 is treated as an overnight shift.'}</p></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><div><Label>{ar ? 'اسم الشفت' : 'Shift name'}</Label><Input placeholder={ar ? 'الشفت المسائي' : 'Evening shift'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>{ar ? 'من' : 'Start'}</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div><div><Label>{ar ? 'إلى' : 'End'}</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div><div><Label>{ar ? 'سماح التأخير بالدقائق' : 'Grace minutes'}</Label><Input type="number" min="0" value={form.grace_minutes} onChange={e => setForm({ ...form, grace_minutes: Number(e.target.value) })} /></div></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{crossesMidnight(form.start_time, form.end_time) ? (ar ? 'شفت ليلي: يمتد لليوم التالي' : 'Overnight shift: ends on the next day') : (ar ? 'شفت في نفس اليوم' : 'Same-day shift')}</p><Button onClick={() => createShift.mutate()} disabled={createShift.isPending || !form.name.trim()}><Clock3 size={16} className="me-2" />{ar ? 'إنشاء شفت' : 'Create shift'}</Button></div></CardContent></Card>
    {isFetching && <p>{ar ? 'جاري تحميل الشفتات...' : 'Loading shifts...'}</p>}
    {shifts.map(shift => <Card key={shift.id}><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg">{shift.name}</CardTitle><span className="text-sm text-muted-foreground" dir="ltr">{shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)} {shift.end_time <= shift.start_time ? (ar ? '(ليلي)' : '(overnight)') : ''} · {shift.grace_minutes} min</span></div></CardHeader><CardContent><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto rounded-md border p-3">{employees.map(employee => { const checked = shiftEmployees(shift).includes(employee.id); return <label key={employee.id} className="flex items-center gap-2 rounded border p-2 cursor-pointer"><input type="checkbox" checked={checked} onChange={() => toggleEmployee(shift, employee.id)} /><span>{employee.name} <small className="text-muted-foreground">({employee.employee_code})</small></span></label>; })}</div><div className="mt-3 flex items-center justify-between"><span className="text-sm text-muted-foreground"><UserRoundCheck size={15} className="inline me-1" />{shiftEmployees(shift).length} {ar ? 'موظف' : 'employees'}</span><Button size="sm" onClick={() => assignShift.mutate({ id: shift.id, employee_ids: shiftEmployees(shift) })} disabled={assignShift.isPending}><Save size={15} className="me-1" />{ar ? 'حفظ الربط' : 'Save assignments'}</Button></div></CardContent></Card>)}
    {!shifts.length && !isFetching && <Card><CardContent className="p-6 text-center text-muted-foreground">{ar ? 'لم يتم إنشاء شفتات بعد.' : 'No shifts created yet.'}</CardContent></Card>}
  </div>;
}
