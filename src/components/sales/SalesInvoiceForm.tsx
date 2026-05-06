/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
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
import { Plus, Trash2, Save, Printer, Crown, Star, Package, Search, X, Loader2 } from "lucide-react";
import api from "@/lib/api";

// ========== Types ==========

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
  branch_id?: number | null;
}

interface Treasury {
  id: number;
  name: string;
  balance: number;
  currency: string;
  branch_id?: number;
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

// واجهات المنتج مع المتغيرات
interface ColorOption {
  id: number;
  color_id: number;
  color: string;
  stock: number;
  hex_code?: string;
}

interface UnitOption {
  id: number;
  unit_id: number;
  unit_name: string;
  cost_price: string;
  sell_price: string;
  barcode: string;
  colors: ColorOption[];
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
  units?: UnitOption[];
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
  stock: number;
  unit_id?: number | null;
  unit_name?: string | null;  // أضف هذا
  color_id?: number | null;
  color_name?: string | null;  // أضف هذا
  color_hex?: string | null;   // أضف هذا للون الدائري
  variant_id?: string;
}

interface SalesInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  editInvoice?: any;
}

const SalesInvoiceForm = ({ isOpen, onClose, editInvoice }: SalesInvoiceFormProps) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrencyTax();
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ========== Refs لمنع الحلقات اللانهائية ==========
  const initializedRef = useRef(false);
  const prevBranchRef = useRef<string | null>(null);
  const isSettingTreasuryRef = useRef(false);

  // ========== State ==========
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    sales_representative_id: "",
    branch_id: "",
    warehouse_id: "",
    treasury_id: "",
    due_date: "",
    payment_method: "cash" as 'cash' | 'card' | 'wallet' | 'credit' | 'bank_transfer' | 'check',
    discount_percent: 0,
    tax_id: "",
    currency_id: "",
    notes: ""
  });
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  // Dialog لاختيار المقاس واللون
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(null);
  const [showVariantDialog, setShowVariantDialog] = useState(false);

  // ========== Queries ==========

  // 1. جلب العملات
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

  // 2. جلب الضرائب
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

  // 3. جلب العملاء
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

  // 4. جلب المندوبين
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

  // 5. جلب الفروع
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
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

  // 6. جلب المخازن (مرتبطة بالفرع المختار)
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses-form', formData.branch_id],
    queryFn: async () => {
      try {
        const filters: any = { active: true };
        if (formData.branch_id) {
          filters.branch_id = Number(formData.branch_id);
        }
        const response = await api.post('/warehouse/index', {
          filters: filters,
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
        return [];
      }
    },
    enabled: isOpen && !!formData.branch_id
  });

  // 7. جلب الخزائن (مرتبطة بالفرع المختار)
  const { data: treasuries = [], isLoading: loadingTreasuries } = useQuery({
    queryKey: ['treasuries-form', formData.branch_id],
    queryFn: async () => {
      try {
        const filters: any = {};
        if (formData.branch_id) filters.branch_id = Number(formData.branch_id);
        const response = await api.post('/treasury/index', {
          filters,
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
        console.error('Error fetching treasuries:', error);
        return [];
      }
    },
    enabled: isOpen && !!formData.branch_id
  });

  // 8. جلب المنتجات مع البحث (مرتبطة بالمخزن المختار)
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products-form', formData.warehouse_id, searchQuery],
    queryFn: async () => {
      try {
        if (!formData.warehouse_id) return [];
        
        // eslint-disable-next-line prefer-const
        let filters: any = { active: true };
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.trim();
          if (/^\d+$/.test(query)) filters.barcode = query;
          else if (query.includes('-') || /^[A-Z0-9\-]+$/i.test(query)) filters.sku = query;
          else filters.name = query;
        }
        const response = await api.post('/product/index', {
          filters: filters,
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: true
        });
        if (response.data.result === 'Success') {
          let productsData = response.data.data || [];
          if (searchQuery && searchQuery.trim() && !/^\d+$/.test(searchQuery.trim()) && !searchQuery.trim().includes('-')) {
            const query = searchQuery.trim().toLowerCase();
            productsData = productsData.filter((p: any) =>
              p.name?.toLowerCase().includes(query) || p.name_ar?.toLowerCase().includes(query)
            );
          }
          // جلب المخزون
          if (formData.warehouse_id && productsData.length > 0) {
            const productIds = productsData.map((p: any) => p.id);
            try {
              const stockResponse = await api.post('/warehouse-stock/index', {
                filters: { warehouse_id: Number(formData.warehouse_id), product_id_in: productIds },
                perPage: 1000,
                paginate: false
              });
              const stockMap = new Map();
              if (stockResponse.data.result === 'Success') {
                stockResponse.data.data?.forEach((stock: any) => {
                  stockMap.set(stock.product_id, stock.quantity);
                });
              }
              productsData = productsData.map((p: any) => ({
                ...p,
                stock: stockMap.get(p.id) || p.stock || 0
              }));
            } catch (stockError) {
              productsData = productsData.map((p: any) => ({ ...p, stock: p.stock || 0 }));
            }
          }
          return productsData;
        }
        return [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    enabled: isOpen && !!formData.warehouse_id,
    staleTime: 0
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && formData.warehouse_id) {
        queryClient.invalidateQueries({ queryKey: ['products-form', formData.warehouse_id, searchQuery] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, formData.warehouse_id, queryClient]);

  // ========== Helper Functions ==========
  const getCurrencyName = (currency: Currency) => language === 'ar' ? currency.name : currency.name;
  const getTaxName = (tax: Tax) => language === 'ar' ? (tax.name_ar || tax.name) : tax.name;

  // ========== Cart Calculations ==========
const calculateTotals = () => {
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unit_price;
    const itemDiscount = (itemTotal * item.discount_percent) / 100;
    return sum + (itemTotal - itemDiscount);
  }, 0);
  
  const discountAmount = (subtotal * formData.discount_percent) / 100;
  const afterDiscount = subtotal - discountAmount;
  const selectedTax = taxes.find(t => t.id === Number(formData.tax_id));
  const taxPercent = selectedTax?.rate || 0;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  const totalAmount = afterDiscount + taxAmount;
  return { subtotal, discountAmount, taxAmount, totalAmount, taxPercent };
};
  const totals = calculateTotals();

  // ========== Handlers for Variant Selection ==========
  const openVariantSelector = (product: Product) => {
    if (!product.units || product.units.length === 0) {
      addProductToCart(product, null, null);
      return;
    }
    setSelectedProduct(product);
    setSelectedUnit(product.units[0] || null);
    setSelectedColor(null);
    setShowVariantDialog(true);
  };

const addProductToCart = (product: Product, unit: UnitOption | null, color: ColorOption | null) => {
  let unitPrice = product.sell_price || product.price || 0;
  let unitId: number | null = null;
  let unitName: string | null = null;
  let colorId: number | null = null;
  let colorName: string | null = null;
  let colorHex: string | null = null;
  let variantStock = product.stock || 0;

  if (unit) {
    unitPrice = parseFloat(unit.sell_price);
    unitId = unit.unit_id;
    unitName = unit.unit_name;
    if (color) {
      colorId = color.color_id;
      colorName = color.color;
      colorHex = color.hex_code || null;
      variantStock = color.stock;
    } else {
      if (unit.colors && unit.colors.length > 0) {
        toast.error(language === 'ar' ? 'يرجى اختيار اللون' : 'Please select a color');
        return;
      }
      variantStock = unit.colors?.reduce((sum, c) => sum + c.stock, 0) || 0;
    }
  }

  if (variantStock <= 0) {
    toast.error(language === 'ar' ? 'هذا المتغير غير متوفر في المخزون' : 'This variant is out of stock');
    return;
  }

  const existingIndex = items.findIndex(item =>
    item.product_id === product.id &&
    item.unit_id === unitId &&
    item.color_id === colorId
  );

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
      unit_price: unitPrice,
      discount_percent: 0,
      discount_amount: 0,
      tax_amount: 0,
      total_price: unitPrice,
      stock: variantStock,
      unit_id: unitId,
      unit_name: unitName,
      color_id: colorId,
      color_name: colorName,
      color_hex: colorHex,
      variant_id: unitId && colorId ? `${product.id}-${unitId}-${colorId}` : undefined
    };
    setItems([...items, newItem]);
    toast.success(language === 'ar' ? 'تم إضافة المنتج' : 'Product added');
  }
  setSearchQuery("");
  setShowProductList(false);
  inputRef.current?.focus();
  setShowVariantDialog(false);
  setSelectedProduct(null);
};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && products.length > 0 && searchQuery) {
      openVariantSelector(products[0]);
      e.preventDefault();
    }
  };

  // ========== useEffect للتهيئة - مع منع الحلقات اللانهائية ==========
  
