import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Trash2, Save, Printer, Crown, Star, Barcode, Search } from "lucide-react";
import { format } from "date-fns";
import QuickProductSearch from "@/components/shared/QuickProductSearch";
import api from "@/lib/api";

// ========== أنواع البيانات ==========

interface Customer {
  id: number;
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  address?: string;
  point?: number;
  last_paid_amount?: number;
}

interface SalesRepresentative {
  id: number;
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  commission_rate?: number;
  is_active?: boolean;
}

interface Branch {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active?: boolean;
}

interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active?: boolean;
}

interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  exchange_rate: number;
  is_default?: boolean;
}

interface Tax {
  id: number;
  name: string;
  name_ar?: string;
  rate: number;
  is_default?: boolean;
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  barcode?: string;
  price: number;
  sell_price?: number;
  cost?: number;
  stock: number;
  reorder_level?: number;
  active?: boolean;
  image_url?: string | null;
  image?: any;
  units?: any[];
}

interface InvoiceItem {
  id: string;
  product_id: number | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
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
  
  // ========== State ==========
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    sales_representative_id: "",
    branch_id: "",
    warehouse_id: "",
    due_date: "",
    payment_method: "cash" as 'cash' | 'card' | 'wallet' | 'credit',
    discount_percent: 0,
    tax_id: "",
    currency_id: "",
    notes: ""
  });
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  // ========== Set Defaults ==========
  useEffect(() => {
    if (defaultTaxRate && !formData.tax_id) {
      setFormData(prev => ({ ...prev, tax_id: defaultTaxRate.id }));
    }
    if (defaultCurrency && !formData.currency_id) {
      setFormData(prev => ({ ...prev, currency_id: defaultCurrency.id }));
    }
  }, [defaultTaxRate, defaultCurrency, formData.tax_id, formData.currency_id]);

  // ========== Generate Invoice Number ==========
  useEffect(() => {
    if (isOpen) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9000 + 1000);
      setInvoiceNumber(`INV-${year}${month}${day}-${random}`);
    }
  }, [isOpen]);

  // ========== Queries ==========

  // ✅ جلب العملاء - POST /customer/index
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/customer/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب العملاء' : 'Error fetching customers');
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب المندوبين - POST /sales-representative/index
  const { data: salesmen = [] } = useQuery({
    queryKey: ['salesmen-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/sales-representative/index', {
          filters: { is_active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching sales representatives:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب المندوبين' : 'Error fetching sales representatives');
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب الفروع - POST /branch/index
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب الفروع' : 'Error fetching branches');
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب المخازن - POST /warehouse/index
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/warehouse/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب المخازن' : 'Error fetching warehouses');
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب المنتجات للبحث السريع - POST /product/index
  const { data: products = [] } = useQuery({
    queryKey: ['products-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // ========== Calculations ==========
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = (subtotal * formData.discount_percent) / 100;
    const afterDiscount = subtotal - discountAmount;
    
    const selectedTax = taxRates.find(t => t.id === formData.tax_id);
    const taxPercent = selectedTax?.rate || 0;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    const totalAmount = afterDiscount + taxAmount;
    
    return { 
      subtotal, 
      discountAmount, 
      taxAmount, 
      totalAmount, 
      taxPercent 
    };
  };

  const totals = calculateTotals();

  // ========== Handlers ==========

  // ✅ إضافة منتج
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
        product_name: product.name_ar || product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: Number(product.sell_price || product.price || 0),
        discount_percent: 0,
        discount_amount: 0,
        tax_amount: 0,
        total_price: Number(product.sell_price || product.price || 0)
      };
      setItems([...items, newItem]);
    }

    toast.success(language === 'ar' ? 'تم إضافة المنتج' : 'Product added');
  };

  // ✅ تحديث كمية المنتج
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

  // ✅ حذف منتج
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success(language === 'ar' ? 'تم حذف المنتج' : 'Product removed');
  };

  // ✅ إعادة تعيين النموذج
  const resetForm = () => {
    setItems([]);
    setFormData({
      customer_id: "",
      sales_representative_id: "",
      branch_id: "",
      warehouse_id: "",
      due_date: "",
      payment_method: "cash",
      discount_percent: 0,
      tax_id: defaultTaxRate?.id || "",
      currency_id: defaultCurrency?.id || "",
      notes: ""
    });
  };

  // ✅ إنشاء فاتورة جديدة - POST /sales-invoice/store
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      // التحقق من البيانات المطلوبة
      if (!formData.customer_id) {
        throw new Error(language === 'ar' ? 'يجب اختيار العميل' : 'Customer is required');
      }
      if (items.length === 0) {
        throw new Error(language === 'ar' ? 'يجب إضافة أصناف' : 'Items are required');
      }

      // تجهيز payload
      const payload = {
        customer_id: Number(formData.customer_id),
        sales_representative_id: formData.sales_representative_id ? Number(formData.sales_representative_id) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
        currency_id: formData.currency_id ? Number(formData.currency_id) : null,
        tax_id: formData.tax_id ? Number(formData.tax_id) : null,
        payment_method: formData.payment_method,
        due_date: formData.due_date || null,
        note: formData.notes || null,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.unit_price
        }))
      };

      console.log('📤 Creating sales invoice:', payload);

      const response = await api.post('/sales-invoice/store', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(language === 'ar' ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
      
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products-form'] });
      
      // إغلاق النموذج وإعادة تعيينه
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('❌ Error creating invoice:', error);
      toast.error(
        language === 'ar' 
          ? error.response?.data?.message || 'حدث خطأ في إنشاء الفاتورة'
          : error.response?.data?.message || 'Error creating invoice'
      );
    }
  });

  // ========== Render ==========
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{language === 'ar' ? 'فاتورة مبيعات جديدة' : 'New Sales Invoice'}</span>
            {invoiceNumber && (
              <span className="text-sm font-mono bg-muted px-3 py-1 rounded-full">
                {invoiceNumber}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========== Main Form ========== */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer & Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {language === 'ar' ? 'معلومات الفاتورة' : 'Invoice Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {/* العميل */}
                <div className="col-span-2 md:col-span-1">
                  <Label className="flex items-center gap-1">
                    {language === 'ar' ? 'العميل' : 'Customer'} 
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر العميل' : 'Select customer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>
                              {language === 'ar' ? customer.name_ar || customer.name : customer.name}
                            </span>
                            {(customer.point || 0) > 0 && (
                              <span className="flex items-center gap-1 text-warning text-xs">
                                <Star size={10} className="fill-warning" />
                                {customer.point}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* عرض نقاط الولاء للعميل المحدد */}
                  {formData.customer_id && (() => {
                    const customer = customers.find((c: Customer) => c.id === Number(formData.customer_id));
                    if (!customer) return null;
                    
                    const earnedPoints = Math.floor(totals.totalAmount / 1000);
                    
                    return (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20">
                        <Crown size={16} className="text-warning" />
                        <span className="text-sm font-medium">
                          {language === 'ar' ? 'نقاط الولاء:' : 'Loyalty Points:'}
                        </span>
                        <span className="text-warning font-bold">{customer.point || 0}</span>
                        {earnedPoints > 0 && (
                          <span className="text-xs text-muted-foreground">
                            (+{earnedPoints} {language === 'ar' ? 'نقطة جديدة' : 'new pts'})
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* المندوب */}
                <div className="col-span-2 md:col-span-1">
                  <Label>{language === 'ar' ? 'المندوب' : 'Salesman'}</Label>
                  <Select
                    value={formData.sales_representative_id}
                    onValueChange={(value) => setFormData({ ...formData, sales_representative_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر المندوب' : 'Select salesman'} />
                    </SelectTrigger>
                    <SelectContent>
                      {salesmen.map((salesman: SalesRepresentative) => (
                        <SelectItem key={salesman.id} value={salesman.id.toString()}>
                          {language === 'ar' ? salesman.name_ar || salesman.name : salesman.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* الفرع */}
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
                      {branches.map((branch: Branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* المخزن */}
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
                      {warehouses.map((warehouse: Warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                          {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* طريقة الدفع */}
                <div>
                  <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                      <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                      <SelectItem value="wallet">{language === 'ar' ? 'محفظة' : 'Wallet'}</SelectItem>
                      <SelectItem value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* تاريخ الاستحقاق */}
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
                  priceField="sell_price"
                  placeholder={language === 'ar' ? 'بحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
                  autoFocus
                  showStock
                />

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="w-24 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                        <TableHead className="w-28 text-right">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                        <TableHead className="w-24 text-center">{language === 'ar' ? 'خصم %' : 'Disc %'}</TableHead>
                        <TableHead className="w-28 text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Barcode size={24} className="opacity-30" />
                              <span>{language === 'ar' ? 'لا توجد أصناف' : 'No items added'}</span>
                            </div>
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
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-24 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount_percent}
                                onChange={(e) => updateItem(item.id, 'discount_percent', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-right">
                              {item.total_price.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
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
                  placeholder={language === 'ar' ? 'أضف ملاحظات للفاتورة...' : 'Add invoice notes...'}
                />
              </CardContent>
            </Card>
          </div>

          {/* ========== Summary ========== */}
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

                {/* Subtotal */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                  </span>
                  <span className="font-medium">
                    {formatAmount(totals.subtotal, currencies.find(c => c.id === formData.currency_id)?.code)}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex items-center gap-2">
                  <Label className="w-24">
                    {language === 'ar' ? 'خصم %' : 'Discount %'}
                  </Label>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <span className="text-destructive flex-1 text-right">
                      -{formatAmount(totals.discountAmount, currencies.find(c => c.id === formData.currency_id)?.code)}
                    </span>
                  </div>
                </div>

                {/* Tax */}
                <div className="flex items-center gap-2">
                  <Label className="w-24">
                    {language === 'ar' ? 'الضريبة' : 'Tax'}
                  </Label>
                  <div className="flex-1 flex items-center gap-2">
                    <Select
                      value={formData.tax_id}
                      onValueChange={(value) => setFormData({ ...formData, tax_id: value })}
                    >
                      <SelectTrigger className="w-32">
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
                    <span className="text-primary flex-1 text-right">
                      +{formatAmount(totals.taxAmount, currencies.find(c => c.id === formData.currency_id)?.code)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">
                      {language === 'ar' ? 'الإجمالي' : 'Total'}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatAmount(totals.totalAmount, currencies.find(c => c.id === formData.currency_id)?.code)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={() => createInvoiceMutation.mutate()}
                    disabled={createInvoiceMutation.isPending || items.length === 0}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {createInvoiceMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {language === 'ar' ? 'حفظ الفاتورة' : 'Save Invoice'}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Printer className="h-4 w-4" />
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