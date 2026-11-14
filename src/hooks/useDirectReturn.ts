// hooks/useDirectReturn.ts
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';
import { generateId } from '@/lib/utils';

export interface DirectReturnItem {
  id: string;
  product_id: number | null;
  invoice_item_id?: number;
  automotive_service_id?: number | null;
  meter_quantity?: number | null;
  color?: string | null;
  size?: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  reason: string;
  quantity_sold?: number;
  product: {
    id: number;
    name: string;
    name_ar?: string | null;
    sku: string;
    price: string;
    image_url?: string | null;
    imageUrl?: string;
  };
}

export interface InvoiceProduct {
  id: number;
  product_id?: number | null;
  invoice_item_id?: number;
  item_type?: string;
  automotive_service_id?: number | null;
  meter_quantity?: number | null;
  color?: string | null;
  size?: string | null;
  name: string;
  name_ar?: string | null;
  sku: string;
  price: string;
  quantity_sold: number;
  invoice_price: string;
  image_url?: string | null;
  stock?: number;
}

interface InvoiceItemSearchResult {
  id: number;
  product_id: number | null;
  item_type?: string;
  automotive_service_id?: number | null;
  meter_quantity?: number | null;
  color?: string | null;
  size?: string | null;
  product_name: string;
  quantity: number;
  price: number | string;
  total?: number | string | null;
  sku?: string;
  stock?: number;
}

interface InvoiceSearchResponse {
  data?: {
    is_complimentary?: boolean;
    total_amount?: number | string;
    original_total_amount?: number | string;
    items?: InvoiceItemSearchResult[];
  };
}

interface ReturnPayload {
  refund_method: string;
  reason: string;
  items: Array<{
    product_id: number | null;
    invoice_item_id?: number;
    automotive_service_id?: number | null;
    meter_quantity?: number | null;
    color?: string | null;
    size?: string | null;
    quantity: number;
    price: number;
  }>;
  payments: Array<{ method: string; amount: number }>;
  invoice_number?: string;
}

export interface UseDirectReturnProps {
  onComplete?: (amount: number) => void;
  currentShiftId?: string;
}

