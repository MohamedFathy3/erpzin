import { AxiosError } from "axios";
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Search,
  RotateCcw,
  Package,
  Receipt,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Minus,
  Trash2,
  FileSearch,
  Palette,
  Ruler
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';



// ==================== Types ====================





interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
  color?: string | null;
  size?: string | null;
  product?: {
    id: string;
    name: string;
    name_ar: string | null;
    sku: string;
  };
}

interface Sale {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: string;
  status: string;
  customer?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
  sale_items: SaleItem[];
}

interface ReturnItem extends SaleItem {
  selected: boolean;
  return_quantity: number;
  return_reason: string;
  return_color?: string | null;
  return_size?: string | null;
}

interface ApiError {
  message?: string;
}

interface POSReturnsProps {
  isOpen: boolean;
  onClose: () => void;
  currentShiftId?: string;
  onReturnComplete?: (amount: number) => void;
}

interface DirectReturnItem {
  id: string;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  reason: string;
  color?: string | null;
  size?: string | null;
  quantity_sold?: number;
  product: {
    id: number;
    name: string;
    name_ar?: string | null;
    description?: string | null;
    image_url?: string | null;
    imageUrl?: string;
    category?: {
      id: number;
      name: string;
      icon?: string;
      parent_id?: number | null;
      type?: string;
    };
    sku: string;
    barcode?: string;
    stock?: number;
    reorder_level?: number;
    price: string;
    cost?: string | null;
    active?: boolean;
  };
}

interface InvoiceProduct {
  id: number;
  name: string;
  name_ar?: string | null;
  sku: string;
  barcode?: string;
  price: string;
  image_url?: string | null;
  imageUrl?: string;
  stock?: number;
  quantity_sold: number;
  invoice_price: string;
  color?: string | null;
  size?: string | null;
}

