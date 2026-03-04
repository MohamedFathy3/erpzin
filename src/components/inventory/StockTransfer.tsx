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
  Building2,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Truck
} from 'lucide-react';

// ========== أنواع البيانات ==========
interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  active: boolean;
}

// ✅ دي البيانات اللي جاية من /warehouses/index-product
interface WarehouseProduct {
  id: number;           // ده هو product_id
  product_name: string;
  warehouse_name: string;
  stock: number;
  cost: string;
  sku?: string;
}

// ✅ دي البيانات اللي بنبعت فيها للـ API
interface TransferProduct {
  product_id: number;   // بناخدها من id بتاع WarehouseProduct
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
      search: 'Search products...',
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
      reset: 'Reset'
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
      search: 'ابحث عن منتج...',
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
      reset: 'إعادة تعيين'
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

  // ========== 2. جلب المنتجات في المخازن ==========
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['warehouse-products', warehouseFilter],
    queryFn: async () => {
      const payload: any = {
        orderBy: 'id',
        perPage: 1000,
        paginate: false
      };

      if (warehouseFilter !== 'all') {
        const warehouse = warehouses.find((w: Warehouse) => w.id === parseInt(warehouseFilter));
        if (warehouse) {
          payload.filters = { warehouse_name: warehouse.name };
        }
      }

      const res = await api.post('/warehouses/index-product', payload);
      return res.data.result === 'Success' ? res.data.data || [] : [];
    }
  });

  // ========== 3. فلترة المنتجات ==========
  const filteredProducts = useMemo(() => {
    if (!searchText) return products;
    const query = searchText.toLowerCase();
    return products.filter((p: WarehouseProduct) =>
      p.product_name.toLowerCase().includes(query)
    );
  }, [products, searchText]);

  // ========== 4. الإحصائيات ==========
  const stats = useMemo(() => {
    const totalItems = filteredProducts.length;
    const totalStock = filteredProducts.reduce((sum, p: WarehouseProduct) => sum + p.stock, 0);
    return { totalItems, totalStock };
  }, [filteredProducts]);

  // ========== 5. تحويل منتجات ==========
  const transferMutation = useMutation({
    mutationFn: async () => {
      // ✅ التحقق من المدخلات
      if (!fromWarehouse) throw new Error('Select source warehouse');
      if (!toWarehouse) throw new Error('Select destination warehouse');
      if (fromWarehouse === toWarehouse) throw new Error(t.differentWarehouses);
      if (transferItems.length === 0) throw new Error('Add products to transfer');

      // ✅ تجهيز البيلود بالضبط زي البوستمان
      const payload = {
        from_warehouse_id: parseInt(fromWarehouse),
        to_warehouse_id: parseInt(toWarehouse),
        products: transferItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          ...(productNotes[item.product_id] ? { note: productNotes[item.product_id] } : {})
        }))
      };

      console.log('📦 Sending payload:', JSON.stringify(payload, null, 2));

      const res = await api.post('/warehouses/transfer', payload);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: t.success, description: t.transferSuccess });
      queryClient.invalidateQueries({ queryKey: ['warehouse-products'] });
      // ✅ إعادة تعيين الحالة
      setShowTransferModal(false);
      setTransferItems([]);
      setProductNotes({});
      setFromWarehouse('');
      setToWarehouse('');
    },
    onError: (error: AxiosError) => {
      console.error('Transfer error:', error.response?.data || error);
      toast({
        title: t.error,
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // ========== 6. إضافة منتج للتحويل ==========
  const handleAddProduct = (product: WarehouseProduct) => {
    // ✅ نستخدم product.id كـ product_id
    const exists = transferItems.find(item => item.product_id === product.id);
    
    if (exists) {
      // زيادة الكمية
      setTransferItems(prev =>
        prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // إضافة منتج جديد
      setTransferItems(prev => [
        ...prev,
        {
          product_id: product.id,
          quantity: 1
        }
      ]);
    }
  };

  // ========== 7. تغيير الكمية ==========
  const handleQuantityChange = (productId: number, quantity: number) => {
    const product = products.find((p: WarehouseProduct) => p.id === productId);
    if (!product) return;
    
    setTransferItems(prev =>
      prev.map(item =>
        item.product_id === productId
          ? { ...item, quantity: Math.min(Math.max(1, quantity), product.stock) }
          : item
      )
    );
  };

  // ========== 8. تغيير الملاحظة ==========
  const handleNoteChange = (productId: number, note: string) => {
    setProductNotes(prev => ({
      ...prev,
      [productId]: note
    }));
  };

  // ========== 9. حذف منتج ==========
  const handleRemoveProduct = (productId: number) => {
    setTransferItems(prev => prev.filter(item => item.product_id !== productId));
    setProductNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[productId];
      return newNotes;
    });
  };

  // ========== 10. فتح/غلق المودال ==========
  const handleOpenTransfer = () => {
    setFromWarehouse('');
    setToWarehouse('');
    setTransferItems([]);
    setProductNotes({});
    setShowTransferModal(true);
  };

  const handleCloseTransfer = () => {
    setShowTransferModal(false);
    setTransferItems([]);
    setProductNotes({});
    setFromWarehouse('');
    setToWarehouse('');
  };

  // ========== 11. إعادة تعيين الفلاتر ==========
  const handleResetFilters = () => {
    setWarehouseFilter('all');
    setSearchText('');
  };

  // ========== 12. اسم المخزن ==========
  const getWarehouseName = (warehouseId: string) => {
    const w = warehouses.find((w: Warehouse) => w.id === parseInt(warehouseId));
    if (!w) return '-';
    return language === 'ar' ? w.name_ar || w.name : w.name;
  };

  // ========== العرض ==========
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
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
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
                onChange={(e) => setSearchText(e.target.value)}
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
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      {t.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((item: WarehouseProduct) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
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
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.search}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pr-9"
                  />
                </div>

                <div className="border rounded-lg">
                  <div className="p-3 bg-muted/30 border-b flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t.fromWarehouse}: {getWarehouseName(fromWarehouse)}</span>
                  </div>
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>{t.product}</TableHead>
                          <TableHead className="w-24 text-center">{t.stock}</TableHead>
                          <TableHead className="w-24 text-center">{t.quantity}</TableHead>
                          <TableHead className="w-32">{t.note}</TableHead>
                          <TableHead className="w-20 text-center"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products
                          .filter((p: WarehouseProduct) => p.warehouse_name === getWarehouseName(fromWarehouse))
                          .map((product: WarehouseProduct) => {
                            const transferItem = transferItems.find(item => item.product_id === product.id);
                            return (
                              <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.product_name}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={product.stock > 0 ? 'secondary' : 'destructive'}>
                                    {product.stock}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    min="1"
                                    max={product.stock}
                                    value={transferItem?.quantity || 0}
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value) || 0;
                                      if (qty > 0) {
                                        if (transferItem) {
                                          handleQuantityChange(product.id, qty);
                                        } else {
                                          handleAddProduct(product);
                                          setTimeout(() => handleQuantityChange(product.id, qty), 0);
                                        }
                                      }
                                    }}
                                    className="w-20 text-center mx-auto"
                                    placeholder="0"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={productNotes[product.id] || ''}
                                    onChange={(e) => handleNoteChange(product.id, e.target.value)}
                                    placeholder={t.note}
                                    disabled={!transferItem}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  {transferItem && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveProduct(product.id)}
                                      className="h-8 w-8 text-destructive"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* ملخص التحويل */}
                {transferItems.length > 0 && (
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">{t.totalItems}</p>
                          <p className="text-xl font-bold">{transferItems.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t.totalQuantity}</p>
                          <p className="text-xl font-bold">
                            {transferItems.reduce((sum, item) => sum + item.quantity, 0)}
                          </p>
                        </div>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-success" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t.toWarehouse}</p>
                        <p className="font-medium">{getWarehouseName(toWarehouse)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
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
            >
              {transferMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  {t.transferring || 'Transferring...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
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