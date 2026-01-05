import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const generateSalesData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = 6; // July (0-indexed would be 6)
  
  return months.map((month, index) => {
    const baseSales = 150000 + Math.random() * 100000;
    const actual = index <= currentMonth ? Math.round(baseSales + (index * 15000)) : null;
    
    // AI Prediction using linear regression: y = mx + c
    const m = 18000; // slope (growth rate)
    const c = 140000; // base value
    const predicted = Math.round(m * index + c + (Math.random() * 10000 - 5000));
    
    return {
      month,
      actual,
      predicted,
    };
  });
};

const salesData = generateSalesData();

const SalesTrendChart: React.FC = () => {
  const { t } = useLanguage();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {entry.value ? `${(entry.value / 1000).toFixed(0)}K YER` : '-'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          {t('dashboard.salesTrend')}
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">{t('dashboard.actualSales')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full gradient-success" />
            <span className="text-muted-foreground">{t('dashboard.aiPrediction')}</span>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 47%, 19%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 47%, 19%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(134, 61%, 41%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(162, 63%, 46%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="actual"
              name={t('dashboard.actualSales')}
              stroke="hsl(217, 47%, 19%)"
              strokeWidth={2}
              fill="url(#colorActual)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              name={t('dashboard.aiPrediction')}
              stroke="hsl(134, 61%, 41%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#colorPredicted)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesTrendChart;
