import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

interface RevenueReport {
  branch_revenues: Array<{
    branch_name: string;
    revenue: number;
  }>;
}

interface BranchRevenueChartProps {
  branches?: Array<{
    branch_name: string;
    revenue: number;
  }>;
}

const BranchRevenueChart: React.FC<BranchRevenueChartProps> = ({ branches: propBranches }) => {
  const { t, language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  const { data: branchData, isLoading } = useQuery({
    queryKey: ['branch-revenue-chart'],
    queryFn: async () => {
      // إذا كان عندنا branches من الـ props، استخدمها
      if (propBranches && propBranches.length > 0) {
        return propBranches.map(branch => ({
          name: branch.branch_name,
          revenue: branch.revenue,
          growth: Math.random() * 20 - 5, // Placeholder - would need historical data
        }));
      }
      
      // وإلا جيبها من API
      const response = await api.get<RevenueReport>('/reports/revenue');
      const branchRevenues = response.data?.branch_revenues || [];
      
      return branchRevenues.map(branch => ({
        name: branch.branch_name,
        revenue: branch.revenue,
        growth: Math.random() * 20 - 5, // Placeholder
      }));
    },
  });

  const getBarColor = (growth: number) => {
    if (growth > 10) return 'hsl(134, 61%, 41%)';
    if (growth > 0) return 'hsl(162, 63%, 46%)';
    return 'hsl(0, 84%, 60%)';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t('dashboard.revenue')}:</span>
              <span className="font-medium">{formatCurrency(data.revenue)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t('dashboard.growth')}:</span>
              <span className={`font-medium ${data.growth > 0 ? 'text-success' : 'text-destructive'}`}>
                {data.growth > 0 ? '+' : ''}{data.growth.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          {t('dashboard.branchRevenue')}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t('common.thisMonth')}
        </span>
      </div>

      <div className="h-64">
        {branchData && branchData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis 
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis 
                type="category"
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={28}>
                {branchData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.growth)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {language === 'ar' ? 'لا توجد بيانات للعرض' : 'No data available'}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchRevenueChart;