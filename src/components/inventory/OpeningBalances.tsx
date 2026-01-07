import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { 
  Wallet, 
  Plus, 
  Search,
  Save,
  Trash2,
  Edit,
  Upload,
  Download,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface ImportRow {
  product_sku: string;
  warehouse_name: string;
  quantity: number;
  unit_cost: number;
  notes?: string;
}

const OpeningBalances = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [addBalanceOpen, setAddBalanceOpen] = useState(false);
  const [editBalanceOpen, setEditBalanceOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    quantity: 0,
    unit_cost: 0,
    notes: ''
  });

  // Import/Export state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const t = {
    en: {
      title: 'Opening Balances',
      description: 'Set initial stock quantities and values',
      addBalance: 'Add Balance',
      product: 'Product',
      selectProduct: 'Select Product',
      warehouse: 'Warehouse',
      selectWarehouse: 'Select Warehouse',
      allWarehouses: 'All Warehouses',
      quantity: 'Quantity',
      unitCost: 'Unit Cost',
      totalValue: 'Total Value',
      date: 'Date',
      notes: 'Notes',
      actions: 'Actions',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      noData: 'No opening balances found',
      balanceAdded: 'Opening balance added',
      balanceUpdated: 'Opening balance updated',
      balanceDeleted: 'Opening balance deleted',
      search: 'Search products...',
      sku: 'SKU',
      import: 'Import',
      export: 'Export',
      downloadTemplate: 'Download Template',
      startImport: 'Start Import',
      importSuccess: 'Balances imported successfully',
      importError: 'Error importing balances',
      dragDrop: 'Drag & drop Excel file here, or click to browse',
      supportedFormats: 'Supported formats: .xlsx, .xls',
      preview: 'Preview',
      rowsToImport: 'Rows to Import',
      errors: 'Errors',
      exportSuccess: 'Data exported successfully',
      productSku: 'Product SKU',
      warehouseName: 'Warehouse Name'
    },
    ar: {
      title: 'رصيد أول المدة',
      description: 'تحديد الكميات والقيم الافتتاحية للمخزون',
      addBalance: 'إضافة رصيد',
      product: 'المنتج',
      selectProduct: 'اختر المنتج',
      warehouse: 'المخزن',
      selectWarehouse: 'اختر المخزن',
      allWarehouses: 'جميع المخازن',
      quantity: 'الكمية',
      unitCost: 'تكلفة الوحدة',
      totalValue: 'القيمة الإجمالية',
      date: 'التاريخ',
      notes: 'ملاحظات',
      actions: 'الإجراءات',
      save: 'حفظ',
      cancel: 'إلغاء',
      edit: 'تعديل',
      delete: 'حذف',
      noData: 'لا توجد أرصدة افتتاحية',
      balanceAdded: 'تم إضافة الرصيد الافتتاحي',
      balanceUpdated: 'تم تحديث الرصيد الافتتاحي',
      balanceDeleted: 'تم حذف الرصيد الافتتاحي',
      search: 'بحث في المنتجات...',
      sku: 'رمز المنتج',
      import: 'استيراد',
      export: 'تصدير',
      downloadTemplate: 'تحميل النموذج',
      startImport: 'بدء الاستيراد',
      importSuccess: 'تم استيراد الأرصدة بنجاح',
      importError: 'خطأ في استيراد الأرصدة',
      dragDrop: 'اسحب وأفلت ملف Excel هنا، أو انقر للاستعراض',
      supportedFormats: 'الصيغ المدعومة: .xlsx, .xls',
      preview: 'معاينة',
      rowsToImport: 'صفوف للاستيراد',
      errors: 'الأخطاء',
      exportSuccess: 'تم تصدير البيانات بنجاح',
      productSku: 'رمز المنتج',
      warehouseName: 'اسم المخزن'
    }
  }[language];

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch opening balances
  const { data: balances = [] } = useQuery({
    queryKey: ['opening-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opening_balances')
        .select('*, products(name, name_ar, sku), warehouses(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Add balance mutation
  const addBalanceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('opening_balances')
        .insert({
          product_id: formData.product_id,
          warehouse_id: formData.warehouse_id,
          quantity: formData.quantity,
          unit_cost: formData.unit_cost,
          notes: formData.notes || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      toast({ title: t.balanceAdded });
      setAddBalanceOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ 
        title: language === 'ar' ? 'خطأ في إضافة الرصيد' : 'Error adding balance', 
        variant: 'destructive' 
      });
    }
  });

  // Update balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('opening_balances')
        .update({
          quantity: formData.quantity,
          unit_cost: formData.unit_cost,
          notes: formData.notes || null
        })
        .eq('id', selectedBalance.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      toast({ title: t.balanceUpdated });
      setEditBalanceOpen(false);
      setSelectedBalance(null);
      resetForm();
    }
  });

  // Delete balance mutation
  const deleteBalanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('opening_balances').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      toast({ title: t.balanceDeleted });
    }
  });

  const resetForm = () => {
    setFormData({
      product_id: '',
      warehouse_id: '',
      quantity: 0,
      unit_cost: 0,
      notes: ''
    });
  };

  const handleEdit = (balance: any) => {
    setSelectedBalance(balance);
    setFormData({
      product_id: balance.product_id,
      warehouse_id: balance.warehouse_id,
      quantity: balance.quantity,
      unit_cost: Number(balance.unit_cost),
      notes: balance.notes || ''
    });
    setEditBalanceOpen(true);
  };

  const filteredBalances = useMemo(() => {
    let filtered = balances;
    
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(b => b.warehouse_id === warehouseFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.products?.name?.toLowerCase().includes(query) ||
        b.products?.name_ar?.includes(query) ||
        b.products?.sku?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [balances, warehouseFilter, searchQuery]);

  const totalValue = filteredBalances.reduce((sum, b) => sum + Number(b.total_value || 0), 0);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      setIsImporting(true);
      setImportProgress(0);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        try {
          // Find product by SKU
          const product = products.find(p => p.sku.toLowerCase() === row.product_sku.toLowerCase());
          if (!product) {
            failCount++;
            errors.push(`Row ${i + 1}: Product SKU "${row.product_sku}" not found`);
            continue;
          }

          // Find warehouse by name
          const warehouse = warehouses.find(w => 
            w.name.toLowerCase() === row.warehouse_name.toLowerCase() ||
            w.name_ar?.toLowerCase() === row.warehouse_name.toLowerCase()
          );
          if (!warehouse) {
            failCount++;
            errors.push(`Row ${i + 1}: Warehouse "${row.warehouse_name}" not found`);
            continue;
          }

          const { error } = await supabase
            .from('opening_balances')
            .insert({
              product_id: product.id,
              warehouse_id: warehouse.id,
              quantity: row.quantity,
              unit_cost: row.unit_cost,
              notes: row.notes || null
            });

          if (error) {
            failCount++;
            errors.push(`Row ${i + 1}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          failCount++;
          errors.push(`Row ${i + 1}: ${err.message}`);
        }

        setImportProgress(Math.round(((i + 1) / importData.length) * 100));
      }

      return { successCount, failCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      toast({
        title: t.importSuccess,
        description: `${result.successCount} ${language === 'ar' ? 'ناجح' : 'successful'}, ${result.failCount} ${language === 'ar' ? 'فاشل' : 'failed'}`
      });
      setImportData([]);
      setImportErrors(result.errors);
      setIsImporting(false);
      if (result.errors.length === 0) {
        setShowImportDialog(false);
      }
    },
    onError: () => {
      toast({ title: t.importError, variant: 'destructive' });
      setIsImporting(false);
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

        const validData: ImportRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          if (!row.product_sku || !row.warehouse_name) {
            errors.push(`Row ${index + 2}: Missing required fields (product_sku, warehouse_name)`);
          } else if (row.quantity === undefined || row.unit_cost === undefined) {
            errors.push(`Row ${index + 2}: Missing quantity or unit_cost`);
          } else {
            validData.push({
              product_sku: String(row.product_sku),
              warehouse_name: String(row.warehouse_name),
              quantity: Number(row.quantity) || 0,
              unit_cost: Number(row.unit_cost) || 0,
              notes: row.notes ? String(row.notes) : undefined
            });
          }
        });

        setImportData(validData);
        setImportErrors(errors);

        if (errors.length > 0) {
          toast({
            title: language === 'ar' ? 'تم العثور على أخطاء' : 'Errors found',
            description: `${errors.length} ${language === 'ar' ? 'صف به مشاكل' : 'rows with issues'}`,
            variant: 'destructive'
          });
        }
      } catch (err) {
        toast({ title: language === 'ar' ? 'صيغة الملف غير صالحة' : 'Invalid file format', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        product_sku: 'SKU-001',
        warehouse_name: 'Main Warehouse',
        quantity: 100,
        unit_cost: 50,
        notes: 'Initial stock'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Opening Balances');
    XLSX.writeFile(wb, 'opening_balances_template.xlsx');
  };

  const exportData = () => {
    const exportRows = filteredBalances.map(b => ({
      product_name: language === 'ar' ? b.products?.name_ar || b.products?.name : b.products?.name,
      product_sku: b.products?.sku,
      warehouse_name: language === 'ar' ? b.warehouses?.name_ar || b.warehouses?.name : b.warehouses?.name,
      quantity: b.quantity,
      unit_cost: Number(b.unit_cost),
      total_value: Number(b.total_value),
      balance_date: b.balance_date,
      notes: b.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Opening Balances');
    XLSX.writeFile(wb, `opening_balances_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: t.exportSuccess });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload size={16} className="me-2" />
            {t.import}
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download size={16} className="me-2" />
            {t.export}
          </Button>
          <Button onClick={() => setAddBalanceOpen(true)}>
            <Plus size={16} className="me-2" />
            {t.addBalance}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Wallet className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.totalValue}</p>
              <p className="text-2xl font-bold">{totalValue.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allWarehouses}</SelectItem>
            {warehouses.map(w => (
              <SelectItem key={w.id} value={w.id}>
                {language === 'ar' ? w.name_ar || w.name : w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Balances Table */}
      <Card className="card-elevated">
        <CardHeader className="border-b">
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t.product}</TableHead>
                    <TableHead className="min-w-[100px]">{t.sku}</TableHead>
                    <TableHead className="min-w-[150px]">{t.warehouse}</TableHead>
                    <TableHead className="min-w-[100px]">{t.quantity}</TableHead>
                    <TableHead className="min-w-[100px]">{t.unitCost}</TableHead>
                    <TableHead className="min-w-[120px]">{t.totalValue}</TableHead>
                    <TableHead className="min-w-[120px]">{t.date}</TableHead>
                    <TableHead className="min-w-[120px]">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBalances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBalances.map(balance => (
                      <TableRow key={balance.id}>
                        <TableCell className="font-medium">
                          {language === 'ar' 
                            ? balance.products?.name_ar || balance.products?.name
                            : balance.products?.name
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {balance.products?.sku}
                        </TableCell>
                        <TableCell>
                          {language === 'ar' 
                            ? balance.warehouses?.name_ar || balance.warehouses?.name
                            : balance.warehouses?.name
                          }
                        </TableCell>
                        <TableCell className="font-semibold">{balance.quantity}</TableCell>
                        <TableCell>{Number(balance.unit_cost).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">
                          {Number(balance.total_value).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(balance.balance_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(balance)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteBalanceMutation.mutate(balance.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Balance Dialog */}
      <Dialog open={addBalanceOpen} onOpenChange={setAddBalanceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.addBalance}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.product}</Label>
              <Select 
                value={formData.product_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, product_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectProduct} />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {language === 'ar' ? p.name_ar || p.name : p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.warehouse}</Label>
              <Select 
                value={formData.warehouse_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, warehouse_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectWarehouse} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {language === 'ar' ? w.name_ar || w.name : w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.quantity}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>{t.unitCost}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>{t.notes}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddBalanceOpen(false); resetForm(); }}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => addBalanceMutation.mutate()}
              disabled={!formData.product_id || !formData.warehouse_id || addBalanceMutation.isPending}
            >
              <Save size={16} className="me-2" />
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Balance Dialog */}
      <Dialog open={editBalanceOpen} onOpenChange={setEditBalanceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.quantity}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>{t.unitCost}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>{t.notes}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditBalanceOpen(false); setSelectedBalance(null); resetForm(); }}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => updateBalanceMutation.mutate()}
              disabled={updateBalanceMutation.isPending}
            >
              <Save size={16} className="me-2" />
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={20} />
              {t.import}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Download Template */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download size={16} className="me-2" />
                {t.downloadTemplate}
              </Button>
            </div>

            {/* Upload Area */}
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-lg font-medium mb-2">{t.dragDrop}</p>
              <p className="text-sm text-muted-foreground">{t.supportedFormats}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Preview */}
            {importData.length > 0 && (
              <Card>
                <CardHeader className="border-b py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.preview}</CardTitle>
                    <Badge variant="secondary">
                      {t.rowsToImport}: {importData.length}
                    </Badge>
                  </div>
                  {isImporting && (
                    <Progress value={importProgress} className="mt-2" />
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px] w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.productSku}</TableHead>
                          <TableHead>{t.warehouseName}</TableHead>
                          <TableHead>{t.quantity}</TableHead>
                          <TableHead>{t.unitCost}</TableHead>
                          <TableHead>{t.notes}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importData.slice(0, 20).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.product_sku}</TableCell>
                            <TableCell>{row.warehouse_name}</TableCell>
                            <TableCell>{row.quantity}</TableCell>
                            <TableCell>{row.unit_cost}</TableCell>
                            <TableCell>{row.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Errors */}
            {importErrors.length > 0 && (
              <Card className="border-amber-500/50">
                <CardHeader className="border-b py-3">
                  <CardTitle className="flex items-center gap-2 text-amber-500 text-base">
                    <AlertTriangle size={16} />
                    {t.errors} ({importErrors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[100px]">
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {importErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportData([]); setImportErrors([]); }}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importData.length === 0 || isImporting}
            >
              {isImporting ? (
                <RefreshCw className="animate-spin me-2" size={16} />
              ) : (
                <Upload size={16} className="me-2" />
              )}
              {t.startImport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpeningBalances;
