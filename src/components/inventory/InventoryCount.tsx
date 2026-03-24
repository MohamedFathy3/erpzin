// InventoryCount.tsx
import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { useInventory } from '@/hooks/useInventory';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import InventoryPrintTemplate from '@/components/inventory/InventoryPrintTemplate';
import type { 
  Warehouse, 
  Product, 
  WarehouseProduct, 
  InventoryRecord,
  CountedProduct 
} from '@/types/inventory';

import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Save,
  Warehouse as WarehouseIcon,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Filter,
  X,
  RefreshCw,
  Building2,
  Edit2,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ========== Component ==========
const InventoryCount = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { useGetAll, useGetById, useCreate, useUpdate, useUpdateNote } = useInventory();

  // ========== State ==========
  const [newCountOpen, setNewCountOpen] = useState(false);
  const [viewCountOpen, setViewCountOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<any>({});
  const [countedProducts, setCountedProducts] = useState<CountedProduct[]>([]);
  const [editRecordOpen, setEditRecordOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(null);
  const [editCountedStock, setEditCountedStock] = useState(0);
  const [editNote, setEditNote] = useState('');
  const [updateStock, setUpdateStock] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // State للطباعة
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  // ========== Queries ==========

  // جلب المخازن
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.post('/warehouse/index', {
        filters: { active: true },
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? response.data.data || [] : [];
    }
  });

  // جلب منتجات المخزن
  const { data: warehouseProducts = [], refetch: refetchProducts } = useQuery({
    queryKey: ['warehouse-products', selectedWarehouse],
    queryFn: async () => {
      if (!selectedWarehouse) return [];
      const response = await api.get(`/warehouses/${selectedWarehouse}/products`);
      return response.data?.data || [];
    },
    enabled: !!selectedWarehouse && newCountOpen
  });

  // جلب جميع المنتجات للفلتر
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const response = await api.post('/product/index', {
        filters: { active: true },
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false
      });
      return response.data.data || [];
    }
  });

  // جلب سجلات الجرد
  const { data: inventoryRecords = [], isLoading: recordsLoading, refetch: refetchRecords } = useGetAll({
    warehouse_id: warehouseFilter !== 'all' ? parseInt(warehouseFilter) : undefined,
    product_id: productFilter !== 'all' ? parseInt(productFilter) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined
  });

  // جلب تفاصيل السجل للتعديل
  const { data: inventoryDetails, isLoading: detailsLoading } = useGetById(selectedRecord?.id || null, editRecordOpen);

  // ========== Mutations ==========
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const updateNoteMutation = useUpdateNote();

  // ========== Company Info ==========
  const companyInfo = {
    name: user?.company_name || 'Company Name',
    nameAr: user?.company_name_ar || 'اسم الشركة',
    logo: user?.company_logo,
    address: user?.company_address,
    addressAr: user?.company_address_ar,
    phone: user?.company_phone,
    email: user?.company_email,
    tax_id: user?.company_tax_id,
  };

  // ========== Translations ==========
  const t = {
    en: {
      title: 'Inventory Count',
      description: 'Perform physical inventory counts and reconciliation',
      newCount: 'New Count',
      countNumber: 'Count #',
      warehouse: 'Warehouse',
      selectWarehouse: 'Select Warehouse',
      date: 'Date',
      status: 'Status',
      totalItems: 'Total Items',
      variance: 'Variance',
      actions: 'Actions',
      draft: 'Draft',
      inProgress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      view: 'View',
      edit: 'Edit',
      complete: 'Complete',
      cancel: 'Cancel',
      save: 'Save',
      notes: 'Notes',
      product: 'Product',
      sku: 'SKU',
      systemQty: 'System Qty',
      countedQty: 'Counted Qty',
      varianceQty: 'Variance',
      noData: 'No inventory counts found',
      createCount: 'Create Count',
      countCreated: 'Inventory count created',
      countSaved: 'Count saved',
      countCompleted: 'Count completed',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirmComplete: 'Are you sure you want to complete this count?',
      confirmCancel: 'Are you sure you want to cancel this count?',
      difference: 'Difference',
      inventoryRecords: 'Inventory Records',
      allWarehouses: 'All Warehouses',
      allProducts: 'All Products',
      filter: 'Filter',
      reset: 'Reset',
      editNote: 'Edit Note',
      addNote: 'Add Note',
      saveNote: 'Save Note',
      positiveVariance: 'Surplus',
      negativeVariance: 'Shortage',
      zeroVariance: 'Accurate',
      searchProducts: 'Search products...',
      selectedProducts: 'Selected Products',
      productsCount: 'products',
      warehouseProducts: 'Warehouse Products',
      noProducts: 'No products found',
      systemStock: 'System Stock',
      countedStock: 'Counted Stock',
      differenceCount: 'Difference',
      countDate: 'Count Date',
      viewDetails: 'View Details',
      close: 'Close',
      editInventory: 'Edit Inventory',
      updateActualStock: 'Update Actual Stock',
      willUpdateStock: 'This will update the product stock to match the counted quantity',
      saveChanges: 'Save Changes',
      print: 'Print',
      export: 'Export',
      report: 'Inventory Report',
      generatingReport: 'Generating report...',
      totalSystemStock: 'Total System Stock',
      totalCountedStock: 'Total Counted Stock',
      totalDifference: 'Total Difference',
      varianceSummary: 'Variance Summary'
    },
    ar: {
      title: 'جرد المخزون',
      description: 'إجراء جرد فعلي للمخزون ومطابقته',
      newCount: 'جرد جديد',
      countNumber: 'رقم الجرد',
      warehouse: 'المخزن',
      selectWarehouse: 'اختر المخزن',
      date: 'التاريخ',
      status: 'الحالة',
      totalItems: 'عدد الأصناف',
      variance: 'الفرق',
      actions: 'الإجراءات',
      draft: 'مسودة',
      inProgress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      view: 'عرض',
      edit: 'تعديل',
      complete: 'إكمال',
      cancel: 'إلغاء',
      save: 'حفظ',
      notes: 'ملاحظات',
      product: 'المنتج',
      sku: 'رمز المنتج',
      systemQty: 'كمية النظام',
      countedQty: 'الكمية المعدودة',
      varianceQty: 'الفرق',
      noData: 'لا توجد عمليات جرد',
      createCount: 'إنشاء الجرد',
      countCreated: 'تم إنشاء عملية الجرد',
      countSaved: 'تم حفظ الجرد',
      countCompleted: 'تم إكمال الجرد',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجاح',
      confirmComplete: 'هل أنت متأكد من إكمال هذا الجرد؟',
      confirmCancel: 'هل أنت متأكد من إلغاء هذا الجرد؟',
      difference: 'الفرق',
      inventoryRecords: 'سجلات الجرد',
      allWarehouses: 'جميع المخازن',
      allProducts: 'جميع المنتجات',
      filter: 'تصفية',
      reset: 'إعادة تعيين',
      editNote: 'تعديل الملاحظة',
      addNote: 'إضافة ملاحظة',
      saveNote: 'حفظ الملاحظة',
      positiveVariance: 'فائض',
      negativeVariance: 'عجز',
      zeroVariance: 'دقيق',
      searchProducts: 'ابحث عن منتج...',
      selectedProducts: 'المنتجات المختارة',
      productsCount: 'منتج',
      warehouseProducts: 'منتجات المخزن',
      noProducts: 'لا توجد منتجات',
      systemStock: 'مخزون النظام',
      countedStock: 'المخزون المعدود',
      differenceCount: 'الفرق',
      countDate: 'تاريخ الجرد',
      viewDetails: 'عرض التفاصيل',
      close: 'إغلاق',
      editInventory: 'تعديل الجرد',
      updateActualStock: 'تحديث المخزون الفعلي',
      willUpdateStock: 'سيتم تحديث مخزون المنتج في النظام ليتطابق مع الكمية المعدودة',
      saveChanges: 'حفظ التغييرات',
      print: 'طباعة',
      export: 'تصدير',
      report: 'تقرير الجرد',
      generatingReport: 'جاري إنشاء التقرير...',
      totalSystemStock: 'إجمالي مخزون النظام',
      totalCountedStock: 'إجمالي المخزون المعدود',
      totalDifference: 'إجمالي الفرق',
      varianceSummary: 'ملخص الفروقات'
    }
  }[language];

  // ========== Helper Functions ==========

  const getStatusBadge = (record: InventoryRecord) => {
    const diff = record.difference;
    if (diff > 0) {
      return (
        <Badge variant="outline" className="gap-1 bg-green-100 text-green-700 border-green-200">
          <TrendingUp size={12} />
          +{diff} ({t.positiveVariance})
        </Badge>
      );
    }
    if (diff < 0) {
      return (
        <Badge variant="outline" className="gap-1 bg-red-100 text-red-700 border-red-200">
          <TrendingDown size={12} />
          {diff} ({t.negativeVariance})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 bg-gray-100 text-gray-700 border-gray-200">
        <CheckCircle size={12} />
        {t.zeroVariance}
      </Badge>
    );
  };

  const handleAddProductToCount = (productId: number, stock: number) => {
    if (stock < 0) {
      toast({ title: t.error, description: 'الكمية يجب أن تكون 0 أو أكثر', variant: 'destructive' });
      return;
    }
    setCountedProducts(prev => {
      const existing = prev.find(p => p.product_id === productId);
      if (existing) {
        return prev.map(p => p.product_id === productId ? { ...p, counted_stock: stock } : p);
      }
      return [...prev, { product_id: productId, counted_stock: stock }];
    });
  };

  const handleRemoveProductFromCount = (productId: number) => {
    setCountedProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  const handleClearAllProducts = () => {
    setCountedProducts([]);
  };

  const handleResetFilters = () => {
    setWarehouseFilter('all');
    setProductFilter('all');
    setDateFrom('');
    setDateTo('');
    setFilterValues({});
  };

  const handleEditRecord = (record: InventoryRecord) => {
    setSelectedRecord(record);
    setEditCountedStock(record.counted_stock);
    setEditNote(record.note || '');
    setUpdateStock(false);
    setEditRecordOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedRecord) return;
    updateMutation.mutate({
      id: selectedRecord.id,
      data: {
        counted_stock: editCountedStock,
        note: editNote,
        update_stock: updateStock
      }
    });
    setEditRecordOpen(false);
    setSelectedRecord(null);
  };

  const calculateDifference = () => {
    if (!selectedRecord) return 0;
    return editCountedStock - selectedRecord.system_stock;
  };

  const difference = calculateDifference();
  const isDifferent = difference !== 0;

  // ========== Print & Export Functions ==========

  const preparePrintData = () => {
    const records = filteredInventoryRecords;
    
    const totalSystemStock = records.reduce((sum, r) => sum + r.system_stock, 0);
    const totalCountedStock = records.reduce((sum, r) => sum + r.counted_stock, 0);
    const totalDifference = totalCountedStock - totalSystemStock;
    
    const positiveVariance = records.filter(r => r.difference > 0).length;
    const negativeVariance = records.filter(r => r.difference < 0).length;
    const zeroVariance = records.filter(r => r.difference === 0).length;
    
    return {
      records: records,
      warehouseName: warehouseFilter !== 'all' 
        ? warehouses.find((w: Warehouse) => w.id === parseInt(warehouseFilter))?.name 
        : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      createdAt: new Date().toISOString(),
      totalRecords: records.length,
      totalSystemStock,
      totalCountedStock,
      totalDifference,
      positiveVariance,
      negativeVariance,
      zeroVariance,
    };
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `inventory-count-report-${new Date().toISOString().split('T')[0]}`,
    onAfterPrint: () => {
      setShowPrint(false);
    },
  });

  const handlePrintClick = () => {
    if (filteredInventoryRecords.length === 0) {
      toast({
        title: t.error,
        description: language === 'ar' ? 'لا توجد بيانات للطباعة' : 'No data to print',
        variant: 'destructive',
      });
      return;
    }
    
    const data = preparePrintData();
    setPrintData(data);
    setShowPrint(true);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const exportToExcel = () => {
    const records = filteredInventoryRecords;
    
    if (records.length === 0) {
      toast({
        title: t.error,
        description: language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export',
        variant: 'destructive',
      });
      return;
    }
    
    // تحويل البيانات إلى صيغة Excel
    const excelData = records.map((record, index) => ({
      '#': index + 1,
      [t.product]: language === 'ar' ? record.product.name_ar || record.product.name : record.product.name,
      [t.sku]: record.product.sku,
      [t.warehouse]: language === 'ar' ? record.warehouse.name_ar || record.warehouse.name : record.warehouse.name,
      [t.systemStock]: record.system_stock,
      [t.countedStock]: record.counted_stock,
      [t.difference]: record.difference,
      [t.notes]: record.note || '',
      [t.date]: formatDate(record.created_at),
    }));
    
    // إضافة ملخص في النهاية
    const totalSystemStock = records.reduce((sum, r) => sum + r.system_stock, 0);
    const totalCountedStock = records.reduce((sum, r) => sum + r.counted_stock, 0);
    const totalDifference = totalCountedStock - totalSystemStock;
    const positiveVariance = records.filter(r => r.difference > 0).length;
    const negativeVariance = records.filter(r => r.difference < 0).length;
    const zeroVariance = records.filter(r => r.difference === 0).length;
    
    excelData.push({
      '#': '',
      [t.product]: '=== ' + (language === 'ar' ? 'الملخص' : 'Summary') + ' ===',
      [t.sku]: '',
      [t.warehouse]: '',
      [t.systemStock]: totalSystemStock,
      [t.countedStock]: totalCountedStock,
      [t.difference]: totalDifference,
      [t.notes]: '',
      [t.date]: '',
    });
    
    excelData.push({
      '#': '',
      [t.product]: t.positiveVariance,
      [t.sku]: '',
      [t.warehouse]: '',
      [t.systemStock]: positiveVariance,
      [t.countedStock]: '',
      [t.difference]: '',
      [t.notes]: '',
      [t.date]: '',
    });
    
    excelData.push({
      '#': '',
      [t.product]: t.negativeVariance,
      [t.sku]: '',
      [t.warehouse]: '',
      [t.systemStock]: negativeVariance,
      [t.countedStock]: '',
      [t.difference]: '',
      [t.notes]: '',
      [t.date]: '',
    });
    
    excelData.push({
      '#': '',
      [t.product]: t.zeroVariance,
      [t.sku]: '',
      [t.warehouse]: '',
      [t.systemStock]: zeroVariance,
      [t.countedStock]: '',
      [t.difference]: '',
      [t.notes]: '',
      [t.date]: '',
    });
    
    // إنشاء ورقة عمل
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // ضبط عرض الأعمدة
    const colWidths = [
      { wch: 5 },   // #
      { wch: 35 },  // Product
      { wch: 15 },  // SKU
      { wch: 20 },  // Warehouse
      { wch: 15 },  // System Stock
      { wch: 15 },  // Counted Stock
      { wch: 15 },  // Difference
      { wch: 30 },  // Notes
      { wch: 15 },  // Date
    ];
    worksheet['!cols'] = colWidths;
    
    // إنشاء المصنف وحفظه
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Count');
    
    const fileName = `inventory-count-${new Date().toISOString().split('T')[0]}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, fileName);
    
    toast({
      title: t.success,
      description: language === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully',
    });
  };

  const filteredWarehouseProducts = useMemo(() => {
    if (!searchQuery) return warehouseProducts;
    const query = searchQuery.toLowerCase();
    return warehouseProducts.filter((p: WarehouseProduct) =>
      p.name?.toLowerCase().includes(query) ||
      p.name_ar?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    );
  }, [warehouseProducts, searchQuery]);

  const filteredInventoryRecords = useMemo(() => {
    let filtered = inventoryRecords || [];
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter((r: InventoryRecord) => r.warehouse.id === parseInt(warehouseFilter));
    }
    if (productFilter !== 'all') {
      filtered = filtered.filter((r: InventoryRecord) => r.product.id === parseInt(productFilter));
    }
    return filtered;
  }, [inventoryRecords, warehouseFilter, productFilter]);

  const isLoading = recordsLoading;

  // ========== Render ==========
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {filteredInventoryRecords.length > 0 && (
            <>
              <Button variant="outline" onClick={handlePrintClick} className="gap-2">
                <Printer size={16} />
                {t.print}
              </Button>
              <Button variant="outline" onClick={exportToExcel} className="gap-2">
                <FileSpreadsheet size={16} />
                {t.export}
              </Button>
            </>
          )}
          <Button onClick={() => setNewCountOpen(true)} className="gap-2">
            <Plus size={16} />
            {t.newCount}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter size={16} />
            {t.filter}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{t.warehouse}</Label>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t.allWarehouses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allWarehouses}</SelectItem>
                  {warehouses.map((w: Warehouse) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} />
                        {language === 'ar' ? w.name_ar || w.name : w.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t.product}</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t.allProducts} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allProducts}</SelectItem>
                  {allProducts.slice(0, 50).map((p: Product) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {language === 'ar' ? p.name_ar || p.name : p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t.date} From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t.date} To</Label>
              <div className="flex gap-2">
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1" />
                <Button variant="outline" size="icon" onClick={handleResetFilters} title={t.reset}>
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Records Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t.inventoryRecords}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>{t.countNumber}</TableHead>
                    <TableHead>{t.warehouse}</TableHead>
                    <TableHead>{t.product}</TableHead>
                    <TableHead className="text-center">{t.systemStock}</TableHead>
                    <TableHead className="text-center">{t.countedStock}</TableHead>
                    <TableHead className="text-center">{t.difference}</TableHead>
                    <TableHead>{t.date}</TableHead>
                    <TableHead>{t.notes}</TableHead>
                    <TableHead className="text-center">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                      </TableCell>
                    </TableRow>
                  ) : filteredInventoryRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        <p>{t.noData}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventoryRecords.map((record: InventoryRecord) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          INV-{formatDate(record.created_at).replace(/\//g, '')}-{record.warehouse.id}
                        </TableCell>
                        <TableCell>
                          {language === 'ar' ? record.warehouse.name_ar || record.warehouse.name : record.warehouse.name}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {language === 'ar' ? record.product.name_ar || record.product.name : record.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{record.product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{record.system_stock}</TableCell>
                        <TableCell className="text-center font-medium">{record.counted_stock}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(record)}</TableCell>
                        <TableCell>{formatDate(record.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate max-w-[150px]">{record.note || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)} className="h-8 w-8 p-0 text-blue-600" title={t.edit}>
                              <Edit2 size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t.view}>
                              <Eye size={16} />
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

      {/* Edit Inventory Dialog */}
      <Dialog open={editRecordOpen} onOpenChange={setEditRecordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 size={18} />
              {t.editInventory}
            </DialogTitle>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : selectedRecord && inventoryDetails ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                <div><p className="text-xs text-muted-foreground">{t.product}</p><p className="font-medium">{language === 'ar' ? selectedRecord.product.name_ar || selectedRecord.product.name : selectedRecord.product.name}</p></div>
                <div><p className="text-xs text-muted-foreground">{t.warehouse}</p><p className="font-medium">{language === 'ar' ? selectedRecord.warehouse.name_ar || selectedRecord.warehouse.name : selectedRecord.warehouse.name}</p></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t.systemStock}</Label><div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center"><span className="text-2xl font-bold">{selectedRecord.system_stock}</span></div></div>
                <div className="space-y-2"><Label>{t.countedStock}</Label><Input type="number" min="0" value={editCountedStock} onChange={(e) => setEditCountedStock(Number(e.target.value))} className="text-center text-lg font-medium" /></div>
              </div>
              
              <div className={cn("p-3 rounded-lg text-center", difference > 0 ? "bg-green-100" : difference < 0 ? "bg-red-100" : "bg-gray-100")}>
                <p className="text-xs text-muted-foreground mb-1">{t.difference}</p>
                <p className={cn("text-lg font-bold", difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : "text-gray-600")}>
                  {difference > 0 ? `+${difference}` : difference}
                </p>
              </div>
              
              {isDifferent && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertTriangle size={16} className="text-yellow-600" />
                  <div className="flex-1"><Label className="text-sm font-medium">{t.updateActualStock}</Label><p className="text-xs text-muted-foreground">{t.willUpdateStock}</p></div>
                  <button onClick={() => setUpdateStock(!updateStock)} className={cn("w-10 h-5 rounded-full transition-colors relative", updateStock ? "bg-green-500" : "bg-gray-300")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", updateStock ? "translate-x-5" : "translate-x-0.5")} />
                  </button>
                </div>
              )}
              
              <div className="space-y-2"><Label>{t.notes}</Label><Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={3} placeholder={t.addNote} /></div>
            </div>
          ) : null}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditRecordOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
              {updateMutation.isPending ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Count Dialog */}
      <Dialog open={newCountOpen} onOpenChange={setNewCountOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2"><Plus size={18} />{t.newCount}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <Label>{t.warehouse} *</Label>
              <Select value={selectedWarehouse} onValueChange={(v) => { setSelectedWarehouse(v); setCountedProducts([]); setSearchQuery(''); }}>
                <SelectTrigger><SelectValue placeholder={t.selectWarehouse} /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: Warehouse) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      <div className="flex items-center gap-2"><WarehouseIcon size={14} />{language === 'ar' ? w.name_ar || w.name : w.name}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t.notes}</Label><Textarea value={countNotes} onChange={(e) => setCountNotes(e.target.value)} rows={2} placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'} /></div>
            {selectedWarehouse && (
              <>
                {countedProducts.length > 0 && (
                  <div className="bg-primary/5 p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">{t.selectedProducts}</span><Badge variant="secondary">{countedProducts.length}</Badge>
                      <Button variant="ghost" size="sm" onClick={handleClearAllProducts} className="h-7 text-xs text-destructive"><X size={12} className="me-1" />{language === 'ar' ? 'مسح الكل' : 'Clear All'}</Button>
                    </div>
                    <ScrollArea className="max-h-[120px]">
                      <div className="space-y-1">
                        {countedProducts.map(p => {
                          const product = warehouseProducts.find((pr: WarehouseProduct) => pr.id === p.product_id);
                          return (<div key={p.product_id} className="flex items-center justify-between text-xs p-1 hover:bg-primary/10 rounded"><span className="truncate max-w-[200px]">{language === 'ar' ? product?.name_ar || product?.name : product?.name}</span><div className="flex items-center gap-2"><span className="font-medium">{p.counted_stock}</span><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleRemoveProductFromCount(p.product_id)}><X size={10} /></Button></div></div>);
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                <div className="space-y-2"><Label>{t.product}</Label><div className="relative"><Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><Input placeholder={t.searchProducts} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" /></div></div>
                <ScrollArea className="h-[300px] border rounded-lg">
                  {filteredWarehouseProducts.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Package className="h-12 w-12 mb-2 opacity-20" /><p className="text-sm">{t.noProducts}</p></div>) : (
                    <div className="p-2 space-y-2">
                      {filteredWarehouseProducts.map((product: WarehouseProduct) => {
                        const countedItem = countedProducts.find(p => p.product_id === product.id);
                        return (<div key={product.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50"><div className="flex-1"><p className="font-medium truncate">{language === 'ar' ? product.name_ar || product.name : product.name}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{product.sku}</span><span>•</span><span>{t.systemStock}: {product.stock || 0}</span></div></div><div className="flex items-center gap-2"><Input type="number" min="0" value={countedItem?.counted_stock || ''} onChange={(e) => handleAddProductToCount(product.id, Number(e.target.value))} className="w-24 text-center" placeholder="0" />{countedItem ? (<Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => handleRemoveProductFromCount(product.id)}><X size={16} /></Button>) : (<Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleAddProductToCount(product.id, product.stock || 0)}><Plus size={16} /></Button>)}</div></div>);
                      })}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>
          <DialogFooter className="p-4 border-t gap-2">
            <Button variant="outline" onClick={() => setNewCountOpen(false)}>{t.cancel}</Button>
            <Button onClick={() => createMutation.mutate({ warehouse_id: Number(selectedWarehouse), note: countNotes, products: countedProducts })} disabled={!selectedWarehouse || countedProducts.length === 0 || createMutation.isPending}>
              {createMutation.isPending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin me-2" /> : null}
              {createMutation.isPending ? (language === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : t.createCount}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Template */}
      {showPrint && printData && (
        <div style={{ display: 'none' }}>
          <InventoryPrintTemplate
            ref={printRef}
            data={printData}
            companyInfo={companyInfo}
          />
        </div>
      )}
    </div>
  );
};

export default InventoryCount;