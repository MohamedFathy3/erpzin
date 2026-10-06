// components/dashboard/CategoryPerformanceChart.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface Category {
  category_id: number;
  category_name: string;
  total_quantity: number;
}

interface CategoryPerformanceChartProps {
  categories?: Category[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a'];

const CategoryPerformanceChart: React.FC<CategoryPerformanceChartProps> = ({ categories = [] }) => {
  const { language, t } = useLanguage();

  // تأكد من وجود بيانات صالحة
  const validCategories = categories.filter(cat => cat && cat.category_name && cat.total_quantity > 0);

  if (validCategories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.categoryPerformance')}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const data = validCategories.map(cat => ({
    name: language === 'ar' ? cat.category_name : cat.category_name,
    value: cat.total_quantity
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.categoryPerformance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CategoryPerformanceChart;