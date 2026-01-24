import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrencyTax } from "@/hooks/useCurrencyTax";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, RotateCcw, Package, Plus, Minus, Loader2 } from "lucide-react";

interface ReturnItem {
  id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  original_quantity: number;
  return_quantity: number;
  unit_cost: number;
  total_cost: number;
  selected: boolean;
  already_returned: number;
}

interface PurchaseReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const PurchaseReturnForm = ({ isOpen, onClose, onSave }: PurchaseReturnFormProps) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { currencies, taxRates, defaultCurrency, defaultTaxRate, formatAmount, getCurrencyName, getTaxRateName } = useCurrencyTax();
  
  const [step, setStep] = useState<'search' | 'items'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState('credit');
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

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('id, name, name_ar').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name, name_ar').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch warehouses
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('id, name, name_ar').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Search invoices
  const { data: searchResults, isLoading: isSearching, refetch: searchInvoices } = useQuery({
    queryKey: ['search-purchase-invoices', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, name_ar),
          items:purchase_invoice_items(
            id,
            product_id,
            product_variant_id,
            quantity,
            unit_cost,
            total_cost,
            product:products(name, name_ar)
          )
        `)
        .ilike('invoice_number', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: false
  });

  // Fetch existing returns for selected invoice
  const { data: existingReturns } = useQuery({
    queryKey: ['existing-purchase-returns', selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice) return [];
      
      const { data, error } = await supabase
        .from('purchase_return_items')
        .select(`
          *,
          return:purchase_returns!inner(original_invoice_id)
        `)
        .eq('return.original_invoice_id', selectedInvoice.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedInvoice
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchInvoices();
    }
  };

  const handleSelectInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    
    const returnedMap = new Map<string, number>();
    existingReturns?.forEach(item => {
      const key = item.product_id || item.product_name;
      returnedMap.set(key, (returnedMap.get(key) || 0) + Number(item.quantity));
    });

    const items: ReturnItem[] = invoice.items?.map((item: any) => {
      const productName = item.product?.name || 'Unknown';
      const key = item.product_id || productName;
      const alreadyReturned = returnedMap.get(key) || 0;
      
      return {
        id: item.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id || null,
        product_name: language === 'ar' ? (item.product?.name_ar || productName) : productName,
        original_quantity: item.quantity,
        return_quantity: 0,
        unit_cost: Number(item.unit_cost),
        total_cost: 0,
        selected: false,
        already_returned: alreadyReturned
      };
    }) || [];
    
    setReturnItems(items);
    setStep('items');
  };

  const toggleItem = (id: string) => {
    setReturnItems(items => items.map(item => {
      if (item.id === id) {
        const selected = !item.selected;
        const maxQty = item.original_quantity - item.already_returned;
        return {
          ...item,
          selected,
          return_quantity: selected ? maxQty : 0,
          total_cost: selected ? maxQty * item.unit_cost : 0
        };
      }
      return item;
    }));
  };

  const updateReturnQuantity = (id: string, quantity: number) => {
    setReturnItems(items => items.map(item => {
      if (item.id === id) {
        const maxQty = item.original_quantity - item.already_returned;
        const validQty = Math.min(Math.max(0, quantity), maxQty);
        return {
          ...item,
          return_quantity: validQty,
          total_cost: validQty * item.unit_cost
        };
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);
    const subtotal = selectedItems.reduce((sum, item) => sum + item.total_cost, 0);
    const selectedTaxRate = taxRates.find(t => t.id === taxRateId);
    const taxPercent = selectedTaxRate?.rate || 0;
    const taxAmount = (subtotal * taxPercent) / 100;
    return { subtotal, taxAmount, totalAmount: subtotal + taxAmount, itemCount: selectedItems.length, taxPercent };
  };

  const totals = calculateTotals();

  // Process return mutation
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);
      
      if (selectedItems.length === 0) {
        throw new Error(language === 'ar' ? 'يجب اختيار أصناف للإرجاع' : 'Select items to return');
      }

      const { data: returnNumber } = await supabase.rpc('generate_purchase_return_number');

      const { data: returnRecord, error: returnError } = await supabase
        .from('purchase_returns')
        .insert({
          return_number: returnNumber,
          original_invoice_id: selectedInvoice.id,
          original_invoice_number: selectedInvoice.invoice_number,
          supplier_id: selectedInvoice.supplier_id,
          branch_id: selectedInvoice.branch_id,
          warehouse_id: selectedInvoice.warehouse_id,
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

      const returnItemsData = selectedItems.map(item => ({
        return_id: returnRecord.id,
        original_item_id: item.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        product_name: item.product_name,
        quantity: item.return_quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        reason
      }));

      const { error: itemsError } = await supabase
        .from('purchase_return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // Update product stock (decrease stock for returned items)
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
              .update({ stock: Math.max(0, product.stock - item.return_quantity) })
              .eq('id', item.product_id);
          }
        }
      }

      // Update supplier balance (reduce what we owe them)
      if (selectedInvoice.supplier_id) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('balance')
          .eq('id', selectedInvoice.supplier_id)
          .single();
        
        if (supplier) {
          await supabase
            .from('suppliers')
            .update({ balance: Number(supplier.balance || 0) - totals.totalAmount })
            .eq('id', selectedInvoice.supplier_id);
        }
      }

      return returnRecord;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إنشاء مرتجع المشتريات بنجاح' : 'Purchase return processed successfully');
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleClose();
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleClose = () => {
    setStep('search');
    setSearchQuery('');
    setSelectedInvoice(null);
    setReturnItems([]);
    setReason('');
    setNotes('');
    setRefundMethod('credit');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {language === 'ar' ? 'مرتجع مشتريات جديد' : 'New Purchase Return'}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'ابحث برقم فاتورة الشراء...' : 'Search by purchase invoice number...'}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((invoice: any) => (
                      <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          {language === 'ar' ? invoice.supplier?.name_ar || invoice.supplier?.name : invoice.supplier?.name}
                        </TableCell>
                        <TableCell>{Number(invoice.total_amount).toLocaleString()} YER</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleSelectInvoice(invoice)}>
                            {language === 'ar' ? 'اختيار' : 'Select'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {searchResults && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
              </div>
            )}
          </div>
        )}

        {step === 'items' && selectedInvoice && (
          <div className="space-y-4">
            {/* Invoice Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{language === 'ar' ? 'رقم الفاتورة:' : 'Invoice #:'}</span>
                    <span className="font-mono font-medium ml-2">{selectedInvoice.invoice_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{language === 'ar' ? 'المورد:' : 'Supplier:'}</span>
                    <span className="font-medium ml-2">
                      {language === 'ar' ? selectedInvoice.supplier?.name_ar || selectedInvoice.supplier?.name : selectedInvoice.supplier?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{language === 'ar' ? 'المبلغ الأصلي:' : 'Original Amount:'}</span>
                    <span className="font-medium ml-2">{Number(selectedInvoice.total_amount).toLocaleString()} YER</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{language === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                    <span className="font-medium ml-2">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الكمية الأصلية' : 'Original Qty'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'المرتجع سابقاً' : 'Already Returned'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'كمية الإرجاع' : 'Return Qty'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item) => {
                    const maxQty = item.original_quantity - item.already_returned;
                    const isDisabled = maxQty <= 0;
                    
                    return (
                      <TableRow key={item.id} className={isDisabled ? 'opacity-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItem(item.id)}
                            disabled={isDisabled}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {item.product_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.original_quantity}</TableCell>
                        <TableCell className="text-center">
                          {item.already_returned > 0 && (
                            <Badge variant="secondary">{item.already_returned}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              disabled={!item.selected || item.return_quantity <= 0}
                              onClick={() => updateReturnQuantity(item.id, item.return_quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.return_quantity}
                              onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 text-center h-7"
                              disabled={!item.selected}
                              min={0}
                              max={maxQty}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              disabled={!item.selected || item.return_quantity >= maxQty}
                              onClick={() => updateReturnQuantity(item.id, item.return_quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.unit_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.total_cost.toLocaleString()} YER
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Return Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label>{language === 'ar' ? 'سبب الإرجاع' : 'Return Reason'}</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر السبب' : 'Select reason'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="defective">{language === 'ar' ? 'منتج معيب' : 'Defective Product'}</SelectItem>
                      <SelectItem value="wrong_item">{language === 'ar' ? 'منتج خاطئ' : 'Wrong Item'}</SelectItem>
                      <SelectItem value="damaged">{language === 'ar' ? 'تالف' : 'Damaged'}</SelectItem>
                      <SelectItem value="excess">{language === 'ar' ? 'كمية زائدة' : 'Excess Quantity'}</SelectItem>
                      <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'طريقة الاسترداد' : 'Refund Method'}</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">{language === 'ar' ? 'خصم من الرصيد' : 'Credit to Account'}</SelectItem>
                      <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                      <SelectItem value="bank">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                    rows={3}
                  />
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-4">{language === 'ar' ? 'ملخص المرتجع' : 'Return Summary'}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'عدد الأصناف:' : 'Items:'}</span>
                      <span>{totals.itemCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                      <span>{totals.subtotal.toLocaleString()} YER</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'الضريبة (15%):' : 'Tax (15%):'}</span>
                      <span>{totals.taxAmount.toLocaleString()} YER</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                      <span className="text-primary">{totals.totalAmount.toLocaleString()} YER</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'items' && (
            <Button variant="outline" onClick={() => setStep('search')}>
              {language === 'ar' ? 'رجوع' : 'Back'}
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          {step === 'items' && (
            <Button
              onClick={() => processReturnMutation.mutate()}
              disabled={processReturnMutation.isPending || totals.itemCount === 0}
            >
              {processReturnMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {language === 'ar' ? 'تأكيد المرتجع' : 'Confirm Return'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseReturnForm;
