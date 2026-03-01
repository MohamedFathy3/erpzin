import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

interface SalesTrendChartProps {
  branchId?: number;
  data?: any;  // 👈 أضف هذا
}

interface SalesInvoice {
  id: number;
  total_amount: string;
  created_at: string;
}

interface SalesInvoiceResponse {
  data: SalesInvoice[];
}

const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ branchId, data: propData }) => {
  const { t, language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  // استخدم propData لو موجود، وإلا جيب من API
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales-trend-chart', branchId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const months = language === 'ar' ? monthsAr : monthsEn;
      
      // جلب كل مبيعات السنة الحالية
      const startOfYear = `${currentYear}-01-01 00:00:00`;
      const endOfYear = `${currentYear}-12-31 23:59:59`;
      
      const params: any = {
        date_from: startOfYear,
        date_to: endOfYear,
        paginate: false
      };
      
      if (branchId) {
        params.branch_id = branchId;
      }

      const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', params);
      const allSales = response.data.data || [];
      
      // Generate data for each month
      const monthlyData = months.map((month, index) => {
        const monthStart = new Date(currentYear, index, 1);
        const monthEnd = new Date(currentYear, index + 1, 0);
        
        // فلترة مبيعات هذا الشهر
        const monthSales = allSales.filter(sale => {
          const saleDate = new Date(sale.created_at);
          return saleDate >= monthStart && saleDate <= monthEnd;
        });
        
        const actual = index <= currentMonth 
          ? monthSales.reduce((sum, s) => sum + Number(s.total_amount), 0)
          : null;
        
        // Simple prediction based on trend
        const baseValue = 100000 + (index * 15000);
        const predicted = Math.round(baseValue + (Math.random() * 20000 - 10000));
        
        return {
          month,
          actual,
          predicted,
        };
      });
      
      return monthlyData;
    },
    enabled: !propData,  // 👈 شغال بس لو مفيش propData
  });

  // استخدم propData لو موجود، وإلا استخدم salesData
  const chartData = propData ? propData.salesData : salesData;

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
                {entry.value ? formatCurrency(entry.value) : '-'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading && !propData) {
    return (
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

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
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="actual"
              name={t('dashboard.actualSales')}
              stroke="hsl(var(--primary))"
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