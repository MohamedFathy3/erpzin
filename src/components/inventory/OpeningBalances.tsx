// components/inventory/OpeningBalances.tsx
import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Plus, Trash2, Loader2, Upload, Download, X } from 'lucide-react';
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
  imported_count?: number;
  failed_count?: number;
  errors?: Array<{ row: number; error: string }>;
}

const OpeningBalances: React.FC = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب المنتجات اللي ليها رصيد
  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ['products-with-balance'],
    queryFn: async () => {
      const response = await api.post('/product/index', {
        filters: { 
          active: true
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

  // استيراد من Excel
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
      if (data.success) {
        toast({
          title: language === 'ar' ? 'تم الاستيراد بنجاح' : 'Import successful',
          description: language === 'ar'
            ? `تم استيراد ${data.imported_count || 0} منتج بنجاح`
            : `Successfully imported ${data.imported_count || 0} products`,
        });
        
        // عرض الأخطاء إن وجدت
        if (data.errors && data.errors.length > 0) {
          console.error('Import errors:', data.errors);
          toast({
            title: language === 'ar' ? 'بعض المنتجات لم تستورد' : 'Some products failed to import',
            description: `${data.errors.length} ${language === 'ar' ? 'خطأ' : 'errors'} occurred`,
            variant: 'destructive',
          });
        }
        
        refetch();
        handleCloseImportDialog();
      } else {
        toast({
          title: language === 'ar' ? 'فشل الاستيراد' : 'Import failed',
          description: data.errors?.[0]?.error || 'Unknown error',
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
      // التحقق من نوع الملف
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
    // يمكن إضافة رابط لتحميل القالب
    const templateLink = '/templates/opening_balances_template.xlsx';
    window.open(templateLink, '_blank');
    
    toast({
      title: language === 'ar' ? 'جاري تحميل القالب' : 'Downloading template',
      description: language === 'ar'
        ? 'سيتم تحميل قالب Excel للرصيد الافتتاحي'
        : 'Excel template for opening balances will be downloaded',
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
                      <TableCell className="text-right font-mono">{Number(product.cost).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {(Number(product.stock) * Number(product.cost)).toFixed(2)}
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