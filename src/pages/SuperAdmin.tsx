import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Building2, Users, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Tenant = { id: number; name: string; slug: string; status: string; plan: string; admins_count: number; };
type Module = { module_key: string; is_enabled: boolean };
type Trial = { id:number; name:string; trial_ends_at:string; days_remaining:number; subscription_status:string };

const labels: Record<string, string> = { crm:'CRM', email:'Email', whatsapp:'WhatsApp', google_calendar:'Google Calendar', google_drive:'Google Drive', tasks:'Tasks & Reminders', inventory:'Inventory', manufacturing:'Manufacturing', sales:'Sales', purchasing:'Purchasing', finance:'Finance', hr:'HR', pos:'POS', reports:'Reports', projects:'Projects', workflow:'Workflow', settings:'Settings', dashboard:'Dashboard', industries:'Industries', manufacturing_setup:'Manufacturing Setup', product_ledger:'Product Ledger' };

export default function SuperAdmin() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [trials, setTrials] = useState<Trial[]>([]);
  const loadTenants = async () => { setLoading(true); try { const r = await api.get('/super-admin/tenants'); setTenants(r.data.data ?? []); } catch { toast.error('تعذر تحميل العملاء'); } finally { setLoading(false); } };
  const loadModules = async (tenant: Tenant) => { setSelected(tenant); try { const r = await api.get(`/super-admin/tenants/${tenant.id}/modules`); setModules(r.data.data ?? []); } catch { toast.error('تعذر تحميل الموديولات'); } };
  const loadTrials = async () => { try { const r=await api.get('/super-admin/trials'); setTrials(r.data.data ?? []); } catch { toast.error('تعذر تحميل التجارب'); } };
  useEffect(() => { if (user?.super_admin) { loadTenants(); loadTrials(); } }, [user?.super_admin]);
  const trialAction = async (id:number, action:'extend'|'activate'|'suspend') => { try { const days=action==='extend' ? Number(window.prompt('عدد الأيام الإضافية؟','7')) : undefined; if(action==='extend' && (!days || days<1)) return; await api.post(`/super-admin/trials/${id}/${action}`, action==='extend'?{days}:{}); toast.success('تم تحديث التجربة'); loadTrials(); loadTenants(); } catch { toast.error('تعذر تحديث حالة التجربة'); } };
  const toggle = async (module: Module) => { if (!selected) return; const next = !module.is_enabled; setModules(items => items.map(x => x.module_key === module.module_key ? { ...x, is_enabled: next } : x)); try { await api.patch(`/super-admin/tenants/${selected.id}/modules/${module.module_key}`, { is_enabled: next }); toast.success(`${labels[module.module_key] ?? module.module_key}: ${next ? 'تم التفعيل' : 'تم التعطيل'}`); } catch { setModules(items => items.map(x => x.module_key === module.module_key ? { ...x, is_enabled: !next } : x)); toast.error('فشل تحديث الموديول'); } };
  if (!user) return null;
  if (!user.super_admin) return <Navigate to="/" replace />;
  return <MainLayout><div className="space-y-6" dir="rtl">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary" /> Super Admin</h1><p className="text-muted-foreground">إدارة العملاء والتحكم في الموديولات المتاحة لكل Tenant</p></div><Button variant="outline" onClick={loadTenants}><RefreshCw className="ml-2 h-4 w-4" /> تحديث</Button></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> العملاء ({tenants.length})</CardTitle></CardHeader><CardContent className="space-y-2">{loading ? <p>جاري التحميل...</p> : tenants.map(t => <button key={t.id} onClick={() => loadModules(t)} className={`w-full rounded-lg border p-3 text-right transition hover:bg-muted ${selected?.id === t.id ? 'border-primary bg-muted' : ''}`}><div className="flex items-center justify-between"><span className="font-medium">{t.name}</span><Badge variant={t.status === 'active' ? 'default' : 'secondary'}>{t.status}</Badge></div><div className="mt-2 flex gap-4 text-xs text-muted-foreground"><span><Users className="inline h-3 w-3 ml-1" />{t.admins_count} مستخدم</span><span>{t.plan}</span></div></button>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>{selected ? `موديولات: ${selected.name}` : 'اختر عميلًا'}</CardTitle></CardHeader><CardContent>{selected ? <div className="grid gap-3 sm:grid-cols-2">{modules.map(m => <div key={m.module_key} className="flex items-center justify-between rounded-lg border p-3"><span>{labels[m.module_key] ?? m.module_key}</span><Switch checked={m.is_enabled} onCheckedChange={() => toggle(m)} aria-label={`تفعيل ${m.module_key}`} /></div>)}</div> : <div className="py-12 text-center text-muted-foreground"><ToggleLeft className="mx-auto mb-3 h-10 w-10" />اختر عميلًا لرؤية إعدادات الموديولات</div>}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>إدارة التجارب المجانية ({trials.length})</CardTitle></CardHeader><CardContent className="space-y-3">{trials.map(trial => <div key={trial.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-semibold">{trial.name}</p><p className="text-xs text-muted-foreground">تنتهي: {new Date(trial.trial_ends_at).toLocaleDateString('ar-EG')} · متبقي {trial.days_remaining} يوم</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>trialAction(trial.id,'extend')}>تمديد</Button><Button size="sm" onClick={()=>trialAction(trial.id,'activate')}>تفعيل</Button><Button size="sm" variant="destructive" onClick={()=>trialAction(trial.id,'suspend')}>تعليق</Button></div></div>)}{!trials.length&&<p className="text-sm text-muted-foreground">لا توجد تجارب نشطة.</p>}</CardContent></Card>
  </div></MainLayout>;
}
