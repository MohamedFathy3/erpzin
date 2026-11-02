import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Factory, Plus, Save, Settings2, X } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
type Product = { id: number; name: string; sku?: string; product_type?: string };
type BomItem = {
  id?: number;
  component_product_id: string;
  quantity: string;
  scrap_percent: string;
  unit: string;
  child_bom_version_id: string;
  is_optional: boolean;
  component?: Product;
};
type Bom = {
  id: number;
  product_id: number;
  version: string;
  status: string;
  yield_quantity: number;
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
  product?: Product;
  items: BomItem[];
};
type Equipment = {
  id: number;
  code: string;
  name: string;
  status: string;
  hourly_rate: number;
  branch_id?: number | null;
  notes?: string | null;
};
type BomForm = {
  product_id: string;
  version: string;
  status: string;
  yield_quantity: string;
  effective_from: string;
  effective_to: string;
  notes: string;
  items: BomItem[];
};
type EquipmentForm = { code: string; name: string; status: string; hourly_rate: string; notes: string };
const emptyProducts: Product[] = [];
const emptyBoms: Bom[] = [];
const emptyEquipmentList: Equipment[] = [];

const newBomItem = (): BomItem => ({
  component_product_id: '',
  quantity: '',
  scrap_percent: '0',
  unit: '',
  child_bom_version_id: '',
  is_optional: false,
});
const emptyBom: BomForm = {
  product_id: '',
  version: '',
  status: 'draft',
  yield_quantity: '1',
  effective_from: '',
  effective_to: '',
  notes: '',
  items: [newBomItem()],
};
const emptyEquipment: EquipmentForm = { code: '', name: '', status: 'available', hourly_rate: '0', notes: '' };
const statusNames: Record<string, string> = { draft: 'مسودة', active: 'فعالة', obsolete: 'قديمة' };

function messageFrom(error: ApiError, fallback: string): string {
  return Object.values(error.response?.data?.errors || {}).flat()[0] || error.response?.data?.message || fallback;
}

