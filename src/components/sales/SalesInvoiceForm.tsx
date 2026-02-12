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
import { Plus, Trash2, Save, Printer, Crown, Star, Barcode, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import QuickProductSearch from "@/components/shared/QuickProductSearch";
import api from "@/lib/api";
import ProductSearch from "./ProductSearch"; 
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
  branch_id?: number | null; // 🔴 مهم جداً
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
  const { formatAmount } = useCurrencyTax(); // استخدمنا فقط formatAmount
  const [showProductSearch, setShowProductSearch] = useState(false);

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

  // ========== Queries ==========

  // ✅ 1. جلب العملات - POST /currency/index
  const { data: currencies = [], isLoading: loadingCurrencies } = useQuery({
    queryKey: ['currencies-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/currency/index', {
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
        console.error('Error fetching currencies:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب العملات' : 'Error fetching currencies');
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ 2. جلب الضرائب - POST /tax/index
  const { data: taxes = [], isLoading: loadingTaxes } = useQuery({
    queryKey: ['taxes-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/tax/index', {
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
        console.error('Error fetching taxes:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب الضرائب' : 'Error fetching taxes');
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ 3. جلب العملاء
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/customer/index', {
          filters: {},
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
        console.error('Error fetching customers:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب العملاء' : 'Error fetching customers');
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ 4. جلب المندوبين
  const { data: salesmen = [], isLoading: loadingSalesmen } = useQuery({
    queryKey: ['salesmen-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/sales-representative/index', {
          filters: {},
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
        console.error('Error fetching sales representatives:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ 5. جلب المخازن - الأولى (لازم يختار المخزن الأول)
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/warehouse/index', {
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
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // ✅ 6. جلب الفروع - على أساس المخزن المختار
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches-form', formData.warehouse_id],
    queryFn: async () => {
      try {
        // لو مخترش مخزن، متجبش حاجة
        if (!formData.warehouse_id) {
          return [];
        }

        // دور على المخزن المختار
        const selectedWarehouse = warehouses.find(w => w.id === Number(formData.warehouse_id));
        
        // لو المخزن عنده branch_id معين، جيب الفرع ده بالذات
        if (selectedWarehouse?.branch_id) {
          const response = await api.post('/branch/index', {
            filters: { 
              id: selectedWarehouse.branch_id,
              active: true 
            },
            orderBy: 'id',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: false
          });
          
          if (response.data.result === 'Success') {
            return response.data.data || [];
          }
        }
        
        // لو مفيش branch_id في المخزن، جيب كل الفروع النشطة
        const response = await api.post('/branch/index', {
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
        console.error('Error fetching branches:', error);
        return [];
      }
    },
    enabled: isOpen && !!formData.warehouse_id // 🔴 شغال بس لما يختار مخزن
  });

  // ✅ 7. جلب المنتجات
  const { data: products = [] } = useQuery({
    queryKey: ['products-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: {  },
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

  // ========== Set Default Currency & Tax ==========
  useEffect(() => {
    if (isOpen) {
      // تعيين أول عملة كافتراضية
      if (currencies.length > 0 && !formData.currency_id) {
        const defaultCurr = currencies.find(c => c.is_default) || currencies[0];
        setFormData(prev => ({ ...prev, currency_id: defaultCurr.id.toString() }));
      }
      
      // تعيين أول ضريبة كافتراضية
      if (taxes.length > 0 && !formData.tax_id) {
        const defaultTax = taxes.find(t => t.is_default) || taxes[0];
        setFormData(prev => ({ ...prev, tax_id: defaultTax.id.toString() }));
      }
    }
  }, [isOpen, currencies, taxes]);

  // ========== Reset branch when warehouse changes ==========
  useEffect(() => {
    // لما المخزن يتغير، امسح الفرع المختار
    setFormData(prev => ({ ...prev, branch_id: "" }));
  }, [formData.warehouse_id]);

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

  // ========== Calculations ==========
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = (subtotal * formData.discount_percent) / 100;
    const afterDiscount = subtotal - discountAmount;
    
    const selectedTax = taxes.find(t => t.id === Number(formData.tax_id));
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

  // ========== Helper Functions ==========
  const getCurrencyName = (currency: Currency) => {
    return language === 'ar' ? currency.name : currency.name;
  };

  const getTaxName = (tax: Tax) => {
    return language === 'ar' ? (tax.name_ar || tax.name) : tax.name;
  };

  // ========== Handlers ==========

  // ✅ إضافة منتج
  const addProduct = (product: any) => {
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setItems(updated);
      toast.success(language === 'ar' ? 'تم زيادة الكمية' : 'Quantity updated');
    } else {
      const newItem: InvoiceItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: language === 'ar' ? (product.name_ar || product.name) : product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: Number(product.sell_price || product.price || 0),
        discount_percent: 0,
        discount_amount: 0,
        tax_amount: 0,
        total_price: Number(product.sell_price || product.price || 0)
      };
      setItems([...items, newItem]);
      toast.success(language === 'ar' ? 'تم إضافة المنتج' : 'Product added');
    }
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
      tax_id: taxes.find(t => t.is_default)?.id?.toString() || taxes[0]?.id?.toString() || "",
      currency_id: currencies.find(c => c.is_default)?.id?.toString() || currencies[0]?.id?.toString() || "",
      notes: ""
    });
  };

  // ✅ إنشاء فاتورة جديدة
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      // التحقق من البيانات المطلوبة
      if (!formData.customer_id) {
        throw new Error(language === 'ar' ? 'يجب اختيار العميل' : 'Customer is required');
      }
      if (items.length === 0) {
        throw new Error(language === 'ar' ? 'يجب إضافة أصناف' : 'Items are required');
      }
      if (!formData.currency_id) {
        throw new Error(language === 'ar' ? 'يجب اختيار العملة' : 'Currency is required');
      }
      if (!formData.tax_id) {
        throw new Error(language === 'ar' ? 'يجب اختيار الضريبة' : 'Tax is required');
      }
      if (!formData.warehouse_id) {
        throw new Error(language === 'ar' ? 'يجب اختيار المخزن' : 'Warehouse is required');
      }

      // ✅ تجهيز payload
      const payload = {
        customer_id: Number(formData.customer_id),
        sales_representative_id: formData.sales_representative_id ? Number(formData.sales_representative_id) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        warehouse_id: Number(formData.warehouse_id),
        currency_id: Number(formData.currency_id),
        tax_id: Number(formData.tax_id),
        payment_method: formData.payment_method,
        due_date: formData.due_date || null,
        note: formData.notes || null,
        items: items.map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price: Number(item.unit_price)
        }))
      };

      console.log('📦 Sending payload to /sales-invoice/store:', JSON.stringify(payload, null, 2));

      const response = await api.post('/sales-invoice/store', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(language === 'ar' ? '✅ تم إنشاء الفاتورة بنجاح' : '✅ Invoice created successfully');
      
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products-form'] });
      
      // إغلاق النموذج وإعادة تعيينه
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Error creating invoice:', error.response?.data || error);
      
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(
        language === 'ar' 
          ? `❌ خطأ: ${errorMessage}`
          : `❌ Error: ${errorMessage}`
      );
    }
  });

  // ✅ حفظ وطباعة
  const handleSaveAndPrint = () => {
    toast.info(language === 'ar' ? 'جاري تجهيز الطباعة...' : 'Preparing print...');
  };

  // ========== Render ==========
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-background z-10 border-b px-6 py-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {language === 'ar' ? 'فاتورة مبيعات جديدة' : 'New Sales Invoice'}
              </span>
              {invoiceNumber && (
                <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {invoiceNumber}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ========== Main Form ========== */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer & Basic Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    {language === 'ar' ? 'معلومات الفاتورة' : 'Invoice Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {/* العميل */}
                  <div className="col-span-2 md:col-span-1">
                    <Label className="flex items-center gap-1 mb-2">
                      {language === 'ar' ? 'العميل' : 'Customer'} 
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={language === 'ar' ? 'اختر العميل' : 'Select customer'} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCustomers ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          customers.map((customer: Customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              <div className="flex items-center justify-between w-full gap-4">
                                <span>
                                  {language === 'ar' ? customer.name_ar || customer.name : customer.name}
                                </span>
                                {(customer.point || 0) > 0 && (
                                  <span className="flex items-center gap-1 text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-full">
                                    <Star size={10} className="fill-amber-600" />
                                    {customer.point}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    
                    {/* عرض نقاط الولاء */}
                    {formData.customer_id && (() => {
                      const customer = customers.find((c: Customer) => c.id === Number(formData.customer_id));
                      if (!customer) return null;
                      
                      const earnedPoints = Math.floor(totals.totalAmount / 1000);
                      
                      return (
                        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                          <Crown size={16} className="text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">
                            {language === 'ar' ? 'نقاط الولاء:' : 'Loyalty Points:'}
                          </span>
                          <span className="text-amber-700 font-bold">{customer.point || 0}</span>
                          {earnedPoints > 0 && (
                            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                              +{earnedPoints} {language === 'ar' ? 'نقطة' : 'pts'}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* المندوب */}
                  <div className="col-span-2 md:col-span-1">
                    <Label className="mb-2 block">
                      {language === 'ar' ? 'المندوب' : 'Salesman'}
                    </Label>
                    <Select
                      value={formData.sales_representative_id}
                      onValueChange={(value) => setFormData({ ...formData, sales_representative_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر المندوب' : 'Select salesman'} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingSalesmen ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          salesmen.map((salesman: SalesRepresentative) => (
                            <SelectItem key={salesman.id} value={salesman.id.toString()}>
                              {language === 'ar' ? salesman.name_ar || salesman.name : salesman.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 🔴 المخزن - لازم يختار الأول */}
                  <div className="col-span-2 md:col-span-1">
                    <Label className="flex items-center gap-1 mb-2">
                      {language === 'ar' ? 'المخزن' : 'Warehouse'} 
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.warehouse_id}
                      onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر المخزن أولاً' : 'Select warehouse first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingWarehouses ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          warehouses.map((warehouse: Warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              <div className="flex items-center justify-between w-full">
                                <span>
                                  {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                                </span>
                                {warehouse.branch_id && (
                                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                    {language === 'ar' ? 'مرتبط بفرع' : 'Linked to branch'}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {!formData.warehouse_id && (
                      <p className="text-xs text-amber-600 mt-1">
                        {language === 'ar' ? '⚠️ يجب اختيار المخزن أولاً' : '⚠️ Select warehouse first'}
                      </p>
                    )}
                  </div>

                  {/* 🔴 الفرع - بيظهر بعد اختيار المخزن */}
                  <div className="col-span-2 md:col-span-1">
                    <Label className="mb-2 block">
                      {language === 'ar' ? 'الفرع' : 'Branch'}
                    </Label>
                    <Select
                      value={formData.branch_id}
                      onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                      disabled={!formData.warehouse_id}
                    >
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={
                            !formData.warehouse_id 
                              ? (language === 'ar' ? 'اختر المخزن أولاً' : 'Select warehouse first')
                              : (language === 'ar' ? 'اختر الفرع' : 'Select branch')
                          } 
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingBranches ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          branches.map((branch: Branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* طريقة الدفع */}
                  <div>
                    <Label className="mb-2 block">
                      {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                    </Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          {language === 'ar' ? 'نقداً' : 'Cash'}
                        </SelectItem>
                        <SelectItem value="card">
                          {language === 'ar' ? 'بطاقة' : 'Card'}
                        </SelectItem>
                        <SelectItem value="wallet">
                          {language === 'ar' ? 'محفظة' : 'Wallet'}
                        </SelectItem>
                        <SelectItem value="credit">
                          {language === 'ar' ? 'آجل' : 'Credit'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* تاريخ الاستحقاق */}
                  <div>
                    <Label className="mb-2 block">
                      {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                    </Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Product Search & Items */}
           {/* Product Search & Items */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-lg flex items-center gap-2">
      <div className="w-1 h-5 bg-primary rounded-full" />
      {language === 'ar' ? 'الأصناف' : 'Items'}
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* ✅ Product Search Button */}
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 gap-2"
        onClick={() => setShowProductSearch(true)}
      >
        <Search className="h-4 w-4" />
        {language === 'ar' ? '🔍 بحث عن منتج' : '🔍 Search Product'}
      </Button>
    </div>

    {/* ✅ Product Search Dialog */}
    <ProductSearch
      isOpen={showProductSearch}
      onClose={() => setShowProductSearch(false)}
      onSelectProduct={addProduct}
    />

    {/* Items Table */}
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="min-w-[250px]">
              {language === 'ar' ? 'المنتج' : 'Product'}
            </TableHead>
            <TableHead className="w-24 text-center">
              {language === 'ar' ? 'الكمية' : 'Qty'}
            </TableHead>
            <TableHead className="w-28 text-right">
              {language === 'ar' ? 'السعر' : 'Price'}
            </TableHead>
            <TableHead className="w-24 text-center">
              {language === 'ar' ? 'خصم %' : 'Disc %'}
            </TableHead>
            <TableHead className="w-32 text-right">
              {language === 'ar' ? 'الإجمالي' : 'Total'}
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <Barcode size={32} className="opacity-30" />
                  <span className="text-sm">
                    {language === 'ar' ? 'لا توجد أصناف' : 'No items added'}
                  </span>
                  <Button
                    variant="link"
                    onClick={() => setShowProductSearch(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {language === 'ar' ? 'إضافة منتج' : 'Add Product'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {item.sku}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-20 text-center mx-auto"
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
                    className="w-20 text-center mx-auto"
                  />
                </TableCell>
                <TableCell className="font-medium text-right">
                  {item.total_price.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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

    {/* ✅ Shortcut buttons for quick add (اختياري) */}
    {items.length > 0 && (
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowProductSearch(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'إضافة منتج آخر' : 'Add Another Product'}
        </Button>
      </div>
    )}
  </CardContent>
</Card>

              {/* Notes */}
              <Card>
                <CardContent className="pt-4">
                  <Label className="mb-2 block">
                    {language === 'ar' ? 'ملاحظات' : 'Notes'}
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder={language === 'ar' ? 'أضف ملاحظات للفاتورة...' : 'Add invoice notes...'}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </div>

            {/* ========== Summary ========== */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    {language === 'ar' ? 'ملخص الفاتورة' : 'Invoice Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Currency Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'العملة' : 'Currency'} 
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Select
                      value={formData.currency_id}
                      onValueChange={(value) => setFormData({ ...formData, currency_id: value })}
                    >
                      <SelectTrigger className="w-full bg-muted/30">
                        <SelectValue placeholder={language === 'ar' ? 'اختر العملة' : 'Select currency'} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCurrencies ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          currencies.map((currency: Currency) => (
                            <SelectItem key={currency.id} value={currency.id.toString()}>
                              <span className="flex items-center gap-2">
                                {getCurrencyName(currency)} ({currency.symbol})
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subtotal */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                    </span>
                    <span className="font-medium text-lg">
                      {formatAmount(totals.subtotal, currencies.find(c => c.id === Number(formData.currency_id))?.code)}
                    </span>
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'الخصم' : 'Discount'}
                      </Label>
                      <span className="text-destructive font-medium">
                        -{formatAmount(totals.discountAmount, currencies.find(c => c.id === Number(formData.currency_id))?.code)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.discount_percent}
                          onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                          className="pl-8 pr-4 text-center"
                          placeholder="0"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tax */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'الضريبة' : 'Tax'} 
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <span className="text-primary font-medium">
                        +{formatAmount(totals.taxAmount, currencies.find(c => c.id === Number(formData.currency_id))?.code)}
                      </span>
                    </div>
                    <Select
                      value={formData.tax_id}
                      onValueChange={(value) => setFormData({ ...formData, tax_id: value })}
                    >
                      <SelectTrigger className="w-full bg-muted/30">
                        <SelectValue placeholder={language === 'ar' ? 'اختر الضريبة' : 'Select tax'} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingTaxes ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          taxes.map((tax: Tax) => (
                            <SelectItem key={tax.id} value={tax.id.toString()}>
                              <span className="flex items-center gap-2">
                                {getTaxName(tax)} ({tax.rate}%)
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">
                        {language === 'ar' ? 'الإجمالي' : 'Total'}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {formatAmount(totals.totalAmount, currencies.find(c => c.id === Number(formData.currency_id))?.code)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 pt-4">
                    <Button
                      onClick={() => createInvoiceMutation.mutate()}
                      disabled={
                        createInvoiceMutation.isPending || 
                        items.length === 0 || 
                        !formData.customer_id || 
                        !formData.currency_id || 
                        !formData.tax_id ||
                        !formData.warehouse_id
                      }
                      className="w-full gap-2 h-11 text-base"
                      size="lg"
                    >
                      {createInvoiceMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {language === 'ar' ? 'حفظ الفاتورة' : 'Save Invoice'}
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 h-11"
                      onClick={handleSaveAndPrint}
                      disabled={createInvoiceMutation.isPending || items.length === 0}
                    >
                      <Printer className="h-4 w-4" />
                      {language === 'ar' ? 'حفظ وطباعة' : 'Save & Print'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesInvoiceForm;