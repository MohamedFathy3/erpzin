import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Portal = ({ technician = false }: { technician?: boolean }) => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [token, setToken] = useState(localStorage.getItem(technician ? 'technician_token' : 'customer_token')); const [data, setData] = useState<any>(null);
  const login = async () => { try { const r = await api.post(`/${technician ? 'technician' : 'customer'}-portal/login`, { email, password }); localStorage.setItem(technician ? 'technician_token' : 'customer_token', r.data.token); setToken(r.data.token); } catch { toast.error('بيانات الدخول غير صحيحة'); } };
  useEffect(() => { if (!token) return; api.get(`/${technician ? 'technician' : 'customer'}-portal/${technician ? 'orders' : 'dashboard'}`).then((r) => setData(r.data.data)).catch(() => { setToken(null); }); }, [token, technician]);
  if (!token) return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6" dir="rtl"><Card className="w-full max-w-md"><CardHeader><CardTitle>{technician ? 'دخول الفني' : 'بوابة العميل'}</CardTitle></CardHeader><CardContent className="space-y-4"><Input placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} /><Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} /><Button className="w-full" onClick={() => void login()}>تسجيل الدخول</Button></CardContent></Card></div>;
  const orders = technician ? data : data?.orders;
  return <div className="min-h-screen space-y-6 bg-muted/20 p-6" dir="rtl"><div className="flex justify-between"><h1 className="text-3xl font-bold">{technician ? 'أعمالي' : 'بوابة العميل'}</h1><Button variant="outline" onClick={() => { localStorage.removeItem(technician ? 'technician_token' : 'customer_token'); setToken(null); }}>خروج</Button></div>{!technician && <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><b>السيارات</b><p className="text-3xl">{data?.vehicles?.length || 0}</p></CardContent></Card><Card><CardContent className="p-5"><b>الضمانات</b><p className="text-3xl">{data?.warranties?.length || 0}</p></CardContent></Card><Card><CardContent className="p-5"><b>الزيارات</b><p className="text-3xl">{data?.visits?.length || 0}</p></CardContent></Card></div>}<Card><CardHeader><CardTitle>{technician ? 'أوامر الخدمة المسندة' : 'أوامر الخدمة والفواتير'}</CardTitle></CardHeader><CardContent className="space-y-3">{orders?.map((o: any) => <div key={o.id} className="rounded-lg border p-4"><b>{o.order_number}</b><span className="mx-3 rounded bg-primary/10 px-2 py-1">{o.status}</span><p className="text-sm text-muted-foreground">{o.vehicle?.make} {o.vehicle?.model} · {o.total_amount || ''}</p></div>)}</CardContent></Card></div>;
};
export const CustomerPortal = () => <Portal />;
export const TechnicianPortal = () => <Portal technician />;
export default Portal;
