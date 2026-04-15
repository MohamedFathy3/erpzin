// contexts/RegionalSettingsContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ar, enUS, type Locale } from 'date-fns/locale';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

interface RegionalSettingsContextType {
  currency: string;
  country: string;
  isLoading: boolean;
  formatCurrency: (amount: number, showSymbol?: boolean) => string;
  getCurrencySymbol: () => string;
  formatDate: (date: Date | string, formatStr?: string) => string;
  formatDateTime: (date: Date | string) => string;
  getCalendarLocale: () => Locale;
  refresh: () => void;
}

const getSymbol = (currencyCode: string): string => {
  const symbols: Record<string, string> = {
    'EGP': 'ج.م',
    'USD': '$',
    'SAR': '﷼',
    'AED': 'د.إ',
    'KWD': 'د.ك',
    'QAR': '﷼',
    'BHD': 'د.ب',
    'OMR': '﷼',
    'EUR': '€',
    'GBP': '£',
    'YER': '﷼',
  };
  return symbols[currencyCode] || currencyCode;
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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // تحديث كل مرة يتغير فيها user أو language أو refreshKey
  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user, refreshKey]);

  // استخدام useMemo عشان القيم تتحديث تلقائياً
  const currency = user?.currency || 'EGP';
  const country = user?.country || 'EG';

  // دالة formatCurrency معمولة useCallback عشان تسمع للتغيرات
  const formatCurrency = useCallback((amount: number, showSymbol = true): string => {
    const numAmount = Number(amount) || 0;
    const symbol = getSymbol(currency);
    
    const locale = language === 'ar' ? 'ar-EG' : 'en-US';
    const formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    if (!showSymbol) {
      return formattedNumber;
    }

    if (language === 'ar') {
      return `${formattedNumber} ${symbol}`;
    }
    return `${symbol} ${formattedNumber}`;
  }, [currency, language]);

  const getCurrencySymbol = useCallback((): string => {
    return getSymbol(currency);
  }, [currency]);

  const getCalendarLocale = useCallback((): Locale => {
    return language === 'ar' ? ar : enUS;
  }, [language]);

  const formatDate = useCallback((date: Date | string, formatStr?: string): string => {
    try {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      const pattern = formatStr || 'dd/MM/yyyy';
      return format(dateObj, pattern, { locale: getCalendarLocale() });
    } catch {
      return '';
    }
  }, [getCalendarLocale]);

  const formatDateTime = useCallback((date: Date | string): string => {
    try {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      const timeFormat = language === 'ar' ? 'hh:mm ص' : 'hh:mm a';
      return format(dateObj, `dd/MM/yyyy ${timeFormat}`, { locale: getCalendarLocale() });
    } catch {
      return '';
    }
  }, [language, getCalendarLocale]);

  const value = useMemo(() => ({
    currency,
    country,
    isLoading,
    formatCurrency,
    getCurrencySymbol,
    formatDate,
    formatDateTime,
    getCalendarLocale,
    refresh,
  }), [currency, country, isLoading, formatCurrency, getCurrencySymbol, formatDate, formatDateTime, getCalendarLocale, refresh]);

  return (
    <RegionalSettingsContext.Provider value={value}>
      {children}
    </RegionalSettingsContext.Provider>
  );
};