// pages/Dashboard.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import QuickAccessGrid from '@/components/dashboard/QuickAccessGrid';
import SalesTrendChart from '@/components/dashboard/SalesTrendChart';
import CategoryPerformanceChart from '@/components/dashboard/CategoryPerformanceChart';
import BranchRevenueChart from '@/components/dashboard/BranchRevenueChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import LowStockAlert from '@/components/dashboard/LowStockAlert';
import { useDashboardData } from '@/hooks/useDashboardData';

const Dashboard: React.FC = () => {
  const { language } = useLanguage();
  const { 
    revenueReport,
    dashboardMetrics,
    recentTransactions,
    lowStockProducts,
    isLoading 
  } = useDashboardData();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'ar' ? 'صباح الخير' : 'Good Morning';
    if (hour < 18) return language === 'ar' ? 'مساء الخير' : 'Good Afternoon';
    return language === 'ar' ? 'مساء الخير' : 'Good Evening';
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <DashboardHeader greeting={getGreeting()} />

        {/* Quick Access */}
        <QuickAccessGrid />

        {/* KPI Cards */}
        <DashboardKPIs metrics={dashboardMetrics} isLoading={isLoading} />

        {/* Low Stock Alert */}
        <LowStockAlert lowStockProducts={lowStockProducts} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SalesTrendChart 
              branchId={undefined}
              reportData={revenueReport}
            />
          </div>
          <div>
            <CategoryPerformanceChart 
              categories={revenueReport?.top_categories || []}
            />
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <BranchRevenueChart 
              branches={revenueReport?.branch_revenues || []}
            />
          </div>
          <div>
            <RecentTransactions 
              transactions={recentTransactions}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;