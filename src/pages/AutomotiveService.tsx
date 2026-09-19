import { useCallback, useEffect, useMemo, useState } from 'react';
import { CarFront, ClipboardList, Clock3, DollarSign, Plus, RefreshCw, Wrench, Users, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomotiveService as automotiveApi, AutomotiveCustomer, AutomotiveServiceItem, AutomotiveServiceOrder, AutomotiveTechnician, AutomotiveVehicle } from '@/services/AutomotiveService';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  checked_in: 'تم الاستقبال', diagnosis: 'تشخيص', awaiting_approval: 'بانتظار الموافقة', approved: 'تمت الموافقة',
  in_progress: 'قيد التنفيذ', quality_check: 'فحص الجودة', ready_for_delivery: 'جاهزة للتسليم', delivered: 'تم التسليم',
};

const AutomotiveServicePage = () => {
  const [vehicles, setVehicles] = useState<AutomotiveVehicle[]>([]);
  const [services, setServices] = useState<AutomotiveServiceItem[]>([]);
  const [orders, setOrders] = useState<AutomotiveServiceOrder[]>([]);
  const [report, setReport] = useState<any>(null);
  const [customers, setCustomers] = useState<AutomotiveCustomer[]>([]);
  const [technicians, setTechnicians] = useState<AutomotiveTechnician[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({ code: '', name: '', name_ar: '', selling_price: '', estimated_cost: '' });
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ customer_id: '', make: '', model: '', model_year: '', plate_number: '', vin: '', current_mileage: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleData, serviceData, orderData, reportData, customerData, technicianData] = await Promise.all([
        automotiveApi.vehicles(search), automotiveApi.services(), automotiveApi.orders(), automotiveApi.profitabilityReport(), automotiveApi.customers(), automotiveApi.technicians(),
      ]);
      setVehicles(vehicleData); setServices(serviceData); setOrders(orderData);
      setReport(reportData); setCustomers(customerData); setTechnicians(technicianData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات خدمة السيارات');
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => ({
    open: orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length,
    ready: orders.filter((order) => order.status === 'ready_for_delivery').length,
    revenue: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
  }), [orders]);

  const createService = async () => {
    if (!serviceForm.code || !serviceForm.name || !serviceForm.selling_price) return toast.error('أدخل كود واسم وسعر الخدمة');
    try {
      await automotiveApi.createService({ ...serviceForm, selling_price: Number(serviceForm.selling_price), estimated_cost: Number(serviceForm.estimated_cost || 0) });
      setServiceForm({ code: '', name: '', name_ar: '', selling_price: '', estimated_cost: '' });
      setShowServiceForm(false); toast.success('تمت إضافة الخدمة'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إضافة الخدمة'); }
  };

  const moveOrder = async (order: AutomotiveServiceOrder, status: string) => {
    try { await automotiveApi.updateOrderStatus(order.id, status); toast.success('تم تحديث حالة أمر الخدمة'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الحالة'); }
  };

  const createVehicle = async () => {
    if (!vehicleForm.customer_id || !vehicleForm.make || !vehicleForm.model) return toast.error('اختر العميل وأدخل ماركة وموديل السيارة');
    try {
      await automotiveApi.createVehicle({ ...vehicleForm, customer_id: Number(vehicleForm.customer_id), model_year: vehicleForm.model_year ? Number(vehicleForm.model_year) : undefined, current_mileage: vehicleForm.current_mileage ? Number(vehicleForm.current_mileage) : 0 });
      setVehicleForm({ customer_id: '', make: '', model: '', model_year: '', plate_number: '', vin: '', current_mileage: '' }); setShowVehicleForm(false); toast.success('تمت إضافة السيارة'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إضافة السيارة'); }
  };

  return (
    <div className="min-h-full space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">Automotive Service</p><h1 className="text-3xl font-bold">خدمة السيارات</h1><p className="mt-1 text-muted-foreground">إدارة السيارات، أوامر الخدمة، الفنيين، والخدمات المباعة.</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="ml-2 h-4 w-4" /> تحديث</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">أوامر مفتوحة</p><p className="text-3xl font-bold">{totals.open}</p></div><ClipboardList className="h-8 w-8 text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">جاهزة للتسليم</p><p className="text-3xl font-bold">{totals.ready}</p></div><Clock3 className="h-8 w-8 text-amber-500" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">إجمالي الأوامر</p><p className="text-3xl font-bold">{totals.revenue.toLocaleString()}</p></div><DollarSign className="h-8 w-8 text-emerald-500" /></CardContent></Card>
      </div>
      {report && <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>ربحية الخدمات</CardTitle></CardHeader><CardContent className="space-y-2">{report.services?.slice(0, 8).map((row: any) => <div key={`${row.service_id}-${row.service}`} className="flex items-center justify-between rounded border p-3"><span>{row.service} <small className="text-muted-foreground">({row.orders} أمر)</small></span><span className="font-semibold text-emerald-600">{Number(row.profit).toLocaleString()} ربح</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>ربحية الفنيين</CardTitle></CardHeader><CardContent className="space-y-2">{report.technicians?.slice(0, 8).map((row: any) => <div key={row.technician_id} className="flex items-center justify-between rounded border p-3"><span>{row.technician} <small className="text-muted-foreground">({row.orders} أمر)</small></span><span className="font-semibold text-emerald-600">{Number(row.profit).toLocaleString()} ربح</span></div>)}</CardContent></Card></div>}<div className="mt-4"><Card><CardHeader><CardTitle>تقرير العملاء والأرباح</CardTitle></CardHeader><CardContent className="space-y-2">{report.customers?.slice(0, 12).map((row: any) => <div key={row.customer_id} className="grid gap-2 rounded border p-3 md:grid-cols-4"><span className="font-medium">{row.customer}</span><span>{row.orders} أمر</span><span>إيراد: {Number(row.revenue).toLocaleString()}</span><span className="font-semibold text-emerald-600">ربح: {Number(row.profit).toLocaleString()}</span></div>)}</CardContent></Card></div>
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList><TabsTrigger value="orders">أوامر الخدمة</TabsTrigger><TabsTrigger value="vehicles">السيارات</TabsTrigger><TabsTrigger value="customers">العملاء</TabsTrigger><TabsTrigger value="technicians">الفنيون</TabsTrigger><TabsTrigger value="services">الخدمات</TabsTrigger></TabsList>
        <TabsContent value="orders"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> أوامر الخدمة</CardTitle></CardHeader><CardContent><div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b text-right"><th className="p-3">الأمر</th><th className="p-3">العميل</th><th className="p-3">السيارة</th><th className="p-3">الفني</th><th className="p-3">الحالة</th><th className="p-3">الإجمالي</th><th className="p-3">إجراء</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b"><td className="p-3 font-medium">{order.order_number}</td><td className="p-3">{order.customer?.name || '—'}</td><td className="p-3">{order.vehicle ? `${order.vehicle.make} ${order.vehicle.model}` : '—'}</td><td className="p-3">{order.technicians?.map((technician) => technician.name).join('، ') || 'غير معين'}</td><td className="p-3"><span className="rounded-full bg-primary/10 px-2 py-1">{statusLabels[order.status] || order.status}</span></td><td className="p-3">{Number(order.total_amount || 0).toLocaleString()}</td><td className="p-3">{order.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => void moveOrder(order, 'quality_check')}>فحص الجودة</Button>}{order.status === 'quality_check' && <Button size="sm" onClick={() => void moveOrder(order, 'ready_for_delivery')}>جاهز للتسليم</Button>}</td></tr>)}</tbody></table>{!loading && orders.length === 0 && <div className="py-12 text-center text-muted-foreground">لا توجد أوامر خدمة حتى الآن</div>}</div></CardContent></Card></TabsContent>
        <TabsContent value="vehicles"><Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><CarFront className="h-5 w-5" /> سجل السيارات</CardTitle><Button onClick={() => setShowVehicleForm((value) => !value)}><Plus className="ml-2 h-4 w-4" /> سيارة جديدة</Button><Input className="max-w-xs" placeholder="بحث باللوحة أو VIN أو الموديل" value={search} onChange={(event) => setSearch(event.target.value)} /></div></CardHeader><CardContent>{showVehicleForm && <div className="mb-5 grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-4"><div><Label>العميل</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={vehicleForm.customer_id} onChange={(e) => setVehicleForm({ ...vehicleForm, customer_id: e.target.value })}><option value="">اختر العميل</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div><div><Label>الماركة</Label><Input value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} /></div><div><Label>الموديل</Label><Input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} /></div><div><Label>سنة الصنع</Label><Input type="number" value={vehicleForm.model_year} onChange={(e) => setVehicleForm({ ...vehicleForm, model_year: e.target.value })} /></div><div><Label>رقم اللوحة</Label><Input value={vehicleForm.plate_number} onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })} /></div><div><Label>VIN</Label><Input value={vehicleForm.vin} onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })} /></div><div><Label>الممشى</Label><Input type="number" value={vehicleForm.current_mileage} onChange={(e) => setVehicleForm({ ...vehicleForm, current_mileage: e.target.value })} /></div><Button className="self-end" onClick={() => void createVehicle()}>حفظ السيارة</Button></div>}<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{vehicles.map((vehicle) => <Card key={vehicle.id} className="bg-muted/30"><CardContent className="p-4"><p className="font-semibold">{vehicle.make} {vehicle.model} {vehicle.model_year || ''}</p><p className="text-sm text-muted-foreground">{vehicle.plate_number || 'بدون لوحة'} · {vehicle.customer?.name || 'بدون عميل'}</p><p className="mt-2 text-xs text-muted-foreground">الممشى: {vehicle.current_mileage || 0}</p></CardContent></Card>)}</div>{!loading && vehicles.length === 0 && <div className="py-12 text-center text-muted-foreground">لا توجد سيارات مسجلة</div>}</CardContent></Card></TabsContent>
        <TabsContent value="customers"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> العملاء ({customers.length})</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{customers.map((customer) => <Card key={customer.id} className="bg-muted/30"><CardContent className="p-4"><p className="font-semibold">{customer.name}</p><p className="text-sm text-muted-foreground">{customer.phone || customer.email || "بدون بيانات اتصال"}</p><p className="mt-2 text-xs text-muted-foreground">سيارات: {vehicles.filter((vehicle) => vehicle.customer_id === customer.id).length}</p></CardContent></Card>)}</div>{!customers.length && <div className="py-12 text-center text-muted-foreground">لا يوجد عملاء</div>}</CardContent></Card></TabsContent><TabsContent value="technicians"><Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> الفنيون ({technicians.length})</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{technicians.map((technician) => <Card key={technician.id} className="bg-muted/30"><CardContent className="p-4"><p className="font-semibold">{technician.name}</p><p className="text-sm text-muted-foreground">{technician.phone || technician.email || "بدون بيانات اتصال"}</p><p className="mt-2 text-xs text-muted-foreground">أوامر مسندة: {orders.filter((order) => order.technicians?.some((item) => item.id === technician.id)).length}</p></CardContent></Card>)}</div>{!technicians.length && <div className="py-12 text-center text-muted-foreground">لا يوجد فنيوّن</div>}</CardContent></Card></TabsContent><TabsContent value="services"><Card><CardHeader><div className="flex items-center justify-between"><CardTitle>كتالوج الخدمات ({services.length})</CardTitle><Button onClick={() => setShowServiceForm((value) => !value)}><Plus className="ml-2 h-4 w-4" /> خدمة جديدة</Button></div></CardHeader><CardContent>{showServiceForm && <div className="mb-5 grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-5"><div><Label>الكود</Label><Input value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })} /></div><div><Label>اسم الخدمة</Label><Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} /></div><div><Label>الاسم العربي</Label><Input value={serviceForm.name_ar} onChange={(e) => setServiceForm({ ...serviceForm, name_ar: e.target.value })} /></div><div><Label>سعر البيع</Label><Input type="number" value={serviceForm.selling_price} onChange={(e) => setServiceForm({ ...serviceForm, selling_price: e.target.value })} /></div><div><Label>التكلفة</Label><Input type="number" value={serviceForm.estimated_cost} onChange={(e) => setServiceForm({ ...serviceForm, estimated_cost: e.target.value })} /></div><Button className="md:col-span-5" onClick={() => void createService()}>حفظ الخدمة</Button></div>}<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{services.map((service) => <Card key={service.id}><CardContent className="p-4"><div className="flex items-start justify-between"><div><p className="font-semibold">{service.name}</p><p className="text-xs text-muted-foreground">{service.code}</p></div><span className="font-bold">{Number(service.selling_price).toLocaleString()}</span></div><p className="mt-3 text-sm text-muted-foreground">التكلفة التقديرية: {Number(service.estimated_cost).toLocaleString()}</p></CardContent></Card>)}</div></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomotiveServicePage;
