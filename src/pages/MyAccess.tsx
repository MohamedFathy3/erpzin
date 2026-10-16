import { useEffect, useMemo, useState } from 'react';
import { Building2, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MainLayout from '@/components/layout/MainLayout';
import api from '@/lib/api';
import { moduleLabel, permissionKey, permissionLabel, roleLabel } from '@/utils/accessControlLabels';

type Permission = {
  id?: number;
  key?: string;
  slug?: string;
  name?: string | null;
  name_ar?: string | null;
  module?: string | null;
};

type AccessSummary = {
  role?: string | null;
  branch?: { id: number; name?: string | null; name_ar?: string | null } | null;
  visible_branches?: Array<{ id: number; name?: string | null; name_ar?: string | null; code?: string | null }>;
  permissions: string[];
  permission_details?: Permission[];
};

export default function MyAccess() {
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/me/permissions'),
      api.post('/branch/index', { filters: {}, orderBy: 'name', orderByDirection: 'asc', perPage: 1000, paginate: false }).catch(() => null),
    ])
      .then(([accessResponse, branchesResponse]) => {
        if (!cancelled) {
          const access = accessResponse.data?.data;
          const branches = branchesResponse?.data?.data;
          setSummary(access ? { ...access, visible_branches: Array.isArray(branches) ? branches : [] } : null);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('تعذر تحميل بيانات الفرع والصلاحيات');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const permissionDetails = useMemo(() => {
    if (!summary) return [];
    if (summary.permission_details?.length) return summary.permission_details;
    return (summary.permissions ?? []).map((key) => ({ key, module: key.split(/[._-]/)[0] || 'general' }));
  }, [summary]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    permissionDetails.forEach((permission) => {
      const module = permission.module || 'general';
      groups.set(module, [...(groups.get(module) ?? []), permission]);
    });
    return Array.from(groups.entries());
  }, [permissionDetails]);
  const canViewAllBranches = Boolean(summary?.permissions?.includes('branches.view') || summary?.permissions?.includes('*'));

  return (
    <MainLayout activeItem="my-access">
      <div className="space-y-6" dir="rtl">
        <header>
          <div className="flex items-center gap-2 text-primary"><ShieldCheck size={21} /><span className="text-sm font-semibold">حسابي</span></div>
          <h1 className="mt-2 text-2xl font-bold">فرعي وصلاحياتي</h1>
          <p className="mt-1 text-sm text-muted-foreground">قائمة الفروع التي يسمح لك النظام بعرضها والصلاحيات الفعلية الممنوحة لك من الدور والصلاحيات المباشرة.</p>
        </header>

        {loading ? <Card><CardContent className="py-12 text-center text-muted-foreground">جاري تحميل بيانات حسابك...</CardContent></Card> : null}
        {!loading && !summary ? <Card><CardContent className="py-12 text-center text-muted-foreground">تعذر عرض بيانات الحساب. حاول تحديث الصفحة أو تواصل مع المدير.</CardContent></Card> : null}
        {!loading && summary ? <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Building2 size={19} className="text-primary" />الفروع الظاهرة لك</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">{canViewAllBranches ? 'لديك صلاحية branches.view؛ تظهر لك فروع منشأتك.' : 'لا تملك branches.view؛ يظهر لك الفرع المعيّن لحسابك فقط.'}</p>
                {summary.visible_branches?.length ? <ul className="space-y-2">{summary.visible_branches.map((branch) => <li key={branch.id} className="flex items-center justify-between gap-3 rounded-lg border p-2"><span className="font-medium">{branch.name_ar || branch.name || `فرع #${branch.id}`}</span><Badge variant="outline">#{branch.id}</Badge></li>)}</ul> : <p className="text-sm text-muted-foreground">لا توجد فروع متاحة لحسابك. تواصل مع مدير الشركة إذا كنت تحتاج إلى تعيين فرع أو صلاحية عرض الفروع.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><KeyRound size={19} className="text-primary" />الدور والصلاحيات</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p>الدور: <strong>{roleLabel(summary.role)}</strong></p>
                <p className="text-sm text-muted-foreground">عدد الصلاحيات الفعلية: {permissionDetails.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>الصلاحيات الممنوحة لك في النظام</CardTitle><p className="text-sm text-muted-foreground">هذه القائمة توضح ما يسمح به دورك وما أضيف لحسابك مباشرة؛ لا يمكنك تغييرها من هذه الصفحة.</p></CardHeader>
            <CardContent>
              {!permissionDetails.length ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد صلاحيات مسجلة لحسابك.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groupedPermissions.map(([module, permissions]) => <section key={module} className="rounded-xl border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between border-b pb-2"><h2 className="font-semibold">{moduleLabel(module)}</h2><Badge variant="secondary">{permissions.length}</Badge></div>
                  <ul className="space-y-2">
                    {permissions.map((permission, index) => <li key={`${permissionKey(permission)}-${permission.id ?? index}`} className="flex items-start justify-between gap-3 text-sm">
                      <span>{permissionLabel(permission)}</span><code className="shrink-0 text-[11px] text-muted-foreground" dir="ltr">{permissionKey(permission)}</code>
                    </li>)}
                  </ul>
                </section>)}
              </div>}
            </CardContent>
          </Card>
        </> : null}
      </div>
    </MainLayout>
  );
}
