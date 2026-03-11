import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
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
  Warehouse, CreditCard, Calendar, Loader2, DollarSign, 
  ArrowLeftRight, Copy, Save, BadgeCheck, XCircle, Printer, Landmark
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import PurchaseVariantSelector from './PurchaseVariantSelector';
import QuickProductSearch from '@/components/shared/QuickProductSearch';
import api from '@/lib/api';
import { Badge } from '../ui/badge';
import { useReactToPrint } from 'react-to-print';
import { format, parseISO } from 'date-fns';
import PurchaseInvoiceTemplate from './PurchaseInvoiceTemplate';
import DatePicker from '../ui/date-picker';

// ========== الأنواع ==========
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
  balance?: number;
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
  branch_id?: number;
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

interface Treasury {
  id: number;
  name: string;
  name_ar?: string;
  branch_id: number;
  balance: number;
  currency: string;
  is_main: boolean;
  notes?: string;
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

type InvoiceAction = 'save' | 'save_and_new' | 'save_and_print';

interface PurchaseInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onSaveAndNew?: () => void;
}

const PurchaseInvoiceForm: React.FC<PurchaseInvoiceFormProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndNew
}) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invoicePrintRef = useRef<HTMLDivElement>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  // دالة للطباعة
  const handlePrint = useReactToPrint({
    contentRef: invoicePrintRef,
    documentTitle: `فاتورة-مشتريات-${Date.now()}`,
    onAfterPrint: () => {
      setShowPrint(false);
      setPrintData(null);
    },
  });

  // دالة للحصول على تاريخ اليوم بالتنسيق الصحيح (YYYY-MM-DD)
  const getTodayDate = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [formData, setFormData] = useState({
    supplier_id: '',
    branch_id: '',
    warehouse_id: '',
    invoice_date: getTodayDate(),
    due_date: '',
    payment_method: 'cash',
    tax_id: '',
    currency_id: '',
    notes: '',
    paid_amount: 0,
    treasury_id: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  // ========== جلب البيانات ==========

  // جلب العملات
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

  // جلب الضرائب
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

  // جلب الموردين
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

  // جلب الفروع
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

  // جلب المستودعات (بتتغير مع الفرع)
  const { data: warehouses = [], isLoading: loadingWarehouses, refetch: refetchWarehouses } = useQuery({
    queryKey: ['warehouses-active', formData.branch_id],
    queryFn: async () => {
      try {
        const filters: any = { active: true };
        
        if (formData.branch_id) {
          filters.branch_id = Number(formData.branch_id);
        }
        
        const response = await api.post('/warehouse/index', {
          filters: filters,
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
    enabled: isOpen && !!formData.branch_id
  });

  // جلب المنتجات
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-purchase'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: {},
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
        console.error('Error fetching products:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // ========== جلب الخزائن ==========
  const { data: treasury = [], isLoading: treasuryLoading, refetch: refetchTreasury } = useQuery({
    queryKey: ['treasury', formData.branch_id],
    queryFn: async () => {
      try {
        const filters: any = {};
        
        // ✅ نجيب كل خزائن الفرع المختار
        if (formData.branch_id) {
          filters.branch_id = Number(formData.branch_id);
        }
        
        const response = await api.post('/treasury/index', {
          filters: filters,
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
        console.error('Error fetching treasury:', error);
        return [];
      }
    },
    enabled: isOpen && !!formData.branch_id // 👈 نشغل الـ query بس لو فيه فرع مختار
  });

  // ========== Effects ==========

  // تعيين العملة الافتراضية
  useEffect(() => {
    if (currencies.length > 0 && !formData.currency_id) {
      const defaultCurr = currencies.find((c: Currency) => c.default === true) || currencies[0];
      setFormData(prev => ({ ...prev, currency_id: defaultCurr.id.toString() }));
    }
  }, [currencies, formData.currency_id]);

  // تعيين الضريبة الافتراضية
  useEffect(() => {
    if (taxes.length > 0 && !formData.tax_id) {
      const defaultTax = taxes.find((t: Tax) => t.default === true) || taxes[0];
      setFormData(prev => ({ ...prev, tax_id: defaultTax.id.toString() }));
    }
  }, [taxes, formData.tax_id]);

  // ✅ تأثير اختيار الفرع - نجيب المستودعات والخزائن ونختار الرئيسية كافتراضية
  useEffect(() => {
    if (formData.branch_id) {
      // نجيب المستودعات
      refetchWarehouses();
      
      // نجيب الخزائن
      refetchTreasury().then((result) => {
        const treasuries = result.data || [];
        if (treasuries.length > 0) {
          // ✅ ندور على الخزينة الرئيسية (is_main = true)
          const mainTreasury = treasuries.find((t: Treasury) => t.is_main === true);
          
          if (mainTreasury) {
            // ✅ لو لقينا رئيسية، نختارها
            setFormData(prev => ({ 
              ...prev, 
              treasury_id: mainTreasury.id.toString(),
              warehouse_id: '' // نمسح المستودع لأن الفرع اتغير
            }));
          } else {
            // ✅ لو مفيش رئيسية، نختار أول خزينة
            setFormData(prev => ({ 
              ...prev, 
              treasury_id: treasuries[0].id.toString(),
              warehouse_id: ''
            }));
          }
        } else {
          // ✅ لو مفيش خزائن خالص، نفضي الحقل
          setFormData(prev => ({ 
            ...prev, 
            treasury_id: '',
            warehouse_id: ''
          }));
        }
      });
    }
  }, [formData.branch_id, refetchWarehouses, refetchTreasury]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
    }
  }, [isOpen]);

  // ========== طرق الدفع ==========
  const paymentMethods = [
    { code: 'cash', name: 'Cash', name_ar: 'نقداً' },
    { code: 'credit', name: 'Credit', name_ar: 'آجل' },
    { code: 'card', name: 'Card', name_ar: 'بطاقة' },
    { code: 'bank_transfer', name: 'Bank Transfer', name_ar: 'تحويل بنكي' }
  ];

  // ========== دوال إدارة المنتجات ==========

  const handleProductClick = (product: any) => {
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

  // ========== دوال الحسابات ==========

  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const totalTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = items.reduce((sum, item) => sum + item.total_cost, 0);
    const remaining = total - (formData.paid_amount || 0);
    return { subtotal, totalDiscount, totalTax, total, remaining };
  }, [items, formData.paid_amount]);

  const remainingAmount = useMemo(() => {
    const totals = calculateTotals();
    return totals.remaining;
  }, [calculateTotals]);

  const totals = calculateTotals();

  // ========== دوال التحقق ==========

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplier_id) {
      newErrors.supplier_id = language === 'ar' ? 'يرجى اختيار المورد' : 'Please select a supplier';
    }

    if (!formData.warehouse_id) {
      newErrors.warehouse_id = language === 'ar' ? 'يرجى اختيار المستودع' : 'Please select a warehouse';
    }

    if (items.length === 0) {
      newErrors.items = language === 'ar' ? 'يرجى إضافة منتجات' : 'Please add products';
    }

    // ✅ التحقق من الخزينة لو طريقة الدفع نقداً والمبلغ المدفوع أكبر من 0
    if (formData.payment_method === 'cash' && formData.paid_amount > 0 && !formData.treasury_id) {
      newErrors.treasury_id = language === 'ar' ? 'يرجى اختيار الخزينة' : 'Please select treasury';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ========== Mutation ==========

  const createInvoiceMutation = useMutation({
    mutationFn: async (action: InvoiceAction) => {
      if (!validateForm()) {
        throw new Error('Validation failed');
      }

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
        paid_amount: formData.paid_amount || 0,
        remaining_amount: remainingAmount,
        treasury_id: formData.treasury_id ? Number(formData.treasury_id) : null, // ✅ إضافة الخزينة
        items: items.map(item => ({
          product_id: item.product_id,
          product_variant_id: item.product_variant_id || null,
          quantity: item.quantity,
          price: item.unit_cost,
          discount: item.discount_percent,
          tax: item.tax_percent
        }))
      };

      console.log('📦 Sending payload:', JSON.stringify(payload, null, 2));

      const response = await api.post('/purchases-invoices/store', payload);
      return { data: response.data, action };
    },
    onSuccess: (result) => {
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' 
          ? `تم إنشاء فاتورة الشراء بنجاح` 
          : `Purchase invoice created successfully`
      });

      // تحديث الكاش
      queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-purchase'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-active'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });

      // معالجة حالة save_and_print
      if (result.action === 'save_and_print') {
        const printInvoiceData = {
          id: result.data.data.id,
          invoice_number: result.data.data.invoice_number,
          date: new Date().toISOString(),
          supplier: suppliers.find(s => s.id === Number(formData.supplier_id)),
          cashierName: user?.name || 'المدير',
          branchName: user?.branch_name || branches.find(b => b.id === Number(formData.branch_id))?.name,
          branchPhone: user?.branch_phone,
          branchAddress: user?.branch_address,
          taxRate: formData.tax_id ? taxes.find(t => t.id === Number(formData.tax_id))?.rate : 0,
          items: items.map(item => ({
            name: item.product_name,
            nameAr: item.product_name,
            quantity: item.quantity,
            price: item.unit_cost,
            sizeName: item.size_name,
            colorName: item.color_name,
            discount_percent: item.discount_percent,
            tax_percent: item.tax_percent
          })),
          subtotal: totals.subtotal,
          tax: totals.totalTax,
          discount_total: totals.totalDiscount,
          total: totals.total,
          paid_amount: formData.paid_amount,
          remaining_amount: remainingAmount,
          payment_method: formData.payment_method,
          notes: formData.notes,
        };
        
        setPrintData(printInvoiceData);
        setShowPrint(true);
        setTimeout(() => handlePrint(), 100);
        
        resetForm();
        onSave();
        onClose();
      }
      // معالجة حالة save_and_new
      else if (result.action === 'save_and_new' && onSaveAndNew) {
        resetForm();
        onSaveAndNew();
      } 
      // معالجة حالة save العادية
      else {
        resetForm();
        onSave();
        onClose();
      }
    },
    onError: (error: any) => {
      console.error('❌ Error creating invoice:', error.response?.data || error);
      
      const errorMessage = error.response?.data?.message || error.message;
      
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: errorMessage,
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
      invoice_date: getTodayDate(),
      due_date: '',
      payment_method: 'cash',
      tax_id: defaultTax?.id?.toString() || '',
      currency_id: defaultCurrency?.id?.toString() || '',
      notes: '',
      paid_amount: 0,
      treasury_id: ''
    });
    setItems([]);
    setShowPaymentDetails(false);
    setErrors({});
  };

  const handleSubmit = (action: InvoiceAction) => {
    createInvoiceMutation.mutate(action);
  };

  const formatCurrency = (amount: number) => {
    const currency = currencies.find((c: Currency) => c.id === Number(formData.currency_id));
    return `${amount.toLocaleString()} ${currency?.symbol || ''}`;
  };

  const getSupplierName = (supplier: Supplier) => {
    return language === 'ar' ? supplier.name_ar || supplier.name : supplier.name;
  };

  const isFormValid = formData.supplier_id && formData.warehouse_id && items.length > 0;

  // ========== Render ==========

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
                  onValueChange={(v) => {
                    setFormData(prev => ({ ...prev, supplier_id: v }));
                    if (errors.supplier_id) setErrors(prev => ({ ...prev, supplier_id: '' }));
                  }}
                >
                  <SelectTrigger className={cn(
                    "h-8 text-sm",
                    errors.supplier_id && "border-destructive"
                  )}>
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
                          {getSupplierName(s)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.supplier_id && (
                  <p className="text-[10px] text-destructive">{errors.supplier_id}</p>
                )}
              </div>

              {/* Branch */}
              <div className="space-y-1">
                <Label className="text-xs">{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(v) => {
                    setFormData(prev => ({ ...prev, branch_id: v, warehouse_id: '' }));
                  }}
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
                  onValueChange={(v) => {
                    setFormData(prev => ({ ...prev, warehouse_id: v }));
                    if (errors.warehouse_id) setErrors(prev => ({ ...prev, warehouse_id: '' }));
                  }}
                  disabled={!formData.branch_id || warehouses.length === 0}
                >
                  <SelectTrigger className={cn(
                    "h-8 text-sm",
                    errors.warehouse_id && "border-destructive"
                  )}>
                    <SelectValue placeholder={
                      !formData.branch_id 
                        ? (language === 'ar' ? 'اختر فرعاً أولاً' : 'Select branch first')
                        : warehouses.length === 0
                          ? (language === 'ar' ? 'لا يوجد مستودعات' : 'No warehouses')
                          : (language === 'ar' ? 'اختر' : 'Select')
                    } />
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
                {errors.warehouse_id && (
                  <p className="text-[10px] text-destructive">{errors.warehouse_id}</p>
                )}
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
                <DatePicker
                  value={formData.invoice_date}
                  onChange={(value) => setFormData(prev => ({ ...prev, invoice_date: value }))}
                  placeholder={language === 'ar' ? 'اختر التاريخ' : 'Select Date'}
                  className="h-8 text-sm"
                />
                {formData.invoice_date && (
                  <div className="text-xs text-gray-500">
                    {language === 'ar' ? 'التاريخ المختار: ' : 'Selected Date: '}
                    {format(parseISO(formData.invoice_date), 'dd/MM/yyyy')}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <Label className="text-xs">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                <DatePicker
                  value={formData.due_date}
                  onChange={(value) => setFormData(prev => ({ ...prev, due_date: value }))}
                  placeholder={language === 'ar' ? 'اختر التاريخ' : 'Select Date'}
                  className="h-8 text-sm"
                />
                {formData.due_date && (
                  <div className="text-xs text-gray-500">
                    {language === 'ar' ? 'التاريخ المختار: ' : 'Selected Date: '}
                    {format(parseISO(formData.due_date), 'dd/MM/yyyy')}
                  </div>
                )}
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
                  products={products}
                  disabled={false}
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
                {errors.items && (
                  <p className="text-[10px] text-destructive text-center">{errors.items}</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                    className="gap-2"
                  >
                    <DollarSign size={16} />
                    {showPaymentDetails 
                      ? (language === 'ar' ? 'إخفاء تفاصيل الدفع' : 'Hide Payment Details')
                      : (language === 'ar' ? 'إظهار تفاصيل الدفع' : 'Show Payment Details')
                    }
                  </Button>
                  
                  {/* المبلغ الإجمالي والمتبقي للمورد */}
                  <div className="flex items-center gap-4">
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(totals.total)}</p>
                    </div>
                    <ArrowLeftRight size={20} className="text-muted-foreground" />
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'المتبقي للمورد' : 'Remaining'}</p>
                      <p className={`text-lg font-bold ${remainingAmount > 0 ? 'text-warning' : 'text-success'}`}>
                        {formatCurrency(remainingAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                {showPaymentDetails && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-primary/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>{language === 'ar' ? 'المبلغ المدفوع' : 'Paid Amount'}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.paid_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: Number(e.target.value) }))}
                          placeholder="0"
                          className="text-lg font-bold"
                        />
                      </div>
                      
                      {/* ✅ حقل الخزينة - يظهر فقط للدفع النقدي */}
                    {/* ✅ حقل الخزينة - نسخة محسنة للعربية */}
{formData.payment_method === 'cash' && (
  <div>
    <Label className="flex items-center gap-1 mb-1.5 font-medium">
      <Landmark size={16} className="text-primary" />
      {language === 'ar' ? 'الخزينة' : 'Treasury'}
      {formData.paid_amount > 0 && <span className="text-destructive">*</span>}
    </Label>
    
    {!formData.branch_id ? (
      <div className="text-sm text-muted-foreground p-2.5 border rounded-md bg-muted/20 border-dashed">
        {language === 'ar' ? '⏳ اختر الفرع أولاً' : '⏳ Select branch first'}
      </div>
    ) : treasuryLoading ? (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2.5 border rounded-md bg-muted/20">
        <Loader2 className="h-4 w-4 animate-spin" />
        {language === 'ar' ? 'جاري تحميل الخزائن...' : 'Loading treasuries...'}
      </div>
    ) : treasury.length === 0 ? (
      <div className="text-sm text-muted-foreground p-2.5 border rounded-md bg-muted/20 border-dashed">
        {language === 'ar' ? '❌ لا يوجد خزائن لهذا الفرع' : '❌ No treasuries for this branch'}
      </div>
    ) : (
      <select
        value={formData.treasury_id}
        onChange={(e) => {
          setFormData(prev => ({ ...prev, treasury_id: e.target.value }));
          if (errors.treasury_id) setErrors(prev => ({ ...prev, treasury_id: '' }));
        }}
        className={cn(
          "w-full px-3 py-2.5 border rounded-md bg-background text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
          "transition-all duration-200",
          "font-sans", // تأكد من استخدام خط يدعم العربية
          errors.treasury_id 
            ? "border-destructive bg-destructive/5" 
            : "border-input hover:border-primary/50"
        )}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        style={{ 
          textAlign: language === 'ar' ? 'right' : 'left',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", sans-serif'
        }}
      >
        <option value="" disabled className="text-muted-foreground">
          {language === 'ar' ? '-- اختر الخزينة --' : '-- Select treasury --'}
        </option>
        
        {treasury.map((treasuryItem: Treasury) => {
          // فك الترميز وعرض النص بشكل صحيح
          const displayName = language === 'ar' 
            ? (treasuryItem.name_ar || treasuryItem.name) 
            : treasuryItem.name;
          
          return (
            <option 
              key={treasuryItem.id} 
              value={treasuryItem.id.toString()}
              className="py-1"
              style={{ 
                direction: language === 'ar' ? 'rtl' : 'ltr',
                textAlign: language === 'ar' ? 'right' : 'left'
              }}
            >
              {displayName}
              {treasuryItem.is_main && (
                ` ${language === 'ar' ? '(رئيسية)' : '(Main)'}`
              )}
            </option>
          );
        })}
      </select>
    )}
    
    {errors.treasury_id && (
      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
        <span>⚠️</span>
        {errors.treasury_id}
      </p>
    )}
    
    {/* عرض الخزينة المختارة حالياً */}
    {formData.treasury_id && !errors.treasury_id && (
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <span>✓</span>
        {language === 'ar' ? 'تم الاختيار' : 'Selected'}
      </p>
    )}
  </div>
)}
                    </div>
                    
                    {remainingAmount > 0 && (
                      <div className="bg-warning/10 p-3 rounded-lg flex items-center gap-2">
                        <DollarSign size={18} className="text-warning" />
                        <p className="text-sm text-warning">
                          {language === 'ar' 
                            ? `المتبقي للمورد: ${formatCurrency(remainingAmount)}`
                            : `Remaining for supplier: ${formatCurrency(remainingAmount)}`
                          }
                        </p>
                      </div>
                    )}
                    
                    {remainingAmount === 0 && totals.total > 0 && (
                      <div className="bg-success/10 p-3 rounded-lg flex items-center gap-2">
                        <BadgeCheck size={18} className="text-success" />
                        <p className="text-sm text-success">
                          {language === 'ar' ? 'تم الدفع بالكامل' : 'Fully paid'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
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

          <DialogFooter className="p-4 pt-3 border-t bg-muted/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm py-1">
                {language === 'ar' ? 'الإجمالي:' : 'Total:'} {formatCurrency(totals.total)}
              </Badge>
              {remainingAmount > 0 && (
                <Badge variant="destructive" className="text-sm py-1">
                  {language === 'ar' ? 'المتبقي:' : 'Remaining:'} {formatCurrency(remainingAmount)}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onClose} 
                size="sm"
                disabled={createInvoiceMutation.isPending}
              >
                <XCircle size={14} className="me-1.5" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              
              {/* زر حفظ فقط */}
              <Button 
                onClick={() => handleSubmit('save')} 
                disabled={createInvoiceMutation.isPending || !isFormValid} 
                size="sm" 
                className="min-w-24"
              >
                {createInvoiceMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="me-1.5 animate-spin" />
                    {language === 'ar' ? 'جاري...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save size={14} className="me-1.5" />
                    {language === 'ar' ? 'حفظ فقط' : 'Save Only'}
                  </>
                )}
              </Button>
              
              {/* زر حفظ وإضافة جديد */}
              {onSaveAndNew && (
                <Button 
                  onClick={() => handleSubmit('save_and_new')} 
                  disabled={createInvoiceMutation.isPending || !isFormValid} 
                  size="sm" 
                  variant="secondary"
                  className="min-w-24"
                >
                  {createInvoiceMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="me-1.5 animate-spin" />
                      {language === 'ar' ? 'جاري...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="me-1.5" />
                      {language === 'ar' ? 'حفظ وإضافة' : 'Save & New'}
                    </>
                  )}
                </Button>
              )}

              {/* زر حفظ وطباعة */}
              <Button 
                onClick={() => handleSubmit('save_and_print')} 
                disabled={createInvoiceMutation.isPending || !isFormValid} 
                size="sm" 
                variant="default"
                className="min-w-24 bg-green-600 hover:bg-green-700"
              >
                {createInvoiceMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="me-1.5 animate-spin" />
                    {language === 'ar' ? 'جاري...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Printer size={14} className="me-1.5" />
                    {language === 'ar' ? 'حفظ وطباعة' : 'Save & Print'}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مكون الطباعة المخفي */}
      {showPrint && printData && (
        <div style={{ display: 'none' }}>
          <PurchaseInvoiceTemplate
            ref={invoicePrintRef}
            invoiceData={printData}
          />
        </div>
      )}

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