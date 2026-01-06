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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Wallet, 
  Plus, 
  Search,
  Save,
  Trash2,
  Edit
} from 'lucide-react';

const OpeningBalances = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [addBalanceOpen, setAddBalanceOpen] = useState(false);
  const [editBalanceOpen, setEditBalanceOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    quantity: 0,
    unit_cost: 0,
    notes: ''
  });

  const t = {
    en: {
      title: 'Opening Balances',
      description: 'Set initial stock quantities and values',
      addBalance: 'Add Balance',
      product: 'Product',
      selectProduct: 'Select Product',
      warehouse: 'Warehouse',
      selectWarehouse: 'Select Warehouse',
      allWarehouses: 'All Warehouses',
      quantity: 'Quantity',
      unitCost: 'Unit Cost',
      totalValue: 'Total Value',
      date: 'Date',
      notes: 'Notes',
      actions: 'Actions',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      noData: 'No opening balances found',
      balanceAdded: 'Opening balance added',
      balanceUpdated: 'Opening balance updated',
      balanceDeleted: 'Opening balance deleted',
      search: 'Search products...',
      sku: 'SKU'
    },
    ar: {
      title: 'رصيد أول المدة',
      description: 'تحديد الكميات والقيم الافتتاحية للمخزون',
      addBalance: 'إضافة رصيد',
      product: 'المنتج',
      selectProduct: 'اختر المنتج',
      warehouse: 'المخزن',
      selectWarehouse: 'اختر المخزن',
      allWarehouses: 'جميع المخازن',
      quantity: 'الكمية',
      unitCost: 'تكلفة الوحدة',
      totalValue: 'القيمة الإجمالية',
      date: 'التاريخ',
      notes: 'ملاحظات',
      actions: 'الإجراءات',
      save: 'حفظ',
      cancel: 'إلغاء',
      edit: 'تعديل',
      delete: 'حذف',
      noData: 'لا توجد أرصدة افتتاحية',
      balanceAdded: 'تم إضافة الرصيد الافتتاحي',
      balanceUpdated: 'تم تحديث الرصيد الافتتاحي',
      balanceDeleted: 'تم حذف الرصيد الافتتاحي',
      search: 'بحث في المنتجات...',
      sku: 'رمز المنتج'
    }
  }[language];

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
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

  // Fetch opening balances
  const { data: balances = [] } = useQuery({
    queryKey: ['opening-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opening_balances')
        .select('*, products(name, name_ar, sku), warehouses(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Add balance mutation
  const addBalanceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('opening_balances')
        .insert({
          product_id: formData.product_id,
          warehouse_id: formData.warehouse_id,
          quantity: formData.quantity,
          unit_cost: formData.unit_cost,
          notes: formData.notes || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      toast({ title: t.balanceAdded });
      setAddBalanceOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ 
        title: language === 'ar' ? 'خطأ في إضافة الرصيد' : 'Error adding balance', 
        variant: 'destructive' 
      });
    }
  });

  // Update balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('opening_balances')
        .update({
          quantity: formData.quantity,
          unit_cost: formData.unit_cost,
          notes: formData.notes || null
        })
        .eq('id', selectedBalance.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      toast({ title: t.balanceUpdated });
      setEditBalanceOpen(false);
      setSelectedBalance(null);
      resetForm();
    }
  });

  // Delete balance mutation
  const deleteBalanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('opening_balances').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-balances'] });
      toast({ title: t.balanceDeleted });
    }
  });

  const resetForm = () => {
    setFormData({
      product_id: '',
      warehouse_id: '',
      quantity: 0,
      unit_cost: 0,
      notes: ''
    });
  };

  const handleEdit = (balance: any) => {
    setSelectedBalance(balance);
    setFormData({
      product_id: balance.product_id,
      warehouse_id: balance.warehouse_id,
      quantity: balance.quantity,
      unit_cost: Number(balance.unit_cost),
      notes: balance.notes || ''
    });
    setEditBalanceOpen(true);
  };

  const filteredBalances = useMemo(() => {
    let filtered = balances;
    
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(b => b.warehouse_id === warehouseFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.products?.name?.toLowerCase().includes(query) ||
        b.products?.name_ar?.includes(query) ||
        b.products?.sku?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [balances, warehouseFilter, searchQuery]);

  const totalValue = filteredBalances.reduce((sum, b) => sum + Number(b.total_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <Button onClick={() => setAddBalanceOpen(true)}>
          <Plus size={16} className="me-2" />
          {t.addBalance}
        </Button>
      </div>

      {/* Stats */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Wallet className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.totalValue}</p>
              <p className="text-2xl font-bold">{totalValue.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allWarehouses}</SelectItem>
            {warehouses.map(w => (
              <SelectItem key={w.id} value={w.id}>
                {language === 'ar' ? w.name_ar || w.name : w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Balances Table */}
      <Card className="card-elevated">
        <CardHeader className="border-b">
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t.product}</TableHead>
                    <TableHead className="min-w-[100px]">{t.sku}</TableHead>
                    <TableHead className="min-w-[150px]">{t.warehouse}</TableHead>
                    <TableHead className="min-w-[100px]">{t.quantity}</TableHead>
                    <TableHead className="min-w-[100px]">{t.unitCost}</TableHead>
                    <TableHead className="min-w-[120px]">{t.totalValue}</TableHead>
                    <TableHead className="min-w-[120px]">{t.date}</TableHead>
                    <TableHead className="min-w-[120px]">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBalances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBalances.map(balance => (
                      <TableRow key={balance.id}>
                        <TableCell className="font-medium">
                          {language === 'ar' 
                            ? balance.products?.name_ar || balance.products?.name
                            : balance.products?.name
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {balance.products?.sku}
                        </TableCell>
                        <TableCell>
                          {language === 'ar' 
                            ? balance.warehouses?.name_ar || balance.warehouses?.name
                            : balance.warehouses?.name
                          }
                        </TableCell>
                        <TableCell className="font-semibold">{balance.quantity}</TableCell>
                        <TableCell>{Number(balance.unit_cost).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">
                          {Number(balance.total_value).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(balance.balance_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(balance)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteBalanceMutation.mutate(balance.id)}
                            >
                              <Trash2 size={16} />
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

      {/* Add Balance Dialog */}
      <Dialog open={addBalanceOpen} onOpenChange={setAddBalanceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.addBalance}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.product}</Label>
              <Select 
                value={formData.product_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, product_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectProduct} />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {language === 'ar' ? p.name_ar || p.name : p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.warehouse}</Label>
              <Select 
                value={formData.warehouse_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, warehouse_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectWarehouse} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {language === 'ar' ? w.name_ar || w.name : w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.quantity}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>{t.unitCost}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>{t.notes}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddBalanceOpen(false); resetForm(); }}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => addBalanceMutation.mutate()}
              disabled={!formData.product_id || !formData.warehouse_id || addBalanceMutation.isPending}
            >
              <Save size={16} className="me-2" />
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Balance Dialog */}
      <Dialog open={editBalanceOpen} onOpenChange={setEditBalanceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.quantity}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>{t.unitCost}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>{t.notes}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditBalanceOpen(false); setSelectedBalance(null); resetForm(); }}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => updateBalanceMutation.mutate()}
              disabled={updateBalanceMutation.isPending}
            >
              <Save size={16} className="me-2" />
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpeningBalances;
