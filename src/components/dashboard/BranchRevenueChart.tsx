import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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

const BranchRevenueChart: React.FC = () => {
  const { t } = useLanguage();

  const branchData = [
    { name: t('branch.abra'), revenue: 485000, growth: 12.5 },
    { name: t('branch.primark'), revenue: 392000, growth: 8.2 },
    { name: t('branch.fashionKings'), revenue: 328000, growth: -2.1 },
    { name: t('branch.ahyan'), revenue: 275000, growth: 15.8 },
  ];

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
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-medium">{(data.revenue / 1000).toFixed(0)}K YER</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Growth:</span>
              <span className={`font-medium ${data.growth > 0 ? 'text-success' : 'text-destructive'}`}>
                {data.growth > 0 ? '+' : ''}{data.growth}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={branchData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis 
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
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
      </div>
    </div>
  );
};

export default BranchRevenueChart;
