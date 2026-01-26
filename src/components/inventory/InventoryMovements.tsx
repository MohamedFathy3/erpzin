import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

const InventoryMovements = () => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const t = {
    en: {
      title: 'Inventory Movements',
      description: 'Track all stock in/out movements',
      date: 'Date',
      product: 'Product',
      sku: 'SKU',
      type: 'Type',
      quantity: 'Quantity',
      previousStock: 'Previous',
      newStock: 'New Stock',
      reference: 'Reference',
      notes: 'Notes',
      in: 'Stock In',
      out: 'Stock Out',
      adjustment: 'Adjustment',
      transfer_in: 'Transfer In',
      transfer_out: 'Transfer Out',
      opening_balance: 'Opening Balance',
      inventory_count: 'Inventory Count',
      allTypes: 'All Types',
      search: 'Search products...',
      noData: 'No movements found',
      export: 'Export',
      refresh: 'Refresh'
    },
    ar: {
      title: 'سجل حركة المخزون',
      description: 'تتبع جميع حركات الدخول والخروج',
      date: 'التاريخ',
      product: 'المنتج',
      sku: 'رمز المنتج',
      type: 'النوع',
      quantity: 'الكمية',
      previousStock: 'السابق',
      newStock: 'الجديد',
      reference: 'المرجع',
      notes: 'ملاحظات',
      in: 'إدخال',
      out: 'إخراج',
      adjustment: 'تعديل',
      transfer_in: 'استلام نقل',
      transfer_out: 'إرسال نقل',
      opening_balance: 'رصيد افتتاحي',
      inventory_count: 'جرد',
      allTypes: 'جميع الأنواع',
      search: 'بحث في المنتجات...',
      noData: 'لا توجد حركات',
      export: 'تصدير',
      refresh: 'تحديث'
    }
  }[language];

  // Fetch movements with product data
  const { data: movements = [], refetch, isLoading } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, products(name, name_ar, sku)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    }
  });

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof ArrowUp }> = {
      in: { label: t.in, variant: 'default', icon: ArrowUp },
      out: { label: t.out, variant: 'destructive', icon: ArrowDown },
      adjustment: { label: t.adjustment, variant: 'secondary', icon: ArrowUpDown },
      transfer_in: { label: t.transfer_in, variant: 'default', icon: ArrowUp },
      transfer_out: { label: t.transfer_out, variant: 'destructive', icon: ArrowDown },
      opening_balance: { label: t.opening_balance, variant: 'outline', icon: ArrowUp },
      inventory_count: { label: t.inventory_count, variant: 'secondary', icon: ArrowUpDown }
    };
    const typeConfig = config[type] || { label: type, variant: 'secondary' as const, icon: ArrowUpDown };
    const Icon = typeConfig.icon;
    return (
      <Badge variant={typeConfig.variant} className="gap-1">
        <Icon size={12} />
        {typeConfig.label}
      </Badge>
    );
  };

  const filteredMovements = useMemo(() => {
    let filtered = movements;
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(m => m.movement_type === typeFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.products?.name?.toLowerCase().includes(query) ||
        m.products?.name_ar?.includes(query) ||
        m.products?.sku?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [movements, typeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ArrowUpDown className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw size={16} className="me-2" />
            {t.refresh}
          </Button>
          <Button variant="outline" size="sm">
            <Download size={16} className="me-2" />
            {t.export}
          </Button>
        </div>
      </div>

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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter size={16} className="me-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allTypes}</SelectItem>
            <SelectItem value="in">{t.in}</SelectItem>
            <SelectItem value="out">{t.out}</SelectItem>
            <SelectItem value="adjustment">{t.adjustment}</SelectItem>
            <SelectItem value="transfer_in">{t.transfer_in}</SelectItem>
            <SelectItem value="transfer_out">{t.transfer_out}</SelectItem>
            <SelectItem value="opening_balance">{t.opening_balance}</SelectItem>
            <SelectItem value="inventory_count">{t.inventory_count}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Movements Table */}
      <Card className="card-elevated">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown size={18} />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] w-full">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[150px]">{t.date}</TableHead>
                    <TableHead className="min-w-[200px]">{t.product}</TableHead>
                    <TableHead className="min-w-[100px]">{t.sku}</TableHead>
                    <TableHead className="min-w-[130px]">{t.type}</TableHead>
                    <TableHead className="min-w-[80px]">{t.quantity}</TableHead>
                    <TableHead className="min-w-[80px]">{t.previousStock}</TableHead>
                    <TableHead className="min-w-[80px]">{t.newStock}</TableHead>
                    <TableHead className="min-w-[120px]">{t.reference}</TableHead>
                    <TableHead className="min-w-[150px]">{t.notes}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <RefreshCw className="animate-spin mx-auto" size={24} />
                      </TableCell>
                    </TableRow>
                  ) : filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {t.noData}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements.map(movement => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(movement.created_at, true)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {language === 'ar' 
                            ? movement.products?.name_ar || movement.products?.name
                            : movement.products?.name
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {movement.products?.sku}
                        </TableCell>
                        <TableCell>{getTypeBadge(movement.movement_type)}</TableCell>
                        <TableCell className={`font-semibold ${
                          ['in', 'transfer_in', 'opening_balance'].includes(movement.movement_type) 
                            ? 'text-green-500' 
                            : ['out', 'transfer_out'].includes(movement.movement_type)
                              ? 'text-red-500'
                              : ''
                        }`}>
                          {['in', 'transfer_in', 'opening_balance'].includes(movement.movement_type) 
                            ? `+${movement.quantity}`
                            : ['out', 'transfer_out'].includes(movement.movement_type)
                              ? `-${movement.quantity}`
                              : movement.quantity
                          }
                        </TableCell>
                        <TableCell>{movement.previous_stock}</TableCell>
                        <TableCell className="font-semibold">{movement.new_stock}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {movement.reference_type ? `${movement.reference_type}` : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[150px] truncate">
                          {movement.notes || '-'}
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

export default InventoryMovements;
