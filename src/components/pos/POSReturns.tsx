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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            مرتجعات المبيعات
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'search' && (
            <div className="space-y-4">
              {/* Search Input */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="ابحث برقم الفاتورة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="h-4 w-4 ml-2" />
                  بحث
                </Button>
              </div>

              {/* Search Results */}
              <ScrollArea className="h-[400px]">
                {isSearching ? (
                  <div className="text-center py-8 text-muted-foreground">
                    جاري البحث...
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((sale) => (
                      <Card 
                        key={sale.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleSelectSale(sale)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Receipt className="h-8 w-8 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{sale.invoice_number}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(sale.sale_date), 'yyyy/MM/dd HH:mm', { locale: ar })}
                                </div>
                                {sale.customer && (
                                  <div className="text-sm text-muted-foreground">
                                    العميل: {sale.customer.name_ar || sale.customer.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-lg">
                                {sale.total_amount.toLocaleString()} ر.ي
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {sale.sale_items.length} صنف
                              </div>
                              <Badge variant="outline">{sale.payment_method}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchQuery && !isSearching ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لم يتم العثور على فواتير</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>أدخل رقم الفاتورة للبحث</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {step === 'select' && selectedSale && (
            <div className="space-y-4">
              {/* Invoice Info */}
              <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">فاتورة رقم: </span>
                  <span className="font-medium">{selectedSale.invoice_number}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep('search')}>
                  <X className="h-4 w-4 ml-1" />
                  تغيير
                </Button>
              </div>

              {/* Selection Controls */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  تحديد الكل
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  إلغاء التحديد
                </Button>
              </div>

              {/* Items Table */}
              <ScrollArea className="h-[280px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead className="text-center">الكمية المباعة</TableHead>
                      <TableHead className="text-center">كمية الإرجاع</TableHead>
                      <TableHead className="text-left">السعر</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnItems.map((item) => (
                      <TableRow key={item.id} className={item.selected ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {item.product?.name_ar || item.product?.name || 'غير معروف'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.product?.sku}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={item.return_quantity}
                            onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-20 text-center mx-auto"
                            disabled={!item.selected}
                          />
                        </TableCell>
                        <TableCell className="text-left font-medium">
                          {(item.unit_price * item.return_quantity).toLocaleString()} ر.ي
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Return Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>سبب الإرجاع</Label>
                  <Textarea
                    placeholder="اكتب سبب الإرجاع..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>طريقة الاسترداد</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                      <SelectItem value="credit">رصيد للعميل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-primary/10 flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">الأصناف المحددة: </span>
                  <span className="font-bold">{selectedItemsCount}</span>
                </div>
                <div className="text-xl font-bold">
                  إجمالي الإرجاع: {selectedItemsTotal.toLocaleString()} ر.ي
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            إلغاء
          </Button>
          {step === 'select' && (
            <Button 
              onClick={() => processReturnMutation.mutate()}
              disabled={selectedItemsCount === 0 || processReturnMutation.isPending}
            >
              {processReturnMutation.isPending ? (
                'جاري المعالجة...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  تأكيد الإرجاع
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default POSReturns;
