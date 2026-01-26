import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrencyTax } from "@/hooks/useCurrencyTax";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Save, Printer, Crown, Star } from "lucide-react";
import { format } from "date-fns";
import QuickProductSearch from "@/components/shared/QuickProductSearch";

interface InvoiceItem {
  id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  total_price: number;
}

interface SalesInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  editInvoice?: any;
}

const SalesInvoiceForm = ({ isOpen, onClose, editInvoice }: SalesInvoiceFormProps) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { currencies, taxRates, defaultCurrency, defaultTaxRate, formatAmount, getCurrencyName, getTaxRateName } = useCurrencyTax();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    salesman_id: "",
    branch_id: "",
    warehouse_id: "",
    due_date: "",
    payment_method: "cash",
    discount_percent: 0,
    tax_rate_id: "",
    currency_id: "",
    notes: ""
  });

  // Set defaults when data loads
  useEffect(() => {
    if (defaultTaxRate && !formData.tax_rate_id) {
      setFormData(prev => ({ ...prev, tax_rate_id: defaultTaxRate.id }));
    }
    if (defaultCurrency && !formData.currency_id) {
      setFormData(prev => ({ ...prev, currency_id: defaultCurrency.id }));
    }
  }, [defaultTaxRate, defaultCurrency, formData.tax_rate_id, formData.currency_id]);

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch salesmen
  const { data: salesmen } = useQuery({
    queryKey: ['salesmen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salesmen')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
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
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
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

  // Generate invoice number
  const { data: invoiceNumber } = useQuery({
    queryKey: ['new-invoice-number'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('generate_sales_invoice_number');
      if (error) throw error;
      return data;
    }
  });

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const discountAmount = (subtotal * formData.discount_percent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const selectedTaxRate = taxRates.find(t => t.id === formData.tax_rate_id);
    const taxPercent = selectedTaxRate?.rate || 0;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const totalAmount = afterDiscount + taxAmount;
    
    return { subtotal, discountAmount, taxAmount, totalAmount, taxPercent };
  };

  const totals = calculateTotals();

  // Add product to items
  const addProduct = (product: any) => {
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setItems(updated);
    } else {
      const newItem: InvoiceItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_variant_id: null,
        product_name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.price,
        discount_amount: 0,
        discount_percent: 0,
        tax_amount: 0,
        total_price: product.price
      };
      setItems([...items, newItem]);
    }
  };

  // Update item
  const updateItem = (id: string, field: string, value: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent') {
          const baseTotal = newItem.quantity * newItem.unit_price;
          const discount = (baseTotal * newItem.discount_percent) / 100;
          newItem.discount_amount = discount;
          newItem.total_price = baseTotal - discount;
        }
        return newItem;
      }
      return item;
    });
    setItems(updated);
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!formData.customer_id) {
        throw new Error(language === 'ar' ? 'يجب اختيار العميل' : 'Customer is required');
      }
      if (items.length === 0) {
        throw new Error(language === 'ar' ? 'يجب إضافة أصناف' : 'Items are required');
      }

      const paymentStatus = formData.payment_method === 'credit' ? 'pending' : 'paid';
      const paidAmount = formData.payment_method === 'credit' ? 0 : totals.totalAmount;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('sales_invoices')
        .insert({
          invoice_number: invoiceNumber,
          invoice_type: 'standard',
          customer_id: formData.customer_id,
          salesman_id: formData.salesman_id || null,
          branch_id: formData.branch_id || null,
          warehouse_id: formData.warehouse_id || null,
          due_date: formData.due_date || null,
          subtotal: totals.subtotal,
          discount_amount: totals.discountAmount,
          discount_percent: formData.discount_percent,
          tax_amount: totals.taxAmount,
          tax_percent: totals.taxPercent,
          total_amount: totals.totalAmount,
          paid_amount: paidAmount,
          remaining_amount: totals.totalAmount - paidAmount,
          payment_status: paymentStatus,
          payment_method: formData.payment_method,
          notes: formData.notes
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount,
        discount_percent: item.discount_percent,
        tax_amount: item.tax_amount,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update product stock and create inventory movements
      for (const item of items) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            const previousStock = product.stock;
            const newStock = Math.max(0, previousStock - item.quantity);
            
            // Update product stock
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.product_id);

            // Create inventory movement record
            await supabase
              .from('inventory_movements')
              .insert({
                product_id: item.product_id,
                warehouse_id: formData.warehouse_id || null,
                movement_type: 'sale',
                quantity: -item.quantity,
                previous_stock: previousStock,
                new_stock: newStock,
                reference_type: 'sales_invoice',
                reference_id: invoice.id,
                notes: `فاتورة مبيعات رقم ${invoiceNumber}`
              });
          }
        }
      }

      // Update customer total purchases and add loyalty points
      if (formData.customer_id) {
        const customer = customers?.find(c => c.id === formData.customer_id);
        if (customer) {
          // Calculate loyalty points: 1 point per 1000 YER
          const earnedPoints = Math.floor(totals.totalAmount / 1000);
          
          await supabase
            .from('customers')
            .update({ 
              total_purchases: (customer.total_purchases || 0) + totals.totalAmount,
              loyalty_points: (customer.loyalty_points || 0) + earnedPoints
            })
            .eq('id', formData.customer_id);
        }
      }

      return invoice;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['new-invoice-number'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-search'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setItems([]);
    setFormData({
      customer_id: "",
      salesman_id: "",
      branch_id: "",
      warehouse_id: "",
      due_date: "",
      payment_method: "cash",
      discount_percent: 0,
      tax_rate_id: defaultTaxRate?.id || "",
      currency_id: defaultCurrency?.id || "",
      notes: ""
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'فاتورة مبيعات جديدة' : 'New Sales Invoice'}
            {invoiceNumber && ` - ${invoiceNumber}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer & Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'معلومات الفاتورة' : 'Invoice Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label>{language === 'ar' ? 'العميل *' : 'Customer *'}</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر العميل' : 'Select customer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center gap-2">
                            <span>{language === 'ar' ? customer.name_ar || customer.name : customer.name}</span>
                            {(customer.loyalty_points || 0) > 0 && (
                              <span className="flex items-center gap-1 text-warning text-xs">
                                <Star size={10} className="fill-warning" />
                                {customer.loyalty_points}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Show selected customer loyalty points */}
                  {formData.customer_id && (() => {
                    const customer = customers?.find(c => c.id === formData.customer_id);
                    if (!customer) return null;
                    return (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20">
                        <Crown size={16} className="text-warning" />
                        <span className="text-sm font-medium">
                          {language === 'ar' ? 'نقاط الولاء:' : 'Loyalty Points:'}
                        </span>
                        <span className="text-warning font-bold">{customer.loyalty_points || 0}</span>
                        <span className="text-xs text-muted-foreground">
                          (+{Math.floor(totals.totalAmount / 1000)} {language === 'ar' ? 'نقطة جديدة' : 'new pts'})
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <Label>{language === 'ar' ? 'المندوب' : 'Salesman'}</Label>
                  <Select
                    value={formData.salesman_id}
                    onValueChange={(value) => setFormData({ ...formData, salesman_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر المندوب' : 'Select salesman'} />
                    </SelectTrigger>
                    <SelectContent>
                      {salesmen?.map((salesman) => (
                        <SelectItem key={salesman.id} value={salesman.id}>
                          {language === 'ar' ? salesman.name_ar || salesman.name : salesman.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                  <Select
                    value={formData.branch_id}
                    onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select branch'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'المخزن' : 'Warehouse'}</Label>
                  <Select
                    value={formData.warehouse_id}
                    onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر المخزن' : 'Select warehouse'} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
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
                          <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                          <SelectItem value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Search & Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'الأصناف' : 'Items'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Product Search */}
                <QuickProductSearch
                  onSelectProduct={addProduct}
                  priceField="price"
                  placeholder={language === 'ar' ? 'بحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
                  autoFocus
                  showStock
                />

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                        <TableHead className="w-28">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                        <TableHead className="w-24">{language === 'ar' ? 'خصم %' : 'Disc %'}</TableHead>
                        <TableHead className="w-28">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {language === 'ar' ? 'لا توجد أصناف' : 'No items added'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-xs text-muted-foreground">{item.sku}</div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount_percent}
                                onChange={(e) => updateItem(item.id, 'discount_percent', parseFloat(e.target.value) || 0)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.total_price.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="pt-4">
                <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'ملخص الفاتورة' : 'Invoice Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Currency Selection */}
                <div className="flex items-center gap-2">
                  <Label className="w-24">
                    {language === 'ar' ? 'العملة' : 'Currency'}
                  </Label>
                  <Select
                    value={formData.currency_id}
                    onValueChange={(value) => setFormData({ ...formData, currency_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر العملة' : 'Select currency'} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {getCurrencyName(currency)} ({currency.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                  </span>
                  <span>{formatAmount(totals.subtotal, currencies.find(c => c.id === formData.currency_id)?.code)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-24">
                    {language === 'ar' ? 'خصم %' : 'Discount %'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                    className="w-20"
                  />
                  <span className="text-destructive">-{totals.discountAmount.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-24">
                    {language === 'ar' ? 'الضريبة' : 'Tax'}
                  </Label>
                  <Select
                    value={formData.tax_rate_id}
                    onValueChange={(value) => setFormData({ ...formData, tax_rate_id: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الضريبة' : 'Select tax'} />
                    </SelectTrigger>
                    <SelectContent>
                      {taxRates.map((rate) => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {getTaxRateName(rate)} ({rate.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-primary">+{totals.taxAmount.toLocaleString()}</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="text-primary">{totals.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={() => createInvoiceMutation.mutate()}
                    disabled={createInvoiceMutation.isPending || items.length === 0}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createInvoiceMutation.isPending 
                      ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                      : (language === 'ar' ? 'حفظ الفاتورة' : 'Save Invoice')}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Printer className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'حفظ وطباعة' : 'Save & Print'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesInvoiceForm;