export default function ManufacturingSetup() {
  const queryClient = useQueryClient();
  const { currentBranch } = useApp();
  const [bomForm, setBomForm] = useState<BomForm>(emptyBom);
  const [equipmentForm, setEquipmentForm] = useState<EquipmentForm>(emptyEquipment);
  const [editingBomId, setEditingBomId] = useState<number | null>(null);
  const [editingEquipmentId, setEditingEquipmentId] = useState<number | null>(null);

  const productsQuery = useQuery<Product[]>({
    queryKey: ['manufacturing-setup-products'],
    queryFn: async () => (await api.get('/manufacturing/v2/products', { params: { per_page: 250 } })).data.data,
  });
  const bomsQuery = useQuery<Bom[]>({
    queryKey: ['manufacturing-v2-boms'],
    queryFn: async () => (await api.get('/manufacturing/v2/boms', { params: { per_page: 200 } })).data.data,
  });
  const equipmentQuery = useQuery<Equipment[]>({
    queryKey: ['manufacturing-v2-equipment'],
    queryFn: async () => (await api.get('/manufacturing/v2/equipment', { params: { per_page: 200 } })).data.data,
  });
  const products = productsQuery.data ?? emptyProducts;
  const boms = bomsQuery.data ?? emptyBoms;
  const equipment = equipmentQuery.data ?? emptyEquipmentList;
  const productOptions = useMemo(() => products.map((product) => (
    <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>
  )), [products]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['manufacturing-v2-boms'] });
    void queryClient.invalidateQueries({ queryKey: ['manufacturing-v2-equipment'] });
    void queryClient.invalidateQueries({ queryKey: ['manufacturing-v2-overview'] });
    void queryClient.invalidateQueries({ queryKey: ['manufacturing-v2-products'] });
  };

  const saveBom = useMutation({
    mutationFn: () => {
      const items = bomForm.items.map((item) => ({
        component_product_id: Number(item.component_product_id),
        quantity: Number(item.quantity),
        scrap_percent: Number(item.scrap_percent || 0),
        unit: item.unit || null,
        child_bom_version_id: item.child_bom_version_id ? Number(item.child_bom_version_id) : null,
        is_optional: item.is_optional,
      }));
      const common = {
        version: bomForm.version,
        status: bomForm.status,
        yield_quantity: Number(bomForm.yield_quantity),
        effective_from: bomForm.effective_from || null,
        effective_to: bomForm.effective_to || null,
        notes: bomForm.notes || null,
        items,
      };
      return editingBomId
        ? api.put(`/manufacturing/v2/boms/${editingBomId}`, common)
        : api.post('/manufacturing/v2/boms', {
          ...common,
          product_id: Number(bomForm.product_id),
          branch_id: currentBranch?.id ? Number(currentBranch.id) : null,
        });
    },
    onSuccess: () => {
      toast.success(editingBomId ? 'تم تحديث إصدار BOM' : 'تم إنشاء إصدار BOM');
      setBomForm(emptyBom);
      setEditingBomId(null);
      refresh();
    },
    onError: (error: ApiError) => toast.error(messageFrom(error, 'تعذر حفظ إصدار BOM')),
  });

  const deleteBom = useMutation({
    mutationFn: (id: number) => api.delete(`/manufacturing/v2/boms/${id}`),
    onSuccess: () => {
      toast.success('تم حذف إصدار BOM غير المستخدم');
      refresh();
    },
    onError: (error: ApiError) => toast.error(messageFrom(error, 'لا يمكن حذف هذا الإصدار')),
  });

  const saveEquipment = useMutation({
    mutationFn: () => {
      const payload = {
        ...equipmentForm,
        hourly_rate: Number(equipmentForm.hourly_rate),
        branch_id: currentBranch?.id ? Number(currentBranch.id) : null,
      };
      return editingEquipmentId
        ? api.put(`/manufacturing/v2/equipment/${editingEquipmentId}`, payload)
        : api.post('/manufacturing/v2/equipment', payload);
    },
    onSuccess: () => {
      toast.success(editingEquipmentId ? 'تم تحديث المعدة' : 'تم إضافة المعدة');
      setEquipmentForm(emptyEquipment);
      setEditingEquipmentId(null);
      refresh();
    },
    onError: (error: ApiError) => toast.error(messageFrom(error, 'تعذر حفظ المعدة')),
  });

  const deleteEquipment = useMutation({
    mutationFn: (id: number) => api.delete(`/manufacturing/v2/equipment/${id}`),
    onSuccess: () => {
      toast.success('تم أرشفة المعدة');
      refresh();
    },
    onError: (error: ApiError) => toast.error(messageFrom(error, 'تعذر أرشفة المعدة')),
  });

  const resetBom = () => {
    setBomForm(emptyBom);
    setEditingBomId(null);
  };
  const editDraft = (bom: Bom) => {
    setEditingBomId(bom.id);
    setBomForm({
      product_id: String(bom.product_id),
      version: bom.version,
      status: bom.status,
      yield_quantity: String(bom.yield_quantity || 1),
      effective_from: bom.effective_from || '',
      effective_to: bom.effective_to || '',
      notes: bom.notes || '',
      items: bom.items.length ? bom.items.map((item) => ({
        ...item,
        component_product_id: String(item.component_product_id),
        quantity: String(item.quantity),
        scrap_percent: String(item.scrap_percent || 0),
        unit: item.unit || '',
        child_bom_version_id: item.child_bom_version_id ? String(item.child_bom_version_id) : '',
        is_optional: Boolean(item.is_optional),
      })) : [newBomItem()],
    });
  };
  const createRevision = (bom: Bom) => {
    const numericVersions = boms
      .filter((version) => version.product_id === bom.product_id)
      .map((version) => Number(version.version))
      .filter(Number.isFinite);
    const nextVersion = String(Math.max(0, ...numericVersions) + 1);
    setEditingBomId(null);
    setBomForm({
      product_id: String(bom.product_id),
      version: nextVersion,
      status: 'draft',
      yield_quantity: String(bom.yield_quantity || 1),
      effective_from: '',
      effective_to: '',
      notes: bom.notes || '',
      items: bom.items.map((item) => ({
        ...item,
        id: undefined,
        component_product_id: String(item.component_product_id),
        quantity: String(item.quantity),
        scrap_percent: String(item.scrap_percent || 0),
        unit: item.unit || '',
        child_bom_version_id: item.child_bom_version_id ? String(item.child_bom_version_id) : '',
        is_optional: Boolean(item.is_optional),
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const bomFormValid = Boolean(
    bomForm.product_id
    && bomForm.version.trim()
    && Number(bomForm.yield_quantity) > 0
    && bomForm.items.length > 0
    && bomForm.items.every((item) => item.component_product_id && Number(item.quantity) > 0),
  );
  const equipmentFormValid = Boolean(equipmentForm.code.trim() && equipmentForm.name.trim());

  return (
    <MainLayout activeItem="manufacturing">
      <div className="space-y-6 p-2" dir="rtl">
        <section className="rounded-2xl bg-gradient-to-l from-[#101a3b] via-[#172554] to-[#7c3aed] p-6 text-white">
          <div className="flex items-center gap-3">
            <Settings2 size={32} />
            <div>
              <h1 className="text-2xl font-extrabold">إعدادات التصنيع</h1>
              <p className="text-violet-100">إصدارات BOM متعددة المستويات ومعدات التشغيل، مع الحفاظ على نسخ الأوامر القائمة.</p>
            </div>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>قائمة المواد وإصدارات BOM</span>
              {editingBomId && <Button variant="ghost" size="sm" onClick={resetBom}><X size={15} /> إلغاء التعديل</Button>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={bomForm.product_id} disabled={Boolean(editingBomId)} onChange={(event) => setBomForm({ ...bomForm, product_id: event.target.value })}>
                <option value="">المنتج النهائي *</option>{productOptions}
              </select>
              <Input placeholder="رقم الإصدار * (مثال: 1)" value={bomForm.version} onChange={(event) => setBomForm({ ...bomForm, version: event.target.value })} />
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={bomForm.status} onChange={(event) => setBomForm({ ...bomForm, status: event.target.value })}>
                <option value="draft">مسودة</option><option value="active">فعال</option><option value="obsolete">قديم</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Input type="number" min="0.000001" step="0.001" placeholder="كمية الناتج لكل إصدار" value={bomForm.yield_quantity} onChange={(event) => setBomForm({ ...bomForm, yield_quantity: event.target.value })} />
              <Input type="date" value={bomForm.effective_from} onChange={(event) => setBomForm({ ...bomForm, effective_from: event.target.value })} />
              <Input type="date" value={bomForm.effective_to} onChange={(event) => setBomForm({ ...bomForm, effective_to: event.target.value })} />
              <Input placeholder="ملاحظات الإصدار" value={bomForm.notes} onChange={(event) => setBomForm({ ...bomForm, notes: event.target.value })} />
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">المكونات والهالك والوحدات</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setBomForm({ ...bomForm, items: [...bomForm.items, newBomItem()] })}><Plus size={14} /> إضافة مكون</Button>
              </div>
              {bomForm.items.map((item, index) => {
                const componentId = Number(item.component_product_id);
                const childVersions = boms.filter((candidate) => candidate.product_id === componentId && candidate.status !== 'obsolete');
                return (
                  <div key={index} className="grid gap-2 rounded-md bg-muted/30 p-2 md:grid-cols-[1.4fr_0.7fr_0.6fr_0.6fr_1.2fr_auto]">
                    <select className="h-10 rounded-md border bg-background px-2 text-sm" value={item.component_product_id} onChange={(event) => setBomForm({
                      ...bomForm,
                      items: bomForm.items.map((row, rowIndex) => rowIndex === index
                        ? { ...row, component_product_id: event.target.value, child_bom_version_id: '' }
                        : row),
                    })}>
                      <option value="">المادة / نصف المصنع *</option>{productOptions}
                    </select>
                    <Input type="number" min="0.000001" step="0.001" placeholder="الكمية *" value={item.quantity} onChange={(event) => setBomForm({ ...bomForm, items: bomForm.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row) })} />
                    <Input type="number" min="0" max="100" step="0.01" placeholder="هالك %" value={item.scrap_percent} onChange={(event) => setBomForm({ ...bomForm, items: bomForm.items.map((row, rowIndex) => rowIndex === index ? { ...row, scrap_percent: event.target.value } : row) })} />
                    <Input placeholder="الوحدة" value={item.unit} onChange={(event) => setBomForm({ ...bomForm, items: bomForm.items.map((row, rowIndex) => rowIndex === index ? { ...row, unit: event.target.value } : row) })} />
                    <select className="h-10 rounded-md border bg-background px-2 text-sm" value={item.child_bom_version_id || 'none'} onChange={(event) => setBomForm({ ...bomForm, items: bomForm.items.map((row, rowIndex) => rowIndex === index ? { ...row, child_bom_version_id: event.target.value === 'none' ? '' : event.target.value } : row) })}>
                      <option value="none">بدون BOM فرعي</option>{childVersions.map((child) => <option key={child.id} value={child.id}>{child.product?.name || 'نصف مصنع'} · {child.version}</option>)}
                    </select>
                    <Button type="button" variant="ghost" size="icon" disabled={bomForm.items.length <= 1} onClick={() => setBomForm({ ...bomForm, items: bomForm.items.filter((_, rowIndex) => rowIndex !== index) })}><X size={15} /></Button>
                    <label className="flex items-center gap-2 text-xs md:col-span-6">
                      <input type="checkbox" checked={item.is_optional} onChange={(event) => setBomForm({ ...bomForm, items: bomForm.items.map((row, rowIndex) => rowIndex === index ? { ...row, is_optional: event.target.checked } : row) })} />
                      مكون اختياري
                    </label>
                  </div>
                );
              })}
            </div>
            <Button disabled={!bomFormValid || saveBom.isPending} onClick={() => saveBom.mutate()}><Save size={16} /> {editingBomId ? 'حفظ الإصدار' : 'إنشاء إصدار BOM'}</Button>

            <div className="space-y-2 border-t pt-4">
              {bomsQuery.isLoading ? <p>جارٍ تحميل الإصدارات...</p> : bomsQuery.isError ? <p className="text-destructive">تعذر تحميل إصدارات BOM.</p> : boms.map((bom) => (
                <div key={bom.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="font-semibold">{bom.product?.name || `منتج #${bom.product_id}`} · الإصدار {bom.version}</p>
                    <p className="text-xs text-muted-foreground">الناتج {bom.yield_quantity} · المكونات {bom.items?.length || 0}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={bom.status === 'active' ? 'default' : 'secondary'}>{statusNames[bom.status] || bom.status}</Badge>
                    {bom.status === 'draft' && <Button variant="ghost" size="icon" onClick={() => editDraft(bom)} title="تعديل المسودة"><Settings2 size={15} /></Button>}
                    <Button variant="outline" size="sm" onClick={() => createRevision(bom)}><Plus size={14} /> إصدار جديد</Button>
                    {bom.status === 'draft' && <Button variant="ghost" size="icon" disabled={deleteBom.isPending} onClick={() => deleteBom.mutate(bom.id)} title="حذف المسودة"><Archive size={15} /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><Factory size={20} /> معدات التصنيع</span>{editingEquipmentId && <Button variant="ghost" size="sm" onClick={() => { setEditingEquipmentId(null); setEquipmentForm(emptyEquipment); }}><X size={15} /> إلغاء</Button>}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-5">
              <Input placeholder="الكود *" value={equipmentForm.code} disabled={Boolean(editingEquipmentId)} onChange={(event) => setEquipmentForm({ ...equipmentForm, code: event.target.value })} />
              <Input placeholder="اسم المعدة *" value={equipmentForm.name} onChange={(event) => setEquipmentForm({ ...equipmentForm, name: event.target.value })} />
              <Input type="number" min="0" step="0.01" placeholder="تكلفة الساعة" value={equipmentForm.hourly_rate} onChange={(event) => setEquipmentForm({ ...equipmentForm, hourly_rate: event.target.value })} />
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={equipmentForm.status} onChange={(event) => setEquipmentForm({ ...equipmentForm, status: event.target.value })}>
                <option value="available">متاحة</option><option value="maintenance">صيانة</option><option value="inactive">متوقفة</option>
              </select>
              <Button disabled={!equipmentFormValid || saveEquipment.isPending} onClick={() => saveEquipment.mutate()}><Save size={15} /> {editingEquipmentId ? 'حفظ' : 'إضافة معدة'}</Button>
            </div>
            <Input placeholder="ملاحظات" value={equipmentForm.notes} onChange={(event) => setEquipmentForm({ ...equipmentForm, notes: event.target.value })} />
            {equipmentQuery.isLoading ? <p>جارٍ تحميل المعدات...</p> : equipmentQuery.isError ? <p className="text-destructive">تعذر تحميل المعدات.</p> : equipment.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div><p className="font-semibold">{item.code} · {item.name}</p><p className="text-xs text-muted-foreground">تكلفة الساعة {item.hourly_rate} · الحالة {item.status}</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditingEquipmentId(item.id);
                    setEquipmentForm({ code: item.code, name: item.name, status: item.status, hourly_rate: String(item.hourly_rate || 0), notes: item.notes || '' });
                  }}>تعديل</Button>
                  <Button size="sm" variant="ghost" disabled={deleteEquipment.isPending} onClick={() => deleteEquipment.mutate(item.id)}>أرشفة</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
