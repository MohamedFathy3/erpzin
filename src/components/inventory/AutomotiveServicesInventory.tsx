import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Plus, RefreshCw, CarFront, PackageCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { AutomotiveServiceItem } from '@/services/AutomotiveService';

type FormState = {
  code: string; name: string; name_ar: string; item_type: 'service' | 'product'; unit: string;
  selling_price: string; estimated_cost: string; stock_quantity: string;
  small_vehicle_quantity: string; large_vehicle_quantity: string;
  small_vehicle_price: string; large_vehicle_price: string; active: boolean;
};

const emptyForm: FormState = {
  code: '', name: '', name_ar: '', item_type: 'service', unit: '', selling_price: '', estimated_cost: '', stock_quantity: '0',
  small_vehicle_quantity: '', large_vehicle_quantity: '', small_vehicle_price: '', large_vehicle_price: '', active: true,
};

const toForm = (service: AutomotiveServiceItem): FormState => ({
  code: service.code || '', name: service.name || '', name_ar: service.name_ar || '',
  item_type: service.item_type || 'service', unit: service.unit || '',
  selling_price: String(service.selling_price ?? ''), estimated_cost: String(service.estimated_cost ?? ''),
  stock_quantity: String(service.stock_quantity ?? service.product?.stock ?? 0),
  small_vehicle_quantity: String(service.small_vehicle_quantity ?? ''), large_vehicle_quantity: String(service.large_vehicle_quantity ?? ''),
  small_vehicle_price: String(service.small_vehicle_price ?? ''), large_vehicle_price: String(service.large_vehicle_price ?? ''),
  active: service.active !== false,
});

const numberOrUndefined = (value: string) => value === '' ? undefined : Number(value);

