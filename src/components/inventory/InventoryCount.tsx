import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { AdvancedFilter, FilterField, FilterValues } from '@/components/ui/advanced-filter';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Save,
  Warehouse,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Filter,
  X,
  RefreshCw,
  Building2
} from 'lucide-react';

// ========== أنواع البيانات من API ==========

interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  phone: string;
  address: string;
  manager: string;
  active: boolean;
  main_branch: boolean;
  note: string;
  branch_id: {
    id: number;
    name: string;
    code: string;
    phone: string;
    address: string;
    manager: string;
    active: boolean;
    main_branch: boolean;
    image: string;
    created_at: string;
    updated_at: string;
  } | null;
  image: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number | string;
  sell_price?: number | string;
  cost_price?: number | string;
  stock: number;
  reorder_level: number;
  active: boolean;
  image_url?: string | null;
  imageUrl?: string | null;
  image?: any;
  units?: any[];
  category?: any;
  created_at?: string;
  updated_at?: string;
}

// ✅ نوع بيانات سجل الجرد من API
interface InventoryRecord {
  id: number;
  warehouse: {
    id: number;
    name: string;
    name_ar?: string;
  };
  product: {
    id: number;
    name: string;
    name_ar?: string;
    sku: string;
  };
  system_stock: number;
  counted_stock: number;
  difference: number;
  note: string | null;
  created_at: string;
}

interface InventoryCount {
  id: number;
  count_number: string;
  warehouse_id: number;
  warehouse?: Warehouse;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  note: string | null;
  total_items: number;
  variance_items: number;
  count_date: string;
  completed_date: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  items?: InventoryRecord[];
}

interface CountedProduct {
  product_id: number;
  counted_stock: number;
}

// ✅ تعديل WarehouseProduct ليتوافق مع شكل البيانات الراجع من API
interface WarehouseProduct {
  id: number;
  name: string;
  name_ar?: string;
  description?: string;
  sku: string;
  barcode?: string;
  stock: number;
  price: number | string;
  sell_price?: number | string;
  cost_price?: number | string;
  reorder_level?: number;
  active?: boolean;
  image_url?: string | null;
  imageUrl?: string | null;
  image?: any;
  category?: any;
  units?: any[];
  created_at?: string;
  updated_at?: string;
}

