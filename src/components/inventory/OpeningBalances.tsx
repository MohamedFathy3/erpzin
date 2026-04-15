// components/inventory/OpeningBalances.tsx
import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Plus, Trash2, Loader2, Upload, Download, X, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import AddProductWithBalance from './AddProductWithBalance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import * as XLSX from 'xlsx';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  cost: number;
  stock?: number;
}

interface ImportResponse {
  success: boolean;
  status?: boolean;
  imported_count?: number;
  failed_count?: number;
  message?: string;
  errors?: Array<{ row: number; error: string }>;
}

const OpeningBalances: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب المنتجات اللي ليها رصيد
  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ['products-with-balance'],
    queryFn: async () => {
      const response = await api.post('/product/index', {
        filters: { 
          beginning_balance: true,
        },
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 100,
        paginate: false
      });
      const allProducts = response.data?.data || [];
      return allProducts.filter(p => p.stock && p.stock > 0);
    }
  });

  // ✅ دالة تصدير البيانات إلى Excel
  const handleExport = () => {
    if (products.length === 0) {
      toast({
        title: language === 'ar' ? 'لا توجد بيانات' : 'No data',
        description: language === 'ar' ? 'لا توجد بضاعة أول مدة للتصدير' : 'No opening balances to export',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);
    try {
      // تحويل البيانات إلى صيغة مناسبة للتصدير
      const exportData = products.map(product => ({
        [language === 'ar' ? 'معرف المنتج' : 'Product ID']: product.id,
        [language === 'ar' ? 'اسم المنتج' : 'Product Name']: language === 'ar' ? (product.name_ar || product.name) : product.name,
        [language === 'ar' ? 'SKU' : 'SKU']: product.sku,
        [language === 'ar' ? 'الكمية' : 'Quantity']: product.stock || 0,
        [language === 'ar' ? 'سعر التكلفة' : 'Cost Price']: product.cost,
        [language === 'ar' ? 'القيمة الإجمالية' : 'Total Value']: (product.stock || 0) * product.cost,
      }));

      // إنشاء ورقة عمل
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // ضبط عرض الأعمدة
      const colWidths = [
        { wch: 15 },  // ID
        { wch: 30 },  // Name
        { wch: 20 },  // SKU
        { wch: 12 },  // Quantity
        { wch: 15 },  // Cost Price
        { wch: 18 },  // Total Value
      ];
      ws['!cols'] = colWidths;

      // إنشاء المصنف
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances');
      
      // تصدير الملف
      XLSX.writeFile(wb, `opening_balances_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: language === 'ar' ? 'تم التصدير بنجاح' : 'Export successful',
        description: language === 'ar' 
          ? `تم تصدير ${products.length} صنف`
          : `Exported ${products.length} items`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: language === 'ar' ? 'خطأ في التصدير' : 'Export error',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // حذف الرصيد
  const deleteBalanceMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await api.delete('/product/delete', {
        data:{items: [productId]},
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ 
        title: language === 'ar' ? 'تم حذف الرصيد بنجاح' : 'Balance deleted successfully',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: language === 'ar' ? 'حدث خطأ' : 'Error', 
        description: error.response?.data?.message || error.message, 
        variant: 'destructive' 
      });
    }
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });
      return response.data;
    },
    onSuccess: (data: ImportResponse) => {
      if (data.status === true || data.success === true) {
        toast({
          title: language === 'ar' ? 'تم الاستيراد بنجاح' : 'Import successful',
          description: data.message || (language === 'ar' 
            ? 'تم استيراد المنتجات بنجاح'
            : 'Products imported successfully'),
        });
        
        refetch();
        handleCloseImportDialog();
      } else {
        toast({
          title: language === 'ar' ? 'فشل الاستيراد' : 'Import failed',
          description: data.message || (language === 'ar' ? 'حدث خطأ أثناء الاستيراد' : 'Error during import'),
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      toast({
        title: language === 'ar' ? 'حدث خطأ أثناء الاستيراد' : 'Error during import',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
      handleCloseImportDialog();
    },
  });

  const handleDelete = (product: Product) => {
    if (window.confirm(
      language === 'ar' 
        ? `هل أنت متأكد من حذف رصيد المنتج ${product.name_ar || product.name}؟` 
        : `Are you sure you want to delete balance for ${product.name}?`
    )) {
      deleteBalanceMutation.mutate(product.id);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.oasis.opendocument.spreadsheet'
      ];
      
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|ods)$/i)) {
        toast({
          title: language === 'ar' ? 'نوع ملف غير صالح' : 'Invalid file type',
          description: language === 'ar' 
            ? 'يرجى اختيار ملف Excel بصيغة .xlsx, .xls, أو .ods'
            : 'Please select an Excel file (.xlsx, .xls, or .ods)',
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      setUploadProgress(0);
      importMutation.mutate(selectedFile);
    }
  };

  const handleOpenImportDialog = () => {
    setShowImportDialog(true);
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        [language === 'ar' ? 'اسم المنتج' : 'Product Name']: 'Example Product',
        [language === 'ar' ? 'SKU' : 'SKU']: 'PRD-001',
        [language === 'ar' ? 'الكمية' : 'Quantity']: 100,
        [language === 'ar' ? 'سعر التكلفة' : 'Cost Price']: 50,
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'opening_balances_template.xlsx');
    
    toast({
      title: language === 'ar' ? 'تم تحميل القالب' : 'Template downloaded',
    });
  };

  const t = {
    title: language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances',
    description: language === 'ar' ? 'المنتجات التي لها رصيد أول مدة' : 'Products with opening balance',
    product: language === 'ar' ? 'المنتج' : 'Product',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    costPrice: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    actions: language === 'ar' ? 'إجراءات' : 'Actions',
    add: language === 'ar' ? 'إضافة رصيد' : 'Add Balance',
    import: language === 'ar' ? 'استيراد من Excel' : 'Import from Excel',
    export: language === 'ar' ? 'تصدير إلى Excel' : 'Export to Excel',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    noData: language === 'ar' ? 'لا توجد منتجات لها رصيد أول مدة' : 'No products with opening balance',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    importTitle: language === 'ar' ? 'استيراد رصيد أول المدة' : 'Import Opening Balances',
    importDescription: language === 'ar' 
      ? 'اختر ملف Excel يحتوي على بيانات الرصيد الافتتاحي'
      : 'Select an Excel file containing opening balance data',
    selectFile: language === 'ar' ? 'اختر الملف' : 'Select File',
    downloadTemplate: language === 'ar' ? 'تحميل القالب' : 'Download Template',
    importNow: language === 'ar' ? 'استيراد الآن' : 'Import Now',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    fileSelected: language === 'ar' ? 'تم اختيار الملف' : 'File selected',
    uploading: language === 'ar' ? 'جاري الرفع...' : 'Uploading...',
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="text-emerald-500" size={20} />
                {t.title}
              </CardTitle>
              <CardDescription className="mt-1">{t.description}</CardDescription>
            </div>
            <div className="flex gap-2">
              {/* ✅ زر التصدير */}
              <Button 
                onClick={handleExport} 
                variant="outline"
                className="gap-2"
                disabled={isExporting || products.length === 0}
              >
                {isExporting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={16} />
                )}
                {t.export}
              </Button>
              <Button 
                onClick={handleOpenImportDialog} 
                variant="outline"
                className="gap-2"
              >
                <Upload size={16} />
                {t.import}
              </Button>
              <Button 
                onClick={() => setShowAddForm(true)} 
                className="gap-2"
              >
                <Plus size={16} />
                {t.add}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.product}</TableHead>
                  <TableHead className="text-right">{t.quantity}</TableHead>
                  <TableHead className="text-right">{t.costPrice}</TableHead>
                  <TableHead className="text-right">{t.total}</TableHead>
                  <TableHead className="text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="animate-spin mx-auto" size={24} />
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Package className="mx-auto h-12 w-12 mb-3 opacity-20" />
                      <p>{t.noData}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div>{language === 'ar' && product.name_ar ? product.name_ar : product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{product.stock}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(product.cost)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency((product.stock || 0) * product.cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(product)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Product Form Modal */}
      <AddProductWithBalance
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={() => refetch()}
      />

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={handleCloseImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload size={18} className="text-emerald-500" />
              {t.importTitle}
            </DialogTitle>
            <CardDescription>{t.importDescription}</CardDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Download Template Button */}
            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate}
              className="w-full gap-2"
            >
              <Download size={16} />
              {t.downloadTemplate}
            </Button>

            {/* File Input */}
            <div className="space-y-2">
              <Label>{t.selectFile}</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.ods"
                onChange={handleFileSelect}
                disabled={importMutation.isPending}
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Package size={14} />
                  <span>{t.fileSelected}: {selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={importMutation.isPending}
                  >
                    <X size={14} />
                  </Button>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {importMutation.isPending && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t.uploading}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCloseImportDialog}
              disabled={importMutation.isPending}
            >
              {t.cancel}
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              className="gap-2"
            >
              {importMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Upload size={16} />
              )}
              {t.importNow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OpeningBalances;