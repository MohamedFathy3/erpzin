import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText, Trash2, Package, Building2,
  Warehouse, CreditCard, Calendar, Loader2, Layers
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import PurchaseVariantSelector from './PurchaseVariantSelector';
import QuickProductSearch from '@/components/shared/QuickProductSearch';

interface InvoiceItem {
  id: string;
  product_id: string;
  product_variant_id?: string;
  product_name: string;
  product_sku: string;
  size_name?: string;
  color_name?: string;
  quantity: number;
  unit_cost: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  total_cost: number;
}

interface PurchaseInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const PurchaseInvoiceForm: React.FC<PurchaseInvoiceFormProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { currencies, taxRates, defaultCurrency, defaultTaxRate, formatAmount, getCurrencyName, getTaxRateName } = useCurrencyTax();
  const [loading, setLoading] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);

  const [formData, setFormData] = useState({
    supplier_id: '',
    branch_id: '',
    warehouse_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_method: 'credit',
    tax_rate_id: '',
    currency_id: '',
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Set defaults when data loads
  useEffect(() => {
    if (defaultTaxRate && !formData.tax_rate_id) {
      setFormData(prev => ({ ...prev, tax_rate_id: defaultTaxRate.id }));
    }
    if (defaultCurrency && !formData.currency_id) {
      setFormData(prev => ({ ...prev, currency_id: defaultCurrency.id }));
    }
  }, [defaultTaxRate, defaultCurrency, formData.tax_rate_id, formData.currency_id]);

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-purchase'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });



  const handleProductClick = (product: any) => {
    if (product.has_variants) {
      setVariantProduct(product);
    } else {
      addProduct(product);
    }
  };

  const addProduct = (product: any) => {
    const existingIndex = items.findIndex(item => item.product_id === product.id && !item.product_variant_id);

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      recalculateItem(newItems, existingIndex);
      setItems(newItems);
    } else {
      const newItem: InvoiceItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: language === 'ar' ? product.name_ar || product.name : product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_cost: Number(product.cost) || 0,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: 0,
        tax_amount: 0,
        total_cost: Number(product.cost) || 0
      };
      setItems([...items, newItem]);
    }
  };

  const addVariant = (variant: {
    product_id: string;
    variant_id: string;
    product_name: string;
    product_sku: string;
    unit_cost: number;
    size_name?: string;
    color_name?: string;
  }) => {
    const existingIndex = items.findIndex(item => item.product_variant_id === variant.variant_id);

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      recalculateItem(newItems, existingIndex);
      setItems(newItems);
    } else {
      const newItem: InvoiceItem = {
        id: crypto.randomUUID(),
        product_id: variant.product_id,
        product_variant_id: variant.variant_id,
        product_name: variant.product_name,
        product_sku: variant.product_sku,
        size_name: variant.size_name,
        color_name: variant.color_name,
        quantity: 1,
        unit_cost: variant.unit_cost,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: 0,
        tax_amount: 0,
        total_cost: variant.unit_cost
      };
      setItems([...items, newItem]);
    }
    setVariantProduct(null);
  };

  const recalculateItem = (itemsArray: InvoiceItem[], index: number) => {
    const item = itemsArray[index];
    const subtotal = item.quantity * item.unit_cost;
    item.discount_amount = (subtotal * item.discount_percent) / 100;
    const afterDiscount = subtotal - item.discount_amount;
    item.tax_amount = (afterDiscount * item.tax_percent) / 100;
    item.total_cost = afterDiscount + item.tax_amount;
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    recalculateItem(newItems, index);
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = items.reduce((sum, item) => sum + item.total_cost, 0);
    return { subtotal, totalDiscount, totalTax, total };
  };

  const handleSubmit = async () => {
    if (!formData.supplier_id) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار المورد' : 'Please select a supplier',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.warehouse_id) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار المستودع' : 'Please select a warehouse',
        variant: 'destructive'
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إضافة منتجات' : 'Please add products',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const totals = calculateTotals();

      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc('generate_purchase_invoice_number');

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('purchase_invoices')
        .insert({
          invoice_number: invoiceNumber,
          supplier_id: formData.supplier_id,
          branch_id: formData.branch_id || null,
          warehouse_id: formData.warehouse_id,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date || null,
          payment_method: formData.payment_method,
          subtotal: totals.subtotal,
          discount_amount: totals.totalDiscount,
          tax_amount: totals.totalTax,
          total_amount: totals.total,
          remaining_amount: formData.payment_method === 'cash' ? 0 : totals.total,
          paid_amount: formData.payment_method === 'cash' ? totals.total : 0,
          payment_status: formData.payment_method === 'cash' ? 'paid' : 'unpaid',
          notes: formData.notes
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        tax_percent: item.tax_percent,
        tax_amount: item.tax_amount,
        total_cost: item.total_cost
      }));

      const { error: itemsError } = await supabase
        .from('purchase_invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update stock for each item
      for (const item of items) {
        if (item.product_variant_id) {
          // Update variant stock
          const { data: variant } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', item.product_variant_id)
            .single();

          if (variant) {
            await supabase
              .from('product_variants')
              .update({ stock: variant.stock + item.quantity })
              .eq('id', item.product_variant_id);
          }
        } else {
          // Update product stock
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            const currentStock = product.stock || 0;
            const currentAvgCost = Number(product.average_cost) || Number(product.cost) || 0;
            const newQuantity = item.quantity;
            const newCost = item.unit_cost;

            // Calculate weighted average cost
            const totalValue = (currentStock * currentAvgCost) + (newQuantity * newCost);
            const newTotalStock = currentStock + newQuantity;
            const newAvgCost = newTotalStock > 0 ? totalValue / newTotalStock : newCost;

            await supabase
              .from('products')
              .update({
                stock: newTotalStock,
                average_cost: newAvgCost,
                cost: newCost
              })
              .eq('id', item.product_id);
          }
        }

        // Create inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product_id,
            warehouse_id: formData.warehouse_id,
            movement_type: 'purchase',
            quantity: item.quantity,
            previous_stock: 0,
            new_stock: item.quantity,
            reference_type: 'purchase_invoice',
            reference_id: invoice.id,
            notes: `فاتورة شراء رقم ${invoiceNumber}`
          });
      }

      // Update supplier balance if credit
      if (formData.payment_method === 'credit') {
        const supplier = suppliers.find(s => s.id === formData.supplier_id);
        const currentBalance = Number(supplier?.balance) || 0;
        const newBalance = currentBalance + totals.total;

        await supabase
          .from('suppliers')
          .update({ balance: newBalance })
          .eq('id', formData.supplier_id);

        await supabase
          .from('supplier_transactions')
          .insert({
            supplier_id: formData.supplier_id,
            transaction_type: 'invoice',
            reference_type: 'purchase_invoice',
            reference_id: invoice.id,
            amount: totals.total,
            balance_before: currentBalance,
            balance_after: newBalance,
            description: `فاتورة شراء رقم ${invoiceNumber}`
          });
      }

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar'
          ? `تم إنشاء فاتورة الشراء رقم ${invoiceNumber}`
          : `Purchase invoice ${invoiceNumber} created`
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-purchase'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-active'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });

      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="text-primary" size={20} />
              {language === 'ar' ? 'فاتورة شراء جديدة' : 'New Purchase Invoice'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Supplier */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Building2 size={12} />
                  {language === 'ar' ? 'المورد' : 'Supplier'} *
                </Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_id: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {language === 'ar' ? s.name_ar || s.name : s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Branch */}
              <div className="space-y-1">
                <Label className="text-xs">{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, branch_id: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {language === 'ar' ? b.name_ar || b.name : b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Warehouse */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Warehouse size={12} />
                  {language === 'ar' ? 'المستودع' : 'Warehouse'} *
                </Label>
                <Select
                  value={formData.warehouse_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, warehouse_id: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        {language === 'ar' ? w.name_ar || w.name : w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <CreditCard size={12} />
                  {language === 'ar' ? 'الدفع' : 'Payment'}
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method) => (
                        <SelectItem key={method.code} value={method.code}>
                          {language === 'ar' ? method.name_ar : method.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                        <SelectItem value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Date */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Calendar size={12} />
                  {language === 'ar' ? 'التاريخ' : 'Date'}
                </Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <Label className="text-xs">{language === 'ar' ? 'الاستحقاق' : 'Due'}</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>

              {/* Currency */}
              <div className="space-y-1">
                <Label className="text-xs">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                <Select
                  value={formData.currency_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency_id: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tax Rate */}
              <div className="space-y-1">
                <Label className="text-xs">{language === 'ar' ? 'الضريبة' : 'Tax'}</Label>
                <Select
                  value={formData.tax_rate_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tax_rate_id: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {taxRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Search */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package size={14} />
                  {language === 'ar' ? 'المنتجات' : 'Products'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <QuickProductSearch
                  onSelectProduct={handleProductClick}
                  priceField="cost"
                  placeholder={language === 'ar' ? 'بحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
                  autoFocus
                  showStock
                />

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-8 py-2 text-xs">#</TableHead>
                        <TableHead className="py-2 text-xs">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="w-16 py-2 text-xs text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                        <TableHead className="w-20 py-2 text-xs text-center">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                        <TableHead className="w-14 py-2 text-xs text-center">{language === 'ar' ? 'خصم%' : 'Disc%'}</TableHead>
                        <TableHead className="w-14 py-2 text-xs text-center">{language === 'ar' ? 'ضريبة%' : 'Tax%'}</TableHead>
                        <TableHead className="w-20 py-2 text-xs text-end">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        <TableHead className="w-8 py-2"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">
                            {language === 'ar' ? 'لم يتم إضافة منتجات' : 'No products added'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="py-1.5 text-xs text-center">{index + 1}</TableCell>
                            <TableCell className="py-1.5">
                              <div>
                                <p className="font-medium text-xs">{item.product_name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.product_sku}</p>
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                className="w-14 h-7 text-xs text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="0"
                                value={item.unit_cost}
                                onChange={(e) => updateItem(index, 'unit_cost', Number(e.target.value))}
                                className="w-18 h-7 text-xs text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount_percent}
                                onChange={(e) => updateItem(index, 'discount_percent', Number(e.target.value))}
                                className="w-12 h-7 text-xs text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.tax_percent}
                                onChange={(e) => updateItem(index, 'tax_percent', Number(e.target.value))}
                                className="w-12 h-7 text-xs text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-end font-semibold text-xs">
                              {item.total_cost.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-56 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'المجموع' : 'Subtotal'}</span>
                      <span>{totals.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'الخصم' : 'Discount'}</span>
                      <span className="text-destructive">-{totals.totalDiscount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'الضريبة' : 'Tax'}</span>
                      <span>+{totals.totalTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t font-bold">
                      <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-primary">{totals.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={language === 'ar' ? 'ملاحظات...' : 'Notes...'}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="p-4 pt-3 border-t bg-muted/30">
            <Button variant="outline" onClick={onClose} size="sm">
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={loading} size="sm" className="min-w-24">
              {loading ? (
                <>
                  <Loader2 size={14} className="me-1.5 animate-spin" />
                  {language === 'ar' ? 'جاري...' : 'Saving...'}
                </>
              ) : (
                language === 'ar' ? 'حفظ' : 'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Selector */}
      {variantProduct && (
        <PurchaseVariantSelector
          isOpen={!!variantProduct}
          onClose={() => setVariantProduct(null)}
          product={variantProduct}
          onSelectVariant={addVariant}
        />
      )}
    </>
  );
};

export default PurchaseInvoiceForm;
