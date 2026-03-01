import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface RevenueReport {
  top_categories: Array<{
    category_id: number;
    category_name: string;
    total_quantity: number;
  }>;
}

interface CategoryPerformanceChartProps {
  categories?: Array<{
    category_id: number;
    category_name: string;
    total_quantity: number;
  }>;
}

const COLORS = [
  'hsl(217, 47%, 19%)',
  'hsl(134, 61%, 41%)',
  'hsl(162, 63%, 46%)',
  'hsl(199, 89%, 48%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
];

const CategoryPerformanceChart: React.FC<CategoryPerformanceChartProps> = ({ categories: propCategories }) => {
  const { t, language } = useLanguage();

  const { data: categoryData, isLoading } = useQuery({
    queryKey: ['category-performance-chart'],
    queryFn: async () => {
      // إذا كان عندنا categories من الـ props، استخدمها
      if (propCategories && propCategories.length > 0) {
        return propCategories.map((cat, index) => ({
          name: cat.category_name,
          value: cat.total_quantity,
          color: COLORS[index % COLORS.length],
        }));
      }
      
      // وإلا جيبها من API
      const response = await api.get<RevenueReport>('/reports/revenue');
      const topCategories = response.data?.top_categories || [];
      
      return topCategories.map((cat, index) => ({
        name: cat.category_name,
        value: cat.total_quantity,
        color: COLORS[index % COLORS.length],
      }));
    },
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = categoryData?.reduce((sum, item) => sum + item.value, 0) || 1;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="font-medium text-sm">{data.name}</span>
          </div>
          <p className="text-sm mt-1 text-muted-foreground">
            {percentage}% {t('dashboard.ofTotalSales')}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5 text-xs">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-5">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-56 w-full rounded-full" />
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t('dashboard.categoryPerformance')}
        </h3>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {categoryData?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryPerformanceChart;