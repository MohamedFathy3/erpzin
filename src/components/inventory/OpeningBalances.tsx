// components/inventory/OpeningBalances.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Package, Plus, Trash2, Loader2, Upload, Download, X, FileSpreadsheet, 
  Search, Save, FileText, CheckCircle, AlertCircle, ShoppingBag, 
  MinusCircle, List, Grid3X3, ChevronRight, Building2, Warehouse, Calendar,
  Layers, Palette, Ruler
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as XLSX from 'xlsx';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

interface Unit {
  id: number;
  unit_id: number;
  unit_name: string;
  cost_price: string;
  sell_price: string;
  barcode: string;
  colors: Color[];
}

interface Color {
  id: number;
  color_id: number;
  color: string;
  stock: number;
  hex_code: string;
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  cost: number;
  stock?: number;
  barcode?: string;
  price?: number;
  units?: Unit[];
}

interface ImportPreviewItem {
  row: number;
  product_name: string;
  sku: string;
  quantity: number;
  cost_price: number;
  barcode: string;
  price: number;
  status: 'pending' | 'valid' | 'error';
  error?: string;
}

interface SelectedProduct {
  product: Product;
  unitId?: number;
  unitName?: string;
  colorId?: number;
  colorName?: string;
  quantity: number;
  cost: number;
  price: number;
}

const OpeningBalances: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const queryClient = useQueryClient();
  
  // States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'grid'>('list');
  
  // Variant selection states
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [variantQuantity, setVariantQuantity] = useState<number>(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب الفروع
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.post('/branch/index', { paginate: false });
      return response.data?.data || [];
    }
  });

  // جلب المستودعات
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', selectedBranch],
    queryFn: async () => {
      const filters: any = {};
      if (selectedBranch && selectedBranch !== 'all') {
        filters.branch_id = parseInt(selectedBranch);
      }
      const response = await api.post('/warehouse/index', { filters, paginate: false });
      return response.data?.data || [];
    },
    enabled: !!selectedBranch
  });

  // جلب المنتجات اللي ليها رصيد
  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ['products-with-balance', searchQuery, selectedBranch, selectedWarehouse],
    queryFn: async () => {
      const filters: any = { beginning_balance: true };
      
      if (searchQuery) {
        filters.name = searchQuery;
      }
      if (selectedBranch && selectedBranch !== 'all') {
        filters.branch_id = parseInt(selectedBranch);
      }
      if (selectedWarehouse && selectedWarehouse !== 'all') {
        filters.warehouse_id = parseInt(selectedWarehouse);
      }
      
      const response = await api.post('/product/index', {
        filters,
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 100,
        paginate: false
      });
      const allProducts = response.data?.data || [];
      return allProducts.filter(p => p.stock && p.stock > 0);
    }
  });

  // فتح نافذة اختيار المتغيرات
  const handleProductClick = (product: Product) => {
    if (product.units && product.units.length > 0) {
      // المنتج عنده متغيرات (وحدات وألوان)
      setSelectedProductForVariant(product);
      setSelectedUnit(null);
      setSelectedColor(null);
      setVariantQuantity(1);
    } else {
      // منتج بدون متغيرات
      addProduct(product);
    }
  };

  // إضافة منتج (بدون متغيرات أو بعد اختيار المتغيرات)
  const addProduct = (product: Product, unit?: Unit, color?: Color) => {
    // Check if same product+unit+color already exists
    const existingIndex = selectedProducts.findIndex(p => 
      p.product.id === product.id && 
      p.unitId === unit?.unit_id && 
      p.colorId === color?.color_id
    );
    
    if (existingIndex >= 0) {
      // Increase quantity
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += variantQuantity;
      setSelectedProducts(updated);
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم زيادة الكمية' : 'Quantity increased'
      });
    } else {
      // Add new product with variant
      const cost = unit ? parseFloat(unit.cost_price) : product.cost;
      const price = unit ? parseFloat(unit.sell_price) : (product.price || product.cost * 1.3);
      
      const newSelected: SelectedProduct = {
        product: product,
        unitId: unit?.unit_id,
        unitName: unit?.unit_name,
        colorId: color?.color_id,
        colorName: color?.color,
        quantity: variantQuantity,
        cost: cost,
        price: price
      };
      setSelectedProducts([...selectedProducts, newSelected]);
      toast({
        title: language === 'ar' ? 'تمت الإضافة' : 'Added',
        description: language === 'ar' ? 'تم إضافة المنتج' : 'Product added'
      });
    }
    
    // Close variant modal
    setSelectedProductForVariant(null);
    setSelectedUnit(null);
    setSelectedColor(null);
    setVariantQuantity(1);
  };
  
  // حذف منتج من القائمة
  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };
  
  // تحديث كمية منتج
  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveProduct(index);
      return;
    }
    const updated = [...selectedProducts];
    updated[index].quantity = newQuantity;
    setSelectedProducts(updated);
  };
  
  // تحديث سعر التكلفة
  const handleUpdateCost = (index: number, newCost: number) => {
    const updated = [...selectedProducts];
    updated[index].cost = newCost;
    setSelectedProducts(updated);
  };
  
  // حفظ جميع المنتجات المضافة
  const saveAllProducts = useMutation({
    mutationFn: async (items: SelectedProduct[]) => {
      const results = [];
      for (const item of items) {
        try {
          // تحديث المنتج الموجود
          const response = await api.put(`/product/${item.product.id}`, {
            stock: item.quantity,
            cost: item.cost,
            price: item.price,
            beginning_balance: true
          });
          results.push({ success: true, item });
        } catch (error) {
          console.error('Error updating product:', error);
          results.push({ success: false, item, error });
        }
      }
      return {
        total: items.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };
    },
    onSuccess: (result) => {
      toast({
        title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully',
        description: language === 'ar' 
          ? `تم تحديث ${result.success} منتج بنجاح، فشل ${result.failed}`
          : `Updated ${result.success} products successfully, ${result.failed} failed`,
      });
      
      setSelectedProducts([]);
      setShowAddModal(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  // حذف الرصيد
  const deleteBalanceMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await api.delete(`/product/delete`, {
       data: { items: [productId] }
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

  // قراءة ملف Excel
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: language === 'ar' ? 'نوع ملف غير صالح' : 'Invalid file type',
        description: language === 'ar' 
          ? 'يرجى اختيار ملف Excel بصيغة .xlsx أو .xls'
          : 'Please select an Excel file (.xlsx or .xls)',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedFile(file);
    readExcelFile(file);
  };

  // قراءة ملف Excel
  const readExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);
        
        const previewItems: ImportPreviewItem[] = rows.map((row: any, index: number) => {
          const productName = row['اسم المنتج'] || row['Product Name'] || row['product_name'] || row['name'] || '';
          const sku = row['SKU'] || row['sku'] || '';
          const quantity = parseFloat(row['الكمية'] || row['Quantity'] || row['quantity'] || 0);
          const costPrice = parseFloat(row['سعر التكلفة'] || row['Cost Price'] || row['cost_price'] || row['cost'] || 0);
          const barcode = row['barcode'] || row['Barcode'] || row['الباركود'] || '';
          const price = parseFloat(row['price'] || row['Price'] || row['سعر البيع'] || 0);
          
          let status: 'pending' | 'valid' | 'error' = 'pending';
          let error = '';
          
          if (!productName) {
            status = 'error';
            error = language === 'ar' ? 'اسم المنتج مطلوب' : 'Product name is required';
          } else if (isNaN(quantity) || quantity <= 0) {
            status = 'error';
            error = language === 'ar' ? 'الكمية يجب أن تكون أكبر من 0' : 'Quantity must be greater than 0';
          } else if (isNaN(costPrice) || costPrice < 0) {
            status = 'error';
            error = language === 'ar' ? 'سعر التكلفة غير صالح' : 'Invalid cost price';
          } else {
            status = 'valid';
          }
          
          return {
            row: index + 2,
            product_name: productName,
            sku: sku || `AUTO-${Date.now()}-${index}`,
            quantity,
            cost_price: costPrice,
            barcode: barcode,
            price: price || costPrice * 1.3,
            status,
            error
          };
        });
        
        setPreviewData(previewItems);
        setImportStep('preview');
        
        toast({
          title: language === 'ar' ? 'تم قراءة الملف' : 'File read successfully',
          description: language === 'ar' 
            ? `تم قراءة ${previewItems.length} صف`
            : `Read ${previewItems.length} rows`,
        });
      } catch (error) {
        console.error('Error reading Excel:', error);
        toast({
          title: language === 'ar' ? 'خطأ في قراءة الملف' : 'Error reading file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // استيراد البيانات
  const importMutation = useMutation({
    mutationFn: async (items: ImportPreviewItem[]) => {
      const validItems = items.filter(item => item.status === 'valid');
      const results = [];
      for (const item of validItems) {
        try {
          const searchResponse = await api.post('/product/index', {
            filters: { sku: item.sku },
            perPage: 1,
            paginate: false
          });
          
          const existingProduct = searchResponse.data?.data?.[0];
          
          if (existingProduct) {
            const response = await api.put(`/product/${existingProduct.id}`, {
              stock: item.quantity,
              cost: item.cost_price,
              price: item.price,
              beginning_balance: true
            });
            results.push({ success: true, item });
          } else {
            const response = await api.post('/product', {
              name: item.product_name,
              sku: item.sku,
              barcode: item.barcode || null,
              stock: item.quantity,
              cost: item.cost_price,
              price: item.price,
              active: true,
              has_variants: false,
              beginning_balance: true
            });
            results.push({ success: true, item });
          }
        } catch (error) {
          results.push({ success: false, item, error });
        }
      }
      return {
        total: validItems.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };
    },
    onSuccess: (result) => {
      toast({
        title: language === 'ar' ? 'تم الاستيراد بنجاح' : 'Import successful',
        description: language === 'ar' 
          ? `تم استيراد ${result.success} منتج بنجاح، فشل ${result.failed}`
          : `Imported ${result.success} products successfully, ${result.failed} failed`,
      });
      refetch();
      handleCloseImportDialog();
    },
    onError: (error: any) => {
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const handleImport = () => {
    setImportStep('importing');
    importMutation.mutate(previewData);
  };

  const handleDelete = (product: Product) => {
    if (window.confirm(
      language === 'ar' 
        ? `هل أنت متأكد من حذف رصيد المنتج ${product.name_ar || product.name}؟` 
        : `Are you sure you want to delete balance for ${product.name}?`
    )) {
      deleteBalanceMutation.mutate(product.id);
    }
  };

  const handleOpenModal = () => {
    setShowAddModal(true);
    setSelectedProducts([]);
    setSelectedBranch('all');
    setSelectedWarehouse('all');
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleOpenImportDialog = () => {
    setShowImportDialog(true);
    setSelectedFile(null);
    setUploadProgress(0);
    setPreviewData([]);
    setImportStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setSelectedFile(null);
    setPreviewData([]);
    setImportStep('upload');
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        'اسم المنتج': 'Example Product',
        'SKU': 'PRD-001',
        'الكمية': 100,
        'سعر التكلفة': 50,
        'barcode': '123456789',
        'price': 65,
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
      const exportData = products.map(product => ({
        'اسم المنتج': language === 'ar' ? (product.name_ar || product.name) : product.name,
        'SKU': product.sku,
        'الكمية': product.stock || 0,
        'سعر التكلفة': product.cost,
        'barcode': product.barcode || '',
        'price': product.price || 0,
        'القيمة الإجمالية': (product.stock || 0) * product.cost,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances');
      XLSX.writeFile(wb, `opening_balances_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: language === 'ar' ? 'تم التصدير بنجاح' : 'Export successful',
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ في التصدير' : 'Export error',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const validCount = previewData.filter(i => i.status === 'valid').length;
  const errorCount = previewData.filter(i => i.status === 'error').length;
  const totalQuantity = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = selectedProducts.reduce((sum, p) => sum + (p.quantity * p.cost), 0);

  const t = {
    title: language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances',
    description: language === 'ar' ? 'إدارة أرصدة أول المدة للمنتجات' : 'Manage opening balances for products',
    product: language === 'ar' ? 'المنتج' : 'Product',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    costPrice: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    actions: language === 'ar' ? 'إجراءات' : 'Actions',
    add: language === 'ar' ? 'إضافة رصيد' : 'Add Balance',
    import: language === 'ar' ? 'استيراد' : 'Import',
    export: language === 'ar' ? 'تصدير' : 'Export',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    noData: language === 'ar' ? 'لا توجد منتجات' : 'No products found',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    search: language === 'ar' ? 'ابحث باسم المنتج...' : 'Search by product name...',
    branch: language === 'ar' ? 'الفرع' : 'Branch',
    warehouse: language === 'ar' ? 'المستودع' : 'Warehouse',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    importTitle: language === 'ar' ? 'استيراد من Excel' : 'Import from Excel',
    importDescription: language === 'ar' 
      ? 'اختر ملف Excel يحتوي على بيانات الرصيد الافتتاحي'
      : 'Select an Excel file containing opening balance data',
    selectFile: language === 'ar' ? 'اختر الملف' : 'Select File',
    downloadTemplate: language === 'ar' ? 'تحميل قالب Excel' : 'Download Excel Template',
    importNow: language === 'ar' ? 'استيراد' : 'Import',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    fileSelected: language === 'ar' ? 'تم اختيار الملف' : 'File selected',
    uploading: language === 'ar' ? 'جاري الرفع...' : 'Uploading...',
    preview: language === 'ar' ? 'معاينة البيانات' : 'Preview Data',
    confirmImport: language === 'ar' ? 'تأكيد الاستيراد' : 'Confirm Import',
    valid: language === 'ar' ? 'صالح' : 'Valid',
    error: language === 'ar' ? 'خطأ' : 'Error',
    row: language === 'ar' ? 'الصف' : 'Row',
    allBranches: language === 'ar' ? 'جميع الفروع' : 'All Branches',
    allWarehouses: language === 'ar' ? 'جميع المستودعات' : 'All Warehouses',
    selectedProducts: language === 'ar' ? 'المنتجات المحددة' : 'Selected Products',
    saveAll: language === 'ar' ? 'حفظ الكل' : 'Save All',
    barcode: language === 'ar' ? 'الباركود' : 'Barcode',
    salePrice: language === 'ar' ? 'سعر البيع' : 'Sale Price',
    totalQuantity: language === 'ar' ? 'إجمالي الكمية' : 'Total Quantity',
    totalValue: language === 'ar' ? 'القيمة الإجمالية' : 'Total Value',
    selectBranch: language === 'ar' ? 'اختر الفرع' : 'Select branch',
    selectWarehouse: language === 'ar' ? 'اختر المستودع' : 'Select warehouse',
    size: language === 'ar' ? 'المقاس' : 'Size',
    color: language === 'ar' ? 'اللون' : 'Color',
    selectSize: language === 'ar' ? 'اختر المقاس' : 'Select size',
    selectColor: language === 'ar' ? 'اختر اللون' : 'Select color',
    variantDetails: language === 'ar' ? 'تفاصيل المتغيرات' : 'Variant Details',
    addToList: language === 'ar' ? 'إضافة إلى القائمة' : 'Add to List',
  };

  return (
    <>
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Package className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                {t.title}
              </CardTitle>
              <CardDescription className="mt-1.5">{t.description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleExport} 
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isExporting || products.length === 0}
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                {t.export}
              </Button>
              <Button 
                onClick={handleOpenImportDialog} 
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Upload size={16} />
                {t.import}
              </Button>
              <Button onClick={handleOpenModal} size="sm" className="gap-2">
                <Plus size={16} />
                {t.add}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-muted/30 rounded-xl">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder={t.branch} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allBranches}</SelectItem>
                {branches.map((branch: any) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder={t.warehouse} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allWarehouses}</SelectItem>
                {warehouses.map((warehouse: any) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 p-1 bg-background rounded-lg border">
              <Button
                variant={activeView === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setActiveView('list')}
              >
                <List size={14} />
              </Button>
              <Button
                variant={activeView === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setActiveView('grid')}
              >
                <Grid3X3 size={14} />
              </Button>
            </div>
          </div>

          {/* Products Display */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin" size={32} className="text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-xl">
              <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
                <Package className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground">{t.noData}</p>
            </div>
          ) : activeView === 'list' ? (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold">{t.product}</TableHead>
                    <TableHead className="text-right font-semibold">{t.quantity}</TableHead>
                    <TableHead className="text-right font-semibold">{t.costPrice}</TableHead>
                    <TableHead className="text-right font-semibold">{t.salePrice}</TableHead>
                    <TableHead className="text-right font-semibold">{t.total}</TableHead>
                    <TableHead className="text-right w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{language === 'ar' && product.name_ar ? product.name_ar : product.name}</span>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{product.sku}</span>
                            {product.barcode && (
                              <span className="text-xs text-muted-foreground">• {product.barcode}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{product.stock}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(product.cost)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(product.price || 0)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-600">
                        {formatCurrency((product.stock || 0) * product.cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(product)}
                          className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{language === 'ar' && product.name_ar ? product.name_ar : product.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(product)}
                        className="text-muted-foreground hover:text-red-500 h-8 w-8 p-0"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">{t.quantity}</p>
                        <p className="font-mono font-medium">{product.stock}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{t.costPrice}</p>
                        <p className="font-mono">{formatCurrency(product.cost)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{t.salePrice}</p>
                        <p className="font-mono">{formatCurrency(product.price || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{t.total}</p>
                        <p className="font-mono font-semibold text-emerald-600">{formatCurrency((product.stock || 0) * product.cost)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Balance Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Package className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              {t.add}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header Fields - Date, Branch, Warehouse */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl">
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Calendar size={14} className="text-muted-foreground" />
                  {t.date}
                </Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Building2 size={14} className="text-muted-foreground" />
                  {t.branch}
                </Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t.selectBranch} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBranches}</SelectItem>
                    {branches.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Warehouse size={14} className="text-muted-foreground" />
                  {t.warehouse}
                </Label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t.selectWarehouse} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allWarehouses}</SelectItem>
                    {warehouses.map((warehouse: any) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Search Section */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package size={14} />
                  {language === 'ar' ? 'المنتجات' : 'Products'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>

                {/* Search Results */}
                {searchQuery && (
                  <div className="border rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
                    {products.filter(p => 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).slice(0, 10).map((product) => (
                      <div
                        key={product.id}
                        className="p-2 cursor-pointer hover:bg-muted/50 border-b last:border-b-0"
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{language === 'ar' ? (product.name_ar || product.name) : product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <Badge variant="outline">{formatCurrency(product.cost)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Products Table */}
                {selectedProducts.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-8 py-2 text-xs">#</TableHead>
                          <TableHead className="py-2 text-xs">{t.product}</TableHead>
                          <TableHead className="py-2 text-xs">{t.size}</TableHead>
                          <TableHead className="py-2 text-xs">{t.color}</TableHead>
                          <TableHead className="w-16 py-2 text-xs text-center">{t.quantity}</TableHead>
                          <TableHead className="w-20 py-2 text-xs text-center">{t.costPrice}</TableHead>
                          <TableHead className="w-20 py-2 text-xs text-end">{t.total}</TableHead>
                          <TableHead className="w-8 py-2"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProducts.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="py-1.5 text-xs text-center">{index + 1}</TableCell>
                            <TableCell className="py-1.5">
                              <div>
                                <p className="font-medium text-xs">{language === 'ar' ? (item.product.name_ar || item.product.name) : item.product.name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.product.sku}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5 text-xs">
                              {item.unitName ? (
                                <Badge variant="outline" className="gap-1">
                                  <Ruler size={10} />
                                  {item.unitName}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs">
                              {item.colorName ? (
                                <Badge variant="outline" className="gap-1">
                                  <Palette size={10} />
                                  {item.colorName}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(index, Number(e.target.value))}
                                className="w-20 h-7 text-xs text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.cost}
                                onChange={(e) => handleUpdateCost(index, Number(e.target.value))}
                                className="w-24 h-7 text-xs text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-end font-semibold text-xs text-emerald-600">
                              {formatCurrency(item.quantity * item.cost)}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveProduct(index)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 pt-3 border-t bg-muted/30 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {t.totalQuantity}: <span className="font-bold text-emerald-600">{totalQuantity}</span>
              </span>
              <span className="text-sm font-medium">
                {t.totalValue}: <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} size="sm">
                <X size={14} className="me-1.5" />
                {t.cancel}
              </Button>
              
              <Button 
                onClick={() => saveAllProducts.mutate(selectedProducts)}
                disabled={selectedProducts.length === 0 || saveAllProducts.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                {saveAllProducts.isPending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                {t.saveAll}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Modal */}
      <Dialog open={!!selectedProductForVariant} onOpenChange={() => setSelectedProductForVariant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers size={18} className="text-emerald-600" />
              {t.variantDetails} - {language === 'ar' ? selectedProductForVariant?.name_ar : selectedProductForVariant?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Select Size/Unit */}
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Ruler size={14} />
                {t.size}
              </Label>
              <Select value={selectedUnit?.unit_id?.toString()} onValueChange={(val) => {
                const unit = selectedProductForVariant?.units?.find(u => u.unit_id.toString() === val);
                setSelectedUnit(unit || null);
                setSelectedColor(null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectSize} />
                </SelectTrigger>
                <SelectContent>
                  {selectedProductForVariant?.units?.map((unit) => (
                    <SelectItem key={unit.unit_id} value={unit.unit_id.toString()}>
                      {unit.unit_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Color */}
            {selectedUnit && selectedUnit.colors && selectedUnit.colors.length > 0 && (
              <div>
                <Label className="flex items-center gap-2 mb-1.5">
                  <Palette size={14} />
                  {t.color}
                </Label>
                <Select value={selectedColor?.color_id?.toString()} onValueChange={(val) => {
                  const color = selectedUnit.colors.find(c => c.color_id.toString() === val);
                  setSelectedColor(color || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectColor} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedUnit.colors.map((color) => (
                      <SelectItem key={color.color_id} value={color.color_id.toString()}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border" 
                            style={{ backgroundColor: color.hex_code || '#000000' }}
                          />
                          {color.color}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label className="mb-1.5 block">{t.quantity}</Label>
              <Input
                type="number"
                min="1"
                value={variantQuantity}
                onChange={(e) => setVariantQuantity(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProductForVariant(null)}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => {
                if (selectedProductForVariant) {
                  addProduct(selectedProductForVariant, selectedUnit || undefined, selectedColor || undefined);
                }
              }}
              disabled={!selectedUnit && selectedProductForVariant?.units?.length}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus size={14} />
              {t.addToList}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={handleCloseImportDialog}>
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
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي الصفوف' : 'Total Rows'}</p>
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

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
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
                        <TableCell className="max-w-[200px] truncate">{item.product_name}</TableCell>
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
            </div>
          )}

          {importStep === 'importing' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 size={40} className="animate-spin mx-auto text-primary" />
              <p>{t.uploading}</p>
              <Progress value={uploadProgress} className="h-2 w-full" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImportDialog} disabled={importMutation.isPending}>
              {t.cancel}
            </Button>
            {importStep === 'upload' && (
              <Button onClick={() => selectedFile && setImportStep('preview')} disabled={!selectedFile} className="gap-2">
                {language === 'ar' ? 'التالي' : 'Next'}
                <ChevronRight size={16} />
              </Button>
            )}
            {importStep === 'preview' && (
              <Button onClick={handleImport} disabled={validCount === 0 || importMutation.isPending} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {importMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {t.confirmImport}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OpeningBalances;