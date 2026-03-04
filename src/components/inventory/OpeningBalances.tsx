import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { 
  Wallet, 
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  Eye,
  X
} from 'lucide-react';
import api from '@/lib/api';

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  description?: string;
  sku: string;
  barcode?: string;
  beginning_balance: number;
  stock: number;
  reorder_level: number;
  price: string;
  cost: string;
  active: boolean;
}

const OpeningBalances = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const t = {
    en: {
      title: 'Product Opening Balances',
      description: 'View and manage initial stock quantities for products',
      product: 'Product',
      quantity: 'Opening Balance',
      unitCost: 'Cost',
      totalValue: 'Total Value',
      noData: 'No products found',
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
      productName: 'Product Name',
      currentStock: 'Current Stock',
      fileSelected: 'File selected',
      clearFile: 'Clear file',
      processing: 'Processing...',
      importNote: 'Upload Excel file with SKU, beginning_balance, and cost columns'
    },
    ar: {
      title: 'أرصدة المنتجات الافتتاحية',
      description: 'عرض وإدارة الكميات الافتتاحية للمنتجات',
      product: 'المنتج',
      quantity: 'الرصيد الافتتاحي',
      unitCost: 'التكلفة',
      totalValue: 'القيمة الإجمالية',
      noData: 'لا توجد منتجات',
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
      productName: 'اسم المنتج',
      currentStock: 'المخزون الحالي',
      fileSelected: 'تم اختيار ملف',
      clearFile: 'مسح الملف',
      processing: 'جاري المعالجة...',
      importNote: 'رفع ملف Excel يحتوي على أعمدة SKU, beginning_balance, cost'
    }
  }[language];

  // ========== FETCH PRODUCTS ==========
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products-for-balance'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: { active: true,
            beginning_balance:true
           },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب المنتجات' : 'Error fetching products',
          variant: 'destructive'
        });
        return [];
      }
    }
  });

  // ========== FILTER PRODUCTS ==========
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => {
      const name = language === 'ar' 
        ? product.name_ar || product.name 
        : product.name;
      return name.toLowerCase().includes(query) || 
             product.sku.toLowerCase().includes(query);
    });
  }, [products, searchQuery, language]);

  // ========== CALCULATE TOTAL VALUE ==========
  const totalValue = useMemo(() => {
    return products.reduce((sum, product) => {
      return sum + (product.beginning_balance * Number(product.cost));
    }, 0);
  }, [products]);

  // ========== IMPORT MUTATION ==========
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected');
      
      setIsImporting(true);
      setImportProgress(30);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await api.post('/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setImportProgress(percentCompleted);
          }
        },
      });
      
      setImportProgress(100);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products-for-balance'] });
      
      toast({
        title: t.importSuccess,
        description: data.message || 'Products updated successfully',
      });
      
      // Reset import state
      setSelectedFile(null);
      setPreviewData([]);
      setImportErrors([]);
      setShowImportDialog(false);
      setIsImporting(false);
      setImportProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: any) => {
      toast({ 
        title: t.importError, 
        description: error.message,
        variant: 'destructive' 
      });
      setIsImporting(false);
      setImportProgress(0);
    }
  });

  // ========== HANDLE FILE UPLOAD ==========
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Read and preview file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Preview first 5 rows
        setPreviewData(jsonData.slice(0, 5));
        
        // Validate basic structure
        const errors: string[] = [];
        jsonData.forEach((row: any, index) => {
          if (!row.sku) {
            errors.push(`Row ${index + 2}: Missing SKU`);
          }
        });
        
        setImportErrors(errors);
      } catch (err) {
        toast({ 
          title: language === 'ar' ? 'صيغة الملف غير صالحة' : 'Invalid file format', 
          variant: 'destructive' 
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ========== CLEAR SELECTED FILE ==========
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setImportErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ========== DOWNLOAD TEMPLATE ==========
  const downloadTemplate = () => {
    const template = [
      {
        sku: 'PROD-2020',
        beginning_balance: 100,
        cost: 50
      },
      {
        sku: 'PROD-6742',
        beginning_balance: 75,
        cost: 43
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Opening Balances');
    XLSX.writeFile(wb, 'opening_balances_template.xlsx');
    
    toast({ 
      title: language === 'ar' ? 'تم تحميل النموذج' : 'Template downloaded',
      variant: 'default' 
    });
  };

  // ========== EXPORT DATA ==========
  const exportData = () => {
    try {
      const exportRows = filteredProducts.map(p => ({
        name: language === 'ar' ? p.name_ar || p.name : p.name,
        sku: p.sku,
        current_stock: p.stock,
        beginning_balance: p.beginning_balance,
        cost: p.cost,
        total_value: p.beginning_balance * Number(p.cost)
      }));
      
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Opening Balances');
      XLSX.writeFile(wb, `opening_balances_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({ title: t.exportSuccess });
    } catch (error) {
      toast({ 
        title: language === 'ar' ? 'خطأ في التصدير' : 'Export error', 
        variant: 'destructive' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

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
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Wallet className="text-primary" size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.totalValue}</p>
              <p className="text-2xl font-bold">
                {totalValue.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] w-full">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[250px]">{t.product}</TableHead>
                    <TableHead className="min-w-[120px]">{t.sku}</TableHead>
                    <TableHead className="min-w-[120px]">{t.currentStock}</TableHead>
                    <TableHead className="min-w-[120px]">{t.quantity}</TableHead>
                    <TableHead className="min-w-[100px]">{t.unitCost}</TableHead>
                    <TableHead className="min-w-[120px]">{t.totalValue}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {language === 'ar' 
                            ? product.name_ar || product.name
                            : product.name
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.sku}
                        </TableCell>
                        <TableCell>{product.stock || 0}</TableCell>
                        <TableCell className="font-semibold">
                          {product.beginning_balance || 0}
                        </TableCell>
                        <TableCell>
                          {Number(product.cost).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {((product.beginning_balance || 0) * Number(product.cost)).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
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

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={20} />
              {t.import}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Download Template Button */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download size={16} className="me-2" />
                {t.downloadTemplate}
              </Button>
            </div>

            {/* Upload Area */}
            {!selectedFile ? (
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto text-muted-foreground mb-4" size={48} />
                <p className="text-lg font-medium mb-2">{t.dragDrop}</p>
                <p className="text-sm text-muted-foreground">{t.supportedFormats}</p>
                <p className="text-xs text-muted-foreground mt-2">{t.importNote}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected File Info */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-primary" size={24} />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearSelectedFile}>
                    <X size={16} />
                  </Button>
                </div>

                {/* Preview */}
                {previewData.length > 0 && (
                  <Card>
                    <CardHeader className="border-b py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Eye size={16} />
                          {t.preview}
                        </CardTitle>
                        <Badge variant="secondary">
                          {t.rowsToImport}: {previewData.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[200px] w-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>{t.quantity}</TableHead>
                              <TableHead>{t.unitCost}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.map((row, index) => (
                              <TableRow key={index}>
                                <TableCell>{row.sku}</TableCell>
                                <TableCell>{row.beginning_balance}</TableCell>
                                <TableCell>{row.cost}</TableCell>
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

                {/* Progress Bar */}
                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t.processing}</span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportDialog(false);
                clearSelectedFile();
              }}
              disabled={isImporting}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={!selectedFile || isImporting || importErrors.length > 0}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="animate-spin me-2" size={16} />
                  {t.processing}
                </>
              ) : (
                <>
                  <Upload size={16} className="me-2" />
                  {t.startImport}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpeningBalances;