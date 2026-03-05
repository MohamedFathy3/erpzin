import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo, useCallback } from "react";

// ==================== Types from APIs ====================
export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  exchange_rate: string;
  active: boolean;
  default: boolean;
}

export interface CurrencyResponse {
  data: Currency[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

export interface Tax {
  id: number;
  name: string;
  rate: string;
  active: boolean;
  default: boolean;
}

export interface TaxResponse {
  data: Tax[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

// ==================== Hook مع تحسينات إضافية ====================
export function useCurrencyTax() {
  const { language } = useLanguage();

  // ==================== Fetch all currencies ====================
  const { 
    data: currencies = [], 
    isLoading: currenciesLoading,
    error: currenciesError,
    refetch: refetchCurrencies
  } = useQuery<Currency[]>({
    queryKey: ['currencies-all'],
    queryFn: async () => {
      try {
        const response = await api.post<CurrencyResponse>('/currency/index', {
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching currencies:', error);
        throw error; // رمي الخطأ بدلاً من إرجاع مصفوفة فارغة
      }
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
    retry: 2 // إعادة المحاولة مرتين عند الفشل
  });

  // ==================== Fetch all taxes ====================
  const { 
    data: taxRates = [], 
    isLoading: taxRatesLoading,
    error: taxRatesError,
    refetch: refetchTaxRates
  } = useQuery<Tax[]>({
    queryKey: ['tax-rates-all'],
    queryFn: async () => {
      try {
        const response = await api.post<TaxResponse>('/tax/index', {
          orderBy: 'rate',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching tax rates:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2
  });

  // ==================== استخدام useMemo للتحسين ====================
  
  // العملات النشطة فقط
  const activeCurrencies = useMemo(() => {
    return currencies.filter(c => c.active === true);
  }, [currencies]);

  // الضرائب النشطة فقط
  const activeTaxRates = useMemo(() => {
    return taxRates.filter(t => t.active === true);
  }, [taxRates]);

  // العملة الافتراضية
  const defaultCurrency = useMemo(() => {
    return currencies.find(c => c.default === true) || currencies[0];
  }, [currencies]);

  // الضريبة الافتراضية
  const defaultTaxRate = useMemo(() => {
    return taxRates.find(t => t.default === true) || 
           taxRates.find(t => parseFloat(t.rate) > 0) || 
           taxRates[0];
  }, [taxRates]);

  // ==================== Helper Functions (مع useCallback) ====================

  // Get currency display name
  const getCurrencyName = useCallback((currency: Currency) => {
    return currency.name;
  }, []);

  // Get tax rate display name
  const getTaxRateName = useCallback((taxRate: Tax) => {
    return taxRate.name;
  }, []);

  // Format amount with currency
  const formatAmount = useCallback((amount: number, currencyCode?: string, options?: { 
    showSymbol?: boolean;
    decimals?: number;
  }) => {
    const currency = currencyCode 
      ? currencies.find(c => c.code === currencyCode) 
      : defaultCurrency;
    
    if (!currency) return amount.toLocaleString();
    
    const decimals = options?.decimals ?? 2;
    const showSymbol = options?.showSymbol ?? true;
    
    const formattedAmount = amount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
    
    if (!showSymbol) return formattedAmount;
    
    // تنسيق حسب اللغة (الرمز قبل أو بعد المبلغ)
    if (language === 'ar') {
      return `${formattedAmount} ${currency.symbol}`;
    } else {
      return `${currency.symbol} ${formattedAmount}`;
    }
  }, [currencies, defaultCurrency, language]);

  // Convert amount between currencies
  const convertAmount = useCallback((amount: number, fromCurrencyCode: string, toCurrencyCode: string) => {
    const fromCurrency = currencies.find(c => c.code === fromCurrencyCode);
    const toCurrency = currencies.find(c => c.code === toCurrencyCode);
    
    if (!fromCurrency || !toCurrency) return amount;
    
    const fromRate = parseFloat(fromCurrency.exchange_rate) || 1;
    const toRate = parseFloat(toCurrency.exchange_rate) || 1;
    
    return (amount / fromRate) * toRate;
  }, [currencies]);

  // Convert amount to default currency
  const convertToDefault = useCallback((amount: number, fromCurrencyCode: string) => {
    if (!defaultCurrency) return amount;
    return convertAmount(amount, fromCurrencyCode, defaultCurrency.code);
  }, [convertAmount, defaultCurrency]);

  // Calculate tax amount
  const calculateTax = useCallback((amount: number, taxRateId?: string | number) => {
    const taxRate = taxRateId 
      ? taxRates.find(t => t.id.toString() === taxRateId.toString()) 
      : defaultTaxRate;
    
    if (!taxRate) return 0;
    
    const rate = parseFloat(taxRate.rate);
    return (amount * rate) / 100;
  }, [taxRates, defaultTaxRate]);

  // Calculate total with tax
  const calculateTotalWithTax = useCallback((amount: number, taxRateId?: string | number) => {
    const tax = calculateTax(amount, taxRateId);
    return amount + tax;
  }, [calculateTax]);

  // Get tax rate by ID
  const getTaxRateById = useCallback((id: string | number) => {
    return taxRates.find(t => t.id.toString() === id.toString());
  }, [taxRates]);

  // Get currency by code
  const getCurrencyByCode = useCallback((code: string) => {
    return currencies.find(c => c.code === code);
  }, [currencies]);

  // Get currency by ID
  const getCurrencyById = useCallback((id: string | number) => {
    return currencies.find(c => c.id.toString() === id.toString());
  }, [currencies]);

  // Check if currency is default
  const isDefaultCurrency = useCallback((currencyCode: string) => {
    return defaultCurrency?.code === currencyCode;
  }, [defaultCurrency]);

  // Check if tax rate is default
  const isDefaultTaxRate = useCallback((taxRateId: string | number) => {
    return defaultTaxRate?.id.toString() === taxRateId.toString();
  }, [defaultTaxRate]);

  // حالة التحميل الكلية
  const isLoading = currenciesLoading || taxRatesLoading;
  
  // وجود أخطاء
  const hasError = currenciesError || taxRatesError;
  
  // دالة إعادة التحميل للكل
  const refetchAll = useCallback(() => {
    return Promise.all([
      refetchCurrencies(),
      refetchTaxRates()
    ]);
  }, [refetchCurrencies, refetchTaxRates]);

  return {
    // البيانات الخام
    currencies,
    taxRates,
    
    // البيانات المفلترة
    activeCurrencies,
    activeTaxRates,
    
    // القيم الافتراضية
    defaultCurrency,
    defaultTaxRate,
    
    // حالات التحميل
    currenciesLoading,
    taxRatesLoading,
    isLoading,
    
    // الأخطاء
    currenciesError,
    taxRatesError,
    hasError,
    
    // دوال إعادة التحميل
    refetchCurrencies,
    refetchTaxRates,
    refetchAll,
    
    // دوال التنسيق
    getCurrencyName,
    getTaxRateName,
    formatAmount,
    
    // دوال التحويل
    convertAmount,
    convertToDefault,
    
    // دوال الضرائب
    calculateTax,
    calculateTotalWithTax,
    
    // دوال البحث
    getTaxRateById,
    getCurrencyByCode,
    getCurrencyById,
    
    // دوال التحقق
    isDefaultCurrency,
    isDefaultTaxRate
  };
}