export const useDirectReturn = ({ onComplete, currentShiftId }: UseDirectReturnProps = {}) => {
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
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState<number | null>(null);

  // Set defaults
  useEffect(() => {
    if (defaultTaxRate && !taxRateId) setTaxRateId(String(defaultTaxRate.id));
    if (defaultCurrency && !currencyId) setCurrencyId(String(defaultCurrency.id));
  }, [defaultTaxRate, defaultCurrency, taxRateId, currencyId]);

  // ========== Search Invoice by Number ==========
  const { data: invoiceData, isLoading: isSearchingInvoice } = useQuery({
    queryKey: ['invoice-search', invoiceNumber],
    queryFn: async () => {
      if (!invoiceNumber.trim()) return null;

      try {
        const response = await api.get<InvoiceSearchResponse>('/invoices/search', {
          params: { invoice_number: invoiceNumber }
        });
        setShowResults(true);
        // حفظ total_amount
        if (response.data?.data?.total_amount) {
          setInvoiceTotalAmount(Number(response.data.data.total_amount));
        }
        return response.data;
      } catch (error: unknown) {
        setShowResults(true);
        if (isAxiosError(error) && error.response?.status === 404) {
          toast.error('الفاتورة غير موجودة');
        } else {
          toast.error('خطأ في البحث عن الفاتورة');
        }
        return null;
      }
    },
    enabled: !!invoiceNumber && invoiceNumber.length > 0 && searchMode === 'invoice',
  });

  // Reset when invoice number changes
  useEffect(() => {
    if (!invoiceNumber) {
      setInvoiceTotalAmount(null);
    }
  }, [invoiceNumber]);

  // ========== Search Regular Products ==========
  const { data: regularProducts, isLoading: isSearchingProducts } = useQuery({
    queryKey: ['product-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchMode !== 'product') return [];

      try {
        const response = await api.get<{ data?: InvoiceProduct[] }>('/products/search', {
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

  // Keep each item's share of the original invoice total for proportional returns.
  const isComplimentaryInvoice = Boolean(invoiceData?.data?.is_complimentary);
  const invoiceItems = invoiceData?.data?.items ?? [];
  const invoiceItemsTotal = invoiceItems.reduce(
    (sum, item) => sum + Number(item.total ?? (Number(item.price ?? 0) * Number(item.quantity ?? 0))),
    0,
  );
  const invoiceValueFactor = invoiceItemsTotal > 0
    ? Number(invoiceData?.data?.original_total_amount ?? invoiceData?.data?.total_amount ?? 0) / invoiceItemsTotal
    : 1;
  const invoiceProducts: InvoiceProduct[] = invoiceItems.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const lineTotal = Number(item.total ?? (Number(item.price ?? 0) * quantity));
    const unitPrice = String(isComplimentaryInvoice
      ? 0
      : quantity > 0
        ? (lineTotal / quantity) * invoiceValueFactor
        : (item.price ?? 0));
    
    return {
      id: Number(item.product_id ?? item.id),
      product_id: item.product_id == null ? null : Number(item.product_id),
      invoice_item_id: Number(item.id),
      item_type: item.item_type,
      automotive_service_id: item.automotive_service_id ?? null,
      meter_quantity: item.meter_quantity ?? null,
      color: item.color ?? null,
      size: item.size ?? null,
      name: item.product_name,
      name_ar: item.product_name,
      sku: item.sku || '',
      price: unitPrice,
      quantity_sold: Number(item.quantity) || 0,
      invoice_price: unitPrice,
      image_url: null,
      stock: item.stock,
    };
  });

  const filteredProducts = searchMode === 'invoice' ? invoiceProducts : (regularProducts || []);
  const isSearching = searchMode === 'invoice' ? isSearchingInvoice : isSearchingProducts;

  // ========== Item Management ==========
  const addItem = (product: InvoiceProduct) => {
    const unitPrice = searchMode === 'invoice'
      ? parseFloat(product.invoice_price || product.price || '0')
      : parseFloat(product.price || '0');

    const quantitySold = searchMode === 'invoice' ? product.quantity_sold : undefined;

    const existing = items.find(i => product.invoice_item_id
      ? i.invoice_item_id === product.invoice_item_id
      : i.product_id === product.id);

    if (existing) {
      if (quantitySold && existing.quantity + 1 > quantitySold) {
        toast.error(`لا يمكن إرجاع أكثر من ${quantitySold} قطعة من هذا المنتج`);
        return;
      }

      setItems(prev => prev.map(i =>
        (product.invoice_item_id ? i.invoice_item_id === product.invoice_item_id : i.product_id === product.id)
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems(prev => [...prev, {
        id: generateId(),
        product_id: searchMode === 'invoice' ? (product.product_id ?? null) : product.id,
        invoice_item_id: product.invoice_item_id,
        automotive_service_id: product.automotive_service_id ?? null,
        meter_quantity: product.meter_quantity ?? null,
        color: product.color ?? null,
        size: product.size ?? null,
        product_name: product.name_ar || product.name,
        sku: product.sku || 'N/A',
        quantity: 1,
        unit_price: unitPrice,
        reason: '',
        quantity_sold: quantitySold,
        product: {
          id: product.id,
          name: product.name,
          name_ar: product.name_ar,
          sku: product.sku,
          price: unitPrice.toString(),
          image_url: product.image_url,
          imageUrl: product.image_url
        }
      }]);
    }

    setSearchQuery('');
    setShowResults(false);
    
    const productName = product.name_ar || product.name;
    toast.success(`تم إضافة ${productName} بسعر ${unitPrice}`);
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

  const updateItemReason = (id: string, reason: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, reason } : item));
  };

  const clearItems = () => {
    setItems([]);
  };

  // ========== Calculations ==========
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const selectedTaxRate = taxRates.find(t => t.id === Number(taxRateId));
  const taxPercent = selectedTaxRate?.rate ?? 0;
  const taxAmount = searchMode === 'invoice' ? 0 : (subtotal * (taxPercent ?? 0)) / 100;
  const total = isComplimentaryInvoice ? 0 : subtotal + taxAmount;

  const selectedCurrency = currencies.find(c => c.id === currencyId);

  // ========== Process Return ==========
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('لم يتم إضافة أي صنف');

      const payload: ReturnPayload = {
        refund_method: isComplimentaryInvoice ? 'none' : refundMethod,
        reason: returnReason || 'مرتجع بدون سبب',
        items: items.map(item => ({
          product_id: item.product_id,
          invoice_item_id: item.invoice_item_id,
          automotive_service_id: item.automotive_service_id,
          meter_quantity: item.meter_quantity,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.unit_price
        })),
        payments: isComplimentaryInvoice ? [] : [{
          method: refundMethod,
          amount: total
        }]
      };

      if (searchMode === 'invoice' && invoiceNumber) {
        payload.invoice_number = invoiceNumber;
      }

      console.log('📤 Sending payload:', payload);

      const response = await api.post('/invoice-return/store', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      toast.success('تم إنشاء فاتورة المرتجع بنجاح');
      onComplete?.(total);
      
      setItems([]);
      setInvoiceNumber('');
      setReturnReason('');
      setRefundMethod('cash');
      setSearchQuery('');
      setShowResults(false);
      setInvoiceTotalAmount(null);
    },
    onError: (error: unknown) => {
      const responseData = isAxiosError<{ message?: string }>(error) ? error.response?.data : undefined;
      console.error('❌ Return Error:', responseData ?? error);
      toast.error(responseData?.message || 'خطأ في معالجة المرتجع');
    }
  });

  const closeResults = () => {
    setShowResults(false);
  };

  const resetSearch = () => {
    setSearchQuery('');
    setInvoiceNumber('');
    setShowResults(false);
    setInvoiceTotalAmount(null);
  };

  const switchToInvoiceMode = () => {
    setSearchMode('invoice');
    setSearchQuery('');
    setInvoiceNumber('');
    setItems([]);
    setShowResults(false);
    setInvoiceTotalAmount(null);
  };

  const switchToProductMode = () => {
    setSearchMode('product');
    setSearchQuery('');
    setInvoiceNumber('');
    setItems([]);
    setShowResults(false);
    setInvoiceTotalAmount(null);
  };

  return {
    searchMode,
    searchQuery,
    invoiceNumber,
    isComplimentaryInvoice,
    items,
    returnReason,
    refundMethod,
    taxRateId,
    currencyId,
    showResults,
    invoiceData,
    filteredProducts,
    isSearching,
    invoiceTotalAmount,
    subtotal,
    taxPercent,
    taxAmount,
    total,
    selectedCurrency,
    setSearchQuery,
    setInvoiceNumber,
    setReturnReason,
    setRefundMethod,
    setTaxRateId,
    setCurrencyId,
    setSearchMode,
    setShowResults,
    addItem,
    updateQuantity,
    removeItem,
    updateItemReason,
    clearItems,
    closeResults,
    resetSearch,
    switchToInvoiceMode,
    switchToProductMode,
    processReturn: processReturnMutation.mutate,
    isProcessing: processReturnMutation.isPending,
  };
};
