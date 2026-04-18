/* eslint-disable @typescript-eslint/no-explicit-any */
// components/ImportDialog.tsx
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, X, FileText, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useProductImport } from '../hooks/useProductImport';
import { ExcelImportStrategy } from '../services/importStrategies/ExcelImportStrategy';
import { ImportPreviewItem } from '../types';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onOpenChange,
  onImportSuccess
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  
  const { importMutation, progress } = useProductImport();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['.xlsx', '.xls'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
      toast({ title: t.invalidFile, variant: 'destructive' });
      return;
    }
    
    setSelectedFile(file);
    readExcelFile(file);
  };

  const readExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);
        
        const strategy = new ExcelImportStrategy();
        const validation = strategy.validate(rows);
        
        if (!validation.isValid) {
          const previewWithErrors: ImportPreviewItem[] = rows.map((row: any, index: number) => {
            const transformed = strategy.transform([row])[0];
            const rowErrors = validation.errors.filter(e => e.row === index + 2);
            return {
              ...transformed,
              status: 'error',
              error: rowErrors.map(e => e.message).join(', ')
            };
          });
          setPreviewData(previewWithErrors);
        } else {
          const transformed = strategy.transform(rows);
          const preview: ImportPreviewItem[] = transformed.map(item => ({
            ...item,
            status: 'valid'
          }));
          setPreviewData(preview);
        }
        
        setImportStep('preview');
      } catch (error) {
        console.error('Error reading Excel:', error);
        toast({ title: t.readError, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setImportStep('importing');
    
    try {
      const result = await importMutation.mutateAsync(selectedFile);
      
      toast({
        title: t.importSuccess,
        description: `${result.inserted || 0} inserted, ${result.updated || 0} updated`
      });
      
      onImportSuccess();
      setTimeout(() => handleClose(), 1500);
    } catch (error: any) {
      toast({ 
        title: t.importError, 
        description: error.response?.data?.message || error.message,
        variant: 'destructive' 
      });
      setImportStep('preview');
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        'اسم المنتج': 'قميص قطني',
        'اسم المنتج (عربي)': 'قميص قطني',
        'الوصف': 'قميص قطني 100%',
        'القسم': 'ملابس',
        'SKU': 'PRD-001',
        'الباركود': '123456789',
        'الكمية': 100,
        'سعر التكلفة': 50,
        'سعر البيع': 80,
        'الحد الأدنى': 10
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Opening Balances Template');
    XLSX.writeFile(wb, 'opening_balances_template.xlsx');
    
    toast({ title: t.templateDownloaded });
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setImportStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const validCount = previewData.filter(i => i.status === 'valid').length;
  const errorCount = previewData.filter(i => i.status === 'error').length;
  const isPending = importMutation.isPending;

  const t = {
    importTitle: language === 'ar' ? 'استيراد من Excel' : 'Import from Excel',
    importDescription: language === 'ar' ? 'اختر ملف Excel يحتوي على بيانات الرصيد الافتتاحي' : 'Select an Excel file containing opening balance data',
    downloadTemplate: language === 'ar' ? 'تحميل قالب Excel' : 'Download Excel Template',
    selectFile: language === 'ar' ? 'اختر الملف' : 'Select File',
    next: language === 'ar' ? 'التالي' : 'Next',
    confirmImport: language === 'ar' ? 'تأكيد الاستيراد' : 'Confirm Import',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    uploading: language === 'ar' ? 'جاري الاستيراد...' : 'Importing...',
    totalRows: language === 'ar' ? 'إجمالي الصفوف' : 'Total Rows',
    valid: language === 'ar' ? 'صالح' : 'Valid',
    error: language === 'ar' ? 'خطأ' : 'Error',
    product: language === 'ar' ? 'المنتج' : 'Product',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    costPrice: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    invalidFile: language === 'ar' ? 'نوع ملف غير صالح' : 'Invalid file type',
    readError: language === 'ar' ? 'خطأ في قراءة الملف' : 'Error reading file',
    importSuccess: language === 'ar' ? 'تم الاستيراد بنجاح' : 'Import successful',
    importError: language === 'ar' ? 'حدث خطأ في الاستيراد' : 'Import error',
    templateDownloaded: language === 'ar' ? 'تم تحميل القالب' : 'Template downloaded'
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Upload size={18} className="text-blue-600" />
            </div>
            {t.importTitle}
          </DialogTitle>
          <DialogDescription>{t.importDescription}</DialogDescription>
        </DialogHeader>

        {importStep === 'upload' && (
          <div className="space-y-4 py-4">
            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate}
              className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Download size={16} />
              {t.downloadTemplate}
            </Button>

            <div className="space-y-2">
              <Label>{t.selectFile}</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 p-2 bg-muted/30 rounded-lg">
                  <FileText size={14} className="text-blue-500" />
                  <span className="flex-1">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X size={14} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {importStep === 'preview' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{previewData.length}</p>
                <p className="text-xs text-muted-foreground">{t.totalRows}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{validCount}</p>
                <p className="text-xs text-muted-foreground">{t.valid}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                <p className="text-xs text-muted-foreground">{t.error}</p>
              </div>
            </div>

            {errorCount > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {language === 'ar' 
                    ? `يوجد ${errorCount} خطأ في الملف. يرجى تصحيحها ثم المحاولة مرة أخرى.`
                    : `Found ${errorCount} errors in the file. Please fix them and try again.`}
                </p>
              </div>
            )}

            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>{t.product}</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">{t.quantity}</TableHead>
                    <TableHead className="text-right">{t.costPrice}</TableHead>
                    <TableHead className="text-center w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 10).map((item) => (
                    <TableRow key={item.row} className={item.status === 'error' ? 'bg-red-50/50' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{item.row}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.product_name}
                        {item.error && (
                          <p className="text-xs text-red-500 mt-1">{item.error}</p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.cost_price)}</TableCell>
                      <TableCell className="text-center">
                        {item.status === 'valid' ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <AlertCircle size={16} className="text-red-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {previewData.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                {language === 'ar' 
                  ? `و ${previewData.length - 10} صفوف أخرى`
                  : `And ${previewData.length - 10} more rows`}
              </p>
            )}
          </div>
        )}

        {importStep === 'importing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 size={40} className="animate-spin mx-auto text-primary" />
            <p>{t.uploading}</p>
            <Progress value={progress} className="h-2 w-full" />
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'يرجى الانتظار...' : 'Please wait...'}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isPending}
          >
            {t.cancel}
          </Button>
          
          {importStep === 'upload' && (
            <Button 
              onClick={() => selectedFile && setImportStep('preview')} 
              disabled={!selectedFile} 
              className="gap-2"
            >
              {t.next}
              <ChevronRight size={16} />
            </Button>
          )}
          
          {importStep === 'preview' && (
            <Button 
              onClick={handleImport} 
              disabled={validCount === 0 || isPending} 
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {t.confirmImport}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};