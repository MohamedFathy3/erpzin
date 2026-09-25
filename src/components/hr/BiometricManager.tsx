import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fingerprint, Plus, RefreshCw, Save, Settings2, Wifi } from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import BiometricReports from '@/components/hr/BiometricReports';

type Employee = { id: number; employee_code: string; name: string; name_ar?: string; biometric_user_id?: string | null };
type Device = { id: number; name: string; ip_address: string; port: number; protocol: 'tcp' | 'udp'; is_active: boolean; last_synced_at?: string; last_error?: string };
type Rule = { id?: number; name: string; work_start: string; work_end: string; grace_minutes: number; late_deduction_type: string; late_deduction_value: number; absence_deduction_type: string; absence_deduction_value: number; is_active: boolean };

const emptyRule: Rule = { name: 'قاعدة الدوام الأساسية', work_start: '08:00', work_end: '16:00', grace_minutes: 15, late_deduction_type: 'none', late_deduction_value: 0, absence_deduction_type: 'none', absence_deduction_value: 0, is_active: true };

export default function BiometricManager({ employees }: { employees: Employee[] }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const qc = useQueryClient();
  const [deviceForm, setDeviceForm] = useState({ name: 'جهاز البصمة الرئيسي', ip_address: '192.168.1.201', port: 4370, protocol: 'tcp' });
  const [rule, setRule] = useState<Rule>(emptyRule);
  const [mappingValues, setMappingValues] = useState<Record<number, string>>({});

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({ queryKey: ['biometric-devices'], queryFn: async () => (await api.get('/biometric/devices')).data.data });
  const { data: rules = [] } = useQuery<Rule[]>({ queryKey: ['attendance-rules'], queryFn: async () => (await api.get('/biometric/rules')).data.data });

  useEffect(() => { if (rules[0]) setRule(rules[0]); }, [rules]);
  useEffect(() => { setMappingValues(Object.fromEntries(employees.map((e) => [e.id, e.biometric_user_id || '']))); }, [employees]);

  const saveDevice = useMutation({ mutationFn: async () => (await api.post('/biometric/devices', deviceForm)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['biometric-devices'] }); toast({ title: ar ? 'تم حفظ الجهاز' : 'Device saved' }); } });
  const saveRule = useMutation({ mutationFn: async () => (await api.post('/biometric/rules', rule)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance-rules'] }); toast({ title: ar ? 'تم حفظ المعادلة' : 'Rule saved' }); } });
  const syncDevice = useMutation({ mutationFn: async (id: number) => (await api.post(`/biometric/devices/${id}/sync`)).data, onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['biometric-devices'] }); toast({ title: ar ? `تم سحب ${data.data.imported} بصمة` : `${data.data.imported} punches imported` }); }, onError: (e: unknown) => toast({ title: ar ? 'فشل الاتصال بالجهاز' : 'Device sync failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }) });
  const testDevice = useMutation({ mutationFn: async (id: number) => (await api.post(`/biometric/devices/${id}/test`)).data, onSuccess: (data) => toast({ title: data.data.connected ? (ar ? 'الجهاز متصل' : 'Device connected') : (ar ? 'الجهاز غير متصل' : 'Device unavailable') }) });
  const saveMapping = useMutation({ mutationFn: async ({ id, value }: { id: number; value: string }) => api.patch(`/biometric/mappings/${id}`, { biometric_user_id: value || null }), onSuccess: () => toast({ title: ar ? 'تم ربط الموظف بالجهاز' : 'Employee mapping saved' }) });

  return <Card className="mt-4">
    <CardHeader><CardTitle className="flex items-center gap-2"><Fingerprint size={20} />{ar ? 'البصمة وحساب الرواتب' : 'Biometric Attendance & Payroll'}</CardTitle></CardHeader>
    <CardContent>
      <Tabs defaultValue="devices">
        <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="devices"><Wifi size={15} className="me-2" />{ar ? 'الأجهزة' : 'Devices'}</TabsTrigger><TabsTrigger value="mapping">{ar ? 'ربط الموظفين' : 'Employee Mapping'}</TabsTrigger><TabsTrigger value="rules"><Settings2 size={15} className="me-2" />{ar ? 'المعادلات' : 'Rules'}</TabsTrigger><TabsTrigger value="reports">{ar ? 'التقارير وExcel' : 'Reports & Excel'}</TabsTrigger></TabsList>
        <TabsContent value="devices" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div><Label>{ar ? 'اسم الجهاز' : 'Device name'}</Label><Input value={deviceForm.name} onChange={e => setDeviceForm({ ...deviceForm, name: e.target.value })} /></div><div><Label>IP</Label><Input dir="ltr" value={deviceForm.ip_address} onChange={e => setDeviceForm({ ...deviceForm, ip_address: e.target.value })} /></div><div><Label>{ar ? 'المنفذ' : 'Port'}</Label><Input type="number" value={deviceForm.port} onChange={e => setDeviceForm({ ...deviceForm, port: Number(e.target.value) })} /></div><div className="flex items-end"><Button onClick={() => saveDevice.mutate()}><Plus size={16} className="me-2" />{ar ? 'إضافة جهاز' : 'Add device'}</Button></div></div>
          {devicesLoading ? <p>{ar ? 'جاري التحميل...' : 'Loading...'}</p> : devices.map(device => <div key={device.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><strong>{device.name}</strong><div className="text-sm text-muted-foreground" dir="ltr">{device.ip_address}:{device.port} / {device.protocol.toUpperCase()}</div>{device.last_error && <div className="text-sm text-destructive">{device.last_error}</div>}</div><div className="flex gap-2"><Button variant="outline" onClick={() => testDevice.mutate(device.id)}><Wifi size={15} className="me-2" />{ar ? 'اختبار' : 'Test'}</Button><Button onClick={() => syncDevice.mutate(device.id)} disabled={syncDevice.isPending}><RefreshCw size={15} className="me-2" />{ar ? 'سحب البصمات' : 'Sync punches'}</Button></div></div>)}
        </TabsContent>
        <TabsContent value="mapping" className="pt-4"><div className="rounded-md border"><div className="grid grid-cols-3 gap-3 bg-muted/50 p-3 font-medium"><span>{ar ? 'الموظف' : 'Employee'}</span><span>{ar ? 'كود الجهاز / User ID' : 'Device User ID'}</span><span /></div>{employees.map(employee => <div key={employee.id} className="grid grid-cols-3 gap-3 items-center border-t p-3"><span>{employee.name} <small className="text-muted-foreground">({employee.employee_code})</small></span><Input dir="ltr" value={mappingValues[employee.id] || ''} placeholder={ar ? 'مثال: 1001' : 'e.g. 1001'} onChange={e => setMappingValues({ ...mappingValues, [employee.id]: e.target.value })} /><Button variant="outline" onClick={() => saveMapping.mutate({ id: employee.id, value: mappingValues[employee.id] || '' })}><Save size={15} className="me-2" />{ar ? 'حفظ' : 'Save'}</Button></div>)}</div></TabsContent>
        <TabsContent value="rules" className="pt-4 space-y-4"><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div><Label>{ar ? 'اسم المعادلة' : 'Rule name'}</Label><Input value={rule.name} onChange={e => setRule({ ...rule, name: e.target.value })} /></div><div><Label>{ar ? 'بداية الدوام' : 'Work start'}</Label><Input type="time" value={rule.work_start} onChange={e => setRule({ ...rule, work_start: e.target.value })} /></div><div><Label>{ar ? 'نهاية الدوام' : 'Work end'}</Label><Input type="time" value={rule.work_end} onChange={e => setRule({ ...rule, work_end: e.target.value })} /></div><div><Label>{ar ? 'سماح التأخير بالدقائق' : 'Grace minutes'}</Label><Input type="number" value={rule.grace_minutes} onChange={e => setRule({ ...rule, grace_minutes: Number(e.target.value) })} /></div><div><Label>{ar ? 'خصم التأخير' : 'Late deduction'}</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={rule.late_deduction_type} onChange={e => setRule({ ...rule, late_deduction_type: e.target.value })}><option value="none">{ar ? 'بدون خصم' : 'None'}</option><option value="fixed">{ar ? 'مبلغ ثابت' : 'Fixed amount'}</option><option value="hourly">{ar ? 'لكل ساعة تأخير' : 'Per late hour'}</option><option value="percent">{ar ? 'نسبة من الراتب' : 'Salary percentage'}</option></select></div><div><Label>{ar ? 'قيمة خصم التأخير' : 'Late value'}</Label><Input type="number" step="0.01" value={rule.late_deduction_value} onChange={e => setRule({ ...rule, late_deduction_value: Number(e.target.value) })} /></div><div><Label>{ar ? 'خصم الغياب' : 'Absence deduction'}</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={rule.absence_deduction_type} onChange={e => setRule({ ...rule, absence_deduction_type: e.target.value })}><option value="none">{ar ? 'بدون خصم' : 'None'}</option><option value="fixed">{ar ? 'مبلغ ثابت' : 'Fixed amount'}</option><option value="daily">{ar ? 'لكل يوم غياب' : 'Per absent day'}</option><option value="percent">{ar ? 'نسبة من الراتب' : 'Salary percentage'}</option></select></div><div><Label>{ar ? 'قيمة خصم الغياب' : 'Absence value'}</Label><Input type="number" step="0.01" value={rule.absence_deduction_value} onChange={e => setRule({ ...rule, absence_deduction_value: Number(e.target.value) })} /></div></div><Button onClick={() => saveRule.mutate()}><Save size={16} className="me-2" />{ar ? 'حفظ المعادلة' : 'Save rule'}</Button><p className="text-sm text-muted-foreground">{ar ? 'بعد الحفظ تُستخدم المعادلة تلقائياً في تجميع الحضور ومعاينة صافي الراتب. لا يتم صرف راتب تلقائياً.' : 'The rule is applied to attendance summaries and payroll previews. Payroll is never paid automatically.'}</p></TabsContent>
        <TabsContent value="reports" className="pt-4"><BiometricReports employees={employees} /></TabsContent>
      </Tabs>
    </CardContent>
  </Card>;
}