// ==================== Direct Return Component ====================
const DirectReturnInvoice: React.FC<{
  onComplete: (amount: number) => void;
  currentShiftId?: string;
}> = ({ onComplete, currentShiftId }) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const queryClient = useQueryClient();
  const { taxRates, defaultTaxRate, currencies, defaultCurrency, formatAmount } = useCurrencyTax();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<DirectReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [taxRateId, setTaxRateId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [searchMode, setSearchMode] = useState<'product' | 'invoice'>('invoice');
  const [showResults, setShowResults] = useState(false);

  // Set defaults
  useEffect(() => {
    if (defaultTaxRate && !taxRateId) setTaxRateId(defaultTaxRate.id);
    if (defaultCurrency && !currencyId) setCurrencyId(defaultCurrency.id);
  }, [defaultTaxRate, defaultCurrency, taxRateId, currencyId]);

  // ========== Search Invoice by Number ==========
  const { data: invoiceData, isLoading: isSearchingInvoice } = useQuery({
    queryKey: ['invoice-search', invoiceNumber],
    queryFn: async () => {
      if (!invoiceNumber.trim()) return null;

      try {
        const response = await api.get('/invoices/search', {
          params: { invoice_number: invoiceNumber }
        });

        setShowResults(true);
        return response.data;
      } catch (error) {
        setShowResults(true);
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 404) {
          toast.error('الفاتورة غير موجودة');
        } else {
          toast.error('خطأ في البحث عن الفاتورة');
        }
        return null;
      }
    },
    enabled: !!invoiceNumber && invoiceNumber.length > 0 && searchMode === 'invoice',
  });

  // Extract products from invoice with color and size
  const invoiceProducts: InvoiceProduct[] = invoiceData?.data?.items?.map((item: { product: { id: number; name: string; name_ar?: string | null; sku: string; barcode?: string; price: string; image_url?: string | null; stock?: number }; quantity: number; price: string; color?: string | null; size?: string | null }) => ({
    ...item.product,
    id: item.product.id,
    name: item.product.name,
    name_ar: item.product.name_ar,
    sku: item.product.sku,
    barcode: item.product.barcode,
    price: item.product.price,
    image_url: item.product.image_url,
    stock: item.product.stock,
    quantity_sold: item.quantity,
    invoice_price: item.price,
    color: item.color,
    size: item.size,
  })) || [];

  // ========== Search Regular Products ==========
  const { data: regularProducts, isLoading: isSearchingProducts } = useQuery({
    queryKey: ['product-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchMode !== 'product') return [];

      try {
        const response = await api.get('/products/search', {
          params: { name: searchQuery }
        });
        setShowResults(true);
        return response.data?.data || [];
      } catch (error) {
        console.error('Error searching products:', error);
        setShowResults(true);
        return [];
      }
    },
    enabled: searchMode === 'product' && !!searchQuery,
  });

  // Determine which products to show
  const filteredProducts = searchMode === 'invoice' ? invoiceProducts : (regularProducts || []);
  const isSearching = searchMode === 'invoice' ? isSearchingInvoice : isSearchingProducts;

  // ========== Item Management ==========
  const addItem = (product: InvoiceProduct) => {
    const unitPrice = searchMode === 'invoice'
      ? parseFloat(product.invoice_price || product.price || '0')
      : parseFloat(product.price || '0');

    const quantitySold = searchMode === 'invoice' ? product.quantity_sold : undefined;

    // Check for existing item with same product, color, and size
    const existing = items.find(i =>
      i.product_id === product.id &&
      i.color === product.color &&
      i.size === product.size
    );

    if (existing) {
      if (quantitySold && existing.quantity + 1 > quantitySold) {
        toast.error(`لا يمكن إرجاع أكثر من ${quantitySold} قطعة من هذا المنتج`);
        return;
      }

      setItems(items.map(i =>
        i.product_id === product.id && i.color === product.color && i.size === product.size
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems([...items, {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name_ar || product.name,
        sku: product.sku || 'N/A',
        quantity: 1,
        unit_price: unitPrice,
        reason: '',
        color: product.color || null,
        size: product.size || null,
        quantity_sold: quantitySold,
        product: {
          ...product,
          price: product.price?.toString() || '0',
          image_url: product.image_url,
          imageUrl: product.imageUrl
        }
      }]);
    }

    // Clear search and close dropdown
    setSearchQuery('');
    setShowResults(false);

    const productName = product.name_ar || product.name;
    const variant = product.color || product.size
      ? ` (${product.color || ''} ${product.size || ''})`.trim()
      : '';
    toast.success(`تم إضافة ${productName}${variant}`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => {
      const newItems = prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;

          if (item.quantity_sold && newQty > item.quantity_sold) {
            toast.error(`لا يمكن إرجاع أكثر من ${item.quantity_sold} قطعة`);
            return item;
          }

          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter((item): item is DirectReturnItem => item !== null);

      return newItems;
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemColor = (id: string, color: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, color } : item
    ));
  };

  const updateItemSize = (id: string, size: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, size } : item
    ));
  };

  // ========== Calculations ==========
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const selectedTaxRate = taxRates.find(t => t.id === taxRateId);
  const taxPercent = selectedTaxRate?.rate || 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;

  // ========== Process Return ==========
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('لم يتم إضافة أي صنف');

      // بناء الـ payload حسب الـ backend المطلوب
      const payload: any = {
        refund_method: refundMethod, // مهم جداً: refund_method منفصل
        reason: returnReason || 'مرتجع بدون سبب',
        items: items.map(item => ({
          product_id: item.product_id,
          color: item.color || null,
          size: item.size || null,
          quantity: item.quantity,
          price: item.unit_price
        })),
        payments: [{
          method: refundMethod,
          amount: total
        }]
      };

      // فقط في حالة البحث بفاتورة وإذا فيه رقم فاتورة نبعته
      if (searchMode === 'invoice' && invoiceNumber) {
        payload.invoice_number = invoiceNumber;
      }

      console.log('📤 Sending payload to API:', payload);

      const apiResponse = await api.post('/invoice-return/store', payload);
      const invoiceId = apiResponse.data?.data?.id;

      if (!invoiceId) {
        throw new Error('فشل في الحصول على معرف الفاتورة');
      }

      return apiResponse.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast.success('تم إنشاء فاتورة المرتجع بنجاح');
      onComplete(total);

      // Clear form
      setItems([]);
      setInvoiceNumber('');
      setReturnReason('');
      setRefundMethod('cash');
    },
    onError: (error: AxiosError<ApiError>) => {
      console.error(
        '❌ Return Error:',
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message || 'خطأ في معالجة المرتجع'
      );
    }
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResults(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ========== Render ==========
  return (
    <div className="h-full flex flex-col gap-4">
      {/* Search Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={searchMode === 'invoice' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setSearchMode('invoice');
            setSearchQuery('');
            setInvoiceNumber('');
            setItems([]);
            setShowResults(false);
          }}
          className="rounded-lg"
        >
          <Receipt className="h-4 w-4 me-2" />
          بحث بفاتورة
        </Button>

      </div>

      {/* Search Input */}

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
        {searchMode === 'invoice' ? (
          <div className="relative">
            <Input
              placeholder="أدخل رقم الفاتورة للبحث..."
              value={invoiceNumber}
              onChange={(e) => {
                setInvoiceNumber(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="h-12 ps-12 pe-10 text-base rounded-xl"
              autoFocus
            />
            {invoiceNumber && (
              <X
                className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 cursor-pointer hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setInvoiceNumber('');
                  setItems([]);
                  setShowResults(false);
                  queryClient.setQueryData(['invoice-search', invoiceNumber], null);
                }}
              />
            )}
          </div>
        ) : (
          <div className="relative">
            <Input
              placeholder="ابحث عن المنتج بالاسم، SKU أو الباركود..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="h-12 ps-12 pe-10 text-base rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <X
                className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 cursor-pointer hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  setShowResults(false);
                }}
              />
            )}
          </div>
        )}

        {/* Search Results Dropdown - مع علامة X للقفل */}
        {showResults && (searchMode === 'invoice' ? invoiceNumber : searchQuery) && (
          <div className="absolute top-full start-0 end-0 mt-1 bg-background border rounded-xl shadow-lg z-50">
            {/* Header with close button */}
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
              <span className="text-sm font-medium px-2">
                {searchMode === 'invoice' ? 'نتائج البحث عن فاتورة' : 'نتائج البحث عن منتجات'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowResults(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-auto">
              {isSearching ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-3">جاري البحث...</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <>
                  {/* Invoice Header */}
                  {searchMode === 'invoice' && invoiceData?.data && (
                    <div className="p-4 bg-primary/5 border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-lg">{invoiceData.data.invoice_number}</div>
                          <div className="text-sm text-muted-foreground">
                            العميل: {invoiceData.data.customer?.name || 'غير محدد'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            تاريخ: {format(new Date(invoiceData.data.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {formatCurrency(invoiceData.data.total_amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {invoiceData.data.items?.length || 0} منتج
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {filteredProducts.map((product) => (
                    <div
                      key={`${product.id}-${product.color || ''}-${product.size || ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(product);
                      }}
                      className="p-4 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.image_url || product.imageUrl ? (
                            <img
                              src={product.image_url || product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                              }}
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-base">
                            {product.name_ar || product.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {product.sku || 'N/A'}
                          </div>

                          {/* Color and Size */}
                          {(product.color || product.size) && (
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {product.color && (
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                                  <Palette className="h-3 w-3 inline me-1" />
                                  {product.color}
                                </span>
                              )}
                              {product.size && (
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                                  <Ruler className="h-3 w-3 inline me-1" />
                                  {product.size}
                                </span>
                              )}
                            </div>
                          )}

                          {searchMode === 'invoice' && product.quantity_sold && (
                            <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md inline-block mt-2">
                              الكمية المباعة: {product.quantity_sold}
                            </div>
                          )}
                        </div>
                        <div className="text-left flex-shrink-0">
                          <div className="font-bold text-lg text-primary">
                            {formatCurrency(
                              searchMode === 'invoice'
                                ? (product.invoice_price || product.price)
                                : product.price
                            )}
                          </div>
                          {searchMode === 'invoice' && product.price !== product.invoice_price && (
                            <div className="text-xs text-muted-foreground line-through">
                              {formatCurrency(product.price)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-8 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">لم يتم العثور على نتائج</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items List */}
      <ScrollArea className="flex-1 border rounded-xl bg-background">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لم يتم إضافة أصناف بعد</p>
              <p className="text-sm mt-1">
                {searchMode === 'invoice'
                  ? 'أدخل رقم الفاتورة لإظهار منتجاتها'
                  : 'ابحث عن المنتجات لإضافتها'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {items.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-muted/30 border flex flex-col gap-3">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.product.imageUrl || item.product.image_url ? (
                      <img
                        src={item.product.imageUrl || item.product.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                        }}
                      />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-lg">{item.product_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.sku}
                    </div>

                    {/* Color and Size Display/Edit */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Palette className="h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="اللون"
                          value={item.color || ''}
                          onChange={(e) => updateItemColor(item.id, e.target.value)}
                          className="h-8 w-24 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="المقاس"
                          value={item.size || ''}
                          onChange={(e) => updateItemSize(item.id, e.target.value)}
                          className="h-8 w-24 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {item.quantity_sold && (
                      <div className="text-xs text-muted-foreground mt-2">
                        الكمية المباعة: {item.quantity_sold}
                      </div>
                    )}
                    <div className="text-primary font-semibold mt-2">
                      {formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.unit_price * item.quantity)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="h-8 w-8"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-8 w-8"
                      disabled={item.quantity_sold ? item.quantity >= item.quantity_sold : false}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Return Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm mb-2 block">سبب الإرجاع</Label>
          <Input
            placeholder="سبب الإرجاع (اختياري)"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="rounded-lg"
          />
        </div>
        <div>
          <Label className="text-sm mb-2 block">طريقة الاسترداد</Label>
          <Select value={refundMethod} onValueChange={setRefundMethod}>
            <SelectTrigger className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">💵 نقداً</SelectItem>
              <SelectItem value="card">💳 بطاقة</SelectItem>
              <SelectItem value="wallet">📱 محفظة</SelectItem>
              <SelectItem value="credit">👤 رصيد للعميل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoice Number Display - يظهر فقط في وضع الفاتورة */}
      {searchMode === 'invoice' && invoiceNumber && (
        <div className="text-sm bg-primary/10 text-primary p-3 rounded-lg">
          <span className="font-medium">📄 رقم الفاتورة الأصلية:</span> {invoiceNumber}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-sidebar rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span>
                {language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'} {formatAmount(subtotal, currencies.find(c => c.id === currencyId)?.code)}
              </span>
              <span>
                {language === 'ar' ? 'الضريبة' : 'Tax'} ({taxPercent}%): {formatAmount(taxAmount, currencies.find(c => c.id === currencyId)?.code)}
              </span>
            </div>
            <div className="text-2xl font-bold">
              {language === 'ar' ? 'الإجمالي:' : 'Total:'} {formatAmount(total, currencies.find(c => c.id === currencyId)?.code)}
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => processReturnMutation.mutate()}
            disabled={items.length === 0 || processReturnMutation.isPending}
            className="h-14 px-8 text-lg rounded-xl bg-destructive hover:bg-destructive/90"
          >
            <RotateCcw className="h-5 w-5 me-2" />
            {processReturnMutation.isPending ? 'جاري المعالجة...' : 'تأكيد المرتجع'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ==================== Main POSReturns Component ====================
const POSReturns: React.FC<POSReturnsProps> = ({
  isOpen,
  onClose,
  currentShiftId,
  onReturnComplete
}) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [step, setStep] = useState<'invoice' | 'search' | 'select' | 'invoice-search'>('invoice');

  // ========== Search Sales ==========
  const { data: searchResults, isLoading: isSearching, refetch: searchInvoice } = useQuery({
    queryKey: ['search-sale', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name, name_ar),
          sale_items(
            *,
            product:products(id, name, name_ar, sku)
          )
        `)
        .or(`invoice_number.ilike.%${searchQuery}%`)
        .eq('status', 'completed')
        .order('sale_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Sale[];
    },
    enabled: false,
  });

  // ========== Process Return ==========
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);

      if (selectedItems.length === 0) throw new Error('لم يتم تحديد أي صنف للإرجاع');
      if (!selectedSale) throw new Error('لم يتم اختيار فاتورة');

      const subtotal = selectedItems.reduce((sum, item) =>
        sum + (item.unit_price * item.return_quantity), 0
      );
      const totalAmount = subtotal;

      // Prepare API payload - مع refund_method منفصل
      const payload = {
        invoice_number: selectedSale.invoice_number,
        refund_method: refundMethod, // مهم جداً: refund_method منفصل
        reason: returnReason || 'مرتجع بدون سبب',
        items: selectedItems.map(item => ({
          product_id: parseInt(item.product_id),
          color: item.return_color || item.color || null,
          size: item.return_size || item.size || null,
          quantity: item.return_quantity,
          price: item.unit_price
        })),
        payments: [{
          method: refundMethod,
          amount: totalAmount
        }]
      };

      console.log('📤 Sending return payload with refund_method:', payload.refund_method);

      // Call API
      const apiResponse = await api.post('/invoice-return/store', payload);

      if (!apiResponse.data?.data?.id) {
        throw new Error('فشل في الحصول على معرف الفاتورة من API');
      }

      // Generate return number for Supabase
      const { data: returnNumber } = await supabase.rpc('generate_return_number');

      // Create return record in Supabase
      const { data: returnRecord, error: returnError } = await supabase
        .from('pos_returns')
        .insert({
          api_invoice_id: apiResponse.data.data.id.toString(),
          return_number: returnNumber,
          original_sale_id: selectedSale.id,
          original_invoice_number: selectedSale.invoice_number,
          shift_id: currentShiftId || null,
          customer_id: selectedSale.customer?.id || null,
          return_type: selectedItems.length === selectedSale.sale_items.length ? 'full' : 'partial',
          subtotal,
          tax_amount: 0,
          total_amount: totalAmount,
          refund_method: refundMethod,
          reason: returnReason,
          processed_by: user?.id
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const { error: itemsError } = await supabase
        .from('pos_return_items')
        .insert(selectedItems.map(item => ({
          return_id: returnRecord.id,
          original_sale_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product?.name || 'غير معروف',
          quantity: item.return_quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.return_quantity,
          color: item.return_color || item.color,
          size: item.return_size || item.size,
          reason: item.return_reason || returnReason
        })));

      if (itemsError) throw itemsError;

      // Update stock
      for (const item of selectedItems) {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (currentProduct) {
          await supabase
            .from('products')
            .update({ stock: currentProduct.stock + item.return_quantity })
            .eq('id', item.product_id);
        }
      }

      // Update shift totals
      if (currentShiftId) {
        const { data: currentShift } = await supabase
          .from('pos_shifts')
          .select('total_returns')
          .eq('id', currentShiftId)
          .single();

        if (currentShift) {
          await supabase
            .from('pos_shifts')
            .update({
              total_returns: (currentShift.total_returns || 0) + totalAmount
            })
            .eq('id', currentShiftId);
        }
      }

      return { returnRecord, totalAmount, apiResponse: apiResponse.data };
    },
    onSuccess: ({ totalAmount }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast.success('تم إرجاع الفاتورة بنجاح');
      onReturnComplete?.(totalAmount);
      handleClose();
    },
    onError: (error: AxiosError<ApiError>) => {
      console.error('❌ Return Error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'خطأ في معالجة المرتجع');
    }
  });

  // ========== Handlers ==========
  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchInvoice();
    }
  };

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setReturnItems(sale.sale_items.map(item => ({
      ...item,
      selected: false,
      return_quantity: item.quantity,
      return_reason: '',
      return_color: item.color,
      return_size: item.size
    })));
    setStep('select');
  };

  const toggleItemSelection = (itemId: string) => {
    setReturnItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateReturnQuantity = (itemId: string, quantity: number) => {
    setReturnItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, return_quantity: Math.min(Math.max(1, quantity), item.quantity) }
        : item
    ));
  };

  const updateItemColor = (itemId: string, color: string) => {
    setReturnItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, return_color: color } : item
    ));
  };

  const updateItemSize = (itemId: string, size: string) => {
    setReturnItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, return_size: size } : item
    ));
  };

  const selectAll = () => {
    setReturnItems(prev => prev.map(item => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    setReturnItems(prev => prev.map(item => ({ ...item, selected: false })));
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedSale(null);
    setReturnItems([]);
    setReturnReason('');
    setRefundMethod('cash');
    setStep('invoice');
    onClose();
  };

  const selectedItemsTotal = returnItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (item.unit_price * item.return_quantity), 0);

  const selectedItemsCount = returnItems.filter(item => item.selected).length;

  // ========== Render ==========
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col bg-background">
        {/* Header */}
        <div className="bg-sidebar px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {step === 'invoice' ? 'فاتورة مرتجع مباشرة' : 'مرتجعات المبيعات'}
              </h2>
              <p className="text-white/60 text-sm">
                {step === 'invoice'
                  ? 'إنشاء فاتورة مرتجع بدون ربط بفاتورة بيع'
                  : step === 'search'
                    ? 'البحث عن فاتورة للإرجاع'
                    : step === 'invoice-search'
                      ? 'البحث عن فاتورة محددة'
                      : 'تحديد الأصناف المرتجعة'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step === 'invoice' && (
              <>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('search')}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Search className="h-4 w-4 me-1" />
                  <span className="text-xs">بحث عام</span>
                </Button>
              </>
            )}
            {(step === 'search' || step === 'invoice-search') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('invoice')}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4 me-1" />
                <span className="text-xs">إلغاء</span>
              </Button>
            )}
            {step === 'select' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('invoice-search')}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4 me-1" />
                <span className="text-xs">تغيير الفاتورة</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {step === 'invoice' && (
            <DirectReturnInvoice
              onComplete={(amount) => {
                onReturnComplete?.(amount);
                handleClose();
              }}
              currentShiftId={currentShiftId}
            />
          )}

          {(step === 'search' || step === 'invoice-search') && (
            <div className="space-y-6 h-full flex flex-col">
              {/* Search Input */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    placeholder={step === 'invoice-search'
                      ? "أدخل رقم الفاتورة للبحث..."
                      : "ابحث برقم الفاتورة أو اسم العميل..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-14 ps-12 text-lg rounded-xl"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="h-14 px-8 rounded-xl text-base"
                >
                  <Search className="h-5 w-5 me-2" />
                  بحث
                </Button>
              </div>

              {/* Results */}
              <ScrollArea className="flex-1">
                {isSearching ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-lg text-muted-foreground">جاري البحث...</p>
                    </div>
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((sale) => (
                      <Card
                        key={sale.id}
                        className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                        onClick={() => handleSelectSale(sale)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Receipt className="h-7 w-7 text-primary" />
                              </div>
                              <div>
                                <div className="font-bold text-lg">{sale.invoice_number}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {format(new Date(sale.sale_date), 'yyyy/MM/dd HH:mm', { locale: ar })}
                                </div>
                                {sale.customer && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    👤 {sale.customer.name_ar || sale.customer.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-xl text-primary">
                                {sale.total_amount.toLocaleString()} ر.ي
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                📦 {sale.sale_items.length} صنف
                              </div>
                              <Badge variant="secondary" className="mt-2">
                                {sale.payment_method === 'cash' ? 'نقدي' :
                                  sale.payment_method === 'card' ? 'بطاقة' :
                                    sale.payment_method === 'wallet' ? 'محفظة' : sale.payment_method}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchQuery && !isSearching ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-10 w-10 opacity-50" />
                      </div>
                      <p className="text-lg font-medium">لم يتم العثور على نتائج</p>
                      <p className="text-sm mt-1">تأكد من رقم الفاتورة وحاول مرة أخرى</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-muted-foreground">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-10 w-10 opacity-50" />
                      </div>
                      <p className="text-lg font-medium">
                        {step === 'invoice-search' ? 'أدخل رقم الفاتورة' : 'ابحث عن فاتورة'}
                      </p>
                      <p className="text-sm mt-1">
                        {step === 'invoice-search'
                          ? 'أدخل رقم الفاتورة للبحث عنها'
                          : 'أدخل رقم الفاتورة أو اسم العميل للبحث'}
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {step === 'select' && selectedSale && (
            <div className="space-y-4 h-full flex flex-col">
              {/* Invoice Info */}
              <div className="p-4 rounded-xl bg-sidebar/5 border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{selectedSale.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(selectedSale.sale_date), 'yyyy/MM/dd HH:mm', { locale: ar })}
                    </div>
                    {selectedSale.customer && (
                      <div className="text-sm text-muted-foreground mt-1">
                        👤 {selectedSale.customer.name_ar || selectedSale.customer.name}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('invoice-search')} className="rounded-lg">
                  <X className="h-4 w-4 me-1" />
                  تغيير الفاتورة
                </Button>
              </div>

              {/* Selection Controls */}
              <div className="flex gap-3 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={selectAll} className="rounded-lg">
                  <CheckCircle2 className="h-4 w-4 me-1" />
                  تحديد الكل
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll} className="rounded-lg">
                  <X className="h-4 w-4 me-1" />
                  إلغاء التحديد
                </Button>
              </div>

              {/* Items List */}
              <ScrollArea className="flex-1 border rounded-xl">
                <div className="p-3 space-y-2">
                  {returnItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border-2 transition-all ${item.selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent bg-muted/30 hover:bg-muted/50'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          className="h-5 w-5"
                        />
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-base">
                            {item.product?.name_ar || item.product?.name || 'غير معروف'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.product?.sku}
                          </div>

                          {/* Color and Size Edit */}
                          {item.selected && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center gap-1">
                                <Palette className="h-3 w-3 text-muted-foreground" />
                                <Input
                                  placeholder="اللون"
                                  value={item.return_color || ''}
                                  onChange={(e) => updateItemColor(item.id, e.target.value)}
                                  className="h-7 w-20 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <Ruler className="h-3 w-3 text-muted-foreground" />
                                <Input
                                  placeholder="المقاس"
                                  value={item.return_size || ''}
                                  onChange={(e) => updateItemSize(item.id, e.target.value)}
                                  className="h-7 w-20 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground mt-2">
                            الكمية المباعة: {item.quantity}
                          </div>
                          {item.selected && (
                            <div className="text-xs text-primary mt-1">
                              سعر الوحدة: {item.unit_price.toLocaleString()} ر.ي
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <Label className="text-xs text-muted-foreground">كمية الإرجاع</Label>
                            <Input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={item.return_quantity}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 text-center h-10 rounded-lg font-bold"
                              disabled={!item.selected}
                            />
                          </div>
                          <div className="text-left min-w-[100px]">
                            <Label className="text-xs text-muted-foreground">الإجمالي</Label>
                            <div className="font-bold text-lg text-primary">
                              {(item.unit_price * item.return_quantity).toLocaleString()} ر.ي
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Return Details */}
              <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">سبب الإرجاع</Label>
                  <Textarea
                    placeholder="اكتب سبب الإرجاع..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={2}
                    className="rounded-xl resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">طريقة الاسترداد</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 نقدي</SelectItem>
                      <SelectItem value="card">💳 بطاقة</SelectItem>
                      <SelectItem value="wallet">📱 محفظة</SelectItem>
                      <SelectItem value="credit">👤 رصيد للعميل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer for Select Step */}
        {step === 'select' && (
          <div className="bg-muted/30 border-t p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-muted-foreground text-sm">الأصناف المحددة</span>
                <div className="font-bold text-2xl">{selectedItemsCount}</div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <span className="text-muted-foreground text-sm">إجمالي المرتجع</span>
                <div className="font-bold text-2xl text-primary">
                  {selectedItemsTotal.toLocaleString()} ر.ي
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="h-12 px-6 rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                onClick={() => processReturnMutation.mutate()}
                disabled={selectedItemsCount === 0 || processReturnMutation.isPending}
                className="h-12 px-8 rounded-xl text-base font-bold"
              >
                {processReturnMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin me-2"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 me-2" />
                    تأكيد المرتجع
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default POSReturns;