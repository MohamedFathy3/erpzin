import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fingerprint, RefreshCw, UserCheck } from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

type DeviceUser = {
  uid: number;
  user_id: string;
  name: string;
  role: number;
  card_no: string;
  last_seen_at?: string;
  punch_count?: number;
  employee?: { id: number; name: string; employee_code: string } | null;
};
type Employee = { id: number; name: string; employee_code: string; biometric_user_id?: string | null };
type Props = { deviceId: number | null; deviceMode?: 'pull' | 'adms'; employees: Employee[] };

export default function BiometricDeviceUsers({ deviceId, deviceMode = 'pull', employees }: Props) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const qc = useQueryClient();
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const { data: users = [], isFetching, refetch } = useQuery<DeviceUser[]>({
    queryKey: ['device-users', deviceId],
    enabled: Boolean(deviceId),
    queryFn: async () => (await api.get(`/biometric/devices/${deviceId}/users`)).data.data,
  });
  const assignUser = useMutation({
    mutationFn: async ({ userId, employeeId }: { userId: string; employeeId: string }) =>
      (await api.post(`/biometric/devices/${deviceId}/users/${encodeURIComponent(userId)}/assign`, { employee_id: Number(employeeId) })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['device-users', deviceId] });
      qc.invalidateQueries({ queryKey: ['biometric-devices'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['biometric-report'] });
      toast({ title: ar ? `تم ربط الموظف وتحديث ${data.data.updated_logs} سجل` : `Employee linked and ${data.data.updated_logs} logs updated` });
    },
    onError: () => toast({ title: ar ? 'فشل ربط الموظف' : 'Could not assign employee', variant: 'destructive' }),
  });

  if (!deviceId) return <Card className="mt-4"><CardContent className="p-6 text-center text-muted-foreground">{ar ? 'اختر جهازًا من تبويب الأجهزة لعرض الأشخاص المسجلين أو المستلمين عليه.' : 'Select a device from Devices to view its registered or received users.'}</CardContent></Card>;

  return <div className="space-y-4 pt-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Fingerprint size={20} />{deviceMode === 'adms' ? (ar ? 'الأشخاص المستلمون من ADMS' : 'Users received from ADMS') : (ar ? 'الأشخاص الموجودون على الجهاز' : 'People on the device')}</CardTitle>
        <p className="text-sm text-muted-foreground">{deviceMode === 'adms' ? (ar ? 'هذه الأرقام وصلت من سجلات الحضور. اختر موظفًا واضغط Assign لربط الرقم بكل سجلاته.' : 'These IDs were received in attendance logs. Choose an employee and press Assign to link all of the user logs.') : (ar ? 'رقم User ID هو الرقم الذي نربط به البصمة بموظف ERP.' : 'User ID is the key used to link a device person to an ERP employee.')}</p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-3"><Button variant="outline" onClick={() => void refetch()} disabled={isFetching}><RefreshCw size={15} className="me-2" />{ar ? 'تحديث القائمة' : 'Refresh list'}</Button></div>
        <div className="overflow-auto rounded-md border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-start">User ID</th>{deviceMode === 'adms' && <><th className="p-3 text-start">{ar ? 'آخر حضور' : 'Last punch'}</th><th className="p-3 text-start">{ar ? 'السجلات' : 'Punches'}</th></>}<th className="p-3 text-start">{ar ? 'الموظف المرتبط' : 'Assigned employee'}</th><th className="p-3 text-start">{ar ? 'الإجراء' : 'Action'}</th></tr></thead><tbody>{users.map(user => { const selected = assignments[user.user_id] ?? String(user.employee?.id ?? ''); return <tr key={`${user.uid}-${user.user_id}`} className="border-t"><td className="p-3 font-mono" dir="ltr">{user.user_id}</td>{deviceMode === 'adms' && <><td className="p-3" dir="ltr">{user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : '-'}</td><td className="p-3">{user.punch_count ?? '-'}</td></>}<td className="p-3">{user.employee ? `${user.employee.name} (${user.employee.employee_code})` : <span className="text-amber-600">{ar ? 'غير مربوط' : 'Not assigned'}</span>}</td><td className="p-3"><div className="flex gap-2 min-w-[260px]"><select className="h-9 flex-1 rounded-md border bg-background px-2" value={selected} onChange={e => setAssignments({ ...assignments, [user.user_id]: e.target.value })}><option value="">{ar ? 'اختر موظفًا' : 'Select employee'}</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name} ({employee.employee_code})</option>)}</select><Button size="sm" disabled={!selected || assignUser.isPending} onClick={() => assignUser.mutate({ userId: user.user_id, employeeId: selected })}><UserCheck size={15} className="me-1" />Assign</Button></div></td></tr>; })}</tbody></table>{!users.length && <p className="p-5 text-center text-muted-foreground">{ar ? 'لا توجد بيانات مستلمة من الجهاز حتى الآن.' : 'No device user data has been received yet.'}</p>}</div>
      </CardContent>
    </Card>
  </div>;
}
