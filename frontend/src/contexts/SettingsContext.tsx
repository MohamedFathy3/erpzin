// contexts/SettingsContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';
import { ar, enUS, type Locale } from 'date-fns/locale';
import { useLanguage } from './LanguageContext';

interface SettingsContextType {
  currency: string;
  country: string;
  isLoading: boolean;
  formatCurrency: (amount: number, showSymbol?: boolean) => string;
  getCurrencySymbol: () => string;
  formatDate: (date: Date | string, formatStr?: string) => string;
  formatDateTime: (date: Date | string) => string;
  getCalendarLocale: () => Locale;
}

// خريطة رموز العملات
const currencySymbols: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'EGP': 'E£',
  'SAR': '﷼',
  'AED': 'د.إ',
  'KWD': 'د.ك',
  'YER': 'YER',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [user]);

  const getCurrencySymbol = (): string => {
    const currencyCode = user?.currency || 'EGP';
    return currencySymbols[currencyCode] || currencyCode;
  };

  const formatCurrency = (amount: number, showSymbol = true): string => {
    const numAmount = Number(amount) || 0;
    const currencyCode = user?.currency || 'EGP';
    const symbol = getCurrencySymbol();

    const formattedNumber = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    if (!showSymbol) {
      return formattedNumber;
    }

    // ترتيب حسب اللغة
    if (language === 'ar') {
      return `${formattedNumber} ${symbol}`;
    }
    return `${symbol} ${formattedNumber}`;
  };

  const getCalendarLocale = (): Locale => {
    return language === 'ar' ? ar : enUS;
  };

  const formatDate = (date: Date | string, formatStr?: string): string => {
    try {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      const pattern = formatStr || 'dd/MM/yyyy';
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
      
      return format(dateObj, 'dd/MM/yyyy hh:mm a', { locale: getCalendarLocale() });
    } catch {
      return '';
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        currency: user?.currency || 'EGP',
        country: user?.country || 'EG',
        isLoading,
        formatCurrency,
        getCurrencySymbol,
        formatDate,
        formatDateTime,
        getCalendarLocale,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};