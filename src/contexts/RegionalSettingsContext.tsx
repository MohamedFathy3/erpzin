/**
 * RegionalSettingsContext - Global Regional Settings Management
 * 
 * Simplified version - No Supabase, Just Yemen 🇾🇪
 */

import React, { createContext, useContext, useState } from 'react';
import { format } from 'date-fns';
import { ar, enUS, type Locale } from 'date-fns/locale';
import { useLanguage } from './LanguageContext';

interface Currency {
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
}

interface RegionalSettings {
  country: string;
  countryName: string;
  countryNameAr: string;
  currency: Currency;
  dateFormat: string;
}

interface RegionalSettingsContextType {
  settings: RegionalSettings;
  
  // Currency utilities
  formatCurrency: (amount: number, showSymbol?: boolean) => string;
  getCurrencySymbol: () => string;
  
  // Date utilities
  formatDate: (date: Date | string, formatStr?: string) => string;
  formatDateTime: (date: Date | string) => string;
  getCalendarLocale: () => Locale;
}

// ✅ العملة الوحيدة - ريال يمني
const yemeniRial: Currency = {
  code: 'YER',
  name: 'Yemeni Rial',
  nameAr: 'ريال يمني',
  symbol: '﷼'
};

// ✅ اليمن فقط
const yemen = {
  name: 'Yemen',
  nameAr: 'اليمن'
};

const defaultSettings: RegionalSettings = {
  country: 'YE',
  countryName: yemen.name,
  countryNameAr: yemen.nameAr,
  currency: yemeniRial,
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
  const [settings] = useState<RegionalSettings>(defaultSettings);

  // ✅ تبسيط تنسيق العملة - ريال يمني فقط
  const formatCurrency = (amount: number, showSymbol = true): string => {
    // التأكد من أن المبلغ رقم
    const numAmount = Number(amount) || 0;
    
    const formattedNumber = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);

    if (showSymbol) {
      return language === 'ar' 
        ? `${formattedNumber} ${settings.currency.symbol}`
        : `${settings.currency.symbol} ${formattedNumber}`;
    }
    return formattedNumber;
  };

  const getCurrencySymbol = (): string => {
    return settings.currency.symbol;
  };

  const getCalendarLocale = (): Locale => {
    return language === 'ar' ? ar : enUS;
  };

  // ✅ تبسيط تنسيق التاريخ
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
        formatCurrency,
        getCurrencySymbol,
        formatDate,
        formatDateTime,
        getCalendarLocale,
      }}
    >
      {children}
    </RegionalSettingsContext.Provider>
  );
};