const InventoryCount = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  // ========== State ==========
  const [newCountOpen, setNewCountOpen] = useState(false);
  const [viewCountOpen, setViewCountOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<InventoryCount | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [countItems, setCountItems] = useState<Record<number, number>>({});
  const [countedProducts, setCountedProducts] = useState<CountedProduct[]>([]);
  const [selectedInventoryRecord, setSelectedInventoryRecord] = useState<InventoryRecord | null>(null);
  const [editNoteOpen, setEditNoteOpen] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // ========== Translation ==========
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
      close: 'Close'
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
      close: 'إغلاق'
    }
  }[language];

  // ========== Queries ==========

  // ✅ 1. جلب جميع المخازن
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      try {
        const response = await api.post('/warehouse/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
    }
  });

  // ✅ 2. جلب منتجات المخزن المحدد - GET /warehouses/{id}/products
  const { data: warehouseProducts = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['warehouse-products', selectedWarehouse],
    queryFn: async () => {
      if (!selectedWarehouse) return [];
      
      try {
        // ✅ GET request مع تمرير id المخزن
        const response = await api.get(`/warehouses/${selectedWarehouse}/products`);
        
        console.log('📦 Warehouse products response:', response.data);
        
        // ✅ API بترجع الـ data مباشرة في response.data.data
        if (response.data && response.data.data) {
          return response.data.data || [];
        } else if (Array.isArray(response.data)) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.error('Error fetching warehouse products:', error);
        toast({
          title: t.error,
          description: language === 'ar' ? 'خطأ في جلب منتجات المخزن' : 'Error fetching warehouse products',
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: !!selectedWarehouse && newCountOpen
  });

  // ✅ 3. جلب سجلات الجرد مع الفلاتر - POST /inventory/index
  const { data: inventoryRecords = [], isLoading: recordsLoading, refetch: refetchRecords } = useQuery({
    queryKey: ['inventory-records', warehouseFilter, productFilter, dateFrom, dateTo],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'created_at',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false
        };

        // ✅ إضافة الفلاتر
        const filters: any = {};

        if (warehouseFilter && warehouseFilter !== 'all') {
          filters.warehouse_id = parseInt(warehouseFilter);
        }

        if (productFilter && productFilter !== 'all') {
          filters.product_id = parseInt(productFilter);
        }

        if (dateFrom) {
          filters.created_at_from = dateFrom;
        }

        if (dateTo) {
          filters.created_at_to = dateTo;
        }

        if (Object.keys(filters).length > 0) {
          payload.filters = filters;
        }

        console.log('📦 Fetching inventory records with payload:', payload);

        const response = await api.post('/inventory/index', payload);
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching inventory records:', error);
        toast({
          title: t.error,
          description: language === 'ar' ? 'خطأ في جلب سجلات الجرد' : 'Error fetching inventory records',
          variant: 'destructive'
        });
        return [];
      }
    }
  });

  // ✅ 4. جلب جميع المنتجات للفلتر
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching all products:', error);
        return [];
      }
    }
  });

  // ========== Transform Records to Counts ==========
  const counts = useMemo(() => {
    // تجميع السجلات حسب التاريخ والمخزن
    const grouped = inventoryRecords.reduce((acc: Record<string, InventoryCount>, record: InventoryRecord) => {
      const date = record.created_at.split(' ')[0];
      const key = `${date}-${record.warehouse.id}`;
      
      if (!acc[key]) {
        acc[key] = {
          id: record.id,
          count_number: `INV-${date.replace(/-/g, '')}-${record.warehouse.id}`,
          warehouse_id: record.warehouse.id,
          warehouse: warehouses.find((w: Warehouse) => w.id === record.warehouse.id),
          status: 'completed',
          note: null,
          total_items: 0,
          variance_items: 0,
          count_date: record.created_at,
          completed_date: record.created_at,
          created_by: null,
          created_at: record.created_at,
          updated_at: record.created_at,
          items: []
        };
      }
      
      acc[key].items!.push(record);
      acc[key].total_items += 1;
      if (record.difference !== 0) {
        acc[key].variance_items += 1;
      }
      
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => 
      new Date(b.count_date).getTime() - new Date(a.count_date).getTime()
    );
  }, [inventoryRecords, warehouses]);

  // ========== Mutations ==========

  // ✅ إنشاء جرد جديد - POST /warehouses/inventory-store
  const createCountMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWarehouse) {
        throw new Error('Warehouse is required');
      }

      if (countedProducts.length === 0) {
        throw new Error('At least one product is required');
      }

      // ✅ تصفية المنتجات اللي الكمية بتاعتها > 0
      const validProducts = countedProducts.filter(p => p.counted_stock >= 0);

      if (validProducts.length === 0) {
        throw new Error('At least one product with valid quantity is required');
      }

      const payload = {
        warehouse_id: Number(selectedWarehouse),
        note: countNotes || null,
        products: validProducts.map(p => ({
          product_id: p.product_id,
          counted_stock: p.counted_stock
        }))
      };

      console.log('📤 Creating inventory count:', payload);

      const response = await api.post('/warehouses/inventory-store', payload);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: t.success,
        description: t.countCreated
      });

      setNewCountOpen(false);
      setSelectedWarehouse('');
      setCountNotes('');
      setCountedProducts([]);
      setSearchQuery('');
      
      // تحديث البيانات
      refetchRecords();
      queryClient.invalidateQueries({ queryKey: ['inventory-records'] });
    },
    onError: (error: AxiosError) => {
      console.error('❌ Error creating count:', error);
      toast({
        title: t.error,
        description: (error?.response?.data as { message?: string })?.message || error.message,
        variant: 'destructive'
      });
    }
  });

  // ✅ تحديث ملاحظة الجرد
  const updateNoteMutation = useMutation({
    mutationFn: async ({ recordId, note }: { recordId: number; note: string }) => {
      // ❗ هذا يحتاج API لتحديث الملاحظة
      // const response = await api.put(`/inventory/${recordId}`, { note });
      // return response.data;
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: t.success,
        description: t.countSaved
      });
      refetchRecords();
      setEditNoteOpen(false);
      setSelectedInventoryRecord(null);
      setEditNote('');
    },
    onError: (error: AxiosError) => {
      toast({
        title: t.error,
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // ========== Handlers ==========

  // ✅ عرض تفاصيل الجرد
  const handleViewCount = (count: InventoryCount) => {
    setSelectedCount(count);
    setViewCountOpen(true);
    setSearchQuery('');
  };

  // ✅ إضافة منتج للجرد
  const handleAddProductToCount = (productId: number, stock: number) => {
    // التحقق من أن الكمية المدخلة صحيحة
    if (stock < 0) {
      toast({
        title: t.error,
        description: language === 'ar' ? 'الكمية يجب أن تكون 0 أو أكثر' : 'Stock must be 0 or greater',
        variant: 'destructive'
      });
      return;
    }

    setCountedProducts(prev => {
      const existing = prev.find(p => p.product_id === productId);
      if (existing) {
        return prev.map(p => 
          p.product_id === productId 
            ? { ...p, counted_stock: stock }
            : p
        );
      }
      return [...prev, { product_id: productId, counted_stock: stock }];
    });
  };

  // ✅ إزالة منتج من الجرد
  const handleRemoveProductFromCount = (productId: number) => {
    setCountedProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  // ✅ تحديث كمية المنتج
  const handleUpdateProductQuantity = (productId: number, quantity: number) => {
    setCountedProducts(prev => 
      prev.map(p => 
        p.product_id === productId 
          ? { ...p, counted_stock: quantity }
          : p
      )
    );
  };

  // ✅ مسح جميع المنتجات المختارة
  const handleClearAllProducts = () => {
    setCountedProducts([]);
  };

  // ✅ إعادة تعيين الفلاتر
  const handleResetFilters = () => {
    setWarehouseFilter('all');
    setProductFilter('all');
    setDateFrom('');
    setDateTo('');
    setFilterValues({});
  };

  // ✅ حفظ الملاحظة
  const handleSaveNote = () => {
    if (selectedInventoryRecord) {
      updateNoteMutation.mutate({
        recordId: selectedInventoryRecord.id,
        note: editNote
      });
    }
  };

  // ✅ حالة العرض
  const getStatusBadge = (status: string) => {
    const config = {
      draft: { 
        label: t.draft, 
        className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
        icon: Clock
      },
      in_progress: { 
        label: t.inProgress, 
        className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300',
        icon: ClipboardList
      },
      completed: { 
        label: t.completed, 
        className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300',
        icon: CheckCircle
      },
      cancelled: { 
        label: t.cancelled, 
        className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300',
        icon: XCircle
      }
    };
    const statusConfig = config[status as keyof typeof config] || config.draft;
    const Icon = statusConfig.icon;
    
    return (
      <Badge variant="outline" className={cn("gap-1", statusConfig.className)}>
        <Icon size={12} />
        {statusConfig.label}
      </Badge>
    );
  };

  // ✅ بادج الفرق
  const getVarianceBadge = (difference: number) => {
    if (difference > 0) {
      return (
        <Badge variant="outline" className="gap-1 bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300">
          <TrendingUp size={12} />
          +{difference} ({t.positiveVariance})
        </Badge>
      );
    }
    if (difference < 0) {
      return (
        <Badge variant="outline" className="gap-1 bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300">
          <TrendingDown size={12} />
          {difference} ({t.negativeVariance})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300">
        <CheckCircle size={12} />
        {t.zeroVariance}
      </Badge>
    );
  };

  // ✅ اسم المخزن
  const getWarehouseName = (warehouseId: number) => {
    const warehouse = warehouses.find((w: Warehouse) => w.id === warehouseId);
    if (!warehouse) return '-';
    return language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name;
  };

  // ✅ فلترة المنتجات للبحث
  const filteredWarehouseProducts = useMemo(() => {
    if (!searchQuery) return warehouseProducts;
    const query = searchQuery.toLowerCase();
    return warehouseProducts.filter((p: WarehouseProduct) =>
      p.name?.toLowerCase().includes(query) ||
      p.name_ar?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [warehouseProducts, searchQuery]);

  // ✅ فلترة سجلات الجرد للعرض
  const filteredInventoryRecords = useMemo(() => {
    let filtered = inventoryRecords;

    if (warehouseFilter && warehouseFilter !== 'all') {
      filtered = filtered.filter((r: InventoryRecord) => 
        r.warehouse.id === parseInt(warehouseFilter)
      );
    }

    if (productFilter && productFilter !== 'all') {
      filtered = filtered.filter((r: InventoryRecord) => 
        r.product.id === parseInt(productFilter)
      );
    }

    return filtered;
  }, [inventoryRecords, warehouseFilter, productFilter]);

  const isLoading = warehousesLoading || recordsLoading;

  // ========== Render ==========
  return (
    <div className="space-y-6">
      {/* ========== Header ========== */}
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
        <Button onClick={() => setNewCountOpen(true)} className="gap-2">
          <Plus size={16} />
          {t.newCount}
        </Button>
      </div>

      {/* ========== Filters Section ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter size={16} />
            {t.filter}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Warehouse Filter */}
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

            {/* Product Filter */}
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

            {/* Date From */}
            <div className="space-y-2">
              <Label className="text-xs">{t.date} From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label className="text-xs">{t.date} To</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleResetFilters}
                  title={t.reset}
                >
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== Inventory Records Table ========== */}
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
                    <TableHead className="min-w-[150px]">{t.countNumber}</TableHead>
                    <TableHead className="min-w-[150px]">{t.warehouse}</TableHead>
                    <TableHead className="min-w-[200px]">{t.product}</TableHead>
                    <TableHead className="min-w-[100px] text-center">{t.systemStock}</TableHead>
                    <TableHead className="min-w-[100px] text-center">{t.countedStock}</TableHead>
                    <TableHead className="min-w-[100px] text-center">{t.difference}</TableHead>
                    <TableHead className="min-w-[150px]">{t.date}</TableHead>
                    <TableHead className="min-w-[200px]">{t.notes}</TableHead>
                    <TableHead className="min-w-[100px] text-center">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-muted-foreground">{t.loading}</p>
                        </div>
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
                          {language === 'ar' 
                            ? record.warehouse.name_ar || record.warehouse.name 
                            : record.warehouse.name}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {language === 'ar' 
                                ? record.product.name_ar || record.product.name 
                                : record.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{record.product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {record.system_stock}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {record.counted_stock}
                        </TableCell>
                        <TableCell className="text-center">
                          {getVarianceBadge(record.difference)}
                        </TableCell>
                        <TableCell>
                          {formatDate(record.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate max-w-[150px]">
                              {record.note || '-'}
                            </span>
                            
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const count = counts.find(c => 
                                c.items?.some(i => i.id === record.id)
                              );
                              if (count) handleViewCount(count);
                            }}
                          >
                            <Eye size={16} className="me-1" />
                            {t.view}
                          </Button>
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

      {/* ========== New Count Dialog ========== */}
      <Dialog open={newCountOpen} onOpenChange={setNewCountOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Plus size={18} />
              {t.newCount}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Warehouse Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.warehouse} *</Label>
              <Select 
                value={selectedWarehouse} 
                onValueChange={(value) => {
                  setSelectedWarehouse(value);
                  setCountedProducts([]);
                  setSearchQuery('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectWarehouse} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: Warehouse) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Warehouse size={14} />
                        {language === 'ar' ? w.name_ar || w.name : w.name}
                        <span className="text-xs text-muted-foreground">({w.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.notes}</Label>
              <Textarea
                value={countNotes}
                onChange={(e) => setCountNotes(e.target.value)}
                rows={2}
                placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
              />
            </div>

            {selectedWarehouse && (
              <>
                {/* Selected Products Summary */}
                {countedProducts.length > 0 && (
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t.selectedProducts}</span>
                        <Badge variant="secondary">{countedProducts.length}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAllProducts}
                        className="h-7 text-xs text-destructive hover:text-destructive"
                      >
                        <X size={12} className="me-1" />
                        {language === 'ar' ? 'مسح الكل' : 'Clear All'}
                      </Button>
                    </div>
                    <ScrollArea className="max-h-[120px]">
                      <div className="space-y-1">
                        {countedProducts.map(p => {
                          const product = warehouseProducts.find((pr: WarehouseProduct) => pr.id === p.product_id);
                          return (
                            <div key={p.product_id} className="flex items-center justify-between text-xs p-1 hover:bg-primary/10 rounded">
                              <span className="truncate max-w-[200px]">
                                {language === 'ar' ? product?.name_ar || product?.name : product?.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{p.counted_stock}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleRemoveProductFromCount(p.product_id)}
                                >
                                  <X size={10} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Product Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t.product}</Label>
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      placeholder={t.searchProducts}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="ps-9"
                    />
                  </div>
                </div>

                {/* Products List */}
                <ScrollArea className="h-[300px] border rounded-lg">
                  {productsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredWarehouseProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Package className="h-12 w-12 mb-2 opacity-20" />
                      <p className="text-sm">{t.noProducts}</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {filteredWarehouseProducts.map((product: WarehouseProduct) => {
                        const countedItem = countedProducts.find(p => p.product_id === product.id);
                        const systemStock = product.stock || 0;
                        
                        return (
                          <div
                            key={product.id}
                            className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {language === 'ar' ? product.name_ar || product.name : product.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{product.sku}</span>
                                <span>•</span>
                                <span>{t.systemStock}: {systemStock}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                value={countedItem?.counted_stock || ''}
                                onChange={(e) => handleAddProductToCount(product.id, Number(e.target.value))}
                                className="w-24 text-center"
                                placeholder="0"
                              />
                              {countedItem ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-destructive"
                                  onClick={() => handleRemoveProductFromCount(product.id)}
                                >
                                  <X size={16} />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => handleAddProductToCount(product.id, systemStock)}
                                >
                                  <Plus size={16} />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>

          <DialogFooter className="p-4 border-t gap-2">
            <Button variant="outline" onClick={() => setNewCountOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => createCountMutation.mutate()}
              disabled={!selectedWarehouse || countedProducts.length === 0 || createCountMutation.isPending}
            >
              {createCountMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin me-2" />
                  {language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}
                </>
              ) : (
                t.createCount
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== View Count Dialog ========== */}
      <Dialog open={viewCountOpen} onOpenChange={setViewCountOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList size={18} />
              {selectedCount?.count_number}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Count Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">{t.warehouse}</p>
                <p className="font-medium">
                  {selectedCount && getWarehouseName(selectedCount.warehouse_id)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.date}</p>
                <p className="font-medium">
                  {selectedCount && formatDate(selectedCount.count_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.totalItems}</p>
                <p className="font-medium">{selectedCount?.total_items || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.variance}</p>
                <p className={cn(
                  "font-medium",
                  selectedCount?.variance_items ? 'text-amber-500' : ''
                )}>
                  {selectedCount?.variance_items || 0}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t.product}</TableHead>
                    <TableHead className="min-w-[100px]">{t.sku}</TableHead>
                    <TableHead className="min-w-[100px] text-center">{t.systemStock}</TableHead>
                    <TableHead className="min-w-[100px] text-center">{t.countedStock}</TableHead>
                    <TableHead className="min-w-[120px] text-center">{t.difference}</TableHead>
                    <TableHead className="min-w-[150px]">{t.notes}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCount?.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {language === 'ar' 
                          ? item.product.name_ar || item.product.name 
                          : item.product.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.product.sku}
                      </TableCell>
                      <TableCell className="text-center">{item.system_stock}</TableCell>
                      <TableCell className="text-center">{item.counted_stock}</TableCell>
                      <TableCell className="text-center">
                        {getVarianceBadge(item.difference)}
                      </TableCell>
                      <TableCell>
                        {item.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setViewCountOpen(false)}>
              {t.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Edit Note Dialog ========== */}
    
    </div>
  );
};

// ========== Helper function ==========
const cn = (...classes: any[]) => {
  return classes.filter(Boolean).join(' ');
};

export default InventoryCount;