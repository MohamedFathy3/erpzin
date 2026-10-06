// components/dashboard/DashboardKPIs.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import KPICard from '@/components/dashboard/KPICard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { DashboardMetrics } from '@/hooks/useDashboardData';
import { Wallet, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';

interface DashboardKPIsProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
}

const DashboardKPIs: React.FC<DashboardKPIsProps> = ({ metrics, isLoading }) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  // الترجمات مباشرة في الملف
  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'dashboard.todaySales': "Today's Sales",
        'dashboard.vsYesterday': 'vs yesterday',
        'dashboard.totalRevenue': 'Total Revenue',
        'dashboard.thisMonth': 'this month',
        'dashboard.threeMonthsRevenue': 'Revenue (3 Months)',
        'dashboard.lastThreeMonths': 'last 3 months',
        'dashboard.totalOrders': 'Total Orders',
      },
      ar: {
        'dashboard.todaySales': 'مبيعات اليوم',
        'dashboard.vsYesterday': 'مقابل الأمس',
        'dashboard.totalRevenue': 'إجمالي الإيرادات',
        'dashboard.thisMonth': 'هذا الشهر',
        'dashboard.threeMonthsRevenue': 'الإيرادات (٣ أشهر)',
        'dashboard.lastThreeMonths': 'آخر ٣ أشهر',
        'dashboard.totalOrders': 'إجمالي الطلبات',
      },
    };

    return translations[language]?.[key] || key;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title={t('dashboard.todaySales')}
        value={formatCurrency(metrics.todaySales)}
        change={metrics.salesChange}
        changeLabel={t('dashboard.vsYesterday')}
        icon={<Wallet size={20} />}
        variant="success"
      />
      <KPICard
        title={t('dashboard.totalRevenue')}
        value={formatCurrency(metrics.totalRevenue)}
        subtitle={t('dashboard.thisMonth')}
        icon={<TrendingUp size={20} />}
        variant="primary"
      />
      <KPICard
        title={t('dashboard.threeMonthsRevenue')}
        value={formatCurrency(metrics.threeMonthsRevenue)}
        subtitle={t('dashboard.lastThreeMonths')}
        icon={<DollarSign size={20} />}
        variant="default"
      />
      <KPICard
        title={t('dashboard.totalOrders')}
        value={metrics.totalOrders}
        change={0}
        changeLabel={t('dashboard.thisMonth')}
        icon={<ShoppingCart size={20} />}
        variant="default"
      />
    </div>
  );
};

export default DashboardKPIs;