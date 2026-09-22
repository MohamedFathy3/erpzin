import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Building2, Check, ChevronDown, ChevronUp, Filter, KeyRound, Search, ShieldCheck, Users } from 'lucide-react';
import { moduleLabel, permissionKey, permissionLabel, roleLabel } from '@/utils/accessControlLabels';

type Permission = { id: number; key?: string; slug?: string; name?: string; name_ar?: string; module?: string };
type Role = { id: number; name: string; tenant?: { id: number; name?: string; slug?: string } | null; permissions: Permission[] };

const tenantLabel = (role: Role) => role.tenant?.name || role.tenant?.slug || `Tenant #${role.tenant?.id ?? 'غير محدد'}`;

export default function AccessControl() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [checked, setChecked] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [openTenants, setOpenTenants] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get('/access-control/roles'),
        api.get('/access-control/permissions'),
      ]);
      const nextRoles = rolesResponse.data?.data ?? [];
      setRoles(nextRoles);
      setPermissions(permissionsResponse.data?.data ?? []);
      setOpenTenants((current) => {
        const next = { ...current };
        nextRoles.forEach((role: Role) => { next[tenantLabel(role)] ??= true; });
        return next;
      });
    } catch {
      toast.error('لا تملك صلاحية إدارة الأدوار أو تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const tenants = useMemo(() => Array.from(new Map(
    roles.map((role) => [String(role.tenant?.id ?? 'none'), tenantLabel(role)])
  ).entries()), [roles]);

  const visibleRoles = useMemo(() => roles.filter((role) => {
    const matchesSearch = `${role.name} ${roleLabel(role.name)} ${tenantLabel(role)}`.toLowerCase().includes(roleSearch.toLowerCase());
    const matchesTenant = tenantFilter === 'all' || String(role.tenant?.id ?? 'none') === tenantFilter;
    return matchesSearch && matchesTenant;
  }), [roles, roleSearch, tenantFilter]);

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, Role[]>();
    visibleRoles.forEach((role) => groups.set(tenantLabel(role), [...(groups.get(tenantLabel(role)) || []), role]));
    return Array.from(groups.entries());
  }, [visibleRoles]);

  const groupedPermissions = useMemo(() => {
    const query = permissionSearch.toLowerCase();
    const groups = new Map<string, Permission[]>();
    permissions.filter((permission) => `${permissionLabel(permission)} ${permissionKey(permission)} ${permission.module || ''}`.toLowerCase().includes(query)).forEach((permission) => {
      const module = permission.module || 'general';
      groups.set(module, [...(groups.get(module) || []), permission]);
    });
    return Array.from(groups.entries());
  }, [permissions, permissionSearch]);

  const edit = (role: Role) => {
    setSelected(role);
    setName(role.name);
    setChecked(role.permissions.map((permission) => permission.id));
  };

  const togglePermissions = (ids: number[], enabled: boolean) => {
    setChecked((current) => enabled ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id)));
  };

  const save = async () => {
    if (!selected || !name.trim()) return;
    setSaving(true);
    try {
      await api.put(`/access-control/roles/${selected.id}`, { name: name.trim(), permissions: checked });
      toast.success('تم حفظ صلاحيات الدور بنجاح');
      await load();
      const refreshed = roles.find((role) => role.id === selected.id);
      if (refreshed) edit({ ...refreshed, name: name.trim(), permissions: permissions.filter((permission) => checked.includes(permission.id)) });
    } catch {
      toast.error('تعذر حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full space-y-6 bg-muted/20 p-4 md:p-6" dir="rtl">
      <div className="rounded-2xl bg-gradient-to-l from-primary/10 via-background to-background p-6 shadow-sm ring-1 ring-border/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary"><ShieldCheck size={22} /><span className="text-sm font-semibold">مركز التحكم والوصول</span></div>
            <h1 className="text-3xl font-bold tracking-tight">الأدوار والصلاحيات</h1>
            <p className="mt-2 text-sm text-muted-foreground">إدارة صلاحيات كل دور داخل الـ Tenant الخاص به من مكان واحد.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-background/80 px-4 py-3 text-center ring-1 ring-border"><Users className="mx-auto mb-1 text-primary" size={18} /><strong className="block text-xl">{roles.length}</strong><span className="text-xs text-muted-foreground">دور</span></div>
            <div className="rounded-xl bg-background/80 px-4 py-3 text-center ring-1 ring-border"><Building2 className="mx-auto mb-1 text-primary" size={18} /><strong className="block text-xl">{tenants.length}</strong><span className="text-xs text-muted-foreground">Tenant</span></div>
            <div className="hidden rounded-xl bg-background/80 px-4 py-3 text-center ring-1 ring-border sm:block"><KeyRound className="mx-auto mb-1 text-primary" size={18} /><strong className="block text-xl">{permissions.length}</strong><span className="text-xs text-muted-foreground">صلاحية</span></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-background pb-4">
            <div className="flex items-center justify-between"><CardTitle className="text-lg">الأدوار حسب الـ Tenant</CardTitle><Badge variant="secondary">{visibleRoles.length}</Badge></div>
            <div className="relative mt-3"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="ابحث عن دور أو Tenant..." className="pr-9" /></div>
            <div className="relative mt-2"><Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><select value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="all">كل الـ Tenants</option>{tenants.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-300px)] space-y-4 overflow-y-auto p-3">
            {loading && <p className="p-4 text-sm text-muted-foreground">جاري تحميل الأدوار...</p>}
            {!loading && groupedRoles.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد أدوار مطابقة للفلترة.</div>}
            {groupedRoles.map(([tenant, tenantRoles]) => {
              const open = openTenants[tenant] !== false;
              return <section key={tenant} className="overflow-hidden rounded-xl border bg-background">
                <button type="button" className="flex w-full items-center justify-between bg-muted/40 px-3 py-3 text-right hover:bg-muted/70" onClick={() => setOpenTenants((current) => ({ ...current, [tenant]: !open }))}>
                  <span className="flex min-w-0 items-center gap-2"><Building2 size={16} className="shrink-0 text-primary" /><span className="truncate font-semibold">{tenant}</span><Badge variant="outline">{tenantRoles.length}</Badge></span>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {open && <div className="space-y-2 p-2">{tenantRoles.map((role) => <button type="button" key={role.id} className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-right transition hover:border-primary/50 hover:bg-primary/5 ${selected?.id === role.id ? 'border-primary bg-primary/10 shadow-sm' : 'bg-background'}`} onClick={() => edit(role)}><span className="min-w-0"><span className="block truncate font-medium">{roleLabel(role.name)}</span><span className="mt-1 block text-xs text-muted-foreground">معرّف الدور: {role.id}</span></span><Badge variant={selected?.id === role.id ? 'default' : 'secondary'}>{role.permissions.length}</Badge></button>)}</div>}
              </section>;
            })}
          </CardContent>
        </Card>

        <Card className="min-h-[560px] shadow-sm">
          <CardHeader className="border-b bg-background"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-xl">{selected ? `تعديل صلاحيات: ${roleLabel(selected.name)}` : 'اختر دوراً للبدء'}</CardTitle>{selected && <p className="mt-1 text-sm text-muted-foreground">المستأجر: <span className="font-semibold text-foreground">{tenantLabel(selected)}</span></p>}</div>{selected && <Badge className="w-fit gap-1"><Check size={14} /> {checked.length} صلاحية مفعلة</Badge>}</div></CardHeader>
          <CardContent className="space-y-5 p-5">
            {!selected && <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-center"><ShieldCheck className="mb-4 text-muted-foreground/40" size={54} /><h2 className="text-xl font-semibold">اختر دوراً من القائمة</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">استخدم البحث أو الفلترة للوصول إلى الدور المطلوب، ثم عدّل صلاحياته داخل الـ Tenant الصحيح.</p></div>}
            {selected && <>
              <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-[1fr_auto] md:items-end"><div><label className="text-sm font-medium">اسم الدور</label><Input className="mt-2 bg-background" value={name} onChange={(event) => setName(event.target.value)} /></div><div className="rounded-lg bg-background px-4 py-2 text-sm ring-1 ring-border"><span className="text-muted-foreground">المستأجر: </span><strong>{tenantLabel(selected)}</strong></div></div>
              <div className="flex flex-col gap-3 rounded-xl border bg-background p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">توزيع الصلاحيات</p><p className="text-sm text-muted-foreground">تم تحديد {checked.length} من {permissions.length} صلاحية متاحة</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setChecked(permissions.map((permission) => permission.id))}>تحديد الكل</Button><Button variant="outline" size="sm" onClick={() => setChecked([])}>إلغاء الكل</Button></div></div>
              <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder="ابحث داخل الصلاحيات مثل tax أو treasury..." className="pr-9" /></div>
              <div className="grid gap-4 md:grid-cols-2">{groupedPermissions.map(([module, modulePermissions]) => { const ids = modulePermissions.map((permission) => permission.id); const selectedCount = ids.filter((id) => checked.includes(id)).length; const allSelected = ids.length > 0 && selectedCount === ids.length; return <div key={module} className="rounded-xl border bg-background p-4 shadow-sm"><div className="mb-3 flex items-center justify-between border-b pb-3"><div><h3 className="font-bold tracking-wide">{moduleLabel(module)}</h3><p className="text-xs text-muted-foreground">{selectedCount} من {ids.length} مفعلة</p></div><Button variant="ghost" size="sm" onClick={() => togglePermissions(ids, !allSelected)}>{allSelected ? 'إلغاء الكل' : 'تحديد الكل'}</Button></div><div className="space-y-3">{modulePermissions.map((permission) => <label key={permission.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-muted/60"><Checkbox checked={checked.includes(permission.id)} onCheckedChange={(value) => togglePermissions([permission.id], Boolean(value))} /><span className="flex-1">{permissionLabel(permission)}</span><span className="text-[11px] text-muted-foreground">{permissionKey(permission)}</span></label>)}</div></div>; })}</div>
              <div className="flex justify-end border-t pt-4"><Button onClick={save} disabled={saving || !name.trim()} className="min-w-32">{saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}</Button></div>
            </>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
