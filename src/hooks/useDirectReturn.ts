// hooks/useDirectReturn.ts
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';

export interface DirectReturnItem {
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
    sku: string;
    price: string;
    image_url?: string | null;
    imageUrl?: string;
  };
}

export interface InvoiceProduct {
  id: number;
  name: string;
  name_ar?: string | null;
  sku: string;
  price: string;
  quantity_sold: number;
  invoice_price: string;
  color?: string | null;
  size?: string | null;
  image_url?: string | null;
  stock?: number;
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

  // Set defaults
  useEffect(() => {
    if (defaultTaxRate && !taxRateId) setTaxRateId(String(defaultTaxRate.id));
    if (defaultCurrency && !currencyId) setCurrencyId(String(defaultCurrency.id));
  }, [defaultTaxRate, defaultCurrency, taxRateId, currencyId]);

  // ========== Search Invoice by Number ==========
  const { data: invoiceData, isLoading: isSearchingInvoice, refetch: refetchInvoice } = useQuery({
    queryKey: ['invoice-search', invoiceNumber],
    queryFn: async () => {
      if (!invoiceNumber.trim()) return null;

      try {
        const response = await api.get('/invoices/search', {
          params: { invoice_number: invoiceNumber }
        });
        setShowResults(true);
        return response.data;
      } catch (error: any) {
        setShowResults(true);
        if (error.response?.status === 404) {
          toast.error('الفاتورة غير موجودة');
        } else {
          toast.error('خطأ في البحث عن الفاتورة');
        }
        return null;
      }
    },
    enabled: !!invoiceNumber && invoiceNumber.length > 0 && searchMode === 'invoice',
  });

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

  // Extract products from invoice
  const invoiceProducts: InvoiceProduct[] = (invoiceData?.data?.items || []).map((item: any) => ({
    id: item.product_id,
    name: item.product_name,
    name_ar: item.product_name,
    sku: item.sku || '',
    price: item.price,
    quantity_sold: item.quantity,
    invoice_price: item.price,
    color: item.color || null,
    size: item.size || null,
    image_url: null,
    stock: item.stock,
  }));

  // Determine which products to show
  const filteredProducts = searchMode === 'invoice' ? invoiceProducts : (regularProducts || []);
  const isSearching = searchMode === 'invoice' ? isSearchingInvoice : isSearchingProducts;

  // ========== Item Management ==========
  const addItem = (product: InvoiceProduct) => {
    const unitPrice = searchMode === 'invoice'
      ? parseFloat(product.invoice_price || product.price || '0')
      : parseFloat(product.price || '0');

    const quantitySold = searchMode === 'invoice' ? product.quantity_sold : undefined;

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

      setItems(prev => prev.map(i =>
        i.product_id === product.id && i.color === product.color && i.size === product.size
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems(prev => [...prev, {
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
          id: product.id,
          name: product.name,
          name_ar: product.name_ar,
          sku: product.sku,
          price: product.price?.toString() || '0',
          image_url: product.image_url,
          imageUrl: product.image_url
        }
      }]);
    }

    setSearchQuery('');
    setShowResults(false);
    
    const productName = product.name_ar || product.name;
    const variant = product.color || product.size ? ` (${product.color || ''} ${product.size || ''})`.trim() : '';
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
    setItems(prev => prev.map(item => item.id === id ? { ...item, color } : item));
  };

  const updateItemSize = (id: string, size: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, size } : item));
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
  const taxAmount = (subtotal * (taxPercent ?? 0)) / 100;
  const total = subtotal + taxAmount;

  const selectedCurrency = currencies.find(c => c.id === currencyId);

  // ========== Process Return ==========
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error('لم يتم إضافة أي صنف');

      const payload: any = {
        refund_method: refundMethod,
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
      
      // Reset form
      setItems([]);
      setInvoiceNumber('');
      setReturnReason('');
      setRefundMethod('cash');
      setSearchQuery('');
      setShowResults(false);
    },
    onError: (error: any) => {
      console.error('❌ Return Error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'خطأ في معالجة المرتجع');
    }
  });

  // Close dropdown
  const closeResults = () => {
    setShowResults(false);
  };

  const resetSearch = () => {
    setSearchQuery('');
    setInvoiceNumber('');
    setShowResults(false);
  };

  const switchToInvoiceMode = () => {
    setSearchMode('invoice');
    setSearchQuery('');
    setInvoiceNumber('');
    setItems([]);
    setShowResults(false);
  };

  const switchToProductMode = () => {
    setSearchMode('product');
    setSearchQuery('');
    setInvoiceNumber('');
    setItems([]);
    setShowResults(false);
  };

  return {
    // State
    searchMode,
    searchQuery,
    invoiceNumber,
    items,
    returnReason,
    refundMethod,
    taxRateId,
    currencyId,
    showResults,
    invoiceData,
    filteredProducts,
    isSearching,
    
    // Calculated
    subtotal,
    taxPercent,
    taxAmount,
    total,
    selectedCurrency,
    
    // Actions
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
    updateItemColor,
    updateItemSize,
    updateItemReason,
    clearItems,
    closeResults,
    resetSearch,
    switchToInvoiceMode,
    switchToProductMode,
    
    // Mutation
    processReturn: processReturnMutation.mutate,
    isProcessing: processReturnMutation.isPending,
  };
};