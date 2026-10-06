import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Download, 
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface ImportRow {
  name: string;
  name_ar?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost?: number;
  stock: number;
  min_stock?: number;
  category?: string;
}

const ExcelImport = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const t = {
    en: {
      title: 'Import Products',
      description: 'Import products from Excel file',
      uploadFile: 'Upload Excel File',
      downloadTemplate: 'Download Template',
      startImport: 'Start Import',
      cancel: 'Cancel',
      fileName: 'File Name',
      totalRows: 'Total Rows',
      successful: 'Successful',
      failed: 'Failed',
      status: 'Status',
      date: 'Date',
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      importHistory: 'Import History',
      noHistory: 'No import history',
      preview: 'Preview',
      name: 'Name',
      nameAr: 'Arabic Name',
      sku: 'SKU',
      barcode: 'Barcode',
      price: 'Price',
      cost: 'Cost',
      stock: 'Stock',
      minStock: 'Min Stock',
      category: 'Category',
      noData: 'No data to preview',
      importSuccess: 'Products imported successfully',
      importError: 'Error importing products',
      invalidFile: 'Invalid file format',
      dragDrop: 'Drag & drop your Excel file here, or click to browse',
      supportedFormats: 'Supported formats: .xlsx, .xls',
      errors: 'Errors',
      rowsToImport: 'Rows to Import'
    },
    ar: {
      title: 'استيراد المنتجات',
      description: 'استيراد المنتجات من ملف Excel',
      uploadFile: 'رفع ملف Excel',
      downloadTemplate: 'تحميل النموذج',
      startImport: 'بدء الاستيراد',
      cancel: 'إلغاء',
      fileName: 'اسم الملف',
      totalRows: 'إجمالي الصفوف',
      successful: 'ناجح',
      failed: 'فاشل',
      status: 'الحالة',
      date: 'التاريخ',
      pending: 'قيد الانتظار',
      processing: 'جاري المعالجة',
      completed: 'مكتمل',
      importHistory: 'سجل الاستيراد',
      noHistory: 'لا يوجد سجل استيراد',
      preview: 'معاينة',
      name: 'الاسم',
      nameAr: 'الاسم بالعربية',
      sku: 'رمز المنتج',
      barcode: 'الباركود',
      price: 'السعر',
      cost: 'التكلفة',
      stock: 'المخزون',
      minStock: 'الحد الأدنى',
      category: 'التصنيف',
      noData: 'لا توجد بيانات للمعاينة',
      importSuccess: 'تم استيراد المنتجات بنجاح',
      importError: 'خطأ في استيراد المنتجات',
      invalidFile: 'صيغة الملف غير صالحة',
      dragDrop: 'اسحب وأفلت ملف Excel هنا، أو انقر للاستعراض',
      supportedFormats: 'الصيغ المدعومة: .xlsx, .xls',
      errors: 'الأخطاء',
      rowsToImport: 'صفوف للاستيراد'
    }
  }[language];

  // Fetch import history
  const { data: importHistory = [] } = useQuery({
    queryKey: ['product-imports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      setProgress(0);

      // Create import record
      const { data: importRecord, error: recordError } = await supabase
        .from('product_imports')
        .insert({
          file_name: 'excel_import.xlsx',
          total_rows: importData.length,
          status: 'processing'
        })
        .select()
        .single();
      
      if (recordError) throw recordError;

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Process each row
      for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        try {
          const { error } = await supabase
            .from('products')
            .insert({
              name: row.name,
              name_ar: row.name_ar || null,
              sku: row.sku,
              barcode: row.barcode || null,
              price: row.price,
              cost: row.cost || 0,
              stock: row.stock,
              min_stock: row.min_stock || 5
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

        setProgress(Math.round(((i + 1) / importData.length) * 100));
      }

      // Update import record
      await supabase
        .from('product_imports')
        .update({
          successful_rows: successCount,
          failed_rows: failCount,
          status: 'completed',
          error_log: errors.length > 0 ? errors : null,
          completed_at: new Date().toISOString()
        })
        .eq('id', importRecord.id);

      return { successCount, failCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['product-imports'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ 
        title: t.importSuccess,
        description: `${result.successCount} ${language === 'ar' ? 'ناجح' : 'successful'}, ${result.failCount} ${language === 'ar' ? 'فاشل' : 'failed'}`
      });
      setImportData([]);
      setImportErrors(result.errors);
      setIsProcessing(false);
    },
    onError: () => {
      toast({ title: t.importError, variant: 'destructive' });
      setIsProcessing(false);
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

        // Validate data
        const validData: ImportRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          if (!row.name || !row.sku) {
            errors.push(`Row ${index + 2}: Missing required fields (name, sku)`);
          } else if (row.price === undefined || row.stock === undefined) {
            errors.push(`Row ${index + 2}: Missing price or stock`);
          } else {
            validData.push({
              name: String(row.name),
              name_ar: row.name_ar ? String(row.name_ar) : undefined,
              sku: String(row.sku),
              barcode: row.barcode ? String(row.barcode) : undefined,
              price: Number(row.price) || 0,
              cost: Number(row.cost) || 0,
              stock: Number(row.stock) || 0,
              min_stock: Number(row.min_stock) || 5,
              category: row.category ? String(row.category) : undefined
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
        toast({ title: t.invalidFile, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Product Name',
        name_ar: 'اسم المنتج',
        sku: 'SKU-001',
        barcode: '1234567890123',
        price: 100,
        cost: 80,
        stock: 50,
        min_stock: 10,
        category: 'Electronics'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products_template.xlsx');
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: t.pending, variant: 'secondary' as const, icon: Clock },
      processing: { label: t.processing, variant: 'default' as const, icon: RefreshCw },
      completed: { label: t.completed, variant: 'default' as const, icon: CheckCircle },
      failed: { label: t.failed, variant: 'destructive' as const, icon: XCircle }
    };
    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;
    return (
      <Badge variant={statusConfig.variant} className="gap-1">
        <Icon size={12} />
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileSpreadsheet className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download size={16} className="me-2" />
          {t.downloadTemplate}
        </Button>
      </div>

      {/* Upload Area */}
      <Card className="card-elevated">
        <CardContent className="p-6">
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
        </CardContent>
      </Card>

      {/* Preview */}
      {importData.length > 0 && (
        <Card className="card-elevated">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>{t.preview}</CardTitle>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {t.rowsToImport}: {importData.length}
                </Badge>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <RefreshCw className="animate-spin me-2" size={16} />
                  ) : (
                    <Upload size={16} className="me-2" />
                  )}
                  {t.startImport}
                </Button>
              </div>
            </div>
            {isProcessing && (
              <Progress value={progress} className="mt-4" />
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] w-full">
              <div className="min-w-[1000px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="min-w-[150px]">{t.name}</TableHead>
                      <TableHead className="min-w-[150px]">{t.nameAr}</TableHead>
                      <TableHead className="min-w-[100px]">{t.sku}</TableHead>
                      <TableHead className="min-w-[120px]">{t.barcode}</TableHead>
                      <TableHead className="min-w-[80px]">{t.price}</TableHead>
                      <TableHead className="min-w-[80px]">{t.cost}</TableHead>
                      <TableHead className="min-w-[80px]">{t.stock}</TableHead>
                      <TableHead className="min-w-[80px]">{t.minStock}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 50).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.name_ar || '-'}</TableCell>
                        <TableCell>{row.sku}</TableCell>
                        <TableCell>{row.barcode || '-'}</TableCell>
                        <TableCell>{row.price.toLocaleString()}</TableCell>
                        <TableCell>{(row.cost || 0).toLocaleString()}</TableCell>
                        <TableCell>{row.stock}</TableCell>
                        <TableCell>{row.min_stock || 5}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {importErrors.length > 0 && (
        <Card className="card-elevated border-amber-500/50">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle size={18} />
              {t.errors} ({importErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[150px]">
              <ul className="space-y-1 text-sm text-muted-foreground">
                {importErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card className="card-elevated">
        <CardHeader className="border-b">
          <CardTitle>{t.importHistory}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[250px] w-full">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t.fileName}</TableHead>
                    <TableHead className="min-w-[100px]">{t.totalRows}</TableHead>
                    <TableHead className="min-w-[100px]">{t.successful}</TableHead>
                    <TableHead className="min-w-[100px]">{t.failed}</TableHead>
                    <TableHead className="min-w-[120px]">{t.status}</TableHead>
                    <TableHead className="min-w-[150px]">{t.date}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t.noHistory}
                      </TableCell>
                    </TableRow>
                  ) : (
                    importHistory.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.file_name}</TableCell>
                        <TableCell>{record.total_rows}</TableCell>
                        <TableCell className="text-green-500">{record.successful_rows}</TableCell>
                        <TableCell className="text-red-500">{record.failed_rows}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(record.created_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
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
    </div>
  );
};

export default ExcelImport;
