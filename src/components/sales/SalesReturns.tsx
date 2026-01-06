import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, RotateCcw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ReturnItem {
  id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  original_quantity: number;
  return_quantity: number;
  unit_price: number;
  total_price: number;
  selected: boolean;
  already_returned: number;
}

const SalesReturns = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Search invoices
  const { data: searchResults, isLoading: isSearching, refetch: searchInvoice } = useQuery({
    queryKey: ['search-invoice-for-return', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];

      // Search in sales_invoices (standard)
      const { data: standardInvoices, error: err1 } = await supabase
        .from('sales_invoices')
        .select(`
          *,
          customer:customers(id, name, name_ar, phone),
          items:sales_invoice_items(*)
        `)
        .or(`invoice_number.ilike.%${searchQuery}%`)
        .eq('status', 'active')
        .limit(10);

      // Search in sales (POS)
      const { data: posInvoices, error: err2 } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name, name_ar, phone),
          items:sale_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product:products(name, name_ar)
          )
        `)
        .or(`invoice_number.ilike.%${searchQuery}%`)
        .eq('status', 'completed')
        .limit(10);

      const combined = [
        ...(standardInvoices || []).map(inv => ({ ...inv, invoice_type: 'standard' })),
        ...(posInvoices || []).map(inv => ({ ...inv, invoice_type: 'pos' }))
      ];

      return combined;
    },
    enabled: false
  });

  // Fetch existing returns for selected invoice
  const { data: existingReturns } = useQuery({
    queryKey: ['existing-returns', selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice) return [];
      
      const { data, error } = await supabase
        .from('sales_return_items')
        .select(`
          *,
          return:sales_returns!inner(original_invoice_id, original_invoice_number)
        `)
        .eq('return.original_invoice_number', selectedInvoice.invoice_number);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedInvoice
  });

  // Handle invoice selection
  const handleSelectInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    
    // Calculate already returned quantities
    const returnedMap = new Map<string, number>();
    existingReturns?.forEach(item => {
      const key = item.product_id || item.product_name;
      returnedMap.set(key, (returnedMap.get(key) || 0) + item.quantity);
    });

    // Map items based on invoice type
    const items: ReturnItem[] = invoice.items?.map((item: any) => {
      const productName = invoice.invoice_type === 'pos' 
        ? (item.product?.name || 'Unknown')
        : item.product_name;
      
      const key = item.product_id || productName;
      const alreadyReturned = returnedMap.get(key) || 0;
      
      return {
        id: item.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id || null,
        product_name: productName,
        original_quantity: item.quantity,
        return_quantity: 0,
        unit_price: item.unit_price,
        total_price: 0,
        selected: false,
        already_returned: alreadyReturned
      };
    }) || [];
    
    setReturnItems(items);
  };

  // Toggle item selection
  const toggleItem = (id: string) => {
    setReturnItems(items => items.map(item => {
      if (item.id === id) {
        const selected = !item.selected;
        return {
          ...item,
          selected,
          return_quantity: selected ? Math.max(0, item.original_quantity - item.already_returned) : 0,
          total_price: selected ? (item.original_quantity - item.already_returned) * item.unit_price : 0
        };
      }
      return item;
    }));
  };

  // Update return quantity
  const updateReturnQuantity = (id: string, quantity: number) => {
    setReturnItems(items => items.map(item => {
      if (item.id === id) {
        const maxQty = item.original_quantity - item.already_returned;
        const validQty = Math.min(Math.max(0, quantity), maxQty);
        return {
          ...item,
          return_quantity: validQty,
          total_price: validQty * item.unit_price
        };
      }
      return item;
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);
    const subtotal = selectedItems.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = (subtotal * (selectedInvoice?.tax_percent || 15)) / 100;
    return { subtotal, taxAmount, totalAmount: subtotal + taxAmount, itemCount: selectedItems.length };
  };

  const totals = calculateTotals();

  // Process return mutation
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);
      
      if (selectedItems.length === 0) {
        throw new Error(language === 'ar' ? 'يجب اختيار أصناف للإرجاع' : 'Select items to return');
      }

      // Generate return number
      const { data: returnNumber } = await supabase.rpc('generate_sales_return_number');

      // Create return record
      const { data: returnRecord, error: returnError } = await supabase
        .from('sales_returns')
        .insert({
          return_number: returnNumber,
          original_invoice_id: selectedInvoice.invoice_type === 'standard' ? selectedInvoice.id : null,
          original_invoice_number: selectedInvoice.invoice_number,
          invoice_type: selectedInvoice.invoice_type,
          customer_id: selectedInvoice.customer_id,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.totalAmount,
          refund_method: refundMethod,
          reason,
          notes,
          status: 'completed'
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemsData = selectedItems.map(item => ({
        return_id: returnRecord.id,
        original_item_id: item.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        product_name: item.product_name,
        quantity: item.return_quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        reason
      }));

      const { error: itemsError } = await supabase
        .from('sales_return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // Update product stock (increase stock)
      for (const item of selectedItems) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock + item.return_quantity })
              .eq('id', item.product_id);
          }
        }
      }

      // Handle refund based on method
      if (refundMethod === 'cash') {
        // Create treasury transaction for cash refund
        // This would integrate with treasury system
      } else if (refundMethod === 'account_deduction' && selectedInvoice.customer_id) {
        // Deduct from customer balance
        const customer = await supabase
          .from('customers')
          .select('total_purchases')
          .eq('id', selectedInvoice.customer_id)
          .single();
        
        if (customer.data) {
          await supabase
            .from('customers')
            .update({ 
              total_purchases: Math.max(0, (customer.data.total_purchases || 0) - totals.totalAmount)
            })
            .eq('id', selectedInvoice.customer_id);
        }
      }

      return returnRecord;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إنشاء المرتجع بنجاح' : 'Return processed successfully');
      queryClient.invalidateQueries({ queryKey: ['sales-returns'] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setSearchQuery("");
    setSelectedInvoice(null);
    setReturnItems([]);
    setRefundMethod("cash");
    setReason("");
    setNotes("");
  };

  // Fetch recent returns
  const { data: recentReturns } = useQuery({
    queryKey: ['recent-sales-returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_returns')
        .select(`
          *,
          customer:customers(name, name_ar)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Return Form */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {language === 'ar' ? 'مرتجع مبيعات' : 'Sales Return'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Invoice */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'ابحث برقم الفاتورة...' : 'Search by invoice number...'}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchInvoice()}
                />
              </div>
              <Button onClick={() => searchInvoice()} disabled={isSearching}>
                {language === 'ar' ? 'بحث' : 'Search'}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults && searchResults.length > 0 && !selectedInvoice && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          {language === 'ar' 
                            ? invoice.customer?.name_ar || invoice.customer?.name 
                            : invoice.customer?.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.invoice_type === 'pos' ? 'secondary' : 'outline'}>
                            {invoice.invoice_type === 'pos' ? 'POS' : 'Standard'}
                          </Badge>
                        </TableCell>
                        <TableCell>{invoice.total_amount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleSelectInvoice(invoice)}>
                            {language === 'ar' ? 'اختر' : 'Select'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Selected Invoice Items */}
            {selectedInvoice && (
              <>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <span className="font-mono font-medium">{selectedInvoice.invoice_number}</span>
                    <span className="mx-2">-</span>
                    <span>
                      {language === 'ar' 
                        ? selectedInvoice.customer?.name_ar || selectedInvoice.customer?.name 
                        : selectedInvoice.customer?.name}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'الكمية الأصلية' : 'Orig. Qty'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'مرتجع سابق' : 'Prev. Ret.'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'كمية الإرجاع' : 'Return Qty'}</TableHead>
                        <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnItems.map((item) => {
                        const availableQty = item.original_quantity - item.already_returned;
                        const canReturn = availableQty > 0;
                        
                        return (
                          <TableRow key={item.id} className={!canReturn ? 'opacity-50' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={item.selected}
                                onCheckedChange={() => toggleItem(item.id)}
                                disabled={!canReturn}
                              />
                            </TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell className="text-center">{item.original_quantity}</TableCell>
                            <TableCell className="text-center">
                              {item.already_returned > 0 && (
                                <Badge variant="destructive">{item.already_returned}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {canReturn ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max={availableQty}
                                  value={item.return_quantity}
                                  onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 0)}
                                  className="w-20 mx-auto"
                                  disabled={!item.selected}
                                />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.total_price.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Return Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'ar' ? 'طريقة الاسترداد' : 'Refund Method'}</Label>
                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                        <SelectItem value="credit_note">{language === 'ar' ? 'إشعار دائن' : 'Credit Note'}</SelectItem>
                        <SelectItem value="account_deduction">{language === 'ar' ? 'خصم من الحساب' : 'Account Deduction'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'سبب الإرجاع' : 'Return Reason'}</Label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل السبب...' : 'Enter reason...'}
                    />
                  </div>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary & Recent Returns */}
      <div className="space-y-4">
        {/* Return Summary */}
        {selectedInvoice && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {language === 'ar' ? 'ملخص المرتجع' : 'Return Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'عدد الأصناف:' : 'Items:'}
                </span>
                <span>{totals.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}
                </span>
                <span>{totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'الضريبة:' : 'Tax:'}
                </span>
                <span>{totals.taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{language === 'ar' ? 'إجمالي الاسترداد:' : 'Refund Total:'}</span>
                <span className="text-primary">{totals.totalAmount.toLocaleString()}</span>
              </div>

              <Button
                className="w-full mt-4"
                onClick={() => processReturnMutation.mutate()}
                disabled={processReturnMutation.isPending || totals.itemCount === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {processReturnMutation.isPending 
                  ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                  : (language === 'ar' ? 'تأكيد المرتجع' : 'Confirm Return')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Returns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {language === 'ar' ? 'آخر المرتجعات' : 'Recent Returns'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentReturns?.slice(0, 5).map((ret) => (
                <div key={ret.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <div className="font-mono text-sm">{ret.return_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(ret.created_at), 'yyyy/MM/dd HH:mm')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-destructive">
                      -{ret.total_amount?.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ret.customer?.name || ret.customer?.name_ar}
                    </div>
                  </div>
                </div>
              ))}
              {(!recentReturns || recentReturns.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  {language === 'ar' ? 'لا توجد مرتجعات' : 'No returns yet'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesReturns;
