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
import { supabase } from '@/integrations/supabase/client';
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

interface Branch {
  id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  address: string | null;
  phone: string | null;
  manager_name: string | null;
  is_active: boolean | null;
  is_main: boolean | null;
}

interface WarehouseType {
  id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  address: string | null;
  phone: string | null;
  manager_name: string | null;
  is_active: boolean | null;
  is_main: boolean | null;
  notes: string | null;
}

interface BranchWarehouse {
  branch_id: string;
  warehouse_id: string;
  is_primary: boolean;
}

const BranchesWarehouses = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  // Branch form state
  const [branchForm, setBranchForm] = useState({
    id: '',
    name: '',
    name_ar: '',
    code: '',
    address: '',
    phone: '',
    manager_name: '',
    is_active: true,
    is_main: false
  });
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);

  // Warehouse form state
  const [warehouseForm, setWarehouseForm] = useState({
    id: '',
    name: '',
    name_ar: '',
    code: '',
    address: '',
    phone: '',
    manager_name: '',
    is_active: true,
    is_main: false,
    notes: '',
    branch_ids: [] as string[]
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
      createWarehousesForBranches: 'إنشاء مخازن لجميع الفروع',
      warehousesCreated: 'تم إنشاء المخازن بنجاح',
      creatingWarehouses: 'جاري إنشاء المخازن...'
    }
  }[language];

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('is_main', { ascending: false });
      if (error) throw error;
      return data as Branch[];
    }
  });

  // Fetch warehouses with their linked branches
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as WarehouseType[];
    }
  });

  // Fetch branch-warehouse relationships
  const { data: branchWarehouses = [] } = useQuery({
    queryKey: ['branch-warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branch_warehouses').select('*');
      if (error) throw error;
      return data as BranchWarehouse[];
    }
  });

  // Branch mutations
  const saveBranchMutation = useMutation({
    mutationFn: async (branch: typeof branchForm) => {
      if (branch.id) {
        const { error } = await supabase.from('branches').update({
          name: branch.name,
          name_ar: branch.name_ar || null,
          code: branch.code || null,
          address: branch.address || null,
          phone: branch.phone || null,
          manager_name: branch.manager_name || null,
          is_active: branch.is_active,
          is_main: branch.is_main
        }).eq('id', branch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('branches').insert({
          name: branch.name,
          name_ar: branch.name_ar || null,
          code: branch.code || null,
          address: branch.address || null,
          phone: branch.phone || null,
          manager_name: branch.manager_name || null,
          is_active: branch.is_active,
          is_main: branch.is_main
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
      resetBranchForm();
      setBranchDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في الحفظ' : 'Error saving', variant: 'destructive' });
    }
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branch-warehouses'] });
      toast({ title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في الحذف' : 'Error deleting', variant: 'destructive' });
    }
  });

  // Warehouse mutations
  const saveWarehouseMutation = useMutation({
    mutationFn: async (warehouse: typeof warehouseForm) => {
      let warehouseId = warehouse.id;
      
      if (warehouse.id) {
        const { error } = await supabase.from('warehouses').update({
          name: warehouse.name,
          name_ar: warehouse.name_ar || null,
          code: warehouse.code || null,
          address: warehouse.address || null,
          phone: warehouse.phone || null,
          manager_name: warehouse.manager_name || null,
          is_active: warehouse.is_active,
          is_main: warehouse.is_main,
          notes: warehouse.notes || null
        }).eq('id', warehouse.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('warehouses').insert({
          name: warehouse.name,
          name_ar: warehouse.name_ar || null,
          code: warehouse.code || null,
          address: warehouse.address || null,
          phone: warehouse.phone || null,
          manager_name: warehouse.manager_name || null,
          is_active: warehouse.is_active,
          is_main: warehouse.is_main,
          notes: warehouse.notes || null
        }).select('id').single();
        if (error) throw error;
        warehouseId = data.id;
      }

      // Update branch-warehouse relationships
      await supabase.from('branch_warehouses').delete().eq('warehouse_id', warehouseId);
      
      if (warehouse.branch_ids.length > 0) {
        const relationships = warehouse.branch_ids.map((branchId, index) => ({
          branch_id: branchId,
          warehouse_id: warehouseId,
          is_primary: index === 0
        }));
        const { error } = await supabase.from('branch_warehouses').insert(relationships);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['branch-warehouses'] });
      toast({ title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
      resetWarehouseForm();
      setWarehouseDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في الحفظ' : 'Error saving', variant: 'destructive' });
    }
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['branch-warehouses'] });
      toast({ title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في الحذف' : 'Error deleting', variant: 'destructive' });
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
      id: '',
      name: '',
      name_ar: '',
      code: '',
      address: '',
      phone: '',
      manager_name: '',
      is_active: true,
      is_main: false
    });
    setIsEditingBranch(false);
  };

  const resetWarehouseForm = () => {
    setWarehouseForm({
      id: '',
      name: '',
      name_ar: '',
      code: '',
      address: '',
      phone: '',
      manager_name: '',
      is_active: true,
      is_main: false,
      notes: '',
      branch_ids: []
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
      manager_name: branch.manager_name || '',
      is_active: branch.is_active ?? true,
      is_main: branch.is_main ?? false
    });
    setIsEditingBranch(true);
    setBranchDialogOpen(true);
  };

  const editWarehouse = (warehouse: WarehouseType) => {
    const linkedBranchIds = branchWarehouses
      .filter(bw => bw.warehouse_id === warehouse.id)
      .map(bw => bw.branch_id);

    setWarehouseForm({
      id: warehouse.id,
      name: warehouse.name,
      name_ar: warehouse.name_ar || '',
      code: warehouse.code || '',
      address: warehouse.address || '',
      phone: warehouse.phone || '',
      manager_name: warehouse.manager_name || '',
      is_active: warehouse.is_active ?? true,
      is_main: warehouse.is_main ?? false,
      notes: warehouse.notes || '',
      branch_ids: linkedBranchIds
    });
    setIsEditingWarehouse(true);
    setWarehouseDialogOpen(true);
  };

  const getWarehouseBranches = (warehouseId: string) => {
    const branchIds = branchWarehouses
      .filter(bw => bw.warehouse_id === warehouseId)
      .map(bw => bw.branch_id);
    return branches.filter(b => branchIds.includes(b.id));
  };

  const getBranchWarehouses = (branchId: string) => {
    const warehouseIds = branchWarehouses
      .filter(bw => bw.branch_id === branchId)
      .map(bw => bw.warehouse_id);
    return warehouses.filter(w => warehouseIds.includes(w.id));
  };

  const toggleBranchSelection = (branchId: string) => {
    setWarehouseForm(prev => ({
      ...prev,
      branch_ids: prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId]
    }));
  };

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
                      value={branchForm.manager_name}
                      onChange={(e) => setBranchForm({ ...branchForm, manager_name: e.target.value })}
                      placeholder={t.manager}
                    />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="branch_active"
                        checked={branchForm.is_active}
                        onCheckedChange={(checked) => setBranchForm({ ...branchForm, is_active: checked })}
                      />
                      <Label htmlFor="branch_active">{t.active}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="branch_main"
                        checked={branchForm.is_main}
                        onCheckedChange={(checked) => setBranchForm({ ...branchForm, is_main: checked })}
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
                    {t.save}
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
                    <div className="flex flex-wrap gap-1">
                      {getBranchWarehouses(branch.id).slice(0, 2).map(w => (
                        <Badge key={w.id} variant="outline" className="text-xs">
                          {language === 'ar' ? w.name_ar || w.name : w.name}
                        </Badge>
                      ))}
                      {getBranchWarehouses(branch.id).length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{getBranchWarehouses(branch.id).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {branch.is_main && <Badge className="bg-primary">{t.mainBranch}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                      {branch.is_active ? t.active : t.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => editBranch(branch)}>
                        <Edit size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
                            >
                              {t.delete}
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
            <div className="flex items-center gap-2">
              {/* Create Warehouses for All Branches Button */}
              <Button 
                variant="outline"
                onClick={() => createWarehousesForBranchesMutation.mutate()}
                disabled={createWarehousesForBranchesMutation.isPending || branches.length === 0}
              >
                {createWarehousesForBranchesMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 me-2 border-2 border-current border-t-transparent rounded-full" />
                    {t.creatingWarehouses}
                  </>
                ) : (
                  <>
                    <Store size={16} className="me-2" />
                    {t.createWarehousesForBranches}
                  </>
                )}
              </Button>
              
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
                      value={warehouseForm.manager_name}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, manager_name: e.target.value })}
                      placeholder={t.manager}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.notes}</Label>
                    <Input 
                      value={warehouseForm.notes}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, notes: e.target.value })}
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
                              checked={warehouseForm.branch_ids.includes(branch.id)}
                              onCheckedChange={() => toggleBranchSelection(branch.id)}
                            />
                            <Label htmlFor={`branch-${branch.id}`} className="cursor-pointer flex-1">
                              {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                              {branch.is_main && (
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
                        checked={warehouseForm.is_active}
                        onCheckedChange={(checked) => setWarehouseForm({ ...warehouseForm, is_active: checked })}
                      />
                      <Label htmlFor="warehouse_active">{t.active}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        id="warehouse_main"
                        checked={warehouseForm.is_main}
                        onCheckedChange={(checked) => setWarehouseForm({ ...warehouseForm, is_main: checked })}
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
                    {t.save}
                  </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
                    <div className="flex flex-wrap gap-1">
                      {getWarehouseBranches(warehouse.id).slice(0, 2).map(b => (
                        <Badge key={b.id} variant="outline" className="text-xs">
                          {language === 'ar' ? b.name_ar || b.name : b.name}
                        </Badge>
                      ))}
                      {getWarehouseBranches(warehouse.id).length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{getWarehouseBranches(warehouse.id).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{warehouse.address || '-'}</TableCell>
                  <TableCell dir="ltr">{warehouse.phone || '-'}</TableCell>
                  <TableCell>
                    {warehouse.is_main && <Badge className="bg-primary">{t.mainWarehouse}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                      {warehouse.is_active ? t.active : t.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => editWarehouse(warehouse)}>
                        <Edit size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
                            >
                              {t.delete}
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
