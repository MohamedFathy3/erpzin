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
import { supabase } from '@/integrations/supabase/client';
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
  Warehouse
} from 'lucide-react';

interface WarehouseType {
  id: string;
  name: string;
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
  };
  image: string;
  created_at: string;
  updated_at: string;
}

const InventoryCount = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [newCountOpen, setNewCountOpen] = useState(false);
  const [viewCountOpen, setViewCountOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<{ id: string; count_number: string; status: string; warehouse_id: string } | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [countItems, setCountItems] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  const [countedProducts, setCountedProducts] = useState<
    { product_id: number; counted_stock: number }[]
  >([]);



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
      countCompleted: 'Count completed'
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
      countCompleted: 'تم إكمال الجرد'
    }
  }[language];

  // Fetch warehouses from API
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      try {
        const response = await api.post('/warehouse/index');
        if (response.data.result === 'Success') {
          return response.data.data as WarehouseType[];
        } else {
          throw new Error(response.data.message || 'Failed to fetch warehouses');
        }
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب المخازن' : 'Error fetching warehouses',
          variant: 'destructive'
        });
        return [];
      }
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch inventory counts
  const { data: counts = [] } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_counts')
        .select('*, warehouses(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Filter fields for advanced filter
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      labelAr: 'بحث',
      type: 'text',
      placeholder: 'Search by count number...',
      placeholderAr: 'بحث برقم الجرد...'
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      labelAr: 'المخزن',
      type: 'select',
      options: warehouses.map(w => ({
        value: w.id,
        label: w.name,
        labelAr: w.name
      }))
    },
    {
      key: 'status',
      label: 'Status',
      labelAr: 'الحالة',
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft', labelAr: 'مسودة' },
        { value: 'in_progress', label: 'In Progress', labelAr: 'قيد التنفيذ' },
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

  // Filter counts based on filter values
  const filteredCounts = useMemo(() => {
    let filtered = counts;

    if (filterValues.search) {
      const query = filterValues.search.toLowerCase();
      filtered = filtered.filter(c => c.count_number?.toLowerCase().includes(query));
    }

    if (filterValues.warehouse && filterValues.warehouse !== 'all') {
      filtered = filtered.filter(c => c.warehouse_id === filterValues.warehouse);
    }

    if (filterValues.status && filterValues.status !== 'all') {
      filtered = filtered.filter(c => c.status === filterValues.status);
    }

    if (filterValues.date_from) {
      const fromDate = new Date(filterValues.date_from);
      filtered = filtered.filter(c => new Date(c.count_date) >= fromDate);
    }

    if (filterValues.date_to) {
      const toDate = new Date(filterValues.date_to);
      filtered = filtered.filter(c => new Date(c.count_date) <= toDate);
    }

    return filtered;
  }, [counts, filterValues]);

  // Fetch count items for selected count
  const { data: countItemsData = [] } = useQuery({
    queryKey: ['count-items', selectedCount?.id],
    queryFn: async () => {
      if (!selectedCount?.id) return [];
      const { data, error } = await supabase
        .from('inventory_count_items')
        .select('*, products(name, name_ar, sku, stock)')
        .eq('count_id', selectedCount.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCount?.id
  });



  const inventoryStoreMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWarehouse) {
        throw new Error('Warehouse is required');
      }

      const body = {
        warehouse_id: Number(selectedWarehouse),
        note: countNotes,
        products: countedProducts
      };

      const response = await api.post(
        '/warehouses/inventory-store',
        body
      );

      return response.data;
    },

    onSuccess: () => {
      toast({
        title: language === 'ar'
          ? 'تم حفظ الجرد بنجاح'
          : 'Inventory stored successfully'
      });

      setNewCountOpen(false);
      setSelectedWarehouse('');
      setCountNotes('');
      setCountedProducts([]);
    },

    onError: (error: AxiosError) => {
      toast({
        title: language === 'ar'
          ? 'فشل حفظ الجرد'
          : 'Inventory store failed',
        description: (error?.response?.data as { message?: string })?.message,
        variant: 'destructive'
      });
    }
  });


  // Save count items mutation
  const saveCountMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(countItems).map(([itemId, countedQty]) =>
        supabase
          .from('inventory_count_items')
          .update({
            counted_quantity: countedQty,
            counted_at: new Date().toISOString()
          })
          .eq('id', itemId)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['count-items', selectedCount?.id] });
      toast({ title: t.countSaved });
    }
  });

  // Complete count mutation
  const completeCountMutation = useMutation({
    mutationFn: async () => {
      // First save current items
      await saveCountMutation.mutateAsync();

      // Calculate variance items
      const varianceCount = countItemsData.filter(item => {
        const counted = countItems[item.id] ?? item.counted_quantity ?? 0;
        return counted !== item.system_quantity;
      }).length;

      // Update count status
      const { error } = await supabase
        .from('inventory_counts')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
          variance_items: varianceCount
        })
        .eq('id', selectedCount.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-counts'] });
      toast({ title: t.countCompleted });
      setViewCountOpen(false);
      setSelectedCount(null);
      setCountItems({});
    }
  });

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: t.draft, variant: 'secondary' as const, icon: Clock },
      in_progress: { label: t.inProgress, variant: 'default' as const, icon: ClipboardList },
      completed: { label: t.completed, variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: t.cancelled, variant: 'destructive' as const, icon: XCircle }
    };
    const statusConfig = config[status as keyof typeof config] || config.draft;
    const Icon = statusConfig.icon;
    return (
      <Badge variant={statusConfig.variant} className="gap-1">
        <Icon size={12} />
        {statusConfig.label}
      </Badge>
    );
  };

  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    if (!warehouse) return '-';
    return warehouse.name;
  };





  const filteredCountItems = useMemo(() => {
    if (!searchQuery) return countItemsData;
    const query = searchQuery.toLowerCase();
    return countItemsData.filter(item =>
      item.products?.name?.toLowerCase().includes(query) ||
      item.products?.name_ar?.includes(query) ||
      item.products?.sku?.toLowerCase().includes(query)
    );
  }, [countItemsData, searchQuery]);

  const handleViewCount = (count: { id: string; count_number: string; status: string; warehouse_id: string }) => {
    setSelectedCount(count);
    setViewCountOpen(true);
    setCountItems({});
  };

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
        <Button onClick={() => setNewCountOpen(true)}>
          <Plus size={16} className="me-2" />
          {t.newCount}
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

      {/* Counts Table */}
      <Card className="card-elevated">
        <CardHeader className="border-b">
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[150px]">{t.countNumber}</TableHead>
                    <TableHead className="min-w-[150px]">{t.warehouse}</TableHead>
                    <TableHead className="min-w-[150px]">{t.date}</TableHead>
                    <TableHead className="min-w-[100px]">{t.totalItems}</TableHead>
                    <TableHead className="min-w-[100px]">{t.variance}</TableHead>
                    <TableHead className="min-w-[120px]">{t.status}</TableHead>
                    <TableHead className="min-w-[100px]">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCounts.map(count => (
                      <TableRow key={count.id}>
                        <TableCell className="font-medium">{count.count_number}</TableCell>
                        <TableCell>
                          {getWarehouseName(count.warehouse_id)}
                        </TableCell>
                        <TableCell>
                          {formatDate(count.count_date)}
                        </TableCell>
                        <TableCell>{count.total_items || 0}</TableCell>
                        <TableCell className={count.variance_items ? 'text-amber-500 font-semibold' : ''}>
                          {count.variance_items || 0}
                        </TableCell>
                        <TableCell>{getStatusBadge(count.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewCount(count)}>
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

      {/* New Count Dialog */}
      <Dialog open={newCountOpen} onOpenChange={setNewCountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.newCount}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.warehouse}</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectWarehouse} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      <div className="flex items-center gap-2">
                        <Warehouse size={14} />
                        {w.name}
                        <span className="text-muted-foreground">({w.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
            <div>
              <Label>{t.notes}</Label>
              <Textarea
                value={countNotes}
                onChange={(e) => setCountNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCountOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => inventoryStoreMutation.mutate()}
              disabled={!selectedWarehouse || inventoryStoreMutation.isPending}
            >
              {t.createCount}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Edit Count Dialog */}
      <Dialog open={viewCountOpen} onOpenChange={setViewCountOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCount?.count_number} - {getStatusBadge(selectedCount?.status || '')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>

            {/* Items Table */}
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t.product}</TableHead>
                    <TableHead className="min-w-[100px]">{t.sku}</TableHead>
                    <TableHead className="min-w-[100px]">{t.systemQty}</TableHead>
                    <TableHead className="min-w-[120px]">{t.countedQty}</TableHead>
                    <TableHead className="min-w-[100px]">{t.varianceQty}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCountItems.map(item => {
                    const countedQty = countItems[item.id] ?? item.counted_quantity ?? '';
                    const variance = countedQty !== '' ? Number(countedQty) - item.system_quantity : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.products?.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.products?.sku}</TableCell>
                        <TableCell>{item.system_quantity}</TableCell>
                        <TableCell>
                          {selectedCount?.status === 'in_progress' ? (
                            <Input
                              type="number"
                              min="0"
                              value={countedQty}
                              onChange={(e) => setCountItems(prev => ({
                                ...prev,
                                [item.id]: Number(e.target.value)
                              }))}
                              className="w-24"
                            />
                          ) : (
                            item.counted_quantity ?? '-'
                          )}
                        </TableCell>
                        <TableCell className={
                          variance !== null && variance !== 0
                            ? variance > 0 ? 'text-green-500' : 'text-red-500'
                            : ''
                        }>
                          {variance !== null ? (variance > 0 ? `+${variance}` : variance) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>



          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCountOpen(false)}>
              {t.cancel}
            </Button>
            {selectedCount?.status === 'in_progress' && (
              <>
                <Button variant="outline" onClick={() => saveCountMutation.mutate()}>
                  <Save size={16} className="me-2" />
                  {t.save}
                </Button>
                <Button onClick={() => completeCountMutation.mutate()}>
                  <CheckCircle size={16} className="me-2" />
                  {t.complete}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryCount;