const AutomotiveServicesInventory: React.FC = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AutomotiveServiceItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const isArabic = language === 'ar';

  const { data: services = [], isLoading, refetch } = useQuery<AutomotiveServiceItem[]>({
    queryKey: ['inventory-automotive-services'],
    queryFn: async () => {
      const response = await api.get('/automotive/services', { params: { per_page: 100 } });
      return response.data?.data?.data ?? response.data?.data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        selling_price: Number(form.selling_price || 0), estimated_cost: Number(form.estimated_cost || 0),
        stock_quantity: Number(form.stock_quantity || 0),
        small_vehicle_quantity: numberOrUndefined(form.small_vehicle_quantity), large_vehicle_quantity: numberOrUndefined(form.large_vehicle_quantity),
        small_vehicle_price: numberOrUndefined(form.small_vehicle_price), large_vehicle_price: numberOrUndefined(form.large_vehicle_price),
      };
      if (editing) return api.patch(`/automotive/services/${editing.id}`, payload);
      return api.post('/automotive/services', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-automotive-services'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      setEditing(null); setForm(emptyForm);
      toast({ title: isArabic ? 'تم حفظ الخدمة بنجاح' : 'Service saved successfully' });
    },
    onError: (error: any) => toast({ title: isArabic ? 'تعذر حفظ الخدمة' : 'Could not save service', description: error.response?.data?.message || error.message, variant: 'destructive' }),
  });

  const startAdd = () => { setEditing(null); setForm(emptyForm); };
  const startEdit = (service: AutomotiveServiceItem) => { setEditing(service); setForm(toForm(service)); };
  const update = (key: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  return <div className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">{isArabic ? 'خدمات ومنتجات السيارات' : 'Automotive Services & Products'}</h2><p className="text-sm text-muted-foreground">{isArabic ? 'إدارة الغسيل وProtect Plus والمخزون والأسعار من مكان واحد' : 'Manage car wash, Protect Plus, stock and pricing in one place'}</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void refetch()}><RefreshCw className="me-2 h-4 w-4" />{isArabic ? 'تحديث' : 'Refresh'}</Button><Button onClick={startAdd}><Plus className="me-2 h-4 w-4" />{isArabic ? 'إضافة خدمة/منتج' : 'Add service/product'}</Button></div>
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5" />{editing ? (isArabic ? 'تعديل الصنف' : 'Edit item') : (isArabic ? 'صنف جديد' : 'New item')}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-4">
      <div><Label>{isArabic ? 'النوع' : 'Type'}</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={form.item_type} onChange={(e) => update('item_type', e.target.value)}><option value="service">{isArabic ? 'خدمة' : 'Service'}</option><option value="product">{isArabic ? 'منتج' : 'Product'}</option></select></div>
      <div><Label>{isArabic ? 'الكود' : 'Code'}</Label><Input value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="WASH-001" /></div>
      <div><Label>{isArabic ? 'الاسم' : 'Name'}</Label><Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Protect Plus" /></div>
      <div><Label>{isArabic ? 'الاسم العربي' : 'Arabic name'}</Label><Input value={form.name_ar} onChange={(e) => update('name_ar', e.target.value)} /></div>
      <div><Label>{isArabic ? 'سعر البيع الأساسي' : 'Base selling price'}</Label><Input type="number" min="0" value={form.selling_price} onChange={(e) => update('selling_price', e.target.value)} /></div>
      <div><Label>{isArabic ? 'سعر التكلفة' : 'Cost price'}</Label><Input type="number" min="0" value={form.estimated_cost} onChange={(e) => update('estimated_cost', e.target.value)} /></div>
      <div><Label>{isArabic ? 'الكمية/المخزون' : 'Quantity/stock'}</Label><Input type="number" min="0" value={form.stock_quantity} onChange={(e) => update('stock_quantity', e.target.value)} /></div>
      <div><Label>{isArabic ? 'الوحدة' : 'Unit'}</Label><Input value={form.unit} onChange={(e) => update('unit', e.target.value)} placeholder={isArabic ? 'متر' : 'meter'} /></div>
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 md:col-span-4"><p className="mb-2 text-sm font-semibold">{isArabic ? 'استهلاك وتسعير السيارة — Protect Plus' : 'Vehicle usage and pricing — Protect Plus'}</p><div className="grid gap-3 md:grid-cols-4"><div><Label>{isArabic ? 'الصغير: أمتار' : 'Small: meters'}</Label><Input type="number" min="0" value={form.small_vehicle_quantity} onChange={(e) => update('small_vehicle_quantity', e.target.value)} placeholder="12" /></div><div><Label>{isArabic ? 'الصغير: سعر' : 'Small: price'}</Label><Input type="number" min="0" value={form.small_vehicle_price} onChange={(e) => update('small_vehicle_price', e.target.value)} /></div><div><Label>{isArabic ? 'الكبير: أمتار' : 'Large: meters'}</Label><Input type="number" min="0" value={form.large_vehicle_quantity} onChange={(e) => update('large_vehicle_quantity', e.target.value)} placeholder="15" /></div><div><Label>{isArabic ? 'الكبير: سعر' : 'Large: price'}</Label><Input type="number" min="0" value={form.large_vehicle_price} onChange={(e) => update('large_vehicle_price', e.target.value)} /></div></div></div>
      <div className="flex items-center gap-2 md:col-span-4"><input id="automotive-active" type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} /><Label htmlFor="automotive-active">{isArabic ? 'نشط ويظهر في الـPOS' : 'Active and visible in POS'}</Label></div>
      <div className="flex gap-2 md:col-span-4"><Button disabled={save.isPending || !form.code.trim() || !form.name.trim()} onClick={() => save.mutate()}>{save.isPending ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (editing ? (isArabic ? 'حفظ التعديل' : 'Save changes') : (isArabic ? 'حفظ وإضافة للمخزون والـPOS' : 'Save to inventory and POS'))}</Button>{editing && <Button variant="outline" onClick={startAdd}>{isArabic ? 'إلغاء التعديل' : 'Cancel'}</Button>}</div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>{isArabic ? `الأصناف (${services.length})` : `Items (${services.length})`}</CardTitle></CardHeader><CardContent><div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b text-right"><th className="p-3">{isArabic ? 'الصنف' : 'Item'}</th><th className="p-3">{isArabic ? 'النوع' : 'Type'}</th><th className="p-3">{isArabic ? 'الكمية' : 'Stock'}</th><th className="p-3">{isArabic ? 'التكلفة' : 'Cost'}</th><th className="p-3">{isArabic ? 'سعر البيع' : 'Selling price'}</th><th className="p-3">{isArabic ? 'إجراء' : 'Action'}</th></tr></thead><tbody>{services.map((service) => <tr className="border-b" key={service.id}><td className="p-3"><div className="flex items-center gap-2"><CarFront className="h-4 w-4 text-primary" /><span className="font-medium">{isArabic ? service.name_ar || service.name : service.name}</span><small className="text-muted-foreground">{service.code}</small></div></td><td className="p-3">{service.item_type === 'product' ? (isArabic ? 'منتج' : 'Product') : (isArabic ? 'خدمة' : 'Service')}</td><td className="p-3">{Number(service.stock_quantity ?? service.product?.stock ?? 0).toLocaleString()} {service.unit || ''}</td><td className="p-3">{Number(service.estimated_cost || 0).toLocaleString()}</td><td className="p-3">{Number(service.selling_price || 0).toLocaleString()}</td><td className="p-3"><Button size="sm" variant="outline" onClick={() => startEdit(service)}><Pencil className="me-1 h-3 w-3" />{isArabic ? 'تعديل' : 'Edit'}</Button></td></tr>)}</tbody></table>{!isLoading && services.length === 0 && <p className="py-8 text-center text-muted-foreground">{isArabic ? 'لا توجد خدمات أو منتجات بعد' : 'No services or products yet'}</p>}</div></CardContent></Card>
  </div>;
};

export default AutomotiveServicesInventory;
