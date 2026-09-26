import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Users, FileText, Wallet } from "lucide-react";
import api from "@/lib/api";

interface SalesmanForm {
  id?: string;
  name: string;
  name_ar: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
  commission_rate: number;
  branch_id: string;
  employee_id: string;
  is_active: boolean;
}

const SalesmenManager = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<SalesmanForm | null>(null);
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [payingSalesman, setPayingSalesman] = useState<any | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentTreasuryId, setPaymentTreasuryId] = useState("");
  const [formData, setFormData] = useState<SalesmanForm>({
    name: "",
    name_ar: "",
    phone: "",
    email: "",
    password: "",
    password_confirmation: "",
    commission_rate: 0,
    branch_id: "",
    employee_id: "",
    is_active: true
  });

  // Fetch salesmen
  const { data: salesmen, isLoading } = useQuery({
    queryKey: ['salesmen', reportFrom, reportTo],
     queryFn: async () => {
      try {
        const response = await api.post('/sales-representative/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false,
          from: reportFrom || undefined,
          to: reportTo || undefined
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching salesmen:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب مندوبي المبيعات' : 'Error fetching salesmen');
        return [];
      }
    },
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب الفروع' : 'Error fetching branches');
        return [];
      }
    },
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const response = await api.post('/employee/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching employee:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب الموظفين' : 'Error fetching employees');
        return [];
      }
    },
  });

  const { data: treasuries = [] } = useQuery({
    queryKey: ['salesmen-bonus-treasuries'],
    queryFn: async () => (await api.post('/treasury/index', { filters: {}, orderBy: 'name', orderByDirection: 'asc', perPage: 100, paginate: false })).data.data || [],
  });
  const payBonusMutation = useMutation({
    mutationFn: async () => api.post(`/sales-representative/${payingSalesman.id}/bonus/collect`, { bonus_date: paymentDate, treasury_id: Number(paymentTreasuryId) }),
    onSuccess: (response) => {
      toast.success(response.data?.message || (language === 'ar' ? 'تم دفع البونص بنجاح' : 'Bonus paid successfully'));
      setPayingSalesman(null); setPaymentTreasuryId('');
      queryClient.invalidateQueries({ queryKey: ['salesmen'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.message),
  });
  // Create/Update salesman
  const saveMutation = useMutation({
    mutationFn: async (data: SalesmanForm) => {
      if (data.id) {
        const response = await api.patch(`/sales-representative/${data.id}`, {
          // id: data.id,
          name: data.name,
          name_ar: data.name_ar || null,
          phone: data.phone || null,
          email: data.email || null,
          ...(data.password ? { password: data.password, password_confirmation: data.password_confirmation } : {}),
          commission_rate: data.commission_rate,
          branch_id: data.branch_id || null,
          employee_id: data.employee_id || null,
          active: data.is_active
        });
        return response.data;
      } else {
        const response = await api.post('/sales-representative', {
          name: data.name,
          name_ar: data.name_ar || null,
          phone: data.phone || null,
          email: data.email || null,
          ...(data.password ? { password: data.password, password_confirmation: data.password_confirmation } : {}),
          commission_rate: data.commission_rate,
          branch_id: data.branch_id || null,
          employee_id: data.employee_id || null,
          active: data.is_active
        });
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
      queryClient.invalidateQueries({ queryKey: ['salesmen'] });
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Delete salesman
// Delete salesman - CORRECTED
const deleteMutation = useMutation({
  mutationFn: async (id: string) => { 
    await api.delete('/sales-representative/delete', {
      data: {
        items: [id] 
      }
    });
  },
  onSuccess: () => {
    toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
    queryClient.invalidateQueries({ queryKey: ['salesmen'] });
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.message || error.message);
  }
});

  const handleOpenForm = (salesman?: any) => {
    if (salesman) {
      setEditingSalesman(salesman);
      setFormData({
        id: salesman.id,
        name: salesman.name,
        name_ar: salesman.name_ar || "",
        phone: salesman.phone || "",
        email: salesman.email || "",
        password: "",
        password_confirmation: "",
        commission_rate: salesman.commission_rate || 0,
        branch_id: salesman.branch_id || "",
        employee_id: salesman.employee_id || "",
        is_active: salesman.is_active ?? true
      });
    } else {
      setEditingSalesman(null);
      setFormData({
        name: "",
        name_ar: "",
        phone: "",
        email: "",
        password: "",
        password_confirmation: "",
        commission_rate: 0,
        branch_id: "",
        employee_id: "",
        is_active: true
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSalesman(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error(language === 'ar' ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    if (!formData.id && (!formData.email || !formData.password)) {
      toast.error(language === 'ar' ? 'البريد وكلمة المرور مطلوبان للحساب الجديد' : 'Email and password are required for a new account');
      return;
    }
    if (formData.password && formData.password !== formData.password_confirmation) {
      toast.error(language === 'ar' ? 'تأكيد كلمة المرور غير مطابق' : 'Passwords do not match');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === 'ar' ? 'إدارة المندوبين' : 'Salesmen Management'}
          </CardTitle>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'مندوب جديد' : 'New Salesman'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[180px_180px_auto]
          "><div><Label>{language === 'ar' ? 'من تاريخ' : 'From'}</Label><Input type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} /></div><div><Label>{language === 'ar' ? 'إلى تاريخ' : 'To'}</Label><Input type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} /></div><div className="flex items-end"><Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['salesmen'] })}>{language === 'ar' ? 'تحديث التقرير' : 'Refresh report'}</Button></div></div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الهاتف' : 'Phone'}</TableHead>
                  <TableHead>{language === 'ar' ? 'نسبة العمولة' : 'Commission %'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الفرع' : 'Branch'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الفواتير' : 'Invoices'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المبيعات' : 'Sales'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التكلفة' : 'Cost'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الربح' : 'Profit'}</TableHead>
                  <TableHead>{language === 'ar' ? 'البونص' : 'Bonus'}</TableHead>
                  <TableHead>{language === 'ar' ? 'تقرير' : 'Report'}</TableHead>
                  {/* <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead> */}
                  <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </TableCell>
                  </TableRow>
                ) : salesmen?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا يوجد مندوبين' : 'No salesmen found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  salesmen?.map((salesman) => (
                    <TableRow key={salesman.id}>
                      <TableCell>
                        <div className="font-medium">
                          {language === 'ar' ? salesman.name_ar || salesman.name : salesman.name}
                        </div>
                        {salesman.email && (
                          <div className="text-xs text-muted-foreground">{salesman.email}</div>
                        )}
                      </TableCell>
                      <TableCell>{salesman.phone || '-'}</TableCell>
                      <TableCell>{salesman.commission_rate}%</TableCell>
                     <TableCell>{salesman.branch_name || '-'}</TableCell>
                      <TableCell>{salesman.report?.invoice_count || 0}</TableCell>
                      <TableCell>{Number(salesman.report?.sales_total || 0).toFixed(2)}</TableCell>
                      <TableCell>{Number(salesman.report?.cost_total || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-emerald-600">{Number(salesman.report?.profit_total || 0).toFixed(2)}</TableCell>
                      <TableCell><div className="text-sm">{Number(salesman.bonus?.paid_total || 0).toFixed(2)} / {Number(salesman.bonus?.due_total || 0).toFixed(2)}</div><Button variant="outline" size="sm" disabled={!salesman.employee_id || Number(salesman.report?.commission_total || 0) <= 0 || Number(salesman.bonus?.paid_total || 0) > 0} onClick={() => { setPayingSalesman(salesman); setPaymentDate(reportTo || reportFrom || new Date().toISOString().slice(0, 10)); }}>{language === 'ar' ? 'دفع' : 'Pay'}</Button></TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => setSelectedReport(salesman)}><FileText className="h-4 w-4" /></Button></TableCell>
                      {/* <TableCell>
                        <Badge variant={salesman.is_active ? 'default' : 'secondary'}>
                          {salesman.is_active 
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </Badge>
                      </TableCell> */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenForm(salesman)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
                                deleteMutation.mutate(salesman.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{language === 'ar' ? `فواتير ${selectedReport?.name || ''}` : `${selectedReport?.name || ''} invoices`}</DialogTitle></DialogHeader><div className="overflow-auto"><div className="mb-3 grid gap-2 sm:grid-cols-5"><div>{language === 'ar' ? 'النسبة' : 'Rate'}: {selectedReport?.report?.commission_rate || selectedReport?.commission_rate || 0}%</div><div>{language === 'ar' ? 'المبيعات' : 'Sales'}: {Number(selectedReport?.report?.sales_total || 0).toFixed(2)}</div><div>{language === 'ar' ? 'الربح' : 'Profit'}: {Number(selectedReport?.report?.profit_total || 0).toFixed(2)}</div><div>{language === 'ar' ? 'العمولة' : 'Commission'}: {Number(selectedReport?.report?.commission_total || 0).toFixed(2)}</div><div>{language === 'ar' ? 'المدفوع' : 'Paid'}: {Number(selectedReport?.bonus?.paid_total || 0).toFixed(2)}</div></div><div className="mb-4 rounded border p-3"><div className="mb-2 font-semibold">{language === 'ar' ? 'سجل دفع البونص' : 'Bonus payment history'}</div>{(selectedReport?.bonus?.payments || []).length ? selectedReport.bonus.payments.map((payment: any) => <div key={payment.id} className="flex flex-wrap gap-3 text-sm"><span>{payment.date}</span><span>{Number(payment.amount).toFixed(2)}</span><span>{payment.status === 'paid' ? (language === 'ar' ? 'مدفوع' : 'Paid') : (language === 'ar' ? 'مستحق' : 'Due')}</span><span>{language === 'ar' ? 'دفعه:' : 'Paid by:'} {payment.paid_by || '-'}</span><span>{payment.paid_at || ''}</span></div>) : <span className="text-sm text-muted-foreground">{language === 'ar' ? 'لا توجد دفعات' : 'No payments yet'}</span>}</div><Table><TableHeader><TableRow><TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead><TableHead>{language === 'ar' ? 'الفاتورة' : 'Invoice'}</TableHead><TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead><TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead><TableHead>{language === 'ar' ? 'التكلفة' : 'Cost'}</TableHead><TableHead>{language === 'ar' ? 'الربح' : 'Profit'}</TableHead><TableHead>{language === 'ar' ? 'العمولة' : 'Commission'}</TableHead><TableHead>{language === 'ar' ? 'القيود' : 'Journal entries'}</TableHead></TableRow></TableHeader><TableBody>{(selectedReport?.report?.invoices || []).map((invoice: any) => <TableRow key={invoice.id}><TableCell>{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}</TableCell><TableCell>{invoice.invoice_number || invoice.id}</TableCell><TableCell><div>{invoice.customer?.name || '-'}</div><div className="text-xs text-muted-foreground">{(invoice.items || []).map((item: any, index: number) => <span key={index} className="me-2">{item.product_name || '-'} × {item.quantity}</span>)}</div></TableCell><TableCell>{Number(invoice.total || 0).toFixed(2)}</TableCell><TableCell>{Number(invoice.cost || 0).toFixed(2)}</TableCell><TableCell className="text-emerald-600">{Number(invoice.profit || 0).toFixed(2)}</TableCell><TableCell>{Number(invoice.commission || 0).toFixed(2)}</TableCell><TableCell className="text-xs">{invoice.journal_entry_id || '-'} / {invoice.cogs_journal_entry_id || '-'} / {invoice.commission_journal_entry_id || '-'}</TableCell></TableRow>)}</TableBody></Table></div></DialogContent>
      </Dialog>
      <Dialog open={!!payingSalesman} onOpenChange={(open) => !open && setPayingSalesman(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === 'ar' ? `دفع بونص ${payingSalesman?.name || ''}` : `Pay bonus for ${payingSalesman?.name || ''}`}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{language === 'ar' ? 'يوم العمولة' : 'Commission date'}</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
            <div><Label>{language === 'ar' ? 'الخزينة' : 'Treasury'}</Label><Select value={paymentTreasuryId} onValueChange={setPaymentTreasuryId}><SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الخزينة' : 'Select treasury'} /></SelectTrigger><SelectContent>{treasuries.map((treasury: any) => <SelectItem key={treasury.id} value={String(treasury.id)}>{treasury.name} — {Number(treasury.balance || 0).toFixed(2)}</SelectItem>)}</SelectContent></Select></div>
            <div className="rounded bg-muted p-3">{language === 'ar' ? 'سيتم حساب العمولة من فواتير اليوم عند التأكيد:' : 'Commission will be calculated from the selected day:'} <strong>{Number(payingSalesman?.report?.commission_total || 0).toFixed(2)}</strong></div>
          </div>
          <DialogFooter><Button disabled={!paymentTreasuryId || payBonusMutation.isPending} onClick={() => payBonusMutation.mutate()}><Wallet className="me-2 h-4 w-4" />{language === 'ar' ? 'تأكيد الدفع' : 'Confirm payment'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSalesman 
                ? (language === 'ar' ? 'تعديل مندوب' : 'Edit Salesman')
                : (language === 'ar' ? 'مندوب جديد' : 'New Salesman')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الاسم (إنجليزي) *' : 'Name (English) *'}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'كلمة المرور' : 'Password'}{!editingSalesman ? ' *' : ''}</Label>
                <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editingSalesman ? (language === 'ar' ? 'اتركها فارغة بدون تغيير' : 'Leave blank to keep current') : ''} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'}{!editingSalesman ? ' *' : ''}</Label>
                <Input type="password" value={formData.password_confirmation} onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'نسبة العمولة %' : 'Commission Rate %'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{language === 'ar' ? 'ربط بموظف' : 'Link to Employee'}</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الموظف' : 'Select employee'} />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {language === 'ar' ? emp.name_ar || emp.name : emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>{language === 'ar' ? 'نشط' : 'Active'}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalesmenManager;
