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
import { Plus, Trash2, Search, Save } from "lucide-react";

interface ReturnItem {
  id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reason: string;
}

interface SalesReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const SalesReturnForm = ({ isOpen, onClose }: SalesReturnFormProps) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { currencies, taxRates, defaultCurrency, defaultTaxRate, formatAmount, getCurrencyName, getTaxRateName } = useCurrencyTax();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    branch_id: "",
    warehouse_id: "",
    refund_method: "cash",
    reason: "",
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

  // Fetch products for search
  const { data: products } = useQuery({
    queryKey: ['products-search-return', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 0
  });

  // Generate return number
  const { data: returnNumber } = useQuery({
    queryKey: ['new-return-number'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('generate_sales_return_number');
      if (error) throw error;
      return data;
    }
  });

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const selectedTaxRate = taxRates.find(t => t.id === formData.tax_rate_id);
    const taxPercent = selectedTaxRate?.rate || 0;
    const taxAmount = (subtotal * taxPercent) / 100;
    const totalAmount = subtotal + taxAmount;
    
    return { subtotal, taxAmount, totalAmount, taxPercent };
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
      const newItem: ReturnItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_variant_id: null,
        product_name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
        reason: ""
      };
      setItems([...items, newItem]);
    }
    setSearchQuery("");
  };

  // Update item
  const updateItem = (id: string, field: string, value: number | string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          newItem.total_price = newItem.quantity * newItem.unit_price;
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

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) {
        throw new Error(language === 'ar' ? 'يجب إضافة أصناف' : 'Items are required');
      }

      // Create return
      const { data: returnRecord, error: returnError } = await supabase
        .from('sales_returns')
        .insert({
          return_number: returnNumber,
          customer_id: formData.customer_id || null,
          branch_id: formData.branch_id || null,
          warehouse_id: formData.warehouse_id || null,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.totalAmount,
          refund_method: formData.refund_method,
          reason: formData.reason,
          notes: formData.notes,
          status: 'completed',
          invoice_type: 'direct'
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItems = items.map(item => ({
        return_id: returnRecord.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        reason: item.reason || formData.reason
      }));

      const { error: itemsError } = await supabase
        .from('sales_return_items')
        .insert(returnItems);

      if (itemsError) throw itemsError;

      // Update product stock (add back to inventory)
      for (const item of items) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock + item.quantity })
              .eq('id', item.product_id);
          }
        }
      }

      return returnRecord;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إنشاء المرتجع بنجاح' : 'Return created successfully');
      queryClient.invalidateQueries({ queryKey: ['sales-invoices-for-return'] });
      queryClient.invalidateQueries({ queryKey: ['new-return-number'] });
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
      branch_id: "",
      warehouse_id: "",
      refund_method: "cash",
      reason: "",
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
            {language === 'ar' ? 'فاتورة مرتجع مبيعات جديدة' : 'New Sales Return'}
            {returnNumber && ` - ${returnNumber}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Return Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'معلومات المرتجع' : 'Return Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label>{language === 'ar' ? 'العميل' : 'Customer'}</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر العميل (اختياري)' : 'Select customer (optional)'} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {language === 'ar' ? customer.name_ar || customer.name : customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{language === 'ar' ? 'طريقة الاسترداد' : 'Refund Method'}</Label>
                  <Select
                    value={formData.refund_method}
                    onValueChange={(value) => setFormData({ ...formData, refund_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                      <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                      <SelectItem value="credit">{language === 'ar' ? 'رصيد' : 'Store Credit'}</SelectItem>
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

                <div className="col-span-2">
                  <Label>{language === 'ar' ? 'سبب الإرجاع' : 'Return Reason'}</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value) => setFormData({ ...formData, reason: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر السبب' : 'Select reason'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="defective">{language === 'ar' ? 'عيب في المنتج' : 'Defective'}</SelectItem>
                      <SelectItem value="wrong_item">{language === 'ar' ? 'منتج خاطئ' : 'Wrong Item'}</SelectItem>
                      <SelectItem value="customer_change">{language === 'ar' ? 'تغيير رأي العميل' : 'Customer Changed Mind'}</SelectItem>
                      <SelectItem value="damaged">{language === 'ar' ? 'تلف' : 'Damaged'}</SelectItem>
                      <SelectItem value="expired">{language === 'ar' ? 'منتهي الصلاحية' : 'Expired'}</SelectItem>
                      <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product Search & Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'الأصناف المرتجعة' : 'Return Items'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ar' ? 'ابحث عن منتج بالاسم أو الباركود...' : 'Search product by name or barcode...'}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {products && products.length > 0 && searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                          onClick={() => addProduct(product)}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.sku} - {product.price.toLocaleString()} 
                            <span className="mx-2">|</span>
                            {language === 'ar' ? 'المخزون:' : 'Stock:'} {product.stock}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                        <TableHead className="w-32">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                        <TableHead className="w-32">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            {language === 'ar' ? 'ابحث عن منتج لإضافته' : 'Search for a product to add'}
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
                                className="w-28"
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
          </div>

          {/* Summary Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'ملخص المرتجع' : 'Return Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                  </span>
                  <span>{totals.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'الضريبة (15%)' : 'Tax (15%)'}
                  </span>
                  <span>{totals.taxAmount.toLocaleString()}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>{language === 'ar' ? 'المبلغ المسترد' : 'Refund Amount'}</span>
                    <span className="text-primary">{totals.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                  rows={4}
                />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => createReturnMutation.mutate()}
                disabled={items.length === 0 || createReturnMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'حفظ المرتجع' : 'Save Return'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesReturnForm;
