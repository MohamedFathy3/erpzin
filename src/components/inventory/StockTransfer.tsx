import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AdvancedFilter, FilterField, FilterValues } from '@/components/ui/advanced-filter';
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Trash2, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  Package,
  Warehouse,
  FileText,
  Eye
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  sku: string;
  stock: number;
  barcode: string | null;
}

interface TransferItem {
  product_id: string;
  product: Product;
  quantity: number;
  notes: string;
}

interface WarehouseType {
  id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
}

interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: string;
  transfer_date: string;
  completed_date: string | null;
  notes: string | null;
  total_items: number;
  total_quantity: number;
  created_at: string;
  from_warehouse?: WarehouseType;
  to_warehouse?: WarehouseType;
}

const StockTransfer = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('transfers');
  const [newTransferOpen, setNewTransferOpen] = useState(false);
  const [viewTransferOpen, setViewTransferOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  // New transfer form state
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const t = {
    en: {
      title: 'Stock Transfers',
      newTransfer: 'New Transfer',
      allTransfers: 'All Transfers',
      pending: 'Pending',
      inTransit: 'In Transit',
      completed: 'Completed',
      cancelled: 'Cancelled',
      fromWarehouse: 'From Warehouse',
      toWarehouse: 'To Warehouse',
      selectWarehouse: 'Select Warehouse',
      transferNumber: 'Transfer #',
      date: 'Date',
      status: 'Status',
      items: 'Items',
      quantity: 'Total Qty',
      actions: 'Actions',
      selectProducts: 'Select Products',
      search: 'Search products...',
      searchTransfers: 'Search transfers...',
      product: 'Product',
      sku: 'SKU',
      availableStock: 'Available',
      transferQty: 'Transfer Qty',
      notes: 'Notes',
      addSelected: 'Add Selected',
      removeAll: 'Remove All',
      createTransfer: 'Create Transfer',
      cancel: 'Cancel',
      noTransfers: 'No transfers found',
      noProducts: 'No products found',
      noItems: 'No items added yet',
      confirmCreate: 'Create Transfer?',
      confirmCreateDesc: 'This will create a new stock transfer request.',
      view: 'View',
      complete: 'Complete',
      cancelTransfer: 'Cancel Transfer',
      confirmComplete: 'Complete Transfer?',
      confirmCompleteDesc: 'This will complete the transfer and update stock levels.',
      confirmCancel: 'Cancel Transfer?',
      confirmCancelDesc: 'This will cancel the transfer. This action cannot be undone.',
      transferDetails: 'Transfer Details',
      transferItems: 'Transfer Items',
      createdAt: 'Created At',
      completedAt: 'Completed At',
      totalItems: 'Total Items',
      totalQuantity: 'Total Quantity'
    },
    ar: {
      title: 'نقل المخزون',
      newTransfer: 'نقل جديد',
      allTransfers: 'جميع عمليات النقل',
      pending: 'قيد الانتظار',
      inTransit: 'في الطريق',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      fromWarehouse: 'من المخزن',
      toWarehouse: 'إلى المخزن',
      selectWarehouse: 'اختر المخزن',
      transferNumber: 'رقم النقل',
      date: 'التاريخ',
      status: 'الحالة',
      items: 'الأصناف',
      quantity: 'الكمية',
      actions: 'الإجراءات',
      selectProducts: 'اختر المنتجات',
      search: 'بحث عن المنتجات...',
      searchTransfers: 'بحث في عمليات النقل...',
      product: 'المنتج',
      sku: 'رمز المنتج',
      availableStock: 'المتاح',
      transferQty: 'كمية النقل',
      notes: 'ملاحظات',
      addSelected: 'إضافة المحدد',
      removeAll: 'حذف الكل',
      createTransfer: 'إنشاء النقل',
      cancel: 'إلغاء',
      noTransfers: 'لا توجد عمليات نقل',
      noProducts: 'لا توجد منتجات',
      noItems: 'لم يتم إضافة أصناف بعد',
      confirmCreate: 'إنشاء عملية النقل؟',
      confirmCreateDesc: 'سيتم إنشاء طلب نقل مخزون جديد.',
      view: 'عرض',
      complete: 'إكمال',
      cancelTransfer: 'إلغاء النقل',
      confirmComplete: 'إكمال النقل؟',
      confirmCompleteDesc: 'سيتم إكمال النقل وتحديث مستويات المخزون.',
      confirmCancel: 'إلغاء النقل؟',
      confirmCancelDesc: 'سيتم إلغاء عملية النقل. لا يمكن التراجع عن هذا الإجراء.',
      transferDetails: 'تفاصيل النقل',
      transferItems: 'أصناف النقل',
      createdAt: 'تاريخ الإنشاء',
      completedAt: 'تاريخ الإكمال',
      totalItems: 'إجمالي الأصناف',
      totalQuantity: 'إجمالي الكمية'
    }
  }[language];

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').eq('is_active', true);
      if (error) throw error;
      return data as WarehouseType[];
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch transfers
  const { data: transfers = [] } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StockTransfer[];
    }
  });

  // Fetch transfer items for selected transfer
  const { data: transferItemsData = [] } = useQuery({
    queryKey: ['transfer-items', selectedTransfer?.id],
    queryFn: async () => {
      if (!selectedTransfer?.id) return [];
      const { data, error } = await supabase
        .from('stock_transfer_items')
        .select('*, products(*)')
        .eq('transfer_id', selectedTransfer.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTransfer?.id
  });

  // Create transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: async () => {
      // Generate transfer number
      const transferNumber = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(transfers.length + 1).padStart(4, '0')}`;
      
      // Create transfer
      const { data: transfer, error: transferError } = await supabase
        .from('stock_transfers')
        .insert({
          transfer_number: transferNumber,
          from_warehouse_id: fromWarehouse,
          to_warehouse_id: toWarehouse,
          notes: transferNotes || null,
          total_items: transferItems.length,
          total_quantity: transferItems.reduce((sum, item) => sum + item.quantity, 0)
        })
        .select()
        .single();
      
      if (transferError) throw transferError;

      // Create transfer items
      const items = transferItems.map(item => ({
        transfer_id: transfer.id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('stock_transfer_items')
        .insert(items);
      
      if (itemsError) throw itemsError;

      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: language === 'ar' ? 'تم إنشاء النقل بنجاح' : 'Transfer created successfully' });
      resetForm();
      setNewTransferOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في إنشاء النقل' : 'Error creating transfer', variant: 'destructive' });
    }
  });

  // Complete transfer mutation
  const completeTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ 
          status: 'completed',
          completed_date: new Date().toISOString()
        })
        .eq('id', transferId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: language === 'ar' ? 'تم إكمال النقل بنجاح' : 'Transfer completed successfully' });
      setViewTransferOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في إكمال النقل' : 'Error completing transfer', variant: 'destructive' });
    }
  });

  // Cancel transfer mutation
  const cancelTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: 'cancelled' })
        .eq('id', transferId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: language === 'ar' ? 'تم إلغاء النقل' : 'Transfer cancelled' });
      setViewTransferOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في إلغاء النقل' : 'Error cancelling transfer', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFromWarehouse('');
    setToWarehouse('');
    setTransferNotes('');
    setTransferItems([]);
    setSelectedProducts(new Set());
    setProductSearchQuery('');
  };

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const addSelectedProducts = () => {
    const newItems: TransferItem[] = [];
    selectedProducts.forEach(productId => {
      if (!transferItems.some(item => item.product_id === productId)) {
        const product = products.find(p => p.id === productId);
        if (product) {
          newItems.push({
            product_id: productId,
            product,
            quantity: 1,
            notes: ''
          });
        }
      }
    });
    setTransferItems([...transferItems, ...newItems]);
    setSelectedProducts(new Set());
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setTransferItems(items => 
      items.map(item => 
        item.product_id === productId 
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setTransferItems(items => 
      items.map(item => 
        item.product_id === productId 
          ? { ...item, notes }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setTransferItems(items => items.filter(item => item.product_id !== productId));
  };

  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    if (!warehouse) return '-';
    return language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: t.pending, variant: 'secondary' as const, icon: Clock },
      in_transit: { label: t.inTransit, variant: 'default' as const, icon: ArrowRightLeft },
      completed: { label: t.completed, variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: t.cancelled, variant: 'destructive' as const, icon: XCircle }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery) return products;
    const query = productSearchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.name_ar && p.name_ar.includes(query)) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.includes(query))
    );
  }, [products, productSearchQuery]);

  // Filter fields for advanced filter
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      labelAr: 'بحث',
      type: 'text',
      placeholder: 'Search by transfer number...',
      placeholderAr: 'بحث برقم النقل...'
    },
    {
      key: 'from_warehouse',
      label: 'From Warehouse',
      labelAr: 'من المخزن',
      type: 'select',
      options: warehouses.map(w => ({
        value: w.id,
        label: w.name,
        labelAr: w.name_ar || w.name
      }))
    },
    {
      key: 'to_warehouse',
      label: 'To Warehouse',
      labelAr: 'إلى المخزن',
      type: 'select',
      options: warehouses.map(w => ({
        value: w.id,
        label: w.name,
        labelAr: w.name_ar || w.name
      }))
    },
    {
      key: 'status',
      label: 'Status',
      labelAr: 'الحالة',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending', labelAr: 'قيد الانتظار' },
        { value: 'in_transit', label: 'In Transit', labelAr: 'في الطريق' },
        { value: 'completed', label: 'Completed', labelAr: 'مكتمل' },
        { value: 'cancelled', label: 'Cancelled', labelAr: 'ملغي' }
      ]
    },
    {
      key: 'date',
      label: 'Date',
      labelAr: 'التاريخ',
      type: 'dateRange'
    }
  ], [warehouses]);

  const filteredTransfers = useMemo(() => {
    let filtered = transfers;

    if (filterValues.search) {
      const query = filterValues.search.toLowerCase();
      filtered = filtered.filter(t => t.transfer_number?.toLowerCase().includes(query));
    }

    if (filterValues.from_warehouse && filterValues.from_warehouse !== 'all') {
      filtered = filtered.filter(t => t.from_warehouse_id === filterValues.from_warehouse);
    }

    if (filterValues.to_warehouse && filterValues.to_warehouse !== 'all') {
      filtered = filtered.filter(t => t.to_warehouse_id === filterValues.to_warehouse);
    }

    if (filterValues.status && filterValues.status !== 'all') {
      filtered = filtered.filter(t => t.status === filterValues.status);
    }

    if (filterValues.date_from) {
      const fromDate = new Date(filterValues.date_from);
      filtered = filtered.filter(t => new Date(t.transfer_date) >= fromDate);
    }

    if (filterValues.date_to) {
      const toDate = new Date(filterValues.date_to);
      filtered = filtered.filter(t => new Date(t.transfer_date) <= toDate);
    }

    return filtered;
  }, [transfers, filterValues]);

  const canCreateTransfer = fromWarehouse && toWarehouse && fromWarehouse !== toWarehouse && transferItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ArrowRightLeft className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'إدارة نقل المخزون بين المخازن' : 'Manage stock transfers between warehouses'}
            </p>
          </div>
        </div>
        <Button className="gradient-success" onClick={() => setNewTransferOpen(true)}>
          <Plus size={16} className="me-2" />
          {t.newTransfer}
        </Button>
      </div>

      {/* Advanced Filter */}
      <AdvancedFilter
        fields={filterFields}
        values={filterValues}
        onChange={setFilterValues}
        onReset={() => setFilterValues({})}
        language={language}
      />

      {/* Transfers Table */}
      <Card className="card-elevated">
        <CardHeader className="border-b">
          <CardTitle>{t.allTransfers}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[150px]">{t.transferNumber}</TableHead>
                    <TableHead className="min-w-[150px]">{t.fromWarehouse}</TableHead>
                    <TableHead className="min-w-[150px]">{t.toWarehouse}</TableHead>
                    <TableHead className="min-w-[120px]">{t.date}</TableHead>
                    <TableHead className="min-w-[80px]">{t.items}</TableHead>
                    <TableHead className="min-w-[80px]">{t.quantity}</TableHead>
                    <TableHead className="min-w-[120px]">{t.status}</TableHead>
                    <TableHead className="w-[80px]">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono font-medium">{transfer.transfer_number}</TableCell>
                      <TableCell>{getWarehouseName(transfer.from_warehouse_id)}</TableCell>
                      <TableCell>{getWarehouseName(transfer.to_warehouse_id)}</TableCell>
                      <TableCell>{new Date(transfer.transfer_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</TableCell>
                      <TableCell>{transfer.total_items}</TableCell>
                      <TableCell>{transfer.total_quantity}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setViewTransferOpen(true);
                          }}
                        >
                          <Eye size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTransfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {t.noTransfers}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* New Transfer Dialog */}
      <Dialog open={newTransferOpen} onOpenChange={(open) => {
        setNewTransferOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft size={20} />
              {t.newTransfer}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Warehouse Selection */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>{t.fromWarehouse} *</Label>
                <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectWarehouse} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== toWarehouse).map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        <div className="flex items-center gap-2">
                          <Warehouse size={14} />
                          {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                          {warehouse.code && <span className="text-muted-foreground">({warehouse.code})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.toWarehouse} *</Label>
                <Select value={toWarehouse} onValueChange={setToWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectWarehouse} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== fromWarehouse).map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        <div className="flex items-center gap-2">
                          <Warehouse size={14} />
                          {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                          {warehouse.code && <span className="text-muted-foreground">({warehouse.code})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Selection */}
            <Card>
              <CardHeader className="py-3 border-b">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">{t.selectProducts}</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                      <Input
                        placeholder={t.search}
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="ps-9 h-8 text-sm"
                      />
                    </div>
                    <Button 
                      size="sm" 
                      onClick={addSelectedProducts}
                      disabled={selectedProducts.size === 0}
                    >
                      <Plus size={14} className="me-1" />
                      {t.addSelected} ({selectedProducts.size})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[200px] w-full">
                  <div className="min-w-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead className="min-w-[200px]">{t.product}</TableHead>
                          <TableHead className="min-w-[120px]">{t.sku}</TableHead>
                          <TableHead className="min-w-[100px]">{t.availableStock}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow 
                            key={product.id} 
                            className={`cursor-pointer ${transferItems.some(i => i.product_id === product.id) ? 'opacity-50' : ''}`}
                            onClick={() => !transferItems.some(i => i.product_id === product.id) && toggleProductSelection(product.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedProducts.has(product.id)}
                                disabled={transferItems.some(i => i.product_id === product.id)}
                                onCheckedChange={() => toggleProductSelection(product.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {language === 'ar' ? product.name_ar || product.name : product.name}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                            <TableCell>
                              <Badge variant={product.stock > 0 ? 'default' : 'destructive'}>
                                {product.stock}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredProducts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                              {t.noProducts}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Selected Items */}
            <Card>
              <CardHeader className="py-3 border-b">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package size={16} />
                    {t.transferItems} ({transferItems.length})
                  </CardTitle>
                  {transferItems.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => setTransferItems([])}
                    >
                      <Trash2 size={14} className="me-1" />
                      {t.removeAll}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[200px] w-full">
                  <div className="min-w-[700px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="min-w-[180px]">{t.product}</TableHead>
                          <TableHead className="min-w-[100px]">{t.sku}</TableHead>
                          <TableHead className="min-w-[80px]">{t.availableStock}</TableHead>
                          <TableHead className="min-w-[100px]">{t.transferQty}</TableHead>
                          <TableHead className="min-w-[150px]">{t.notes}</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transferItems.map((item) => (
                          <TableRow key={item.product_id}>
                            <TableCell className="font-medium">
                              {language === 'ar' ? item.product.name_ar || item.product.name : item.product.name}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.product.sku}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.product.stock}</Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                max={item.product.stock}
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value) || 1)}
                                className="w-20 h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder={t.notes}
                                value={item.notes}
                                onChange={(e) => updateItemNotes(item.product_id, e.target.value)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeItem(item.product_id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {transferItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              {t.noItems}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t.notes}</Label>
              <Textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder={t.notes}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <DialogClose asChild>
              <Button variant="outline">{t.cancel}</Button>
            </DialogClose>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="gradient-success"
                  disabled={!canCreateTransfer || createTransferMutation.isPending}
                >
                  <Send size={16} className="me-2" />
                  {t.createTransfer}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.confirmCreate}</AlertDialogTitle>
                  <AlertDialogDescription>{t.confirmCreateDesc}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => createTransferMutation.mutate()}>
                    {t.createTransfer}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transfer Dialog */}
      <Dialog open={viewTransferOpen} onOpenChange={setViewTransferOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              {t.transferDetails}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransfer && (
            <div className="space-y-6 py-4">
              {/* Transfer Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.transferNumber}</Label>
                  <p className="font-mono font-medium">{selectedTransfer.transfer_number}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.status}</Label>
                  <div>{getStatusBadge(selectedTransfer.status)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.createdAt}</Label>
                  <p>{new Date(selectedTransfer.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                </div>
                {selectedTransfer.completed_date && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">{t.completedAt}</Label>
                    <p>{new Date(selectedTransfer.completed_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <Label className="text-muted-foreground text-xs">{t.fromWarehouse}</Label>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Warehouse size={16} className="text-destructive" />
                      {getWarehouseName(selectedTransfer.from_warehouse_id)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <Label className="text-muted-foreground text-xs">{t.toWarehouse}</Label>
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Warehouse size={16} className="text-primary" />
                      {getWarehouseName(selectedTransfer.to_warehouse_id)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.totalItems}</Label>
                  <p className="text-2xl font-bold">{selectedTransfer.total_items}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.totalQuantity}</Label>
                  <p className="text-2xl font-bold">{selectedTransfer.total_quantity}</p>
                </div>
              </div>

              {selectedTransfer.notes && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.notes}</Label>
                  <p className="text-sm">{selectedTransfer.notes}</p>
                </div>
              )}

              {/* Transfer Items */}
              <Card>
                <CardHeader className="py-3 border-b">
                  <CardTitle className="text-base">{t.transferItems}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px] w-full">
                    <div className="min-w-[500px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="min-w-[200px]">{t.product}</TableHead>
                            <TableHead className="min-w-[120px]">{t.sku}</TableHead>
                            <TableHead className="min-w-[80px]">{t.quantity}</TableHead>
                            <TableHead className="min-w-[150px]">{t.notes}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transferItemsData.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {language === 'ar' ? item.products?.name_ar || item.products?.name : item.products?.name}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.products?.sku}</TableCell>
                              <TableCell>
                                <Badge>{item.quantity}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{item.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <DialogClose asChild>
              <Button variant="outline">{t.cancel}</Button>
            </DialogClose>
            {selectedTransfer?.status === 'pending' && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle size={16} className="me-2" />
                      {t.cancelTransfer}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.confirmCancel}</AlertDialogTitle>
                      <AlertDialogDescription>{t.confirmCancelDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => cancelTransferMutation.mutate(selectedTransfer.id)}
                      >
                        {t.cancelTransfer}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="gradient-success">
                      <CheckCircle size={16} className="me-2" />
                      {t.complete}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.confirmComplete}</AlertDialogTitle>
                      <AlertDialogDescription>{t.confirmCompleteDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => completeTransferMutation.mutate(selectedTransfer.id)}>
                        {t.complete}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockTransfer;
