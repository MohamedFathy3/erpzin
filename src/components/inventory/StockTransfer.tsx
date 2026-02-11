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
  branch_id: any;
  image: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
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

// ✅ نوع بيانات مخزون المنتج في المخزن من /warehouses/index-product
interface WarehouseProductStock {
  id: number;
  product_name: string;
  warehouse_name: string;
  stock: number;
  cost: string;
  created_at: string | null;
  updated_at: string | null;
}

interface CountedProduct {
  product_id: number;
  counted_stock: number;
}

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
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [countedProducts, setCountedProducts] = useState<CountedProduct[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // ========== Translation ==========
  const t = {
    en: {
      title: 'Warehouse Stock',
      description: 'View and manage stock levels across all warehouses',
      warehouse: 'Warehouse',
      product: 'Product',
      sku: 'SKU',
      stock: 'Stock',
      cost: 'Cost',
      lastUpdated: 'Last Updated',
      noData: 'No stock data found',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      filter: 'Filter',
      reset: 'Reset',
      allWarehouses: 'All Warehouses',
      searchProducts: 'Search products...',
      totalItems: 'Total Items',
      totalStock: 'Total Stock',
      exportData: 'Export Data',
      refresh: 'Refresh'
    },
    ar: {
      title: 'مخزون المخازن',
      description: 'عرض وإدارة مستويات المخزون في جميع المخازن',
      warehouse: 'المخزن',
      product: 'المنتج',
      sku: 'رمز المنتج',
      stock: 'المخزون',
      cost: 'التكلفة',
      lastUpdated: 'آخر تحديث',
      noData: 'لا توجد بيانات مخزون',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجاح',
      filter: 'تصفية',
      reset: 'إعادة تعيين',
      allWarehouses: 'جميع المخازن',
      searchProducts: 'ابحث عن منتج...',
      totalItems: 'إجمالي الأصناف',
      totalStock: 'إجمالي المخزون',
      exportData: 'تصدير البيانات',
      refresh: 'تحديث'
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

  // ✅ 2. جلب مخزون المنتجات في المخازن - POST /warehouses/index-product
  const { data: warehouseStocks = [], isLoading: stocksLoading, refetch: refetchStocks } = useQuery({
    queryKey: ['warehouse-stocks', warehouseFilter],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        };

        // إضافة فلتر المخزن
        if (warehouseFilter && warehouseFilter !== 'all') {
          const selectedWarehouse = warehouses.find((w: Warehouse) => w.id === parseInt(warehouseFilter));
          if (selectedWarehouse) {
            payload.filters = {
              warehouse_name: selectedWarehouse.name
            };
          }
        }

        console.log('📦 Fetching warehouse stocks with payload:', payload);

        const response = await api.post('/warehouses/index-product', payload);
        
        console.log('✅ Warehouse stocks response:', response.data);

        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching warehouse stocks:', error);
        toast({
          title: t.error,
          description: language === 'ar' ? 'خطأ في جلب مخزون المخازن' : 'Error fetching warehouse stocks',
          variant: 'destructive'
        });
        return [];
      }
    }
  });

  // ✅ 3. جلب منتجات المخزن المحدد للجرد
  const { data: warehouseProducts = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['warehouse-products', selectedWarehouse],
    queryFn: async () => {
      if (!selectedWarehouse) return [];
      
      try {
        const response = await api.get(`/warehouses/${selectedWarehouse}/products`);
        
        console.log('📦 Warehouse products response:', response.data);
        
        if (response.data && response.data.data) {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching warehouse products:', error);
        return [];
      }
    },
    enabled: !!selectedWarehouse && newCountOpen
  });

  const isLoading = warehousesLoading || stocksLoading;

  // ========== Filtered Data ==========

  // ✅ فلترة مخزون المخازن
  const filteredStocks = useMemo(() => {
    let filtered = warehouseStocks;

    // فلترة حسب البحث
    if (filterValues.search) {
      const query = filterValues.search.toLowerCase();
      filtered = filtered.filter((item: WarehouseProductStock) =>
        item.product_name.toLowerCase().includes(query) ||
        (item.warehouse_name && item.warehouse_name.toLowerCase().includes(query))
      );
    }

    // فلترة حسب التاريخ (إذا كان متاح)
    if (filterValues.date_from) {
      const fromDate = new Date(filterValues.date_from);
      filtered = filtered.filter((item: WarehouseProductStock) => 
        item.updated_at && new Date(item.updated_at) >= fromDate
      );
    }

    if (filterValues.date_to) {
      const toDate = new Date(filterValues.date_to);
      filtered = filtered.filter((item: WarehouseProductStock) => 
        item.updated_at && new Date(item.updated_at) <= toDate
      );
    }

    return filtered;
  }, [warehouseStocks, filterValues]);

  // ✅ فلترة منتجات المخزن للجرد
  const filteredWarehouseProducts = useMemo(() => {
    if (!searchQuery) return warehouseProducts;
    const query = searchQuery.toLowerCase();
    return warehouseProducts.filter((p: Product) =>
      p.name?.toLowerCase().includes(query) ||
      p.name_ar?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [warehouseProducts, searchQuery]);

  // ========== Handlers ==========

  const handleResetFilters = () => {
    setWarehouseFilter('all');
    setDateFrom('');
    setDateTo('');
    setFilterValues({});
  };

  const getWarehouseName = (warehouseId: number) => {
    const warehouse = warehouses.find((w: Warehouse) => w.id === warehouseId);
    if (!warehouse) return '-';
    return language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name;
  };

  // ========== Stats ==========
  const stats = useMemo(() => {
    const totalItems = filteredStocks.length;
    const totalStock = filteredStocks.reduce((sum: number, item: WarehouseProductStock) => sum + item.stock, 0);
    const uniqueWarehouses = new Set(filteredStocks.map((item: WarehouseProductStock) => item.warehouse_name)).size;
    
    return { totalItems, totalStock, uniqueWarehouses };
  }, [filteredStocks]);

  // ========== Render ==========
  return (
    <div className="space-y-6">
      {/* ========== Header ========== */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Warehouse className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchStocks()}
          className="gap-2"
        >
          <RefreshCw size={16} />
          {t.refresh}
        </Button>
      </div>

      {/* ========== Stats Cards ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="text-primary" size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.totalItems}</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-success/10">
              <Warehouse className="text-success" size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.warehouse}</p>
              <p className="text-2xl font-bold">{stats.uniqueWarehouses}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-warning/10">
              <ClipboardList className="text-warning" size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.totalStock}</p>
              <p className="text-2xl font-bold">{stats.totalStock.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
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

            {/* Date From */}
            <div className="space-y-2">
              <Label className="text-xs">{t.lastUpdated} From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label className="text-xs">{t.lastUpdated} To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label className="text-xs">{t.searchProducts}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input
                    placeholder={t.searchProducts}
                    value={filterValues.search || ''}
                    onChange={(e) => setFilterValues({ ...filterValues, search: e.target.value })}
                    className="ps-9 h-9 text-sm"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleResetFilters}
                  title={t.reset}
                  className="h-9 w-9"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== Stock Table ========== */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] w-full">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t.product}</TableHead>
                    <TableHead className="min-w-[150px]">{t.warehouse}</TableHead>
                    <TableHead className="min-w-[100px] text-right">{t.stock}</TableHead>
                    <TableHead className="min-w-[120px] text-right">{t.cost}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-muted-foreground">{t.loading}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredStocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Warehouse className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        <p>{t.noData}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStocks.map((item: WarehouseProductStock, index: number) => (
                      <TableRow key={`${item.id}-${index}`}>
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell>
                          {item.warehouse_name}
                        </TableCell>
                       
                        <TableCell className="text-right font-medium">
                          <Badge variant={item.stock > 10 ? 'outline' : item.stock > 0 ? 'secondary' : 'destructive'}>
                            {item.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.cost).toLocaleString()} ﷼
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

// ========== Helper function ==========
const cn = (...classes: any[]) => {
  return classes.filter(Boolean).join(' ');
};

export default InventoryCount;