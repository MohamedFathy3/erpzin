import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type Tenant = { id: number; name: string; slug: string; status: string; plan: string; admins_count?: number };
type TenantModule = { module_key: string; is_enabled: boolean };

export default function SuperAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [modules, setModules] = useState<TenantModule[]>([]);

  useEffect(() => {
    if (!user?.super_admin) { navigate('/'); return; }
    api.get('/super-admin/tenants').then(({ data }) => setTenants(data.data || []));
  }, [user, navigate]);

  const selectTenant = async (tenant: Tenant) => {
    setSelected(tenant);
    const { data } = await api.get(`/super-admin/tenants/${tenant.id}/modules`);
    setModules(data.data || []);
  };

  const toggleModule = async (module: TenantModule) => {
    if (!selected) return;
    const next = !module.is_enabled;
    try {
      await api.patch(`/super-admin/tenants/${selected.id}/modules/${module.module_key}`, { is_enabled: next });
      setModules(current => current.map(item => item.module_key === module.module_key ? { ...item, is_enabled: next } : item));
      toast.success('Module status updated');
    } catch { toast.error('Unable to update module status'); }
  };

  if (!user?.super_admin) return null;
  return (
    <div className="space-y-6" dir="rtl">
      <div><h1 className="text-2xl font-bold">إدارة العملاء والموديولات</h1><p className="text-muted-foreground">تحكم في الموديولات المتاحة لكل Tenant.</p></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card><CardHeader><CardTitle>العملاء</CardTitle></CardHeader><CardContent className="space-y-2">
          {tenants.map(tenant => <button key={tenant.id} onClick={() => selectTenant(tenant)} className={`w-full rounded-md border p-3 text-right ${selected?.id === tenant.id ? 'border-primary bg-primary/5' : ''}`}><div className="font-medium">{tenant.name}</div><div className="text-sm text-muted-foreground">{tenant.slug} · {tenant.status} · {tenant.admins_count ?? 0} مستخدم</div></button>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{selected ? `موديولات ${selected.name}` : 'اختر عميلًا'}</CardTitle></CardHeader><CardContent className="space-y-3">
          {modules.map(module => <div key={module.module_key} className="flex items-center justify-between rounded-md border p-3"><span dir="ltr">{module.module_key}</span><Switch checked={module.is_enabled} onCheckedChange={() => toggleModule(module)} /></div>)}
        </CardContent></Card>
      </div>
    </div>
  );
}
