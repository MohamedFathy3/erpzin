import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

type Permission = { id: number; key?: string; slug?: string; name?: string; name_ar?: string; module?: string };
type Role = { id: number; name: string; tenant?: { id: number; name?: string; slug?: string } | null; permissions: Permission[] };

const permissionKey = (permission: Permission) => permission.key || permission.slug || `permission-${permission.id}`;
const permissionLabel = (permission: Permission) => permission.name_ar || permission.name || permissionKey(permission);

export default function AccessControl() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [checked, setChecked] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get('/access-control/roles'),
        api.get('/access-control/permissions'),
      ]);
      setRoles(rolesResponse.data?.data ?? []);
      setPermissions(permissionsResponse.data?.data ?? []);
    } catch {
      toast.error('لا تملك صلاحية إدارة الأدوار أو تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    permissions.forEach((permission) => {
      const module = permission.module || 'general';
      groups.set(module, [...(groups.get(module) || []), permission]);
    });
    return Array.from(groups.entries());
  }, [permissions]);

  const edit = (role: Role) => {
    setSelected(role);
    setName(role.name);
    setChecked(role.permissions.map((permission) => permission.id));
  };

  const togglePermissions = (ids: number[], enabled: boolean) => {
    setChecked((current) => enabled
      ? [...new Set([...current, ...ids])]
      : current.filter((id) => !ids.includes(id)));
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
    <div className="space-y-6 p-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">الأدوار والصلاحيات</h1>
        <p className="text-sm text-muted-foreground">اختر الدور، راجع الـ tenant التابع له، ثم وزّع كل الصلاحيات المتاحة.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle>الأدوار ({roles.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && <p>جاري التحميل...</p>}
            {!loading && roles.length === 0 && <p className="text-sm text-muted-foreground">لا توجد أدوار قابلة للتعديل.</p>}
            {roles.map((role) => (
              <Button key={role.id} variant={selected?.id === role.id ? 'default' : 'outline'} className="h-auto w-full justify-between gap-3 py-3 text-right" onClick={() => edit(role)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{role.name}</span>
                  <span className="block truncate text-xs opacity-70">{role.tenant?.name || role.tenant?.slug || `Tenant #${role.tenant?.id ?? 'غير محدد'}`}</span>
                </span>
                <Badge variant="secondary">{role.permissions.length}</Badge>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{selected ? `تعديل: ${selected.name}` : 'اختر دوراً'}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {!selected && <p className="text-muted-foreground">اختر دوراً من القائمة لعرض وتعديل صلاحياته.</p>}
            {selected && (
              <>
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <label className="text-sm font-medium">اسم الدور</label>
                    <Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Tenant: </span>{selected.tenant?.name || selected.tenant?.slug || `#${selected.tenant?.id ?? 'غير محدد'}`}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
                  <span className="text-sm">تم تحديد {checked.length} من {permissions.length} صلاحية</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setChecked(permissions.map((permission) => permission.id))}>تحديد الكل</Button>
                    <Button variant="outline" size="sm" onClick={() => setChecked([])}>إلغاء الكل</Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {groupedPermissions.map(([module, modulePermissions]) => {
                    const ids = modulePermissions.map((permission) => permission.id);
                    const allSelected = ids.length > 0 && ids.every((id) => checked.includes(id));
                    return (
                      <div key={module} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="font-semibold">{module}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{modulePermissions.filter((permission) => checked.includes(permission.id)).length}/{ids.length}</Badge>
                            <Button variant="ghost" size="sm" onClick={() => togglePermissions(ids, !allSelected)}>{allSelected ? 'إلغاء' : 'الكل'}</Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {modulePermissions.map((permission) => (
                            <label key={permission.id} className="flex cursor-pointer items-center gap-2 text-sm">
                              <Checkbox checked={checked.includes(permission.id)} onCheckedChange={(value) => togglePermissions([permission.id], Boolean(value))} />
                              <span>{permissionLabel(permission)}</span>
                              <span className="text-xs text-muted-foreground">({permissionKey(permission)})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button onClick={save} disabled={saving || !name.trim()}>{saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
