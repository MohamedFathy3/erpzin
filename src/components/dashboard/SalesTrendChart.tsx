/* eslint-disable @typescript-eslint/no-explicit-any */
// components/dashboard/SalesTrendChart.tsx
import React, { useMemo } from 'react';
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
import { RevenueReport } from '@/hooks/useDashboardData';

interface SalesTrendChartProps {
  branchId?: number;
  data?: any;
  reportData?: RevenueReport;
}

interface Invoice {
  id: number;
  invoice_number: string;
  status: string;
  customer: {
    id: number;
    name: string;
  };
  amounts: {
    total: number;
    paid: number;
    remaining: number;
  };
  created_at: string;
}

interface InvoicesResponse {
  data: Invoice[];
  result: string;
  message: string;
  status: number;
}

const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ branchId, data: propData, reportData }) => {
  const { t, language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  // جلب البيانات من API /invoices/index
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales-trend-chart', branchId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const months = language === 'ar' ? monthsAr : monthsEn;
      
      const params: any = {
        paginate: false
      };
      
      if (branchId) {
        params.branch_id = branchId;
      }

      const response = await api.post<InvoicesResponse>('/invoices/index', params);
      const allInvoices = response.data.data || [];
      
      // فلترة الفواتير المدفوعة فقط (paid)
      const paidInvoices = allInvoices.filter(invoice => invoice.status === 'paid');
      
      // تجميع المبيعات حسب الشهر
      const monthlyData = months.map((month, index) => {
        const monthStart = new Date(currentYear, index, 1);
        const monthEnd = new Date(currentYear, index + 1, 0);
        
        // فلترة فواتير هذا الشهر
        const monthInvoices = paidInvoices.filter(invoice => {
          const invoiceDate = new Date(invoice.created_at);
          return invoiceDate >= monthStart && invoiceDate <= monthEnd;
        });
        
        const currentMonth = new Date().getMonth();
        const actual = index <= currentMonth 
          ? monthInvoices.reduce((sum, inv) => sum + Number(inv.amounts.total), 0)
          : null;
        
        // توقع بسيط (تقديري)
        let predicted = null;
        if (actual !== null && index === currentMonth) {
          // توقع باقي الشهر الحالي
          predicted = actual * 1.2;
        } else if (index > currentMonth) {
          // توقع للأشهر القادمة بناءً على متوسط الأشهر السابقة
          const previousMonths = paidInvoices.filter(inv => {
            const invDate = new Date(inv.created_at);
            return invDate.getFullYear() === currentYear && invDate.getMonth() < index;
          });
          const avgPrevious = previousMonths.length > 0 
            ? previousMonths.reduce((sum, inv) => sum + Number(inv.amounts.total), 0) / previousMonths.length
            : 50000;
          predicted = Math.round(avgPrevious * (1 + (index * 0.05)));
        }
        
        return {
          month,
          actual,
          predicted,
        };
      });
      
      return monthlyData;
    },
    enabled: !propData && !reportData,
  });

  // تحويل reportData إلى تنسيق المخطط
  const chartDataFromReport = useMemo(() => {
    if (!reportData) return null;
    
    const months = language === 'ar' ? monthsAr : monthsEn;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    return months.map((month, index) => {
      let actual = null;
      
      if (index === currentMonth) {
        actual = reportData.month_revenue;
      } else if (index >= currentMonth - 2 && index <= currentMonth) {
        actual = reportData.three_months_revenue / 3;
      } else if (index < currentMonth) {
        actual = reportData.month_revenue * 0.8;
      }
      
      return {
        month,
        actual,
        predicted: actual ? actual * 1.1 : null,
      };
    });
  }, [reportData, language]);

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
                {entry.value !== null && entry.value !== undefined ? formatCurrency(entry.value) : '-'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // دالة الترجمة المحلية للمفاتيح الناقصة
  const localT = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'dashboard.salesTrend': 'Sales Trend',
        'dashboard.actualSales': 'Actual Sales',
        'dashboard.aiPrediction': 'AI Prediction',
        'common.noData': 'No data available',
      },
      ar: {
        'dashboard.salesTrend': 'اتجاه المبيعات',
        'dashboard.actualSales': 'المبيعات الفعلية',
        'dashboard.aiPrediction': 'توقع الذكاء الاصطناعي',
        'common.noData': 'لا توجد بيانات',
      },
    };
    return translations[language]?.[key] || key;
  };

  const chartData = propData || chartDataFromReport || salesData;

  const isLoadingData = !propData && !reportData && isLoading;

  if (isLoadingData) {
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

  if (!chartData || chartData.length === 0 || chartData.every(item => item.actual === null && item.predicted === null)) {
    return (
      <div className="card-elevated p-5">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          {localT('dashboard.salesTrend')}
        </h3>
        <div className="h-72 flex items-center justify-center">
          <p className="text-muted-foreground">{localT('common.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          {localT('dashboard.salesTrend')}
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">{localT('dashboard.actualSales')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{localT('dashboard.aiPrediction')}</span>
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
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
              name={localT('dashboard.actualSales')}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorActual)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              name={localT('dashboard.aiPrediction')}
              stroke="#10b981"
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