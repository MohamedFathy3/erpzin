import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import KPICard from '@/components/dashboard/KPICard';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import BranchRevenueChart from '@/components/dashboard/BranchRevenueChart';
import CategoryPerformanceChart from '@/components/dashboard/CategoryPerformanceChart';
import LowStockAlerts from '@/components/dashboard/LowStockAlerts';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import QuickAccessGrid from '@/components/dashboard/QuickAccessGrid';
import {
  Wallet,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('dashboard.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.welcome')}, <span className="font-medium text-foreground">Admin</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Quick Access */}
        <QuickAccessGrid />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={t('dashboard.todaySales')}
            value="1,245,800"
            currency="YER"
            change={12.5}
            changeLabel="vs yesterday"
            icon={<Wallet size={20} />}
            variant="success"
          />
          <KPICard
            title={t('dashboard.totalRevenue')}
            value="28,450,000"
            currency="YER"
            change={8.3}
            changeLabel="vs last month"
            icon={<TrendingUp size={20} />}
            variant="primary"
          />
          <KPICard
            title={t('dashboard.totalOrders')}
            value={1847}
            change={15.2}
            changeLabel="vs last month"
            icon={<ShoppingCart size={20} />}
            variant="default"
          />
          <KPICard
            title={t('dashboard.avgOrderValue')}
            value="15,400"
            currency="YER"
            change={-2.1}
            changeLabel="vs last month"
            icon={<Users size={20} />}
            variant="default"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SalesTrendChart />
          </div>
          <div>
            <CategoryPerformanceChart />
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <BranchRevenueChart />
          </div>
          <div>
            <LowStockAlerts />
          </div>
          <div>
            <RecentTransactions />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
