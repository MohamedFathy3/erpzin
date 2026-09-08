import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

type Permission = { id:number; key:string; name:string; name_ar?:string; module:string };
type Role = { id:number; name:string; permissions:Permission[] };
export default function AccessControl() {
  const [roles,setRoles]=useState<Role[]>([]); const [permissions,setPermissions]=useState<Permission[]>([]); const [selected,setSelected]=useState<Role|null>(null); const [name,setName]=useState(''); const [checked,setChecked]=useState<number[]>([]); const [loading,setLoading]=useState(true);
  const load=async()=>{ try { const [r,p]=await Promise.all([api.get('/access-control/roles'),api.get('/access-control/permissions')]); setRoles(r.data.data??[]); setPermissions(p.data.data??[]); } catch { toast.error('لا تملك صلاحية إدارة الأدوار أو تعذر التحميل'); } finally { setLoading(false); } };
  useEffect(()=>{load()},[]);
  const modules=useMemo(()=>Array.from(new Set(permissions.map(item=>item.module))),[permissions]);
  const edit=(role:Role)=>{setSelected(role);setName(role.name);setChecked(role.permissions.map(item=>item.id));};
  const save=async()=>{if(!selected||!name.trim())return;try{await api.put(`/access-control/roles/${selected.id}`,{name,permissions:checked});toast.success('تم حفظ الصلاحيات');await load();}catch{toast.error('تعذر حفظ الصلاحيات')}};
  return <div className="space-y-6 p-6" dir="rtl"><div><h1 className="text-2xl font-bold">الأدوار والصلاحيات</h1><p className="text-sm text-muted-foreground">تحكم مركزي في الوصول إلى الموديولات والعمليات الحساسة.</p></div><div className="grid gap-6 lg:grid-cols-[280px_1fr]"> <Card><CardHeader><CardTitle>الأدوار</CardTitle></CardHeader><CardContent className="space-y-2">{loading?<p>جاري التحميل...</p>:roles.map(role=><Button key={role.id} variant={selected?.id===role.id?'default':'outline'} className="w-full justify-between" onClick={()=>edit(role)}><span>{role.name}</span><Badge variant="secondary">{role.permissions.length}</Badge></Button>)}</CardContent></Card><Card><CardHeader><CardTitle>{selected?`تعديل: ${selected.name}`:'اختر دورًا'}</CardTitle></CardHeader><CardContent className="space-y-5">{selected?<><div><label className="text-sm font-medium">اسم الدور</label><Input className="mt-1" value={name} onChange={e=>setName(e.target.value)}/></div><div className="grid gap-5 md:grid-cols-2">{modules.map(module=><div key={module} className="rounded-lg border p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{module}</h3><Badge variant="outline">{permissions.filter(item=>item.module===module).length}</Badge></div><div className="space-y-3">{permissions.filter(item=>item.module===module).map(permission=><label key={permission.id} className="flex items-center gap-2 text-sm"><Checkbox checked={checked.includes(permission.id)} onCheckedChange={value=>setChecked(current=>value?[...new Set([...current,permission.id])]:current.filter(id=>id!==permission.id))}/><span>{permission.name_ar || permission.name}</span><span className="text-xs text-muted-foreground">({permission.key})</span></label>)}</div></div>)}</div><Button onClick={save}>حفظ الصلاحيات</Button></>:<p className="text-muted-foreground">اختر دورًا من القائمة لعرض صلاحياته.</p>}</CardContent></Card></div></div>;
}
