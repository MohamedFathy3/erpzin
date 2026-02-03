import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Store, Warehouse } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// تعريف الأنواع بناءً على الـ response الجديد
interface Branch {
  id: number;
  name: string;
  name_ar?: string | null;
  code: string | null;
  address: string | null;
  phone: string | null;
  manager: string | null;
  active: boolean;
  main_branch: boolean;
  image?: string | null;
  created_at: string;
  updated_at: string;
}

// ✅ تعديل WarehouseType علشان branch_id يكون object
interface WarehouseType {
  id: number;
  name: string;
  name_ar: string | null;
  code: string | null;
  address: string | null;
  phone: string | null;
  manager: string | null;
  active: boolean;
  main_branch: boolean;
  note: string | null;
  branch_id: Branch | null; // ✅ أصبح object كامل (ممكن يكون null)
  image: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  data: T | T[];
  message?: string;
  status: string | number;
  result?: string;
  links?: any;
  meta?: any;
}

const BranchesWarehouses = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  // Branch form state
  const [branchForm, setBranchForm] = useState({
    id: 0,
    name: '',
    name_ar: '',
    code: '',
    address: '',
    phone: '',
    manager: '',
    active: true,
    main_branch: false,
    image: null as string | null
  });
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);

  // Warehouse form state
  const [warehouseForm, setWarehouseForm] = useState({
    id: 0,
    name: '',
    name_ar: '',
    code: '',
    address: '',
    phone: '',
    manager: '',
    active: true,
    main_branch: false,
    note: '',
    branch_id: null as number | null // ✅ الـ ID فقط للـ form
  });
  const [isEditingWarehouse, setIsEditingWarehouse] = useState(false);
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);

  const t = {
    en: {
      branches: 'Branches',
      warehouses: 'Warehouses',
      branchName: 'Branch Name',
      branchNameAr: 'Branch Name (Arabic)',
      branchCode: 'Code',
      address: 'Address',
      phone: 'Phone',
      manager: 'Manager',
      mainBranch: 'Main Branch',
      active: 'Active',
      inactive: 'Inactive',
      addBranch: 'Add Branch',
      editBranch: 'Edit Branch',
      deleteBranch: 'Delete Branch',
      warehouseName: 'Warehouse Name',
      warehouseNameAr: 'Warehouse Name (Arabic)',
      warehouseCode: 'Code',
      addWarehouse: 'Add Warehouse',
      editWarehouse: 'Edit Warehouse',
      deleteWarehouse: 'Delete Warehouse',
      linkedBranches: 'Linked Branches',
      mainWarehouse: 'Main Warehouse',
      notes: 'Notes',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this item?',
      deleteWarning: 'This action cannot be undone.',
      manageBranches: 'Manage company branches',
      manageWarehouses: 'Manage warehouses and link them to branches',
      selectBranches: 'Select Branches',
      noBranches: 'No branches yet',
      noWarehouses: 'No warehouses yet',
      loading: 'Loading...',
      createWarehousesForBranches: 'Create Warehouses for All Branches',
      warehousesCreated: 'Warehouses created successfully',
      creatingWarehouses: 'Creating warehouses...'
    },
    ar: {
      branches: 'الفروع',
      warehouses: 'المخازن',
      branchName: 'اسم الفرع',
      branchNameAr: 'اسم الفرع (بالعربية)',
      branchCode: 'الرمز',
      address: 'العنوان',
      phone: 'الهاتف',
      manager: 'المدير',
      mainBranch: 'الفرع الرئيسي',
      active: 'نشط',
      inactive: 'غير نشط',
      addBranch: 'إضافة فرع',
      editBranch: 'تعديل الفرع',
      deleteBranch: 'حذف الفرع',
      warehouseName: 'اسم المخزن',
      warehouseNameAr: 'اسم المخزن (بالعربية)',
      warehouseCode: 'الرمز',
      addWarehouse: 'إضافة مخزن',
      editWarehouse: 'تعديل المخزن',
      deleteWarehouse: 'حذف المخزن',
      linkedBranches: 'الفروع المرتبطة',
      mainWarehouse: 'المخزن الرئيسي',
      notes: 'ملاحظات',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      confirmDelete: 'هل أنت متأكد من حذف هذا العنصر؟',
      deleteWarning: 'لا يمكن التراجع عن هذا الإجراء.',
      manageBranches: 'إدارة فروع الشركة',
      manageWarehouses: 'إدارة المخازن وربطها بالفروع',
      selectBranches: 'اختر الفروع',
      noBranches: 'لا توجد فروع بعد',
      noWarehouses: 'لا توجد مخازن بعد',
      loading: 'جاري التحميل...',
      createWarehousesForBranches: 'إنشاء مخازن لجميع الفروع',
      warehousesCreated: 'تم إنشاء المخازن بنجاح',
      creatingWarehouses: 'جاري إنشاء المخازن...'
    }
  }[language];

  // Fetch branches من API Laravel
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Branch[]>>('/branch');
      return Array.isArray(response.data.data) ? response.data.data : [];
    },
    onError: (error) => {
      toast({
        title: language === 'ar' ? 'خطأ في تحميل الفروع' : 'Error loading branches',
        variant: 'destructive'
      });
    }
  });

  // Fetch warehouses من API Laravel
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<WarehouseType[]>>('/warehouse');
      return Array.isArray(response.data.data) ? response.data.data : [];
    },
    onError: (error) => {
      toast({
        title: language === 'ar' ? 'خطأ في تحميل المخازن' : 'Error loading warehouses',
        variant: 'destructive'
      });
    }
  });

  // Branch mutations
  const saveBranchMutation = useMutation({
    mutationFn: async (branch: typeof branchForm) => {
      const payload = {
        name: branch.name,
        name_ar: branch.name_ar || null,
        code: branch.code || null,
        address: branch.address || null,
        phone: branch.phone || null,
        manager: branch.manager || null,
        active: branch.active,
        main_branch: branch.main_branch,
        image: branch.image || null
      };

      if (branch.id) {
        // Update existing branch
        const response = await api.put<ApiResponse<Branch>>(`/branch/${branch.id}`, payload);
        return response.data.data;
      } else {
        // Create new branch
        const response = await api.post<ApiResponse<Branch>>('/branch', payload);
        return response.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast({ 
        title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully',
        description: language === 'ar' ? 'تم حفظ بيانات الفرع' : 'Branch data saved'
      });
      resetBranchForm();
      setBranchDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Error saving branch:', error);
      let errorMessage = language === 'ar' ? 'خطأ في الحفظ' : 'Error saving';
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({ 
        title: errorMessage,
        variant: 'destructive' 
      });
    }
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete('/branch/delete/', {
        data: {
          items: [id],
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast({ 
        title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully',
        description: language === 'ar' ? 'تم حذف الفرع' : 'Branch deleted'
      });
    },
    onError: (error: any) => {
      let errorMessage = language === 'ar' ? 'خطأ في الحذف' : 'Error deleting';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({ 
        title: errorMessage,
        variant: 'destructive' 
      });
    }
  });

  // Warehouse mutations
  const saveWarehouseMutation = useMutation({
    mutationFn: async (warehouse: typeof warehouseForm) => {
      const payload = {
        name: warehouse.name,
        name_ar: warehouse.name_ar || null,
        code: warehouse.code || null,
        address: warehouse.address || null,
        phone: warehouse.phone || null,
        manager: warehouse.manager || null,
        active: warehouse.active,
        main_branch: warehouse.main_branch,
        note: warehouse.note || null,
        branch_id: warehouse.branch_id // ✅ إرسال الـ ID فقط
      };

      if (warehouse.id) {
        // Update existing warehouse
        const response = await api.put<ApiResponse<WarehouseType>>(`/warehouse/${warehouse.id}`, payload);
        return response.data.data;
      } else {
        // Create new warehouse
        const response = await api.post<ApiResponse<WarehouseType>>('/warehouse', payload);
        return response.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast({ 
        title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully',
        description: language === 'ar' ? 'تم حفظ بيانات المخزن' : 'Warehouse data saved'
      });
      resetWarehouseForm();
      setWarehouseDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Error saving warehouse:', error);
      let errorMessage = language === 'ar' ? 'خطأ في الحفظ' : 'Error saving';
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({ 
        title: errorMessage,
        variant: 'destructive' 
      });
    }
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete('/warehouse/delete/', {
        data: {
          items: [id],
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast({ 
        title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully',
        description: language === 'ar' ? 'تم حذف المخزن' : 'Warehouse deleted'
      });
    },
    onError: (error: any) => {
      let errorMessage = language === 'ar' ? 'خطأ في الحذف' : 'Error deleting';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({ 
        title: errorMessage,
        variant: 'destructive' 
      });
    }
  });

  // Create warehouses for all branches mutation
  const createWarehousesForBranchesMutation = useMutation({
    mutationFn: async () => {
      // Get branches that don't have warehouses yet
      const branchesWithoutWarehouses = branches.filter(branch => {
        const hasWarehouse = branchWarehouses.some(bw => bw.branch_id === branch.id);
        return !hasWarehouse;
      });

      if (branchesWithoutWarehouses.length === 0) {
        throw new Error('All branches already have warehouses');
      }

      // Create warehouses for each branch without one
      for (const branch of branchesWithoutWarehouses) {
        const warehouseName = `${branch.name} Warehouse`;
        const warehouseNameAr = branch.name_ar ? `مخزن ${branch.name_ar}` : null;
        const warehouseCode = branch.code ? `WH-${branch.code}` : null;

        // Create warehouse
        const { data: newWarehouse, error: warehouseError } = await supabase
          .from('warehouses')
          .insert({
            name: warehouseName,
            name_ar: warehouseNameAr,
            code: warehouseCode,
            address: branch.address,
            phone: branch.phone,
            is_active: true,
            is_main: branch.is_main ?? false
          })
          .select('id')
          .single();

        if (warehouseError) throw warehouseError;

        // Link warehouse to branch
        const { error: linkError } = await supabase
          .from('branch_warehouses')
          .insert({
            branch_id: branch.id,
            warehouse_id: newWarehouse.id,
            is_primary: true
          });

        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['branch-warehouses'] });
      toast({ title: language === 'ar' ? 'تم إنشاء المخازن بنجاح' : 'Warehouses created successfully' });
    },
    onError: (error: Error) => {
      if (error.message === 'All branches already have warehouses') {
        toast({ title: language === 'ar' ? 'جميع الفروع لديها مخازن بالفعل' : 'All branches already have warehouses' });
      } else {
        toast({ title: language === 'ar' ? 'خطأ في إنشاء المخازن' : 'Error creating warehouses', variant: 'destructive' });
      }
    }
  });

  const resetBranchForm = () => {
    setBranchForm({
      id: 0,
      name: '',
      name_ar: '',
      code: '',
      address: '',
      phone: '',
      manager: '',
      active: true,
      main_branch: false,
      image: null
    });
    setIsEditingBranch(false);
  };

  const resetWarehouseForm = () => {
    setWarehouseForm({
      id: 0,
      name: '',
      name_ar: '',
      code: '',
      address: '',
      phone: '',
      manager: '',
      active: true,
      main_branch: false,
      note: '',
      branch_id: null
    });
    setIsEditingWarehouse(false);
  };

  const editBranch = (branch: Branch) => {
    setBranchForm({
      id: branch.id,
      name: branch.name,
      name_ar: branch.name_ar || '',
      code: branch.code || '',
      address: branch.address || '',
      phone: branch.phone || '',
      manager: branch.manager || '',
      active: branch.active,
      main_branch: branch.main_branch,
      image: branch.image || null
    });
    setIsEditingBranch(true);
    setBranchDialogOpen(true);
  };

  // ✅ التصحيح هنا!
  const editWarehouse = (warehouse: WarehouseType) => {
    console.log('Warehouse data for edit:', warehouse);
    console.log('Branch ID from object:', warehouse.branch_id?.id);
    
    setWarehouseForm({
      id: warehouse.id,
      name: warehouse.name,
      name_ar: warehouse.name_ar || '',
      code: warehouse.code || '',
      address: warehouse.address || '',
      phone: warehouse.phone || '',
      manager: warehouse.manager || '',
      active: warehouse.active,
      main_branch: warehouse.main_branch,
      note: warehouse.note || '',
      // ✅ التصحيح المهم: ناخد الـ ID فقط من الـ object
      branch_id: warehouse.branch_id?.id || null
    });
    setIsEditingWarehouse(true);
    setWarehouseDialogOpen(true);
  };

  // ✅ دالة لعرض اسم الفرع في الجدول
  const getWarehouseBranchName = (warehouse: WarehouseType) => {
    if (!warehouse.branch_id) return '-';
    return language === 'ar' ? 
      warehouse.branch_id.name_ar || warehouse.branch_id.name : 
      warehouse.branch_id.name;
  };

  // ✅ دالة لحساب عدد المخازن لكل فرع
  const getBranchWarehousesCount = (branchId: number) => {
    return warehouses.filter(w => w.branch_id?.id === branchId).length;
  };

  // ✅ تصحيح دالة toggleBranchSelection
  const toggleBranchSelection = (branchId: number) => {
    setWarehouseForm(prev => ({
      ...prev,
      branch_id: prev.branch_id === branchId ? null : branchId
    }));
  };

  if (isLoadingBranches || isLoadingWarehouses) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branches Section */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store size={20} />
                {t.branches}
              </CardTitle>
              <CardDescription>{t.manageBranches}</CardDescription>
            </div>
            <Dialog open={branchDialogOpen} onOpenChange={(open) => {
              setBranchDialogOpen(open);
              if (!open) resetBranchForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-success">
                  <Plus size={16} className="me-2" />
                  {t.addBranch}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{isEditingBranch ? t.editBranch : t.addBranch}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.branchName} *</Label>
                      <Input 
                        value={branchForm.name}
                        onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                        placeholder={t.branchName}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.branchNameAr}</Label>
                      <Input 
                        value={branchForm.name_ar}
                        onChange={(e) => setBranchForm({ ...branchForm, name_ar: e.target.value })}
                        placeholder={t.branchNameAr}
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.branchCode}</Label>
                      <Input 
                        value={branchForm.code}
                        onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                        placeholder="BR001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.phone}</Label>
                      <Input 
                        value={branchForm.phone}
                        onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                        placeholder={t.phone}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.address}</Label>
                    <Input 
                      value={branchForm.address}
                      onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                      placeholder={t.address}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.manager}</Label>
                    <Input 
                      value={branchForm.manager}
                      onChange={(e) => setBranchForm({ ...branchForm, manager: e.target.value })}
                      placeholder={t.manager}
                    />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="branch_active"
                        checked={branchForm.active}
                        onCheckedChange={(checked) => setBranchForm({ ...branchForm, active: checked })}
                      />
                      <Label htmlFor="branch_active">{t.active}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="branch_main"
                        checked={branchForm.main_branch}
                        onCheckedChange={(checked) => setBranchForm({ ...branchForm, main_branch: checked })}
                      />
                      <Label htmlFor="branch_main">{t.mainBranch}</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t.cancel}</Button>
                  </DialogClose>
                  <Button 
                    className="gradient-success"
                    onClick={() => saveBranchMutation.mutate(branchForm)}
                    disabled={!branchForm.name || saveBranchMutation.isPending}
                  >
                    {saveBranchMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : t.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.branchCode}</TableHead>
                <TableHead>{t.branchName}</TableHead>
                <TableHead>{t.address}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{t.warehouses}</TableHead>
                <TableHead>{t.mainBranch}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-mono">{branch.code || '-'}</TableCell>
                  <TableCell className="font-medium">
                    {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{branch.address || '-'}</TableCell>
                  <TableCell dir="ltr">{branch.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getBranchWarehousesCount(branch.id)} {t.warehouses}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {branch.main_branch && <Badge className="bg-primary">{t.mainBranch}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={branch.active ? 'default' : 'secondary'}>
                      {branch.active ? t.active : t.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => editBranch(branch)}
                        disabled={saveBranchMutation.isPending}
                      >
                        <Edit size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            disabled={deleteBranchMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.deleteBranch}</AlertDialogTitle>
                            <AlertDialogDescription>{t.deleteWarning}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteBranchMutation.mutate(branch.id)}
                              disabled={deleteBranchMutation.isPending}
                            >
                              {deleteBranchMutation.isPending ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  {language === 'ar' ? 'جاري الحذف...' : 'Deleting...'}
                                </>
                              ) : t.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {branches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t.noBranches}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Warehouses Section */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Warehouse size={20} />
                {t.warehouses}
              </CardTitle>
              <CardDescription>{t.manageWarehouses}</CardDescription>
            </div>
            <Dialog open={warehouseDialogOpen} onOpenChange={(open) => {
                setWarehouseDialogOpen(open);
                if (!open) resetWarehouseForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gradient-success">
                    <Plus size={16} className="me-2" />
                  {t.addWarehouse}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{isEditingWarehouse ? t.editWarehouse : t.addWarehouse}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.warehouseName} *</Label>
                      <Input 
                        value={warehouseForm.name}
                        onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                        placeholder={t.warehouseName}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.warehouseNameAr}</Label>
                      <Input 
                        value={warehouseForm.name_ar}
                        onChange={(e) => setWarehouseForm({ ...warehouseForm, name_ar: e.target.value })}
                        placeholder={t.warehouseNameAr}
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.warehouseCode}</Label>
                      <Input 
                        value={warehouseForm.code}
                        onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                        placeholder="WH001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.phone}</Label>
                      <Input 
                        value={warehouseForm.phone}
                        onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                        placeholder={t.phone}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.address}</Label>
                    <Input 
                      value={warehouseForm.address}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                      placeholder={t.address}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.manager}</Label>
                    <Input 
                      value={warehouseForm.manager}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, manager: e.target.value })}
                      placeholder={t.manager}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.notes}</Label>
                    <Input 
                      value={warehouseForm.note}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, note: e.target.value })}
                      placeholder={t.notes}
                    />
                  </div>
                  
                  {/* Branch Selection */}
                  <div className="space-y-3">
                    <Label>{t.selectBranches}</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-[150px] overflow-y-auto">
                      {branches.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">{t.noBranches}</p>
                      ) : (
                        branches.map((branch) => (
                          <div key={branch.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`branch-${branch.id}`}
                              checked={warehouseForm.branch_id === branch.id}
                              onCheckedChange={() => toggleBranchSelection(branch.id)}
                            />
                            <Label htmlFor={`branch-${branch.id}`} className="cursor-pointer flex-1">
                              {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                              {branch.main_branch && (
                                <Badge variant="outline" className="ms-2 text-xs">{t.mainBranch}</Badge>
                              )}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="warehouse_active"
                        checked={warehouseForm.active}
                        onCheckedChange={(checked) => setWarehouseForm({ ...warehouseForm, active: checked })}
                      />
                      <Label htmlFor="warehouse_active">{t.active}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="warehouse_main"
                        checked={warehouseForm.main_branch}
                        onCheckedChange={(checked) => setWarehouseForm({ ...warehouseForm, main_branch: checked })}
                      />
                      <Label htmlFor="warehouse_main">{t.mainWarehouse}</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t.cancel}</Button>
                  </DialogClose>
                  <Button 
                    className="gradient-success"
                    onClick={() => saveWarehouseMutation.mutate(warehouseForm)}
                    disabled={!warehouseForm.name || saveWarehouseMutation.isPending}
                  >
                    {saveWarehouseMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : t.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.warehouseCode}</TableHead>
                <TableHead>{t.warehouseName}</TableHead>
                <TableHead>{t.linkedBranches}</TableHead>
                <TableHead>{t.address}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{t.mainWarehouse}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-mono">{warehouse.code || '-'}</TableCell>
                  <TableCell className="font-medium">
                    {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                  </TableCell>
                  <TableCell>
                    {getWarehouseBranchName(warehouse)}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{warehouse.address || '-'}</TableCell>
                  <TableCell dir="ltr">{warehouse.phone || '-'}</TableCell>
                  <TableCell>
                    {warehouse.main_branch && <Badge className="bg-primary">{t.mainWarehouse}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={warehouse.active ? 'default' : 'secondary'}>
                      {warehouse.active ? t.active : t.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => editWarehouse(warehouse)}
                        disabled={saveWarehouseMutation.isPending}
                      >
                        <Edit size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            disabled={deleteWarehouseMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.deleteWarehouse}</AlertDialogTitle>
                            <AlertDialogDescription>{t.deleteWarning}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteWarehouseMutation.mutate(warehouse.id)}
                              disabled={deleteWarehouseMutation.isPending}
                            >
                              {deleteWarehouseMutation.isPending ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  {language === 'ar' ? 'جاري الحذف...' : 'Deleting...'}
                                </>
                              ) : t.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {warehouses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t.noWarehouses}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchesWarehouses;