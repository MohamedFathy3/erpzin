import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  X
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

const POSReturns: React.FC<POSReturnsProps> = ({ 
  isOpen, 
  onClose, 
  currentShiftId,
  onReturnComplete 
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [step, setStep] = useState<'search' | 'select' | 'confirm'>('search');

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
      const taxAmount = subtotal * 0.15; // Assuming 15% tax
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
    setStep('search');
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
              <h2 className="text-lg font-bold text-white">مرتجعات المبيعات</h2>
              <p className="text-white/60 text-sm">إرجاع الأصناف واسترداد المبلغ</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden p-6">
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
