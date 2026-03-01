import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo } from "react";

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

// ==================== Hook مع تحسينات ====================
export function useCurrencyTax() {
  const { language } = useLanguage();

  // ==================== Fetch all currencies (بدون فلتر) ====================
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery<Currency[]>({
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
        return [];
      }
    }
  });

  // ==================== Fetch all taxes (بدون فلتر) ====================
  const { data: taxRates = [], isLoading: taxRatesLoading } = useQuery<Tax[]>({
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
        return [];
      }
    }
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

  // العملة الافتراضية (اللي عليها default: true)
  const defaultCurrency = useMemo(() => {
    return currencies.find(c => c.default === true) || currencies[0];
  }, [currencies]);

  // الضريبة الافتراضية (اللي عليها default: true)
  const defaultTaxRate = useMemo(() => {
    return taxRates.find(t => t.default === true) || 
           taxRates.find(t => parseFloat(t.rate) > 0) || 
           taxRates[0];
  }, [taxRates]);

  // ==================== Helper Functions ====================

  // Get currency display name
  const getCurrencyName = (currency: Currency) => {
    return currency.name;
  };

  // Get tax rate display name
  const getTaxRateName = (taxRate: Tax) => {
    return taxRate.name;
  };

  // Format amount with currency
  const formatAmount = (amount: number, currencyCode?: string, options?: { 
    showSymbol?: boolean;
    decimals?: number;
  }) => {
    const currency = currencyCode 
      ? currencies.find(c => c.code === currencyCode) 
      : defaultCurrency;
    
    if (!currency) return amount.toLocaleString();
    
    const decimals = options?.decimals ?? 2;
    const showSymbol = options?.showSymbol ?? true;
    
    const formattedAmount = amount.toLocaleString(undefined, { 
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
  };

  // Convert amount between currencies
  const convertAmount = (amount: number, fromCurrencyCode: string, toCurrencyCode: string) => {
    const fromCurrency = currencies.find(c => c.code === fromCurrencyCode);
    const toCurrency = currencies.find(c => c.code === toCurrencyCode);
    
    if (!fromCurrency || !toCurrency) return amount;
    
    const fromRate = parseFloat(fromCurrency.exchange_rate) || 1;
    const toRate = parseFloat(toCurrency.exchange_rate) || 1;
    
    // Convert to base currency first, then to target
    return (amount / fromRate) * toRate;
  };

  // Convert amount to default currency
  const convertToDefault = (amount: number, fromCurrencyCode: string) => {
    if (!defaultCurrency) return amount;
    return convertAmount(amount, fromCurrencyCode, defaultCurrency.code);
  };

  // Calculate tax amount
  const calculateTax = (amount: number, taxRateId?: string | number) => {
    const taxRate = taxRateId 
      ? taxRates.find(t => t.id.toString() === taxRateId.toString()) 
      : defaultTaxRate;
    
    if (!taxRate) return 0;
    
    const rate = parseFloat(taxRate.rate);
    return (amount * rate) / 100;
  };

  // Calculate total with tax
  const calculateTotalWithTax = (amount: number, taxRateId?: string | number) => {
    const tax = calculateTax(amount, taxRateId);
    return amount + tax;
  };

  // Get tax rate by ID
  const getTaxRateById = (id: string | number) => {
    return taxRates.find(t => t.id.toString() === id.toString());
  };

  // Get currency by code
  const getCurrencyByCode = (code: string) => {
    return currencies.find(c => c.code === code);
  };

  // Get currency by ID
  const getCurrencyById = (id: string | number) => {
    return currencies.find(c => c.id.toString() === id.toString());
  };

  // Check if currency is default
  const isDefaultCurrency = (currencyCode: string) => {
    return defaultCurrency?.code === currencyCode;
  };

  // Check if tax rate is default
  const isDefaultTaxRate = (taxRateId: string | number) => {
    return defaultTaxRate?.id.toString() === taxRateId.toString();
  };

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