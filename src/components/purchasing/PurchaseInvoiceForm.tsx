import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  FileText, Plus, Trash2, Package, Search, Building2, 
  Warehouse, CreditCard, Calendar, Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface InvoiceItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
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
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    branch_id: '',
    warehouse_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_method: 'credit',
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.name_ar && p.name_ar.includes(searchQuery)) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const addProduct = (product: any) => {
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    
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
    setSearchQuery('');
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

      // Update product stock and calculate weighted average cost
      for (const item of items) {
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

          // Update product
          await supabase
            .from('products')
            .update({
              stock: newTotalStock,
              average_cost: newAvgCost,
              cost: newCost // Update last cost
            })
            .eq('id', item.product_id);

          // Create inventory movement
          await supabase
            .from('inventory_movements')
            .insert({
              product_id: item.product_id,
              warehouse_id: formData.warehouse_id,
              movement_type: 'purchase',
              quantity: newQuantity,
              previous_stock: currentStock,
              new_stock: newTotalStock,
              reference_type: 'purchase_invoice',
              reference_id: invoice.id,
              notes: `فاتورة شراء رقم ${invoiceNumber}`
            });
        }
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

        // Create supplier transaction
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="text-primary" size={24} />
            {language === 'ar' ? 'فاتورة شراء جديدة' : 'New Purchase Invoice'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Supplier */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 size={14} />
                {language === 'ar' ? 'المورد' : 'Supplier'} *
              </Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المورد' : 'Select supplier'} />
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
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
              <Select 
                value={formData.branch_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, branch_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select branch'} />
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Warehouse size={14} />
                {language === 'ar' ? 'المستودع' : 'Warehouse'} *
              </Label>
              <Select 
                value={formData.warehouse_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, warehouse_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المستودع' : 'Select warehouse'} />
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard size={14} />
                {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              </Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                  <SelectItem value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</SelectItem>
                  <SelectItem value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                  <SelectItem value="check">{language === 'ar' ? 'شيك' : 'Check'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar size={14} />
                {language === 'ar' ? 'تاريخ الفاتورة' : 'Invoice Date'}
              </Label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Product Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package size={18} />
                {language === 'ar' ? 'المنتجات' : 'Products'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder={language === 'ar' ? 'بحث بالاسم أو SKU أو الباركود...' : 'Search by name, SKU, or barcode...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-10"
                />
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {language === 'ar' ? 'لا توجد نتائج' : 'No results'}
                    </div>
                  ) : (
                    filteredProducts.slice(0, 10).map(product => (
                      <div
                        key={product.id}
                        onClick={() => addProduct(product)}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                      >
                        <div>
                          <p className="font-medium">
                            {language === 'ar' ? product.name_ar || product.name : product.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                        <div className="text-end">
                          <p className="font-semibold">{Number(product.cost || 0).toLocaleString()} YER</p>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' ? 'المخزون:' : 'Stock:'} {product.stock}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead className="w-28">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                      <TableHead className="w-20">{language === 'ar' ? 'خصم %' : 'Disc %'}</TableHead>
                      <TableHead className="w-20">{language === 'ar' ? 'ضريبة %' : 'Tax %'}</TableHead>
                      <TableHead className="w-28 text-end">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لم يتم إضافة منتجات بعد' : 'No products added yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{item.product_sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                              className="w-20 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.unit_cost}
                              onChange={(e) => updateItem(index, 'unit_cost', Number(e.target.value))}
                              className="w-24 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount_percent}
                              onChange={(e) => updateItem(index, 'discount_percent', Number(e.target.value))}
                              className="w-16 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.tax_percent}
                              onChange={(e) => updateItem(index, 'tax_percent', Number(e.target.value))}
                              className="w-16 h-8"
                            />
                          </TableCell>
                          <TableCell className="text-end font-semibold">
                            {item.total_cost.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 size={16} />
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
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'المجموع' : 'Subtotal'}</span>
                    <span>{totals.subtotal.toLocaleString()} YER</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'الخصم' : 'Discount'}</span>
                    <span className="text-destructive">-{totals.totalDiscount.toLocaleString()} YER</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'الضريبة' : 'Tax'}</span>
                    <span>+{totals.totalTax.toLocaleString()} YER</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-lg">
                    <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="text-primary">{totals.total.toLocaleString()} YER</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="min-w-32">
            {loading ? (
              <>
                <Loader2 size={16} className="me-2 animate-spin" />
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              language === 'ar' ? 'حفظ الفاتورة' : 'Save Invoice'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseInvoiceForm;
