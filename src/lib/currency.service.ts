// lib/currency.service.ts
import { apiService } from './api.service';

export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  exchange_rate: string;
  active: boolean;
  default: boolean;
}

class CurrencyService {
  async getActiveCurrencies(forceRefresh = false): Promise<Currency[]> {
    try {
      const response = await apiService.get<any>('/currency/index', !forceRefresh);
      
      // التحقق من هيكل البيانات
      if (response && Array.isArray(response.data)) {
        return response.data.filter((c: Currency) => c.active === true);
      } else if (Array.isArray(response)) {
        return response.filter((c: Currency) => c.active === true);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching currencies:', error);
      return [];
    }
  }

  async getDefaultCurrency(forceRefresh = false): Promise<Currency | null> {
    try {
      const currencies = await this.getActiveCurrencies(forceRefresh);
      return currencies.find(c => c.default === true) || currencies[0] || null;
    } catch (error) {
      console.error('Error getting default currency:', error);
      return null;
    }
  }

  convertAmount(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
    if (fromCurrency.code === toCurrency.code) return amount;
    
    const fromRate = parseFloat(fromCurrency.exchange_rate) || 1;
    const toRate = parseFloat(toCurrency.exchange_rate) || 1;
    
    // تحويل إلى العملة الأساسية ثم إلى العملة المطلوبة
    return (amount / fromRate) * toRate;
  }
}

export const currencyService = new CurrencyService();