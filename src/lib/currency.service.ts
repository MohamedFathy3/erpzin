// services/currency.service.ts
import api from '@/lib/api';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  links: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: any;
  result: string;
  message: string;
  status: number;
}

class CurrencyService {
  private static instance: CurrencyService;
  private currencies: Currency[] = [];
  private defaultCurrency: Currency | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  private constructor() {}

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  // جلب العملات من API
  async fetchCurrencies(forceRefresh = false): Promise<Currency[]> {
    const now = Date.now();
    
    if (!forceRefresh && this.currencies.length > 0 && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.currencies;
    }

    try {
      const response = await api.get<CurrencyResponse>('/currency/index');
      
      if (response.data?.data) {
        this.currencies = response.data.data;
        this.defaultCurrency = this.currencies.find(c => c.default === true) || this.currencies[0] || null;
        this.lastFetch = now;
      }
      
      return this.currencies;
    } catch (error) {
      console.error('Error fetching currencies:', error);
      return this.currencies;
    }
  }

  // جلب العملة الافتراضية
  async getDefaultCurrency(forceRefresh = false): Promise<Currency | null> {
    if (!this.defaultCurrency || forceRefresh) {
      await this.fetchCurrencies(forceRefresh);
    }
    return this.defaultCurrency;
  }

  // جلب كل العملات النشطة
  async getActiveCurrencies(forceRefresh = false): Promise<Currency[]> {
    if (forceRefresh || this.currencies.length === 0) {
      await this.fetchCurrencies(forceRefresh);
    }
    return this.currencies.filter(c => c.active);
  }

  // تحويل العملة
  convertAmount(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
    const fromRate = parseFloat(fromCurrency.exchange_rate);
    const toRate = parseFloat(toCurrency.exchange_rate);
    
    if (fromRate === 0 || toRate === 0) return amount;
    
    const amountInBase = amount / fromRate;
    return amountInBase * toRate;
  }

  // تنسيق المبلغ
  formatAmount(amount: number, currency?: Currency, language: 'ar' | 'en' = 'ar'): string {
    const targetCurrency = currency || this.defaultCurrency;
    if (!targetCurrency) return amount.toString();

    const formattedNumber = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    if (language === 'ar') {
      return `${formattedNumber} ${targetCurrency.symbol}`;
    } else {
      return `${targetCurrency.symbol} ${formattedNumber}`;
    }
  }

  // مسح الكاش
  clearCache() {
    this.currencies = [];
    this.defaultCurrency = null;
    this.lastFetch = 0;
  }
}

export const currencyService = CurrencyService.getInstance();