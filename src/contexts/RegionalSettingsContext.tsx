// contexts/RegionalSettingsContext.tsx
/**
 * RegionalSettingsContext - Global Regional Settings Management
 * Dynamic version - Uses API for currency data
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar, enUS, type Locale } from 'date-fns/locale';
import { useLanguage } from './LanguageContext';
import { currencyService, type Currency } from '@/lib/currency.service';

interface RegionalSettings {
  country: string;
  countryName: string;
  countryNameAr: string;
  currency: Currency;
  dateFormat: string;
}

interface RegionalSettingsContextType {
  settings: RegionalSettings;
  currencies: Currency[];
  isLoading: boolean;
  refreshCurrencies: () => Promise<void>;
  
  // Currency utilities
  formatCurrency: (amount: number, showSymbol?: boolean, currencyCode?: string) => string;
  getCurrencySymbol: (currencyCode?: string) => string;
  convertAmount: (amount: number, fromCurrencyCode: string, toCurrencyCode: string) => number;
  getCurrencyByCode: (code: string) => Currency | undefined;
  
  // Date utilities
  formatDate: (date: Date | string, formatStr?: string) => string;
  formatDateTime: (date: Date | string) => string;
  getCalendarLocale: () => Locale;
}

const defaultCurrency: Currency = {
  id: 2,
  name: 'YER',
  code: 'YER',
  symbol: 'YER',
  exchange_rate: '1',
  active: true,
  default: true
};

const defaultSettings: RegionalSettings = {
  country: 'YE',
  countryName: 'Yemen',
  countryNameAr: 'اليمن',
  currency: defaultCurrency,
  dateFormat: 'dd/MM/yyyy',
};

const RegionalSettingsContext = createContext<RegionalSettingsContextType | undefined>(undefined);

export const useRegionalSettings = () => {
  const context = useContext(RegionalSettingsContext);
  if (!context) {
    throw new Error('useRegionalSettings must be used within RegionalSettingsProvider');
  }
  return context;
};

export const RegionalSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const [settings, setSettings] = useState<RegionalSettings>(defaultSettings);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load currencies on mount
  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      const currenciesData = await currencyService.getActiveCurrencies(forceRefresh);
      setCurrencies(currenciesData);
      
      const defaultCurr = await currencyService.getDefaultCurrency(forceRefresh);
      if (defaultCurr) {
        setSettings(prev => ({
          ...prev,
          currency: defaultCurr
        }));
      }
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrencies = async () => {
    await loadCurrencies(true);
  };

  const getCurrencyByCode = (code: string): Currency | undefined => {
    return currencies.find(c => c.code === code) || settings.currency;
  };

  const convertAmount = (amount: number, fromCurrencyCode: string, toCurrencyCode: string): number => {
    const fromCurrency = getCurrencyByCode(fromCurrencyCode);
    const toCurrency = getCurrencyByCode(toCurrencyCode);
    
    if (!fromCurrency || !toCurrency) return amount;
    
    return currencyService.convertAmount(amount, fromCurrency, toCurrency);
  };

  const formatCurrency = (amount: number, showSymbol = true, currencyCode?: string): string => {
    const targetCurrency = currencyCode ? getCurrencyByCode(currencyCode) : settings.currency;
    
    if (!targetCurrency) {
      return amount.toString();
    }

    const numAmount = Number(amount) || 0;
    
    const formattedNumber = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    if (showSymbol) {
      return language === 'ar' 
        ? `${formattedNumber} ${targetCurrency.symbol}`
        : `${targetCurrency.symbol} ${formattedNumber}`;
    }
    return formattedNumber;
  };

  const getCurrencySymbol = (currencyCode?: string): string => {
    const currency = currencyCode ? getCurrencyByCode(currencyCode) : settings.currency;
    return currency?.symbol || settings.currency.symbol;
  };

  const getCalendarLocale = (): Locale => {
    return language === 'ar' ? ar : enUS;
  };

  const formatDate = (date: Date | string, formatStr?: string): string => {
    try {
      if (!date) return '';
      
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      const pattern = formatStr || settings.dateFormat;
      return format(dateObj, pattern, { locale: getCalendarLocale() });
    } catch {
      return '';
    }
  };

  const formatDateTime = (date: Date | string): string => {
    try {
      if (!date) return '';
      
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      return format(dateObj, `${settings.dateFormat} hh:mm a`, { locale: getCalendarLocale() });
    } catch {
      return '';
    }
  };

  return (
    <RegionalSettingsContext.Provider
      value={{
        settings,
        currencies,
        isLoading,
        refreshCurrencies,
        formatCurrency,
        getCurrencySymbol,
        convertAmount,
        getCurrencyByCode,
        formatDate,
        formatDateTime,
        getCalendarLocale,
      }}
    >
      {children}
    </RegionalSettingsContext.Provider>
  );
};