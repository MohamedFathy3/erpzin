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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText, Trash2, Package, Building2,
  Warehouse, CreditCard, Calendar, Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import PurchaseVariantSelector from './PurchaseVariantSelector';
import QuickProductSearch from '@/components/shared/QuickProductSearch';
import api from '@/lib/api';

interface InvoiceItem {
  id: string;
  product_id: number | null;
  product_variant_id?: number;
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

interface Supplier {
  id: number;
  name: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  active: boolean;
}

interface Branch {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  exchange_rate: string;
  active: boolean;
  default: boolean;
}

interface Tax {
  id: number;
  name: string;
  name_ar?: string;
  rate: number;
  active: boolean;
  default?: boolean;
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  barcode?: string;
  cost?: number;
  price?: number;
  stock: number;
  has_variants?: boolean;
  active: boolean;
  units?: Array<{
    id: number;
    unit_id: number;
    unit_name: string;
    cost_price: string;
    sell_price: string;
    barcode: string;
    colors?: Array<{
      id: number;
      color_id: number;
      color: string;
      stock: number;
    }>;
  }>;
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
  const [loading, setLoading] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);

  const [formData, setFormData] = useState({
    supplier_id: '',
    branch_id: '',
    warehouse_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_method: 'cash',
    tax_id: '',
    currency_id: '',
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  // ✅ جلب العملات - POST /currency/index
  const { data: currencies = [], isLoading: loadingCurrencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      try {
        const response = await api.post('/currency/index', {
          filters: { active: true },
          orderBy: 'name',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب الضرائب - POST /tax/index
  const { data: taxes = [], isLoading: loadingTaxes } = useQuery({
    queryKey: ['taxes'],
    queryFn: async () => {
      try {
        const response = await api.post('/tax/index', {
          filters: { active: true },
          orderBy: 'name',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching taxes:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب الموردين - POST /suppliers/index
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      try {
        const response = await api.post('/suppliers/index', {
          filters: { active: true },
          orderBy: 'name',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'فشل في جلب الموردين' : 'Failed to fetch suppliers',
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب الفروع - POST /branch/index
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', {
          filters: { active: true },
          orderBy: 'name',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب المستودعات - POST /warehouse/index
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses-active'],
    queryFn: async () => {
      try {
        const response = await api.post('/warehouse/index', {
          filters: { active: true },
          orderBy: 'name',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ جلب المنتجات - POST /warehouses/2/products (مؤقتاً)
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-purchase', formData.warehouse_id],
    queryFn: async () => {
      try {
        if (!formData.warehouse_id) return [];
        
        // استخدام الـ endpoint الخاص بالمخزن
        const response = await api.get(`/warehouses/${formData.warehouse_id}/products`, {
        });
        
        if (response.data.result === 'Success' || response.data.data) {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    enabled: isOpen && !!formData.warehouse_id // فقط لو اختار مخزن
  });

  // ✅ تعيين العملة الافتراضية
  useEffect(() => {
    if (currencies.length > 0 && !formData.currency_id) {
      const defaultCurr = currencies.find((c: Currency) => c.default === true) || currencies[0];
      setFormData(prev => ({ ...prev, currency_id: defaultCurr.id.toString() }));
    }
  }, [currencies]);

  // ✅ تعيين الضريبة الافتراضية
  useEffect(() => {
    if (taxes.length > 0 && !formData.tax_id) {
      const defaultTax = taxes.find((t: Tax) => t.default === true) || taxes[0];
      setFormData(prev => ({ ...prev, tax_id: defaultTax.id.toString() }));
    }
  }, [taxes]);

  // ✅ طرق الدفع
  const paymentMethods = [
    { code: 'cash', name: 'Cash', name_ar: 'نقداً' },
    { code: 'credit', name: 'Credit', name_ar: 'آجل' },
    { code: 'card', name: 'Card', name_ar: 'بطاقة' },
    { code: 'bank_transfer', name: 'Bank Transfer', name_ar: 'تحويل بنكي' }
  ];

  const handleProductClick = (product: any) => {
    // التحقق من وجود وحدات (variants)
    if (product.units && product.units.length > 0) {
      setVariantProduct(product);
    } else {
      addProduct(product);
    }
  };

  const addProduct = (product: any) => {
    const unitCost = Number(product.cost) || 0;
    
    const existingIndex = items.findIndex(item => item.product_id === product.id && !item.product_variant_id);

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      recalculateItem(newItems, existingIndex);
      setItems(newItems);
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم زيادة الكمية' : 'Quantity increased'
      });
    } else {
      const newItem: InvoiceItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: language === 'ar' ? product.name_ar || product.name : product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_cost: unitCost,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: 0,
        tax_amount: 0,
        total_cost: unitCost
      };
      setItems([...items, newItem]);
      toast({
        title: language === 'ar' ? 'تمت الإضافة' : 'Added',
        description: language === 'ar' ? 'تم إضافة المنتج' : 'Product added'
      });
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
    const unitCost = Number(variant.unit_cost) || 0;
    
    const existingIndex = items.findIndex(item => item.product_variant_id === Number(variant.variant_id));

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      recalculateItem(newItems, existingIndex);
      setItems(newItems);
    } else {
      const newItem: InvoiceItem = {
        id: crypto.randomUUID(),
        product_id: Number(variant.product_id),
        product_variant_id: Number(variant.variant_id),
        product_name: variant.product_name,
        product_sku: variant.product_sku,
        size_name: variant.size_name,
        color_name: variant.color_name,
        quantity: 1,
        unit_cost: unitCost,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: 0,
        tax_amount: 0,
        total_cost: unitCost
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
    toast({
      title: language === 'ar' ? 'تم الحذف' : 'Removed',
      description: language === 'ar' ? 'تم حذف المنتج' : 'Product removed'
    });
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = items.reduce((sum, item) => sum + item.total_cost, 0);
    return { subtotal, totalDiscount, totalTax, total };
  };

  // ✅ إنشاء فاتورة شراء - POST /purchases-invoices/store
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const totals = calculateTotals();

      const payload = {
        supplier_id: Number(formData.supplier_id),
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        warehouse_id: Number(formData.warehouse_id),
        currency_id: Number(formData.currency_id),
        tax_id: formData.tax_id ? Number(formData.tax_id) : null,
        payment_method: formData.payment_method,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        note: formData.notes || null,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.unit_cost,
          discount: item.discount_percent,
          tax: item.tax_percent
        }))
      };

      console.log('📦 Sending payload:', JSON.stringify(payload, null, 2));

      const response = await api.post('/purchases-invoices/store', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' 
          ? `تم إنشاء فاتورة الشراء بنجاح` 
          : `Purchase invoice created successfully`
      });

      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-purchase'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-active'] });

      resetForm();
      onSave();
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Error creating invoice:', error.response?.data || error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.response?.data?.message || error.message,
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    const defaultCurrency = currencies.find((c: Currency) => c.default === true) || currencies[0];
    const defaultTax = taxes.find((t: Tax) => t.default === true) || taxes[0];
    
    setFormData({
      supplier_id: '',
      branch_id: '',
      warehouse_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      payment_method: 'cash',
      tax_id: defaultTax?.id?.toString() || '',
      currency_id: defaultCurrency?.id?.toString() || '',
      notes: ''
    });
    setItems([]);
  };

  const handleSubmit = async () => {
    // التحقق من البيانات المطلوبة
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

    createInvoiceMutation.mutate();
  };

  const totals = calculateTotals();

  // ✅ دالة تنسيق العملة
  const formatCurrency = (amount: number) => {
    const currency = currencies.find((c: Currency) => c.id === Number(formData.currency_id));
    return `${amount.toLocaleString()} ${currency?.symbol || ''}`;
  };

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
                    {loadingSuppliers ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      suppliers.map((s: Supplier) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {language === 'ar' ? s.name_ar || s.name : s.name}
                        </SelectItem>
                      ))
                    )}
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
                    {loadingBranches ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      branches.map((b: Branch) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {language === 'ar' ? b.name_ar || b.name : b.name}
                        </SelectItem>
                      ))
                    )}
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
                    {loadingWarehouses ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      warehouses.map((w: Warehouse) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {language === 'ar' ? w.name_ar || w.name : w.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <CreditCard size={12} />
                  {language === 'ar' ? 'طريقة الدفع' : 'Payment'}
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.code} value={method.code}>
                        {language === 'ar' ? method.name_ar : method.name}
                      </SelectItem>
                    ))}
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
                <Label className="text-xs">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
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
                    {loadingCurrencies ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      currencies.map((currency: Currency) => (
                        <SelectItem key={currency.id} value={currency.id.toString()}>
                          {currency.symbol} - {language === 'ar' ? currency.name : currency.name}
                          {currency.default && (
                            <span className="ml-2 text-xs text-primary">(Default)</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tax */}
              <div className="space-y-1">
                <Label className="text-xs">{language === 'ar' ? 'الضريبة' : 'Tax'}</Label>
                <Select
                  value={formData.tax_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tax_id: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTaxes ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      taxes.map((tax: Tax) => (
                        <SelectItem key={tax.id} value={tax.id.toString()}>
                          {language === 'ar' ? tax.name_ar || tax.name : tax.name} ({tax.rate}%)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Search - يظهر فقط بعد اختيار المخزن */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package size={14} />
                  {language === 'ar' ? 'المنتجات' : 'Products'}
                  {!formData.warehouse_id && (
                    <span className="text-xs text-amber-600 font-normal">
                      {language === 'ar' ? '(اختر المخزن أولاً)' : '(Select warehouse first)'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <QuickProductSearch
                  onSelectProduct={handleProductClick}
                  priceField="cost"
                  placeholder={language === 'ar' ? 'بحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
                  autoFocus
                  showStock
                  products={products} // تمرير المنتجات من الـ API
                  disabled={!formData.warehouse_id}
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
                                {(item.size_name || item.color_name) && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {item.size_name && `📏 ${item.size_name}`}
                                    {item.color_name && ` 🎨 ${item.color_name}`}
                                  </p>
                                )}
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
                                step="0.01"
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
                              {formatCurrency(item.total_cost)}
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
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'المجموع' : 'Subtotal'}</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'الخصم' : 'Discount'}</span>
                      <span className="text-destructive">-{formatCurrency(totals.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'الضريبة' : 'Tax'}</span>
                      <span>+{formatCurrency(totals.totalTax)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t font-bold">
                      <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-primary">{formatCurrency(totals.total)}</span>
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
            <Button 
              onClick={handleSubmit} 
              disabled={createInvoiceMutation.isPending || items.length === 0 || !formData.warehouse_id} 
              size="sm" 
              className="min-w-24"
            >
              {createInvoiceMutation.isPending ? (
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