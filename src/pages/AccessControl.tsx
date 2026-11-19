import { useEffect, useMemo, useState, type ReactNode } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Building2, ChevronDown, ChevronUp, Filter, KeyRound, Plus, Search, ShieldCheck, Users } from 'lucide-react';
import { moduleLabel, permissionKey, roleLabel } from '@/utils/accessControlLabels';

type Permission = {
  id: number;
  key?: string;
  slug?: string;
  name?: string;
  name_ar?: string;
  module?: string;
};

type Role = {
  id: number;
  name: string;
  tenant?: { id: number; name?: string; slug?: string } | null;
  permissions: Permission[];
};

type Tenant = { id: number; name?: string; slug?: string };

const tenantLabel = (role: Role) =>
  role.tenant?.name || role.tenant?.slug || `Tenant #${role.tenant?.id ?? 'غير محدد'}`;

const keyForPermission = (permission: Permission) =>
  (permissionKey(permission) || '').toLowerCase();

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState('');

  const load = async () => {
    try {
      const [rolesResponse, permissionsResponse, meResponse] = await Promise.all([
        api.get('/access-control/roles'),
        api.get('/access-control/permissions'),
        api.get('/me/permissions'),
      ]);
      const nextRoles = rolesResponse.data?.data ?? [];
      setRoles(nextRoles);
      setPermissions(permissionsResponse.data?.data ?? []);
      const superAdmin = Boolean(meResponse.data?.data?.is_super_admin);
      setIsSuperAdmin(superAdmin);
      if (superAdmin) {
        const tenantsResponse = await api.get('/super-admin/tenants');
        setTenantOptions(tenantsResponse.data?.data ?? tenantsResponse.data ?? []);
      }
      setOpenTenants((current) => {
        const next = { ...current };
        nextRoles.forEach((role: Role) => {
          next[tenantLabel(role)] ??= true;
        });
        return next;
      });
    } catch {
      toast.error('لا تملك صلاحية إدارة الأدوار أو تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const tenants = useMemo(() =>
    Array.from(new Map(
      roles.map((role) => [String(role.tenant?.id ?? 'none'), tenantLabel(role)])
    ).entries()), [roles]);

  const visibleRoles = useMemo(() => roles.filter((role) => {
    const matchesSearch = `${role.name} ${roleLabel(role.name)} ${tenantLabel(role)}`
      .toLowerCase()
      .includes(roleSearch.toLowerCase());
    const matchesTenant =
      tenantFilter === 'all' ||
      String(role.tenant?.id ?? 'none') === tenantFilter;
    return matchesSearch && matchesTenant;
  }), [roles, roleSearch, tenantFilter]);

  const groupedRoles = useMemo(() => {
    const groups = new Map<string, Role[]>();
    visibleRoles.forEach((role) =>
      groups.set(tenantLabel(role), [...(groups.get(tenantLabel(role)) || []), role])
    );
    return Array.from(groups.entries());
  }, [visibleRoles]);

  const groupedPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    const groups = new Map<string, Permission[]>();
    permissions
      .filter((permission) =>
        `${keyForPermission(permission)} ${permission.name || ''} ${permission.name_ar || ''}`
          .toLowerCase()
          .includes(query)
      )
      .forEach((permission) => {
        const module = permission.module || keyForPermission(permission).split('.')[0] || 'general';
        groups.set(module, [...(groups.get(module) || []), permission]);
      });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, permissionSearch]);

  const openCreate = () => {
    setSelected(null);
    setName('');
    setChecked([]);
    setTenantId('');
    setPermissionSearch('');
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setSelected(role);
    setName(role.name);
    setChecked(role.permissions.map((permission) => permission.id));
    setPermissionSearch('');
    setDialogOpen(true);
  };

  const findPermission = (modulePermissions: Permission[], action: 'show' | 'create' | 'update' | 'delete' | 'force') =>
    modulePermissions.find((permission) => {
      const key = keyForPermission(permission);
      if (action === 'force') return key.includes('force-delete') || key.includes('force_delete');
      if (action === 'delete') {
        return (key.endsWith('.delete') || key.includes('delete-') || key.includes('_delete')) &&
          !key.includes('force');
      }
      if (action === 'show') return key.endsWith('.view') || key.endsWith('.show') || key.includes('list-');
      return key.endsWith(`.${action}`) || key.includes(`${action}-`) || key.includes(`_${action}`);
    });

  const togglePermission = (permission: Permission | undefined) => {
    if (!permission) return;
    setChecked((current) =>
      current.includes(permission.id)
        ? current.filter((id) => id !== permission.id)
        : [...current, permission.id]
    );
  };

  const toggleColumn = (action: 'show' | 'create' | 'update' | 'delete' | 'force') => {
    const ids = groupedPermissions
      .flatMap(([, modulePermissions]) => {
        const permission = findPermission(modulePermissions, action);
        return permission ? [permission.id] : [];
      });
    const allSelected = ids.length > 0 && ids.every((id) => checked.includes(id));
    setChecked((current) => allSelected
      ? current.filter((id) => !ids.includes(id))
      : [...new Set([...current, ...ids])]
    );
  };

  const save = async () => {
    if (!name.trim()) return;
    if (isSuperAdmin && !selected && !tenantId) {
      toast.error('اختر الـTenant الخاص بالدور');
      return;
    }
    setSaving(true);
    try {
      if (selected) {
        await api.put(`/access-control/roles/${selected.id}`, {
          name: name.trim(),
          permissions: checked,
        });
        toast.success('تم حفظ تغييرات الدور');
      } else {
        await api.post('/access-control/roles', {
          name: name.trim(),
          tenant_id: isSuperAdmin ? Number(tenantId) : undefined,
          permissions: checked,
        });
        toast.success('تم إنشاء الدور بنجاح');
      }
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'تعذر حفظ الدور');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout activeItem="access-control">
      <div className="space-y-5" dir="rtl">
        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <CardHeader className="border-b bg-white pb-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-blue-700">
                  <ShieldCheck size={20} />
                  <span className="text-sm font-semibold">مركز التحكم والوصول</span>
                </div>
                <CardTitle className="text-2xl">الأدوار والصلاحيات</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">إدارة صلاحيات كل دور داخل الـTenant الخاص به.</p>
              </div>
              <Button onClick={openCreate} className="gap-2 bg-[#18255a] hover:bg-[#24356f]">
                <Plus size={17} /> إضافة دور جديد
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 p-4 sm:max-w-md">
            <Stat icon={<Users size={17} />} value={roles.length} label="دور" />
            <Stat icon={<Building2 size={17} />} value={tenants.length} label="Tenant" />
            <Stat icon={<KeyRound size={17} />} value={permissions.length} label="صلاحية" />
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
          <Card className="h-fit overflow-hidden border-slate-200/80 shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">الأدوار حسب الـTenant</CardTitle>
                <Badge variant="secondary">{visibleRoles.length}</Badge>
              </div>
              <div className="relative mt-3">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="ابحث عن دور أو Tenant..." className="pr-9" />
              </div>
              <div className="relative mt-2">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <select value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background pr-9 px-3 text-sm">
                  <option value="all">كل الـTenants</option>
                  {tenants.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-310px)] space-y-3 overflow-y-auto p-3">
              {loading && <p className="p-4 text-sm text-muted-foreground">جاري تحميل الأدوار...</p>}
              {!loading && groupedRoles.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد أدوار مطابقة.</div>}
              {groupedRoles.map(([tenant, tenantRoles]) => {
                const open = openTenants[tenant] !== false;
                return (
                  <section key={tenant} className="overflow-hidden rounded-xl border">
                    <button type="button" className="flex w-full items-center justify-between bg-slate-50 px-3 py-3" onClick={() => setOpenTenants((current) => ({ ...current, [tenant]: !open }))}>
                      <span className="flex min-w-0 items-center gap-2">
                        <Building2 size={16} className="text-blue-700" />
                        <span className="truncate font-semibold">{tenant}</span>
                        <Badge variant="outline">{tenantRoles.length}</Badge>
                      </span>
                      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {open && (
                      <div className="space-y-2 p-2">
                        {tenantRoles.map((role) => (
                          <button type="button" key={role.id} onClick={() => openEdit(role)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-right transition ${selected?.id === role.id ? 'border-blue-500 bg-blue-50' : 'bg-white hover:border-blue-300'}`}>
                            <span>
                              <span className="block font-medium">{roleLabel(role.name)}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">معرّف الدور: {role.id}</span>
                            </span>
                            <Badge variant={selected?.id === role.id ? 'default' : 'secondary'}>{role.permissions.length}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </CardContent>
          </Card>

          <Card className="min-h-[560px] border-slate-200/80 shadow-sm">
            <CardContent className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center">
              <ShieldCheck className="mb-4 text-slate-300" size={54} />
              <h2 className="text-xl font-semibold">اختر دورًا للبدء</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">اختر الدور من القائمة اليمنى لتعديل اسمه وصلاحياته، أو أنشئ دورًا جديدًا.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-0" dir="rtl">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-xl">{selected ? 'تعديل الدور' : 'إضافة دور جديد'}</DialogTitle>
            {selected && <p className="text-sm text-muted-foreground">اختر اسم الدور وحدد صلاحياته لكل صفحة.</p>}
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            {isSuperAdmin && !selected && (
              <div className="space-y-2">
                <label className="text-sm font-medium">الـTenant</label>
                <select value={tenantId} onChange={(event) => setTenantId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">اختر Tenant...</option>
                  {tenantOptions.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name || tenant.slug || `Tenant #${tenant.id}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم الدور</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم الدور" />
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="border-b pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-lg">الصفحات الموجودة على الموقع</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">كل صفحة لها صلاحيات العرض والإنشاء والتعديل والحذف والحذف النهائي.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setChecked(permissions.map((permission) => permission.id))}>تحديد الكل</Button>
                    <Button variant="outline" size="sm" onClick={() => setChecked([])}>إلغاء الكل</Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder="ابحث عن صفحة أو صلاحية..." className="pr-9" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50/70">
                      <tr>
                        <th className="w-[38%] px-5 py-3 text-right font-semibold">الصفحة</th>
                        {(['show', 'create', 'update', 'delete', 'force'] as const).map((action) => (
                          <th key={action} className="px-3 py-3 text-center">
                            <button type="button" onClick={() => toggleColumn(action)} className="font-semibold text-slate-600 hover:text-blue-700">
                              {action === 'show' ? 'عرض' : action === 'create' ? 'إنشاء' : action === 'update' ? 'تعديل' : action === 'delete' ? 'حذف' : 'حذف نهائي'}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedPermissions.map(([module, modulePermissions]) => (
                        <tr key={module} className="border-b last:border-0 hover:bg-slate-50/40">
                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-800">{moduleLabel(module)}</span>
                            <span className="mt-1 block text-xs text-blue-600">/{module.replace(/_/g, '-')}</span>
                          </td>
                          {(['show', 'create', 'update', 'delete', 'force'] as const).map((action) => {
                            const permission = findPermission(modulePermissions, action);
                            return (
                              <td key={action} className="px-3 py-4 text-center">
                                {permission ? (
                                  <Checkbox
                                    checked={checked.includes(permission.id)}
                                    onCheckedChange={() => togglePermission(permission)}
                                    className="mx-auto"
                                    aria-label={`${moduleLabel(module)} ${action}`}
                                  />
                                ) : (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {groupedPermissions.length === 0 && (
                    <div className="p-10 text-center text-sm text-muted-foreground">لا توجد صلاحيات مطابقة للبحث.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving || !name.trim()} className="min-w-32">
              {saving ? 'جاري الحفظ...' : selected ? 'حفظ التغييرات' : 'إنشاء الدور'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl border bg-slate-50/60 px-3 py-3 text-center">
      <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">{icon}</span>
      <strong className="block text-xl">{value}</strong>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