useEffect(() => {
  if (!isOpen) return;
  if (initializedRef.current) return;
  
  let hasChanges = false;
  let newCurrencyId = formData.currency_id;
  let newTaxId = formData.tax_id;
  
  if (!newCurrencyId && currencies.length > 0) {
    const defaultCurr = currencies.find(c => c.default === true && c.active === true);
    if (defaultCurr) {
      newCurrencyId = defaultCurr.id.toString();
      hasChanges = true;
    } else {
      const activeCurr = currencies.find(c => c.active === true);
      if (activeCurr) {
        newCurrencyId = activeCurr.id.toString();
        hasChanges = true;
      }
    }
  }
  
  if (!newTaxId && taxes.length > 0) {
    const defaultTax = taxes.find(t => t.default === true && t.active === true);
    if (defaultTax) {
      newTaxId = defaultTax.id.toString();
      hasChanges = true;
    } else {
      const activeTax = taxes.find(t => t.active === true);
      if (activeTax) {
        newTaxId = activeTax.id.toString();
        hasChanges = true;
      }
    }
  }
  
  if (hasChanges) {
    setFormData(prev => ({
      ...prev,
      currency_id: newCurrencyId || prev.currency_id,
      tax_id: newTaxId || prev.tax_id
    }));
  }
  
  if (currencies.length > 0 && taxes.length > 0) {
    initializedRef.current = true;
  }
}, [isOpen, currencies, taxes]);

  useEffect(() => {
    if (!isOpen) return;
    const currentBranch = formData.branch_id;
    if (prevBranchRef.current !== currentBranch && currentBranch) {
      if (formData.warehouse_id || formData.treasury_id) {
        setFormData(prev => ({ ...prev, warehouse_id: "", treasury_id: "" }));
      }
      prevBranchRef.current = currentBranch;
    }
  }, [formData.branch_id, formData.warehouse_id, formData.treasury_id, isOpen]);

  // 3. تعيين الخزينة تلقائياً إذا كان الفرع لديه خزينة واحدة فقط
  useEffect(() => {
    if (!isOpen) return;
    if (isSettingTreasuryRef.current) return;
    
    if (formData.branch_id && treasuries.length === 1) {
      const treasuryId = treasuries[0].id.toString();
      if (formData.treasury_id !== treasuryId) {
        isSettingTreasuryRef.current = true;
        setFormData(prev => ({ ...prev, treasury_id: treasuryId }));
        setTimeout(() => { isSettingTreasuryRef.current = false; }, 0);
      }
    }
  }, [formData.branch_id, treasuries, formData.treasury_id, isOpen]);

  // 4. إنشاء رقم الفاتورة
  useEffect(() => {
    if (isOpen && !invoiceNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9000 + 1000);
      setInvoiceNumber(`INV-${year}${month}${day}-${random}`);
    }
  }, [isOpen, invoiceNumber]);

  // 5. إغلاق قائمة المنتجات عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowProductList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ========== Item Functions ==========
