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
import { Plus, Edit2, Trash2, Users } from "lucide-react";

interface SalesmanForm {
  id?: string;
  name: string;
  name_ar: string;
  phone: string;
  email: string;
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
  const [formData, setFormData] = useState<SalesmanForm>({
    name: "",
    name_ar: "",
    phone: "",
    email: "",
    commission_rate: 0,
    branch_id: "",
    employee_id: "",
    is_active: true
  });

  // Fetch salesmen
  const { data: salesmen, isLoading } = useQuery({
    queryKey: ['salesmen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salesmen')
        .select(`
          *,
          branch:branches(id, name, name_ar),
          employee:employees(id, name, name_ar)
        `)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, name_ar')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Create/Update salesman
  const saveMutation = useMutation({
    mutationFn: async (data: SalesmanForm) => {
      if (data.id) {
        const { error } = await supabase
          .from('salesmen')
          .update({
            name: data.name,
            name_ar: data.name_ar || null,
            phone: data.phone || null,
            email: data.email || null,
            commission_rate: data.commission_rate,
            branch_id: data.branch_id || null,
            employee_id: data.employee_id || null,
            is_active: data.is_active
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salesmen')
          .insert({
            name: data.name,
            name_ar: data.name_ar || null,
            phone: data.phone || null,
            email: data.email || null,
            commission_rate: data.commission_rate,
            branch_id: data.branch_id || null,
            employee_id: data.employee_id || null,
            is_active: data.is_active
          });
        if (error) throw error;
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
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salesmen')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['salesmen'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الهاتف' : 'Phone'}</TableHead>
                  <TableHead>{language === 'ar' ? 'نسبة العمولة' : 'Commission %'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الفرع' : 'Branch'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </TableCell>
                  </TableRow>
                ) : salesmen?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      <TableCell>
                        {salesman.branch 
                          ? (language === 'ar' ? salesman.branch.name_ar || salesman.branch.name : salesman.branch.name)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={salesman.is_active ? 'default' : 'secondary'}>
                          {salesman.is_active 
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </Badge>
                      </TableCell>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الاسم (إنجليزي) *' : 'Name (English) *'}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  dir="rtl"
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
