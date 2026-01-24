import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Currency {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  symbol: string;
  exchange_rate: number | null;
  is_active: boolean | null;
  is_default: boolean | null;
  decimal_places: number | null;
}

export interface TaxRate {
  id: string;
  name: string;
  name_ar: string | null;
  rate: number;
  is_active: boolean | null;
  is_default: boolean | null;
}

export function useCurrencyTax() {
  const { language } = useLanguage();

  // Fetch active currencies
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
    queryKey: ['currencies-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Currency[];
    }
  });

  // Fetch active tax rates
  const { data: taxRates = [], isLoading: taxRatesLoading } = useQuery({
    queryKey: ['tax-rates-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('is_active', true)
        .order('rate', { ascending: true });
      if (error) throw error;
      return data as TaxRate[];
    }
  });

  // Get default currency
  const defaultCurrency = currencies.find(c => c.is_default) || currencies[0];

  // Get default tax rate
  const defaultTaxRate = taxRates.find(t => t.is_default) || taxRates.find(t => t.rate > 0) || taxRates[0];

  // Get currency display name
  const getCurrencyName = (currency: Currency) => {
    return language === 'ar' ? currency.name_ar || currency.name : currency.name;
  };

  // Get tax rate display name
  const getTaxRateName = (taxRate: TaxRate) => {
    return language === 'ar' ? taxRate.name_ar || taxRate.name : taxRate.name;
  };

  // Format amount with currency
  const formatAmount = (amount: number, currencyCode?: string) => {
    const currency = currencyCode 
      ? currencies.find(c => c.code === currencyCode) 
      : defaultCurrency;
    
    if (!currency) return amount.toLocaleString();
    
    const decimals = currency.decimal_places ?? 2;
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency.symbol}`;
  };

  // Convert amount between currencies
  const convertAmount = (amount: number, fromCurrencyCode: string, toCurrencyCode: string) => {
    const fromCurrency = currencies.find(c => c.code === fromCurrencyCode);
    const toCurrency = currencies.find(c => c.code === toCurrencyCode);
    
    if (!fromCurrency || !toCurrency) return amount;
    
    const fromRate = fromCurrency.exchange_rate || 1;
    const toRate = toCurrency.exchange_rate || 1;
    
    // Convert to base currency first, then to target
    return (amount / fromRate) * toRate;
  };

  // Calculate tax amount
  const calculateTax = (amount: number, taxRateId?: string) => {
    const taxRate = taxRateId 
      ? taxRates.find(t => t.id === taxRateId) 
      : defaultTaxRate;
    
    if (!taxRate) return 0;
    
    return (amount * taxRate.rate) / 100;
  };

  return {
    currencies,
    taxRates,
    defaultCurrency,
    defaultTaxRate,
    currenciesLoading,
    taxRatesLoading,
    getCurrencyName,
    getTaxRateName,
    formatAmount,
    convertAmount,
    calculateTax
  };
}
