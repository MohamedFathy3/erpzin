import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Search, 
  RotateCcw, 
  Package,
  Receipt,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Minus,
  Trash2,
  FileSearch,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
  product?: {
    id: string;
    name: string;
    name_ar: string | null;
    sku: string;
  };
}

interface Sale {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: string;
  status: string;
  customer?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
  sale_items: SaleItem[];
}

interface ReturnItem extends SaleItem {
  selected: boolean;
  return_quantity: number;
  return_reason: string;
}

interface POSReturnsProps {
  isOpen: boolean;
  onClose: () => void;
  currentShiftId?: string;
  onReturnComplete?: (amount: number) => void;
}

interface DirectReturnItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  reason: string;
}

// Direct Return Invoice Component (POS-style)
const DirectReturnInvoice: React.FC<{
  onComplete: (amount: number) => void;
  currentShiftId?: string;
}> = ({ onComplete, currentShiftId }) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { taxRates, defaultTaxRate, currencies, defaultCurrency, formatAmount, getTaxRateName, getCurrencyName } = useCurrencyTax();
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<DirectReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [taxRateId, setTaxRateId] = useState('');
  const [currencyId, setCurrencyId] = useState('');

  // Set defaults when data loads
  useEffect(() => {
    if (defaultTaxRate && !taxRateId) {
      setTaxRateId(defaultTaxRate.id);
    }
    if (defaultCurrency && !currencyId) {
      setCurrencyId(defaultCurrency.id);
    }
  }, [defaultTaxRate, defaultCurrency, taxRateId, currencyId]);

  // Search products
  const { data: products } = useQuery({
    queryKey: ['products-for-return'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, name_ar, sku, price')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.name_ar && p.name_ar.includes(searchQuery))
  ).slice(0, 8) || [];

  const addItem = (product: { id: string; name: string; name_ar: string | null; sku: string; price: number }) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => 
        i.product_id === product.id 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems([...items, {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name_ar || product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.price,
        reason: ''
      }]);
    }
    setSearchQuery('');
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const selectedTaxRate = taxRates.find(t => t.id === taxRateId);
  const taxPercent = selectedTaxRate?.rate || 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;

  // Process direct return
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');
      if (items.length === 0) throw new Error('لم يتم إضافة أي صنف');

      const { data: returnNumber } = await supabase.rpc('generate_return_number');

      const { data: returnRecord, error: returnError } = await supabase
        .from('pos_returns')
        .insert({
          return_number: returnNumber,
          return_type: 'direct',
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          refund_method: refundMethod,
          reason: returnReason,
          processed_by: user.id,
          shift_id: currentShiftId || null
        })
        .select()
        .single();

      if (returnError) throw returnError;

      const returnItemsData = items.map(item => ({
        return_id: returnRecord.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        reason: item.reason || returnReason
      }));

      const { error: itemsError } = await supabase
        .from('pos_return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // Update stock
      for (const item of items) {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (currentProduct) {
          await supabase
            .from('products')
            .update({ stock: currentProduct.stock + item.quantity })
            .eq('id', item.product_id);
        }
      }

      // Update shift returns total
      if (currentShiftId) {
        const { data: currentShift } = await supabase
          .from('pos_shifts')
          .select('total_returns')
          .eq('id', currentShiftId)
          .single();

        if (currentShift) {
          await supabase
            .from('pos_shifts')
            .update({ total_returns: (currentShift.total_returns || 0) + total })
            .eq('id', currentShiftId);
        }
      }

      return total;
    },
    onSuccess: (totalAmount) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast.success('تم إنشاء فاتورة المرتجع بنجاح');
      onComplete(totalAmount);
    },
    onError: (error: any) => {
      toast.error('خطأ: ' + error.message);
    }
  });

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Search Products */}
      <div className="relative">
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          placeholder="ابحث عن المنتج بالاسم أو الباركود..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 ps-12 text-base rounded-xl"
        />
        
        {/* Search Results Dropdown */}
        {searchQuery && filteredProducts.length > 0 && (
          <div className="absolute top-full start-0 end-0 mt-1 bg-background border rounded-xl shadow-lg z-50 max-h-64 overflow-auto">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => addItem(product)}
                className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between border-b last:border-b-0"
              >
                <div>
                  <div className="font-medium">{product.name_ar || product.name}</div>
                  <div className="text-sm text-muted-foreground">{product.sku}</div>
                </div>
                <div className="font-bold text-primary">{product.price.toLocaleString()} ر.ي</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items List - POS Style */}
      <ScrollArea className="flex-1 border rounded-xl">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لم يتم إضافة أصناف بعد</p>
              <p className="text-sm mt-1">ابحث عن المنتجات لإضافتها</p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {items.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-muted/30 border flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-sm text-muted-foreground">{item.sku}</div>
                  <div className="text-primary font-semibold mt-1">
                    {item.unit_price.toLocaleString()} × {item.quantity} = {(item.unit_price * item.quantity).toLocaleString()} ر.ي
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <Button size="icon" variant="outline" onClick={() => updateQuantity(item.id, 1)} className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Return Reason & Refund Method */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm mb-2 block">سبب الإرجاع</Label>
          <Input 
            placeholder="سبب الإرجاع (اختياري)"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="rounded-lg"
          />
        </div>
        <div>
          <Label className="text-sm mb-2 block">طريقة الاسترداد</Label>
          <Select value={refundMethod} onValueChange={setRefundMethod}>
            <SelectTrigger className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">نقداً</SelectItem>
              <SelectItem value="card">بطاقة</SelectItem>
              <SelectItem value="credit">رصيد للعميل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Footer - Totals & Action */}
      <div className="p-4 bg-sidebar rounded-xl text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'} {formatAmount(subtotal, currencies.find(c => c.id === currencyId)?.code)}</span>
              <span>{language === 'ar' ? 'الضريبة' : 'Tax'} ({taxPercent}%): {formatAmount(taxAmount, currencies.find(c => c.id === currencyId)?.code)}</span>
            </div>
            <div className="text-2xl font-bold">
              {language === 'ar' ? 'الإجمالي:' : 'Total:'} {formatAmount(total, currencies.find(c => c.id === currencyId)?.code)}
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => processReturnMutation.mutate()}
            disabled={items.length === 0 || processReturnMutation.isPending}
            className="h-14 px-8 text-lg rounded-xl bg-destructive hover:bg-destructive/90"
          >
            <RotateCcw className="h-5 w-5 me-2" />
            {processReturnMutation.isPending ? 'جاري المعالجة...' : 'تأكيد المرتجع'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const POSReturns: React.FC<POSReturnsProps> = ({ 
  isOpen, 
  onClose, 
  currentShiftId,
  onReturnComplete 
}) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { taxRates, defaultTaxRate, currencies, defaultCurrency, formatAmount, getTaxRateName, getCurrencyName } = useCurrencyTax();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [step, setStep] = useState<'invoice' | 'search' | 'select' | 'confirm'>('invoice');
  const [directReturnMode, setDirectReturnMode] = useState(true);
  const [allowDirectReturn, setAllowDirectReturn] = useState(true); // This can be controlled by settings
  const [taxRateId, setTaxRateId] = useState('');
  const [currencyId, setCurrencyId] = useState('');

  // Set defaults when data loads
  useEffect(() => {
    if (defaultTaxRate && !taxRateId) {
      setTaxRateId(defaultTaxRate.id);
    }
    if (defaultCurrency && !currencyId) {
      setCurrencyId(defaultCurrency.id);
    }
  }, [defaultTaxRate, defaultCurrency, taxRateId, currencyId]);

  // Search for invoice
  const { data: searchResults, isLoading: isSearching, refetch: searchInvoice } = useQuery({
    queryKey: ['search-invoice', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name, name_ar),
          sale_items(
            *,
            product:products(id, name, name_ar, sku)
          )
        `)
        .or(`invoice_number.ilike.%${searchQuery}%`)
        .eq('status', 'completed')
        .order('sale_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Sale[];
    },
    enabled: false,
  });

  // Process return mutation
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');
      if (!selectedSale) throw new Error('لم يتم تحديد فاتورة');

      const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);
      if (selectedItems.length === 0) throw new Error('لم يتم تحديد أي صنف للإرجاع');

      // Calculate totals
      const subtotal = selectedItems.reduce((sum, item) => 
        sum + (item.unit_price * item.return_quantity), 0
      );
      const selectedTaxRate = taxRates.find(t => t.id === taxRateId);
      const taxPercent = selectedTaxRate?.rate || 0;
      const taxAmount = (subtotal * taxPercent) / 100;
      const totalAmount = subtotal + taxAmount;

      // Generate return number
      const { data: returnNumber } = await supabase.rpc('generate_return_number');

      // Create return record
      const { data: returnRecord, error: returnError } = await supabase
        .from('pos_returns')
        .insert({
          return_number: returnNumber,
          original_sale_id: selectedSale.id,
          original_invoice_number: selectedSale.invoice_number,
          shift_id: currentShiftId || null,
          customer_id: selectedSale.customer?.id || null,
          return_type: selectedItems.length === selectedSale.sale_items.length ? 'full' : 'partial',
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          refund_method: refundMethod,
          reason: returnReason,
          processed_by: user.id
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemsData = selectedItems.map(item => ({
        return_id: returnRecord.id,
        original_sale_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product?.name || 'غير معروف',
        quantity: item.return_quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.return_quantity,
        reason: item.return_reason || returnReason
      }));

      const { error: itemsError } = await supabase
        .from('pos_return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // Update product stock (increase)
      for (const item of selectedItems) {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (currentProduct) {
          await supabase
            .from('products')
            .update({ stock: currentProduct.stock + item.return_quantity })
            .eq('id', item.product_id);
        }
      }

      // Update shift returns total if shift exists
      if (currentShiftId) {
        const { data: currentShift } = await supabase
          .from('pos_shifts')
          .select('total_returns')
          .eq('id', currentShiftId)
          .single();

        if (currentShift) {
          await supabase
            .from('pos_shifts')
            .update({ 
              total_returns: (currentShift.total_returns || 0) + totalAmount 
            })
            .eq('id', currentShiftId);
        }
      }

      return { returnRecord, totalAmount };
    },
    onSuccess: ({ totalAmount }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast.success('تم إرجاع الفاتورة بنجاح');
      onReturnComplete?.(totalAmount);
      handleClose();
    },
    onError: (error: any) => {
      toast.error('خطأ في معالجة المرتجع: ' + error.message);
    }
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchInvoice();
    }
  };

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setReturnItems(sale.sale_items.map(item => ({
      ...item,
      selected: false,
      return_quantity: item.quantity,
      return_reason: ''
    })));
    setStep('select');
  };

  const toggleItemSelection = (itemId: string) => {
    setReturnItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateReturnQuantity = (itemId: string, quantity: number) => {
    setReturnItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, return_quantity: Math.min(Math.max(1, quantity), item.quantity) } : item
    ));
  };

  const selectAll = () => {
    setReturnItems(prev => prev.map(item => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    setReturnItems(prev => prev.map(item => ({ ...item, selected: false })));
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedSale(null);
    setReturnItems([]);
    setReturnReason('');
    setRefundMethod('cash');
    setStep('invoice');
    setDirectReturnMode(true);
    onClose();
  };

  const selectedItemsTotal = returnItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (item.unit_price * item.return_quantity), 0);

  const selectedItemsCount = returnItems.filter(item => item.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col bg-background">
        {/* Header - POS Style */}
        <div className="bg-sidebar px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {step === 'invoice' ? 'فاتورة مرتجع' : 'مرتجعات المبيعات'}
              </h2>
              <p className="text-white/60 text-sm">
                {step === 'invoice' ? 'إنشاء فاتورة مرتجع مباشرة' : 'إرجاع الأصناف واسترداد المبلغ'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === 'invoice' && allowDirectReturn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('search')}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <FileSearch className="h-4 w-4 me-1" />
                <span className="text-xs">البحث بفاتورة</span>
              </Button>
            )}
            {step === 'search' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('invoice')}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4 me-1" />
                <span className="text-xs">مرتجع مباشر</span>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          {step === 'invoice' && (
            <DirectReturnInvoice 
              onComplete={(amount) => {
                onReturnComplete?.(amount);
                handleClose();
              }}
              currentShiftId={currentShiftId}
            />
          )}

          {step === 'search' && (
            <div className="space-y-6 h-full flex flex-col">
              {/* Search Input - POS Style */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    placeholder="ابحث برقم الفاتورة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-14 ps-12 text-lg rounded-xl"
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  className="h-14 px-8 rounded-xl text-base"
                >
                  <Search className="h-5 w-5 me-2" />
                  بحث
                </Button>
              </div>

              {/* Search Results - Card Grid */}
              <ScrollArea className="flex-1">
                {isSearching ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-lg">جاري البحث...</p>
                    </div>
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((sale) => (
                      <Card 
                        key={sale.id} 
                        className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                        onClick={() => handleSelectSale(sale)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Receipt className="h-7 w-7 text-primary" />
                              </div>
                              <div>
                                <div className="font-bold text-lg">{sale.invoice_number}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {format(new Date(sale.sale_date), 'yyyy/MM/dd HH:mm', { locale: ar })}
                                </div>
                                {sale.customer && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    👤 {sale.customer.name_ar || sale.customer.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-xl text-primary">
                                {sale.total_amount.toLocaleString()} ر.ي
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                📦 {sale.sale_items.length} صنف
                              </div>
                              <Badge variant="secondary" className="mt-2">{sale.payment_method}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchQuery && !isSearching ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-10 w-10 opacity-50" />
                      </div>
                      <p className="text-lg font-medium">لم يتم العثور على فواتير</p>
                      <p className="text-sm mt-1">تأكد من رقم الفاتورة وحاول مرة أخرى</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-10 w-10 opacity-50" />
                      </div>
                      <p className="text-lg font-medium">ابحث عن فاتورة</p>
                      <p className="text-sm mt-1">أدخل رقم الفاتورة للبحث عنها</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {step === 'select' && selectedSale && (
            <div className="space-y-4 h-full flex flex-col">
              {/* Invoice Info - Enhanced */}
              <div className="p-4 rounded-xl bg-sidebar/5 border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{selectedSale.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(selectedSale.sale_date), 'yyyy/MM/dd HH:mm', { locale: ar })}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('search')} className="rounded-lg">
                  <X className="h-4 w-4 me-1" />
                  تغيير الفاتورة
                </Button>
              </div>

              {/* Selection Controls */}
              <div className="flex gap-3 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={selectAll} className="rounded-lg">
                  <CheckCircle2 className="h-4 w-4 me-1" />
                  تحديد الكل
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll} className="rounded-lg">
                  <X className="h-4 w-4 me-1" />
                  إلغاء التحديد
                </Button>
              </div>

              {/* Items Grid - POS Style */}
              <ScrollArea className="flex-1 border rounded-xl">
                <div className="p-3 space-y-2">
                  {returnItems.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => toggleItemSelection(item.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        item.selected 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-transparent bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          className="h-5 w-5"
                        />
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-base">
                            {item.product?.name_ar || item.product?.name || 'غير معروف'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.product?.sku} • الكمية المباعة: {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <Label className="text-xs text-muted-foreground">كمية الإرجاع</Label>
                            <Input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={item.return_quantity}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 text-center h-10 rounded-lg font-bold"
                              disabled={!item.selected}
                            />
                          </div>
                          <div className="text-left min-w-[100px]">
                            <Label className="text-xs text-muted-foreground">الإجمالي</Label>
                            <div className="font-bold text-lg text-primary">
                              {(item.unit_price * item.return_quantity).toLocaleString()} ر.ي
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Return Details - Enhanced */}
              <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">سبب الإرجاع</Label>
                  <Textarea
                    placeholder="اكتب سبب الإرجاع..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={2}
                    className="rounded-xl resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">طريقة الاسترداد</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 نقدي</SelectItem>
                      <SelectItem value="card">💳 بطاقة</SelectItem>
                      <SelectItem value="credit">👤 رصيد للعميل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - POS Style */}
        {step === 'select' && (
          <div className="bg-muted/30 border-t p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-muted-foreground text-sm">الأصناف المحددة</span>
                <div className="font-bold text-2xl">{selectedItemsCount}</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <span className="text-muted-foreground text-sm">إجمالي المرتجع</span>
                <div className="font-bold text-2xl text-primary">
                  {selectedItemsTotal.toLocaleString()} ر.ي
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="h-12 px-6 rounded-xl"
              >
                إلغاء
              </Button>
              <Button 
                onClick={() => processReturnMutation.mutate()}
                disabled={selectedItemsCount === 0 || processReturnMutation.isPending}
                className="h-12 px-8 rounded-xl text-base font-bold"
              >
                {processReturnMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin me-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 me-2" />
                    تأكيد المرتجع
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default POSReturns;
