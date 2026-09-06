/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import {
  Plus,
  Search,
  Save,
  Warehouse,
  Package,
  Filter,
  X,
  RefreshCw,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Barcode
} from 'lucide-react';

// ========== أنواع البيانات ==========
interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  active: boolean;
}

interface WarehouseProduct {
  id: number;
  product_id?: number;
  product_name: string;
  warehouse_name: string;
  stock: number;
  cost: string;
  product?: {
    id: number;
    name: string;
    sku: string;
    barcode: string;
    units: Array<{
      id: number;
      unit_id: number;
      unit_name: string;
      cost_price: string;
      sell_price: string;
      barcode: string;
      colors: Array<{
        id: number;
        color_id: number;
        color: string;
        stock: number;
        hex_code: string;
      }>;
    }>;
  };
}

interface TransferProduct {
  product_id: number;
  product_unit_id: number;
  color_id: number;
  quantity: number;
  note?: string;
}

const WarehouseTransfer = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  // ========== State ==========
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [searchText, setSearchText] = useState('');
  const [modalSearchText, setModalSearchText] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [transferItems, setTransferItems] = useState<TransferProduct[]>([]);
  const [productNotes, setProductNotes] = useState<Record<number, string>>({});

  // ========== Translation ==========
  const t = {
    en: {
      title: 'Warehouse Stock',
      description: 'View and transfer products between warehouses',
      warehouse: 'Warehouse',
      product: 'Product',
      stock: 'Stock',
      cost: 'Cost',
      fromWarehouse: 'From Warehouse',
      toWarehouse: 'To Warehouse',
      quantity: 'Quantity',
      note: 'Note',
      newTransfer: 'New Transfer',
      saveTransfer: 'Transfer Now',
      cancel: 'Cancel',
      selectFrom: 'Select source',
      selectTo: 'Select destination',
      search: 'Search by name or barcode...',
      noData: 'No products found',
      loading: 'Loading...',
      allWarehouses: 'All Warehouses',
      refresh: 'Refresh',
      transferSuccess: 'Transfer completed successfully',
      differentWarehouses: 'Source and destination must be different',
      addProduct: 'Add',
      remove: 'Remove',
      totalItems: 'Total Items',
      totalQuantity: 'Total Quantity',
      filter: 'Filter',
      reset: 'Reset',
      error: 'Error',
      transferring: 'Transferring...',
      barcode: 'Barcode',
      totalStock: 'Total Stock'
    },
    ar: {
      title: 'مخزون المخازن',
      description: 'عرض وتحويل المنتجات بين المخازن',
      warehouse: 'المخزن',
      product: 'المنتج',
      stock: 'المخزون',
      cost: 'التكلفة',
      fromWarehouse: 'من مخزن',
      toWarehouse: 'إلى مخزن',
      quantity: 'الكمية',
      note: 'ملاحظة',
      newTransfer: 'تحويل جديد',
      saveTransfer: 'تحويل الآن',
      cancel: 'إلغاء',
      selectFrom: 'اختر المصدر',
      selectTo: 'اختر الوجهة',
      search: 'ابحث بالاسم أو الباركود...',
      noData: 'لا توجد منتجات',
      loading: 'جاري التحميل...',
      allWarehouses: 'جميع المخازن',
      refresh: 'تحديث',
      transferSuccess: 'تم التحويل بنجاح',
      differentWarehouses: 'يجب أن يكون المخزنين مختلفين',
      addProduct: 'إضافة',
      remove: 'حذف',
      totalItems: 'إجمالي الأصناف',
      totalQuantity: 'إجمالي الكميات',
      filter: 'تصفية',
      reset: 'إعادة تعيين',
      error: 'خطأ',
      transferring: 'جاري التحويل...',
      barcode: 'الباركود',
      totalStock: 'إجمالي المخزون'
    }
  }[language];

  // ========== 1. جلب المخازن ==========
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await api.post('/warehouse/index', {
        filters: { active: true },
        orderBy: 'id',
        perPage: 100,
        paginate: false
      });
      return res.data.result === 'Success' ? res.data.data || [] : [];
    }
  });

  // ========== 2. جلب المنتجات في المخازن (للواجهة الرئيسية) ==========
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['warehouse-products', warehouseFilter, searchText],
    queryFn: async () => {
      const payload: any = {
        orderBy: 'id',
        perPage: 1000,
        paginate: false
      };

      const filters: any = {};

      if (warehouseFilter !== 'all') {
        const warehouse = warehouses.find((w: Warehouse) => w.id === parseInt(warehouseFilter));
        if (warehouse) {
          filters.warehouse_name = warehouse.name;
        }
      }

      if (searchText && searchText.trim() !== '') {
        const searchValue = searchText.trim();
        if (/^\d+$/.test(searchValue)) {
          filters.barcode = searchValue;
        } else {
          filters.product_name = searchValue;
        }
      }

      if (Object.keys(filters).length > 0) {
        payload.filters = filters;
      }

      const res = await api.post('/warehouses/index-product', payload);
      return res.data.result === 'Success' ? res.data.data || [] : [];
    },
    refetchOnWindowFocus: false,
  });

  // ========== 3. جلب منتجات المخزن المصدر (للمودال) ==========
  const {
    data: modalProducts = [],
    isLoading: modalLoading,
    refetch: refetchModal
  } = useQuery({
    queryKey: ['modal-warehouse-products', fromWarehouse, modalSearchText],
    queryFn: async () => {
      if (!fromWarehouse) return [];

      const payload: any = {
        orderBy: 'id',
        perPage: 1000,
        paginate: false
      };

      const filters: any = {};

      // فلتر المخزن المصدر
      const warehouse = warehouses.find((w: Warehouse) => w.id === parseInt(fromWarehouse));
      if (warehouse) {
        filters.warehouse_name = warehouse.name;
      }

      // فلتر البحث في المودال
      if (modalSearchText && modalSearchText.trim() !== '') {
        const searchValue = modalSearchText.trim();
        if (/^\d+$/.test(searchValue)) {
          filters.barcode = searchValue;
        } else {
          filters.product_name = searchValue;
        }
      }

      if (Object.keys(filters).length > 0) {
        payload.filters = filters;
      }

      console.log('📦 Modal fetch payload:', payload);

      const res = await api.post('/warehouses/index-product', payload);
      return res.data.result === 'Success' ? res.data.data || [] : [];
    },
    enabled: !!fromWarehouse, // فقط لما يكون المخزن المصدر محدد
    refetchOnWindowFocus: false,
  });

  // ========== 4. الإحصائيات ==========
  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalStock = products.reduce((sum, p: WarehouseProduct) => sum + p.stock, 0);
    return { totalItems, totalStock };
  }, [products]);

  // ========== 5. تحويل منتجات ==========
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!fromWarehouse) throw new Error('Select source warehouse');
      if (!toWarehouse) throw new Error('Select destination warehouse');
      if (fromWarehouse === toWarehouse) throw new Error(t.differentWarehouses);
      if (transferItems.length === 0) throw new Error('Add products to transfer');

      const payload = {
        from_warehouse_id: parseInt(fromWarehouse),
        to_warehouse_id: parseInt(toWarehouse),
        products: transferItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          ...(item.product_unit_id !== 0 && { product_unit_id: item.product_unit_id }),
          ...(item.color_id !== 0 && { color_id: item.color_id }),
          ...(productNotes[`${item.product_id}-${item.product_unit_id}-${item.color_id}`]
            ? { note: productNotes[`...`] }
            : {})

        }))
      };

      console.log('📦 Sending payload:', JSON.stringify(payload, null, 2));

      const res = await api.post('/warehouses/transfer', payload);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: t.transferSuccess, description: t.transferSuccess });
      queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
      queryClient.invalidateQueries({ queryKey: ['modal-warehouse-products'] });
      setShowTransferModal(false);
      setTransferItems([]);
      setProductNotes({});
      setFromWarehouse('');
      setToWarehouse('');
      setModalSearchText('');
    },
    onError: (error: AxiosError) => {
      const data = error.response?.data as any;
      console.log('Validation errors:', JSON.stringify(data, null, 2));
      // هتشوف exactly أي field فيه مشكلة
      toast({
        title: t.error,
        description: data?.errors
          ? Object.values(data.errors).flat().join(', ')
          : data?.message || error.message,
        variant: 'destructive'
      });
    }
  });

  // ========== 6. إضافة منتج للتحويل ==========
  const handleAddProduct = (rowKey: string, productId: number, unitId: number, colorId: number) => {
    const exists = transferItems.find(item => item.product_id === productId && item.product_unit_id === unitId && item.color_id === colorId);
    if (exists) {
      setTransferItems(prev =>
        prev.map(item =>
          item.product_id === productId && item.product_unit_id === unitId && item.color_id === colorId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setTransferItems(prev => [...prev, { product_id: productId, product_unit_id: unitId, color_id: colorId, quantity: 1 }]);
    }
  };

  // ========== 7. تغيير الكمية ==========

  const handleQuantityChange = (productId: number, unitId: number, colorId: number, quantity: number) => {
    const row = flattenedModalProducts.find(r => r.productId === productId && r.unitId === unitId && r.colorId === colorId);
    if (!row) return;
    setTransferItems(prev =>
      prev.map(item =>
        item.product_id === productId && item.product_unit_id === unitId && item.color_id === colorId
          ? { ...item, quantity: Math.min(Math.max(1, quantity), row.stock) }
          : item
      )
    );
  };

  // ========== 8. تغيير الملاحظة ==========
  // ========== 8. تغيير الملاحظة ==========
  const handleNoteChange = (noteKey: string, note: string) => {
    setProductNotes(prev => ({
      ...prev,
      [noteKey]: note
    }));
  };

  // ========== 9. حذف منتج ==========
  // ========== 9. حذف منتج ==========
  const handleRemoveProduct = (productId: number, unitId: number, colorId: number) => {
    const noteKey = `${productId}-${unitId}-${colorId}`;
    setTransferItems(prev =>
      prev.filter(item => !(item.product_id === productId && item.product_unit_id === unitId && item.color_id === colorId))
    );
    setProductNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[noteKey];
      return newNotes;
    });
  };

  // ========== 10. فتح/غلق المودال ==========
  const handleOpenTransfer = () => {
    setFromWarehouse('');
    setToWarehouse('');
    setTransferItems([]);
    setProductNotes({});
    setModalSearchText('');
    setShowTransferModal(true);
  };

  const handleCloseTransfer = () => {
    setShowTransferModal(false);
    setTransferItems([]);
    setProductNotes({});
    setFromWarehouse('');
    setToWarehouse('');
    setModalSearchText('');
  };

  // ========== 11. إعادة تعيين الفلاتر ==========
  const handleResetFilters = () => {
    setWarehouseFilter('all');
    setSearchText('');
    setTimeout(() => refetch(), 100);
  };

  // ========== 12. اسم المخزن ==========
  const getWarehouseName = (warehouseId: string) => {
    const w = warehouses.find((w: Warehouse) => w.id === parseInt(warehouseId));
    if (!w) return '-';
    return language === 'ar' ? w.name_ar || w.name : w.name;
  };


  // تحويل المنتجات لصفوف مسطحة (unit × color)
  const flattenedModalProducts = useMemo(() => {
    const rows: Array<{
      rowKey: string;
      productId: number;
      productName: string;
      unitId: number;
      unitName: string;
      colorId: number;
      colorName: string;
      hexCode: string;
      barcode: string;
      stock: number;
    }> = [];

    modalProducts.forEach((item: WarehouseProduct) => {
      console.log('item.id:', item.id);
      console.log('item.product_id:', item.product_id);
      console.log('item.product?.id:', item.product?.id);
      const productId = item.product?.id || item.product_id || item.id;
      const units = item.product?.units || [];

      if (units.length === 0) {
        // منتج بدون variants
        rows.push({
          rowKey: `${productId}-0-0`,
          productId,
          productName: item.product_name,
          unitId: 0,
          unitName: '',
          colorId: 0,
          colorName: '',
          hexCode: '',
          barcode: item.product?.barcode || '',
          stock: item.stock,
        });
      } else {
        units.forEach(unit => {
          unit.colors.forEach(color => {
            rows.push({
              rowKey: `${productId}-${unit.id}-${color.id}`,
              productId,
              productName: item.product_name,
              unitId: unit.unit_id,
              unitName: unit.unit_name,
              colorId: color.color_id,
              colorName: color.color,
              hexCode: color.hex_code,
              barcode: unit.barcode || item.product?.barcode || '',
              stock: color.stock,
            });
          });
        });
      }
    });

    return rows;
  }, [modalProducts]);


  return (
    <div className="space-y-4">
      {/* ===== الهيدر ===== */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            {t.refresh}
          </Button>
          <Button size="sm" onClick={handleOpenTransfer}>
            <Plus className="h-4 w-4 ml-2" />
            {t.newTransfer}
          </Button>
        </div>
      </div>

      {/* ===== الإحصائيات ===== */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t.totalItems}</p>
              <p className="text-lg font-bold">{stats.totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Warehouse className="h-5 w-5 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">{t.totalStock}</p>
              <p className="text-lg font-bold">{stats.totalStock.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== الفلاتر ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t.filter}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={warehouseFilter} onValueChange={(value) => {
                setWarehouseFilter(value);
                setTimeout(() => refetch(), 100);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t.allWarehouses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allWarehouses}</SelectItem>
                  {warehouses.map((w: Warehouse) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {language === 'ar' ? w.name_ar || w.name : w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  const timeoutId = setTimeout(() => refetch(), 500);
                  return () => clearTimeout(timeoutId);
                }}
                className="pr-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleResetFilters}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== جدول المنتجات ===== */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>{t.product}</TableHead>
                  <TableHead>{t.barcode}</TableHead>
                  <TableHead>{t.warehouse}</TableHead>
                  <TableHead className="text-center">{t.stock}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      {t.loading}
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      {t.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((item: WarehouseProduct) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {item.barcode || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.warehouse_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.stock > 10 ? 'outline' : item.stock > 0 ? 'secondary' : 'destructive'}>
                          {item.stock}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ===== مودال التحويل ===== */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              {t.newTransfer}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* اختيار المخازن */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.fromWarehouse} <span className="text-destructive">*</span></Label>
                <Select value={fromWarehouse} onValueChange={(value) => {
                  setFromWarehouse(value);
                  setModalSearchText('');
                  setTransferItems([]);
                  setProductNotes({});
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectFrom} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w: Warehouse) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {language === 'ar' ? w.name_ar || w.name : w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.toWarehouse} <span className="text-destructive">*</span></Label>
                <Select
                  value={toWarehouse}
                  onValueChange={setToWarehouse}
                  disabled={!fromWarehouse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectTo} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((w: Warehouse) => w.id.toString() !== fromWarehouse)
                      .map((w: Warehouse) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {language === 'ar' ? w.name_ar || w.name : w.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* جدول منتجات المخزن المصدر */}
            {fromWarehouse && toWarehouse && (
              <>
                {/* مدخل البحث داخل المودال */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.search}
                    value={modalSearchText}
                    onChange={(e) => {
                      setModalSearchText(e.target.value);
                      // الـ refetchModal هتشتغل تلقائياً لأن modalSearchText في الـ queryKey
                    }}
                    className="pr-9"
                  />
                  {modalSearchText && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setModalSearchText('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg">
                  <div className="p-3 bg-muted/30 border-b flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="font-medium">{t.fromWarehouse}: {getWarehouseName(fromWarehouse)}</span>
                    </div>
                    {modalSearchText && (
                      <Badge variant="secondary" className="gap-1">
                        <Search className="h-3 w-3" />
                        {modalSearchText}
                      </Badge>
                    )}
                  </div>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>{t.product}</TableHead>
                          <TableHead>{language === 'ar' ? 'المقاس' : 'Size'}</TableHead>
                          <TableHead>{language === 'ar' ? 'اللون' : 'Color'}</TableHead>
                          <TableHead>{t.barcode}</TableHead>
                          <TableHead className="w-24 text-center">{t.stock}</TableHead>
                          <TableHead className="w-24 text-center">{t.quantity}</TableHead>
                          <TableHead className="w-32">{t.note}</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modalLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">{t.loading}</TableCell>
                          </TableRow>
                        ) : flattenedModalProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                              {modalSearchText ? (
                                <span>{t.noData} <span className="font-mono">"{modalSearchText}"</span></span>
                              ) : (
                                t.noData
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          flattenedModalProducts.map((row) => {
                            const transferItem = transferItems.find(
                              item => item.product_id === row.productId && item.product_unit_id === row.unitId && item.color_id === row.colorId
                            );
                            const noteKey = `${row.productId}-${row.unitId}-${row.colorId}`;
                            return (
                              <TableRow key={row.rowKey} className={transferItem ? 'bg-primary/5' : ''}>
                                <TableCell className="font-medium text-xs">{row.productName}</TableCell>
                                <TableCell>
                                  {row.unitName ? (
                                    <Badge variant="secondary" className="text-xs">{row.unitName}</Badge>
                                  ) : '-'}
                                </TableCell>
                                <TableCell>
                                  {row.colorName ? (
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="inline-block w-4 h-4 rounded-full border border-border"
                                        style={{ backgroundColor: row.hexCode }}
                                      />
                                      <span className="text-xs">{row.colorName}</span>
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-xs">{row.barcode || '-'}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={row.stock > 0 ? 'secondary' : 'destructive'}>{row.stock}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    min="1"
                                    max={row.stock}
                                    value={transferItem?.quantity || ''}
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value) || 0;
                                      if (qty > 0) {
                                        if (transferItem) {
                                          handleQuantityChange(row.productId, row.unitId, row.colorId, qty);
                                        } else {
                                          setTransferItems(prev => [
                                            ...prev,
                                            { product_id: row.productId, product_unit_id: row.unitId, color_id: row.colorId, quantity: qty }
                                          ]);
                                        }
                                      } else if (transferItem) {
                                        handleRemoveProduct(row.productId, row.unitId, row.colorId);
                                      }
                                    }}
                                    className="w-20 text-center mx-auto"
                                    placeholder="0"
                                    disabled={row.stock === 0}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={productNotes[noteKey] || ''}
                                    onChange={(e) => handleNoteChange(noteKey, e.target.value)}
                                    placeholder={t.note}
                                    disabled={!transferItem}
                                    className="h-8 text-xs"
                                  />
                                </TableCell>
                                <TableCell>
                                  {transferItem && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveProduct(row.productId, row.unitId, row.colorId)}
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* ملخص التحويل */}
                {transferItems.length > 0 && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">{t.totalItems}</p>
                          <p className="text-2xl font-bold text-primary">{transferItems.length}</p>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t.totalQuantity}</p>
                          <p className="text-2xl font-bold text-primary">
                            {transferItems.reduce((sum, item) => sum + item.quantity, 0)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ArrowLeft className="h-5 w-5 text-success" />
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{t.toWarehouse}</p>
                          <p className="font-bold text-success">{getWarehouseName(toWarehouse)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sticky bottom-0 bg-background pt-4 border-t">
            <Button variant="outline" onClick={handleCloseTransfer}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => transferMutation.mutate()}
              disabled={
                !fromWarehouse ||
                !toWarehouse ||
                fromWarehouse === toWarehouse ||
                transferItems.length === 0 ||
                transferMutation.isPending
              }
              className="gap-2"
            >
              {transferMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.transferring}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t.saveTransfer}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseTransfer;
