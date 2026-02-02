/**
 * RegionalSettingsContext - Global Regional Settings Management
 * 
 * This context provides application-wide access to regional settings:
 * - Default currency and symbol
 * - Calendar system (Gregorian, Hijri, Both)
 * - Country settings
 * - Date formatting utilities
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  calendarSystem: 'gregorian' | 'hijri' | 'both';
  dateFormat: string;
  taxRate: number;
}

interface RegionalSettingsContextType {
  settings: RegionalSettings;
  isLoading: boolean;
  
  // Currency utilities
  formatCurrency: (amount: number, showSymbol?: boolean) => string;
  getCurrencySymbol: () => string;
  
  // Date utilities
  formatDate: (date: Date | string, formatStr?: string) => string;
  formatDateTime: (date: Date | string) => string;
  getCalendarLocale: () => Locale;
  
  // Refresh settings
  refreshSettings: () => Promise<void>;
}

// Currency mapping
const currencyMap: Record<string, Currency> = {
  YER: { code: 'YER', name: 'Yemeni Rial', nameAr: 'ريال يمني', symbol: '﷼' },
  SAR: { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: '﷼' },
  AED: { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ' },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'د.ك' },
  QAR: { code: 'QAR', name: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: '﷼' },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', symbol: 'د.ب' },
  OMR: { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني', symbol: '﷼' },
  IQD: { code: 'IQD', name: 'Iraqi Dinar', nameAr: 'دينار عراقي', symbol: 'د.ع' },
  JOD: { code: 'JOD', name: 'Jordanian Dinar', nameAr: 'دينار أردني', symbol: 'د.أ' },
  SYP: { code: 'SYP', name: 'Syrian Pound', nameAr: 'ليرة سورية', symbol: 'ل.س' },
  LBP: { code: 'LBP', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية', symbol: 'ل.ل' },
  EGP: { code: 'EGP', name: 'Egyptian Pound', nameAr: 'جنيه مصري', symbol: 'ج.م' },
  SDG: { code: 'SDG', name: 'Sudanese Pound', nameAr: 'جنيه سوداني', symbol: 'ج.س' },
  LYD: { code: 'LYD', name: 'Libyan Dinar', nameAr: 'دينار ليبي', symbol: 'د.ل' },
  TND: { code: 'TND', name: 'Tunisian Dinar', nameAr: 'دينار تونسي', symbol: 'د.ت' },
  DZD: { code: 'DZD', name: 'Algerian Dinar', nameAr: 'دينار جزائري', symbol: 'د.ج' },
  MAD: { code: 'MAD', name: 'Moroccan Dirham', nameAr: 'درهم مغربي', symbol: 'د.م' },
  USD: { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$' },
  EUR: { code: 'EUR', name: 'Euro', nameAr: 'يورو', symbol: '€' },
};

// Country mapping
const countryMap: Record<string, { name: string; nameAr: string }> = {
  YE: { name: 'Yemen', nameAr: 'اليمن' },
  SA: { name: 'Saudi Arabia', nameAr: 'السعودية' },
  AE: { name: 'UAE', nameAr: 'الإمارات' },
  KW: { name: 'Kuwait', nameAr: 'الكويت' },
  QA: { name: 'Qatar', nameAr: 'قطر' },
  BH: { name: 'Bahrain', nameAr: 'البحرين' },
  OM: { name: 'Oman', nameAr: 'عُمان' },
  IQ: { name: 'Iraq', nameAr: 'العراق' },
  JO: { name: 'Jordan', nameAr: 'الأردن' },
  SY: { name: 'Syria', nameAr: 'سوريا' },
  LB: { name: 'Lebanon', nameAr: 'لبنان' },
  PS: { name: 'Palestine', nameAr: 'فلسطين' },
  EG: { name: 'Egypt', nameAr: 'مصر' },
  SD: { name: 'Sudan', nameAr: 'السودان' },
  LY: { name: 'Libya', nameAr: 'ليبيا' },
  TN: { name: 'Tunisia', nameAr: 'تونس' },
  DZ: { name: 'Algeria', nameAr: 'الجزائر' },
  MA: { name: 'Morocco', nameAr: 'المغرب' },
};

const defaultSettings: RegionalSettings = {
  country: 'YE',
  countryName: 'Yemen',
  countryNameAr: 'اليمن',
  currency: currencyMap.YER,
  calendarSystem: 'gregorian',
  dateFormat: 'dd/MM/yyyy',
  taxRate: 0,
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
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('country, default_currency, calendar_system, tax_rate')
        .single();

      if (error) throw error;

      if (data) {
        const countryCode = (data as any).country || 'YE';
        const currencyCode = data.default_currency || 'YER';
        const calSystem = (data as any).calendar_system || 'gregorian';
        
        const countryInfo = countryMap[countryCode] || { name: countryCode, nameAr: countryCode };
        const currencyInfo = currencyMap[currencyCode] || currencyMap.YER;

        setSettings({
          country: countryCode,
          countryName: countryInfo.name,
          countryNameAr: countryInfo.nameAr,
          currency: currencyInfo,
          calendarSystem: calSystem as 'gregorian' | 'hijri' | 'both',
          dateFormat: 'dd/MM/yyyy',
          taxRate: data.tax_rate || 0,
        });
      }
    } catch (error) {
      console.error('Error loading regional settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('regional-settings-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'company_settings' },
        () => {
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSettings]);

  const formatCurrency = useCallback((amount: number, showSymbol = true): string => {
    const formattedNumber = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    if (showSymbol) {
      return language === 'ar' 
        ? `${formattedNumber} ${settings.currency.symbol}`
        : `${settings.currency.symbol} ${formattedNumber}`;
    }
    return formattedNumber;
  }, [language, settings.currency.symbol]);

  const getCurrencySymbol = useCallback((): string => {
    return settings.currency.symbol;
  }, [settings.currency.symbol]);

  const getCalendarLocale = useCallback((): Locale => {
    return language === 'ar' ? ar : enUS;
  }, [language]);

  const formatDate = useCallback((date: Date | string, formatStr?: string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      const pattern = formatStr || settings.dateFormat;
      return format(dateObj, pattern, { locale: getCalendarLocale() });
    } catch {
      return '';
    }
  }, [settings.dateFormat, getCalendarLocale]);

  const formatDateTime = useCallback((date: Date | string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      return format(dateObj, `${settings.dateFormat} HH:mm`, { locale: getCalendarLocale() });
    } catch {
      return '';
    }
  }, [settings.dateFormat, getCalendarLocale]);

  const refreshSettings = useCallback(async () => {
    setIsLoading(true);
    await loadSettings();
  }, [loadSettings]);

  return (
    <RegionalSettingsContext.Provider
      value={{
        settings,
        isLoading,
        formatCurrency,
        getCurrencySymbol,
        formatDate,
        formatDateTime,
        getCalendarLocale,
        refreshSettings,
      }}
    >
      {children}
    </RegionalSettingsContext.Provider>
  );
};