const updateItem = (id: string, field: string, value: number) => {
  const updated = items.map(item => {
    if (item.id === id) {
      const newItem = { ...item, [field]: value };
      const baseTotal = newItem.quantity * newItem.unit_price;
      const discount = (baseTotal * newItem.discount_percent) / 100;
      newItem.discount_amount = discount;
      newItem.total_price = baseTotal - discount;
      return newItem;
    }
    return item;
  });
  setItems(updated);
};

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success(language === 'ar' ? 'تم حذف المنتج' : 'Product removed');
  };

  const resetForm = () => {
    setItems([]);
    setFormData({
      customer_id: "",
      sales_representative_id: "",
      branch_id: "",
      warehouse_id: "",
      treasury_id: "",
      due_date: "",
      payment_method: "cash",
      discount_percent: 0,
      tax_id: taxes.find(t => t.is_default)?.id?.toString() || taxes[0]?.id?.toString() || "",
      currency_id: currencies.find(c => c.is_default)?.id?.toString() || currencies[0]?.id?.toString() || "",
      notes: ""
    });
    setSearchQuery("");
    setShowProductList(false);
    initializedRef.current = false;
    prevBranchRef.current = null;
  };

  const handleSave = async (action: 'save' | 'print' = 'save') => {
    if (!formData.customer_id) {
      toast.error(language === 'ar' ? 'يجب اختيار العميل' : 'Customer is required');
      return;
    }
    if (!formData.branch_id) {
      toast.error(language === 'ar' ? 'يجب اختيار الفرع' : 'Branch is required');
      return;
    }
    if (!formData.warehouse_id) {
      toast.error(language === 'ar' ? 'يجب اختيار المخزن' : 'Warehouse is required');
      return;
    }
    if (!formData.treasury_id) {
      toast.error(language === 'ar' ? 'يجب اختيار الخزينة' : 'Treasury is required');
      return;
    }
    if (items.length === 0) {
      toast.error(language === 'ar' ? 'يجب إضافة أصناف' : 'Items are required');
      return;
    }
    if (!formData.currency_id) {
      toast.error(language === 'ar' ? 'يجب اختيار العملة' : 'Currency is required');
      return;
    }
    if (!formData.tax_id) {
      toast.error(language === 'ar' ? 'يجب اختيار الضريبة' : 'Tax is required');
      return;
    }

    const payload = {
      customer_id: Number(formData.customer_id),
      sales_representative_id: formData.sales_representative_id ? Number(formData.sales_representative_id) : null,
      branch_id: Number(formData.branch_id),
      warehouse_id: Number(formData.warehouse_id),
      treasury_id: Number(formData.treasury_id),
      currency_id: Number(formData.currency_id),
      tax_id: Number(formData.tax_id),
      payment_method: formData.payment_method,
      due_date: formData.due_date || null,
      note: formData.notes || null,
      items: items.map(item => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        price: Number(item.unit_price),
        unit_id: item.unit_id ? Number(item.unit_id) : null,
        color_id: item.color_id ? Number(item.color_id) : null,
      }))
    };

    try {
      const response = await api.post('/sales-invoice/store', payload);
      toast.success(language === 'ar' ? '✅ تم إنشاء الفاتورة بنجاح' : '✅ Invoice created successfully');
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products-form'] });
      if (action === 'print') {
        toast.info(language === 'ar' ? 'جاري تجهيز الطباعة...' : 'Preparing print...');
      }
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('❌ Error creating invoice:', error.response?.data || error);
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(language === 'ar' ? `❌ خطأ: ${errorMessage}` : `❌ Error: ${errorMessage}`);
    }
  };

  const handleSaveAndPrint = () => handleSave('print');

  // ========== Render ==========
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-background z-10 border-b px-6 py-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{language === 'ar' ? 'فاتورة مبيعات جديدة' : 'New Sales Invoice'}</span>
              {invoiceNumber && <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded-full">{invoiceNumber}</span>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
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
                    <Label className="flex items-center gap-1 mb-2">{language === 'ar' ? 'العميل' : 'Customer'} <span className="text-destructive">*</span></Label>
                    <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
                      <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر العميل' : 'Select customer'} /></SelectTrigger>
                      <SelectContent>
                        {loadingCustomers ? <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                          customers.map((customer: Customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              <div className="flex justify-between w-full">
                                <span>{language === 'ar' ? customer.name_ar || customer.name : customer.name}</span>
                                {(customer.point || 0) > 0 && <span className="flex items-center gap-1 text-amber-600 text-xs"><Star size={10} />{customer.point}</span>}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* المندوب */}
                  <div className="col-span-2 md:col-span-1">
                    <Label className="mb-2 block">{language === 'ar' ? 'المندوب' : 'Salesman'}</Label>
                    <Select value={formData.sales_representative_id} onValueChange={(value) => setFormData({ ...formData, sales_representative_id: value })}>
                      <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المندوب' : 'Select salesman'} /></SelectTrigger>
                      <SelectContent>
                        {loadingSalesmen ? <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                          salesmen.map((salesman: SalesRepresentative) => (
                            <SelectItem key={salesman.id} value={salesman.id.toString()}>{language === 'ar' ? salesman.name_ar || salesman.name : salesman.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* الفرع */}
                  <div className="col-span-2 md:col-span-1">
                    <Label className="flex items-center gap-1 mb-2">{language === 'ar' ? 'الفرع' : 'Branch'} <span className="text-destructive">*</span></Label>
                    <Select value={formData.branch_id} onValueChange={(value) => setFormData({ ...formData, branch_id: value, warehouse_id: "", treasury_id: "" })}>
                      <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select branch'} /></SelectTrigger>
                      <SelectContent>
                        {loadingBranches ? <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                          branches.map((branch: Branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* المخزن */}
                  <div className="col-span-2 md:col-span-1">
                    <Label className="flex items-center gap-1 mb-2">{language === 'ar' ? 'المخزن' : 'Warehouse'} <span className="text-destructive">*</span></Label>
                    <Select value={formData.warehouse_id} onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })} disabled={!formData.branch_id}>
                      <SelectTrigger><SelectValue placeholder={!formData.branch_id ? (language === 'ar' ? 'اختر الفرع أولاً' : 'Select branch first') : (language === 'ar' ? 'اختر المخزن' : 'Select warehouse')} /></SelectTrigger>
                      <SelectContent>
                        {loadingWarehouses ? <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                          warehouses.map((warehouse: Warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* الخزينة */}
                  <div className="col-span-2 md:col-span-1">
                    <Label className="flex items-center gap-1 mb-2">{language === 'ar' ? 'الخزينة' : 'Treasury'} <span className="text-destructive">*</span></Label>
                    <Select value={formData.treasury_id} onValueChange={(value) => setFormData({ ...formData, treasury_id: value })} disabled={!formData.branch_id}>
                      <SelectTrigger><SelectValue placeholder={!formData.branch_id ? (language === 'ar' ? 'اختر الفرع أولاً' : 'Select branch first') : (language === 'ar' ? 'اختر الخزينة' : 'Select treasury')} /></SelectTrigger>
                      <SelectContent>
                        {loadingTreasuries ? <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div> :
                          treasuries.map((treasury: Treasury) => (
                            <SelectItem key={treasury.id} value={treasury.id.toString()}>
                              {treasury.name} ({treasury.currency})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* طريقة الدفع */}
                  <div>
                    <Label className="mb-2 block">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                    <Select value={formData.payment_method} onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                        <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                        <SelectItem value="wallet">{language === 'ar' ? 'محفظة' : 'Wallet'}</SelectItem>
                        <SelectItem value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</SelectItem>
                        <SelectItem value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                        <SelectItem value="check">{language === 'ar' ? 'شيك' : 'Check'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* تاريخ الاستحقاق */}
                  <div>
                    <Label className="mb-2 block">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
                    <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                  </div>
                </CardContent>
              </Card>

              {/* Product Search & Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    {language === 'ar' ? 'المنتجات' : 'Products'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative" ref={searchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder={!formData.warehouse_id ? (language === 'ar' ? '⚠️ اختر المخزن أولاً للبحث' : '⚠️ Select warehouse first') :
                          (language === 'ar' ? '🔍 بحث بالاسم أو الباركود... (Enter للإضافة)' : '🔍 Search... (Enter to add)')}
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowProductList(true); }}
                        onFocus={() => setShowProductList(true)}
                        onKeyDown={handleKeyDown}
                        className="pl-10 pr-10 h-12 text-base"
                        disabled={!formData.warehouse_id}
                        autoFocus
                      />
                      {searchQuery && <button onClick={() => { setSearchQuery(""); setShowProductList(false); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4" /></button>}
                    </div>
                    {showProductList && searchQuery && !loadingProducts && products.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        {products.map((product: any) => (
                          <button key={product.id} onClick={() => openVariantSelector(product)} className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0 flex items-center justify-between group">
                            <div className="flex-1">
                              <div className="font-medium">{language === 'ar' ? (product.name_ar || product.name) : product.name}</div>
                              <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-primary">{(product.sell_price || product.price)} {currencies.find(c => c.id === Number(formData.currency_id))?.symbol}</div>
                              <div className={`text-xs px-2 py-0.5 rounded-full mt-1 ${(product.stock || 0) === 0 ? 'bg-red-100 text-red-700' : (product.stock || 0) <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {language === 'ar' ? 'المخزون:' : 'Stock:'} {product.stock || 0}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showProductList && searchQuery && !loadingProducts && products.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                        {language === 'ar' ? '❌ لا توجد منتجات مطابقة' : '❌ No products found'}
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="min-w-[200px]">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                          <TableHead className="w-16 text-center">{language === 'ar' ? 'المخزون' : 'Stock'}</TableHead>
                          <TableHead className="w-20 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                          <TableHead className="w-28 text-right">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                          <TableHead className="w-20 text-center">{language === 'ar' ? 'خصم %' : 'Disc %'}</TableHead>
                          <TableHead className="w-32 text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><Package size={32} className="mx-auto opacity-30" /><span className="text-sm">{language === 'ar' ? 'لا توجد منتجات' : 'No products added'}</span></TableCell></TableRow>
                        ) : (
                          items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="font-medium text-sm">{item.product_name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                             {(item.unit_id || item.color_id) && (
  <div className="text-xs text-primary mt-1 flex flex-wrap gap-2 items-center">
    {item.unit_name && (
      <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
        {language === 'ar' ? 'مقاس:' : 'Size:'} {item.unit_name}
      </span>
    )}
    {item.color_name && (
      <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
        {language === 'ar' ? 'لون:' : 'Color:'}
        <div 
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: item.color_hex || '#CCCCCC',
            border: '1px solid #ccc'
          }}
        />
        {item.color_name}
      </span>
    )}
  </div>
)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${(item.stock || 0) === 0 ? 'bg-red-100 text-red-700' : (item.stock || 0) <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                  {item.stock || 0}
                                </span>
                              </TableCell>
                              <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-20 text-center mx-auto h-8" /></TableCell>
                              <TableCell><Input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} className="w-24 text-right h-8" /></TableCell>
                              <TableCell><Input type="number" min="0" max="100" value={item.discount_percent} onChange={(e) => updateItem(item.id, 'discount_percent', parseFloat(e.target.value) || 0)} className="w-20 text-center mx-auto h-8" /></TableCell>
                              <TableCell className="font-medium text-right text-sm">{item.total_price.toLocaleString()}</TableCell>
                              <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {items.length > 0 && (
                    <div className="flex justify-between items-center text-sm bg-muted/30 p-3 rounded-lg">
                      <div className="flex gap-4"><span>{language === 'ar' ? 'عدد المنتجات:' : 'Items:'} <strong>{items.length}</strong></span><span>{language === 'ar' ? 'الكمية الإجمالية:' : 'Total Qty:'} <strong>{items.reduce((sum, i) => sum + i.quantity, 0)}</strong></span></div>
                      <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setShowProductList(true); inputRef.current?.focus(); }}><Plus className="h-4 w-4" />{language === 'ar' ? 'إضافة منتج آخر' : 'Add Another'}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card><CardContent className="pt-4"><Label className="mb-2 block">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder={language === 'ar' ? 'أضف ملاحظات للفاتورة...' : 'Add invoice notes...'} className="resize-none" /></CardContent></Card>
            </div>

            {/* Summary */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader className="pb-3 border-b"><CardTitle className="text-lg flex items-center gap-2"><div className="w-1 h-5 bg-primary rounded-full" />{language === 'ar' ? 'ملخص الفاتورة' : 'Invoice Summary'}</CardTitle></CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2"><Label className="text-sm text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'} <span className="text-destructive">*</span></Label><Select value={formData.currency_id} onValueChange={(value) => setFormData({ ...formData, currency_id: value })}><SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger><SelectContent>{loadingCurrencies ? <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : currencies.map((c: Currency) => <SelectItem key={c.id} value={c.id.toString()}>{getCurrencyName(c)} ({c.symbol})</SelectItem>)}</SelectContent></Select></div>
                  <div className="flex justify-between items-center py-2 border-b"><span className="text-muted-foreground">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span><span className="font-medium text-lg">{formatAmount(totals.subtotal, currencies.find(c => c.id === Number(formData.currency_id))?.code)}</span></div>
                  <div className="space-y-2"><div className="flex justify-between items-center"><Label className="text-sm text-muted-foreground">{language === 'ar' ? 'الخصم' : 'Discount'}</Label><span className="text-destructive font-medium">-{formatAmount(totals.discountAmount, currencies.find(c => c.id === Number(formData.currency_id))?.code)}</span></div><div className="flex items-center gap-3"><div className="flex-1 relative"><Input type="number" min="0" max="100" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })} className="pl-8 pr-4 text-center" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span></div></div></div>
                  <div className="space-y-2"><div className="flex justify-between items-center"><Label className="text-sm text-muted-foreground">{language === 'ar' ? 'الضريبة' : 'Tax'} <span className="text-destructive">*</span></Label><span className="text-primary font-medium">+{formatAmount(totals.taxAmount, currencies.find(c => c.id === Number(formData.currency_id))?.code)}</span></div><Select value={formData.tax_id} onValueChange={(value) => setFormData({ ...formData, tax_id: value })}><SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger><SelectContent>{loadingTaxes ? <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : taxes.map((t: Tax) => <SelectItem key={t.id} value={t.id.toString()}>{getTaxName(t)} ({t.rate}%)</SelectItem>)}</SelectContent></Select></div>
                  <div className="border-t pt-4"><div className="flex justify-between items-center"><span className="text-lg font-bold">{language === 'ar' ? 'الإجمالي' : 'Total'}</span><span className="text-2xl font-bold text-primary">{formatAmount(totals.totalAmount, currencies.find(c => c.id === Number(formData.currency_id))?.code)}</span></div></div>
                  <div className="flex flex-col gap-3 pt-4"><Button onClick={() => handleSave('save')} disabled={items.length === 0 || !formData.customer_id || !formData.currency_id || !formData.tax_id || !formData.branch_id || !formData.warehouse_id || !formData.treasury_id} className="w-full gap-2 h-11 text-base"><Save className="h-4 w-4" />{language === 'ar' ? 'حفظ الفاتورة' : 'Save Invoice'}</Button><Button variant="outline" onClick={handleSaveAndPrint} disabled={items.length === 0 || !formData.customer_id} className="w-full gap-2 h-11"><Printer className="h-4 w-4" />{language === 'ar' ? 'حفظ وطباعة' : 'Save & Print'}</Button></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Dialog لاختيار المقاس واللون */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{language === 'ar' ? 'اختيار المقاس واللون' : 'Select Size & Color'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {selectedProduct && selectedProduct.units && selectedProduct.units.length > 0 && (
              <>
                <div>
                  <Label>{language === 'ar' ? 'المقاس' : 'Size'}</Label>
                  <Select value={selectedUnit?.unit_id?.toString()} onValueChange={(val) => {
                    const unit = selectedProduct.units?.find(u => u.unit_id === parseInt(val));
                    setSelectedUnit(unit || null);
                    setSelectedColor(null);
                  }}>
                    <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المقاس' : 'Select size'} /></SelectTrigger>
                    <SelectContent>
                      {selectedProduct.units.map(unit => (
                        <SelectItem key={unit.unit_id} value={unit.unit_id.toString()}>{unit.unit_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedUnit && selectedUnit.colors && selectedUnit.colors.length > 0 && (
                  <div>
                    <Label>{language === 'ar' ? 'اللون' : 'Color'}</Label>
                 <Select value={selectedColor?.color_id?.toString()} onValueChange={(val) => {
  const color = selectedUnit.colors.find(c => c.color_id === parseInt(val));
  setSelectedColor(color || null);
}}>
  <SelectTrigger className="flex items-center justify-between">
    <SelectValue placeholder={language === 'ar' ? 'اختر اللون' : 'Select color'} />
    {selectedColor && (
      <div 
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: selectedColor.hex_code || '#CCCCCC',
          border: '1px solid #ddd',
          marginLeft: '8px'
        }}
      />
    )}
  </SelectTrigger>
  <SelectContent>
    {selectedUnit.colors.map(color => (
      <SelectItem key={color.color_id} value={color.color_id.toString()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: color.hex_code || '#CCCCCC',
              border: '1px solid #ccc'
            }}
          />
          <span>
            {color.color} ({language === 'ar' ? 'المخزون' : 'stock'}: {color.stock})
          </span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
                  </div>
                )}
                <Button onClick={() => {
                  if (!selectedUnit) { toast.error(language === 'ar' ? 'يرجى اختيار المقاس' : 'Select size'); return; }
                  if (selectedUnit.colors && selectedUnit.colors.length > 0 && !selectedColor) { toast.error(language === 'ar' ? 'يرجى اختيار اللون' : 'Select color'); return; }
                  addProductToCart(selectedProduct, selectedUnit, selectedColor);
                }} className="w-full">{language === 'ar' ? 'إضافة إلى الفاتورة' : 'Add to Invoice'}</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default SalesInvoiceForm;