// services/StatsService.ts
import { Customer } from '@/types/loyalty';

export class StatsService {
  constructor(private customers: Customer[]) {}

  getTotalPoints(): number {
    return this.customers.reduce((sum, c) => sum + (c.point || 0), 0);
  }

  getTotalPurchases(): number {
    return this.customers.reduce((sum, c) => sum + Number(c.last_paid_amount || 0), 0);
  }

  getActiveCustomers(): number {
    return this.customers.filter(c => Number(c.last_paid_amount || 0) > 0).length;
  }

  getTotalCustomers(): number {
    return this.customers.length;
  }

  getStats(language: string) {
    const translations = {
      en: {
        totalCustomers: 'Total Customers',
        activeCustomers: 'Active Customers',
        totalPoints: 'Total Points',
        avgPurchase: 'Avg Purchase',
        totalPurchases:"Total Ptuchases"
      },
      ar: {
        totalCustomers: 'إجمالي العملاء',
        activeCustomers: 'العملاء النشطين',
        totalPoints: 'إجمالي النقاط',
        avgPurchase: 'متوسط الشراء',
        totalPurchases:"مجموع الشراء"
      }
    };

    const t = translations[language as keyof typeof translations];

    return [
      {
        label: t.totalCustomers,
        value: this.getTotalCustomers(),
        icon: 'Users',
        color: 'bg-primary/10'
      },
      {
        label: t.activeCustomers,
        value: this.getActiveCustomers(),
        icon: 'TrendingUp',
        color: 'bg-accent/10'
      },
      {
        label: t.totalPoints,
        value: this.getTotalPoints().toLocaleString(),
        icon: 'Crown',
        color: 'bg-warning/10'
      },
      {
        label: t.totalPurchases,
        value: `${this.getTotalPurchases().toLocaleString()} YER`,
        icon: 'ShoppingBag',
        color: 'bg-info/10'
      }
    ];
  }
}