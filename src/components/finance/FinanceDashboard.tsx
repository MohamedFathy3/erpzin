import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PiggyBank,
  Building2,
  Users,
  RefreshCw,
  Calendar,
  Download
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface FinanceDashboardProps {
  language: string;
}

// ==================== Types ====================
interface SalesInvoice {
  id: number;
  invoice_number: string;
  customer: {
    id: number;
    name: string;
  };
  total_amount: string;
  payment_method: string;
  created_at: string;
}

interface SalesInvoiceResponse {
  data: SalesInvoice[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Expense {
  id: number;
  category: string;
  amount: string;
  description: string;
  date: string;
  payment_method: string;
  payment_method_arabic: string;
}

interface ExpenseResponse {
  data: Expense[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: {
    id: number | null;
    name: string | null;
  };
  total_amount: string;
  paid_amount?: string;
  remaining_amount?: string;
  payment_status: string;
  invoice_date: string;
}

interface PurchaseInvoiceResponse {
  data: PurchaseInvoice[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; labelAr: string }[];
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange, options }) => {
  return (
    <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ language }) => {
  const { formatCurrency } = useRegionalSettings();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const currentDate = new Date();
  
  // ==================== Date Ranges ====================
  const getDateRange = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'today':
        return {
          start: format(now, 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd')
        };
      case 'week':
        return {
          start: format(subDays(now, 7), 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd')
        };
      case 'month':
        return {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd')
        };
      case 'quarter':
        return {
          start: format(subMonths(now, 3), 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd')
        };
      case 'year':
        return {
          start: format(subMonths(now, 12), 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd')
        };
      default:
        return {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd')
        };
    }
  };

  const currentRange = getDateRange(period);
  const lastMonthStart = startOfMonth(subMonths(currentDate, 1));
  const lastMonthEnd = endOfMonth(subMonths(currentDate, 1));

  const currentMonthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');
  const lastMonthStartStr = format(lastMonthStart, 'yyyy-MM-dd');
  const lastMonthEndStr = format(lastMonthEnd, 'yyyy-MM-dd');

  // ==================== Queries ====================
  const { 
    data: currentSales = [], 
    isLoading: loadingCurrentSales,
    refetch: refetchCurrentSales
  } = useQuery<SalesInvoice[]>({
    queryKey: ['finance-sales-current', currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      try {
        const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
          date_from: `${currentMonthStart} 00:00:00`,
          date_to: `${currentMonthEnd} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching current sales:', error);
        return [];
      }
    }
  });

  const { 
    data: lastMonthSales = [], 
    isLoading: loadingLastMonthSales 
  } = useQuery<SalesInvoice[]>({
    queryKey: ['finance-sales-last', lastMonthStartStr, lastMonthEndStr],
    queryFn: async () => {
      try {
        const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
          date_from: `${lastMonthStartStr} 00:00:00`,
          date_to: `${lastMonthEndStr} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching last month sales:', error);
        return [];
      }
    }
  });

  const { 
    data: currentExpenses = [], 
    isLoading: loadingCurrentExpenses 
  } = useQuery<Expense[]>({
    queryKey: ['finance-expenses-current', currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      try {
        const response = await api.post<ExpenseResponse>('/finance/index', {
          date_from: currentMonthStart,
          date_to: currentMonthEnd
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching current expenses:', error);
        return [];
      }
    }
  });

  const { 
    data: lastMonthExpenses = [], 
    isLoading: loadingLastMonthExpenses 
  } = useQuery<Expense[]>({
    queryKey: ['finance-expenses-last', lastMonthStartStr, lastMonthEndStr],
    queryFn: async () => {
      try {
        const response = await api.post<ExpenseResponse>('/finance/index', {
          date_from: lastMonthStartStr,
          date_to: lastMonthEndStr
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching last month expenses:', error);
        return [];
      }
    }
  });

  const { 
    data: purchaseInvoices = [], 
    isLoading: loadingPurchaseInvoices 
  } = useQuery<PurchaseInvoice[]>({
    queryKey: ['finance-purchase-invoices'],
    queryFn: async () => {
      try {
        const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
          paginate: false,
          filters: {
            payment_status: 'unpaid'
          }
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching purchase invoices:', error);
        return [];
      }
    }
  });

  const isLoading = loadingCurrentSales || loadingLastMonthSales || 
                    loadingCurrentExpenses || loadingLastMonthExpenses || 
                    loadingPurchaseInvoices;

  // ==================== Refresh Handler ====================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchCurrentSales(),
      // refetch other queries if needed
    ]);
    setIsRefreshing(false);
    toast.success(language === 'ar' ? 'تم تحديث البيانات' : 'Data refreshed');
  };

  // ==================== Export Handler ====================
  const handleExport = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['التقرير المالي', 'Financial Report'],
        ['الفترة', `${currentMonthStart} إلى ${currentMonthEnd}`],
        [''],
        ['المؤشر', 'القيمة'],
        ['إجمالي المبيعات', metrics.totalSalesAmount],
        ['إجمالي المصروفات', metrics.totalExpensesAmount],
        ['صافي الربح', metrics.netProfit],
        ['هامش الربح', `${metrics.profitMargin.toFixed(1)}%`],
        ['المستحقات', metrics.totalPayables],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Expenses Sheet
      const expensesData = [
        ['الفئة', 'المبلغ'],
        ...Object.entries(expensesByCategory).map(([cat, amount]) => [cat, amount])
      ];
      const expensesWs = XLSX.utils.aoa_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(wb, expensesWs, 'Expenses');

      XLSX.writeFile(wb, `finance-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(language === 'ar' ? 'حدث خطأ في التصدير' : 'Export failed');
    }
  };

  // ==================== Metrics ====================
  const metrics = useMemo(() => {
    const totalSalesAmount = currentSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const lastMonthSalesAmount = lastMonthSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    
    const totalExpensesAmount = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const lastMonthExpensesAmount = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const salesGrowth = lastMonthSalesAmount > 0 
      ? ((totalSalesAmount - lastMonthSalesAmount) / lastMonthSalesAmount * 100)
      : 0;

    const expensesChange = lastMonthExpensesAmount > 0
      ? ((totalExpensesAmount - lastMonthExpensesAmount) / lastMonthExpensesAmount * 100)
      : 0;

    const netProfit = totalSalesAmount - totalExpensesAmount;
    const profitMargin = totalSalesAmount > 0 ? (netProfit / totalSalesAmount) * 100 : 0;

    const totalPayables = purchaseInvoices.reduce((sum, inv) => {
      const remaining = inv.remaining_amount ? Number(inv.remaining_amount) : 
                       (Number(inv.total_amount) - Number(inv.paid_amount || 0));
      return sum + remaining;
    }, 0);

    return {
      totalSalesAmount,
      lastMonthSalesAmount,
      totalExpensesAmount,
      lastMonthExpensesAmount,
      salesGrowth,
      expensesChange,
      netProfit,
      profitMargin,
      totalPayables
    };
  }, [currentSales, lastMonthSales, currentExpenses, lastMonthExpenses, purchaseInvoices]);

  // ==================== Expense Breakdown ====================
  const expensesByCategory = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    
    currentExpenses.forEach(exp => {
      const cat = exp.category || 'other';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount);
    });

    return categoryMap;
  }, [currentExpenses]);

  const categoryLabels: Record<string, { en: string; ar: string; color: string }> = {
    rent: { en: 'Rent', ar: 'إيجار', color: '#3b82f6' },
    utilities: { en: 'Utilities', ar: 'مرافق', color: '#10b981' },
    salaries: { en: 'Salaries', ar: 'رواتب', color: '#f59e0b' },
    supplies: { en: 'Supplies', ar: 'مستلزمات', color: '#8b5cf6' },
    marketing: { en: 'Marketing', ar: 'تسويق', color: '#ec4899' },
    maintenance: { en: 'Maintenance', ar: 'صيانة', color: '#06b6d4' },
    other: { en: 'Other', ar: 'أخرى', color: '#6b7280' }
  };

  const pieData = useMemo(() => {
    return Object.entries(expensesByCategory).map(([key, value]) => ({
      name: language === 'ar' ? categoryLabels[key]?.ar || key : categoryLabels[key]?.en || key,
      value,
      color: categoryLabels[key]?.color || '#6b7280'
    }));
  }, [expensesByCategory, language]);

  // ==================== Daily Sales Trend ====================
  const dailySalesData = useMemo(() => {
    const dailyData: Record<string, number> = {};
    
    currentSales.forEach(sale => {
      const day = format(new Date(sale.created_at), 'MM/dd');
      dailyData[day] = (dailyData[day] || 0) + Number(sale.total_amount);
    });

    return Object.entries(dailyData)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [currentSales]);

  // ==================== Payment Methods Breakdown ====================
  const paymentMethodsData = useMemo(() => {
    const methods: Record<string, number> = {};
    
    currentSales.forEach(sale => {
      const method = sale.payment_method || 'cash';
      methods[method] = (methods[method] || 0) + Number(sale.total_amount);
    });

    return Object.entries(methods).map(([method, amount]) => ({
      name: method === 'cash' ? (language === 'ar' ? 'نقدي' : 'Cash') 
           : method === 'card' ? (language === 'ar' ? 'بطاقة' : 'Card')
           : method === 'wallet' ? (language === 'ar' ? 'محفظة' : 'Wallet')
           : method === 'bank_transfer' ? (language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer')
           : method,
      amount
    }));
  }, [currentSales, language]);

  // ==================== Stats Cards ====================
  const stats = [
    {
      title: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
      value: metrics.totalSalesAmount,
      change: metrics.salesGrowth,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      invertChange: false
    },
    {
      title: language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses',
      value: metrics.totalExpensesAmount,
      change: metrics.expensesChange,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      invertChange: true
    },
    {
      title: language === 'ar' ? 'صافي الربح' : 'Net Profit',
      value: metrics.netProfit,
      subtitle: `${metrics.profitMargin.toFixed(1)}% ${language === 'ar' ? 'هامش الربح' : 'margin'}`,
      icon: DollarSign,
      color: metrics.netProfit >= 0 ? 'text-primary' : 'text-red-600',
      bgColor: metrics.netProfit >= 0 ? 'bg-primary/10' : 'bg-red-100 dark:bg-red-900/30'
    },
    {
      title: language === 'ar' ? 'المستحقات للموردين' : 'Accounts Payable',
      value: metrics.totalPayables,
      subtitle: language === 'ar' ? 'فواتير غير مدفوعة' : 'Unpaid invoices',
      icon: Building2,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    }
  ];

  // ==================== Period Options ====================
  const periodOptions = [
    { value: 'today', label: language === 'ar' ? 'اليوم' : 'Today', labelAr: 'اليوم' },
    { value: 'week', label: language === 'ar' ? 'أسبوع' : 'Week', labelAr: 'أسبوع' },
    { value: 'month', label: language === 'ar' ? 'شهر' : 'Month', labelAr: 'شهر' },
    { value: 'quarter', label: language === 'ar' ? 'ربع سنة' : 'Quarter', labelAr: 'ربع سنة' },
    { value: 'year', label: language === 'ar' ? 'سنة' : 'Year', labelAr: 'سنة' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">
            {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'لوحة المالية' : 'Finance Dashboard'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy', { locale: language === 'ar' ? ar : undefined })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <PeriodSelector
            value={period}
            onChange={(v) => setPeriod(v as any)}
            options={periodOptions}
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            className="h-9 w-9"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stat.value)}
                  </p>
                  {stat.change !== undefined && (
                    <div className={`flex items-center gap-1 text-sm ${
                      (stat.invertChange ? stat.change <= 0 : stat.change >= 0) 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(stat.invertChange ? stat.change <= 0 : stat.change >= 0) 
                        ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span>{Math.abs(stat.change).toFixed(1)}%</span>
                      <span className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'من الشهر السابق' : 'vs last month'}
                      </span>
                    </div>
                  )}
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
                <div className={cn(
                  "p-3 rounded-xl transition-transform group-hover:scale-110",
                  stat.bgColor
                )}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إجمالي المعاملات' : 'Total Transactions'}
              </p>
              <p className="text-2xl font-bold">{currentSales.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/5 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'متوسط الفاتورة' : 'Average Order'}
              </p>
              <p className="text-2xl font-bold">
                {currentSales.length > 0 
                  ? formatCurrency(Math.round(metrics.totalSalesAmount / currentSales.length))
                  : formatCurrency(0)}
              </p>
            </div>
            <div className="p-3 bg-accent/10 rounded-full">
              <Wallet className="h-6 w-6 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'اتجاه المبيعات اليومية' : 'Daily Sales Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySalesData}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(value).replace(/[^0-9]/g, '')}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#salesGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'توزيع المصروفات' : 'Expense Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
                </div>
              )}
            </div>
            
            {pieData.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto scrollbar-thin">
                {pieData.slice(0, 4).map((item, index) => {
                  const total = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }} 
                        />
                        <span className="truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{percentage}%</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  );
                })}
                {pieData.length > 4 && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    +{pieData.length - 4} {language === 'ar' ? 'فئات أخرى' : 'more categories'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'طرق الدفع' : 'Payment Methods'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {paymentMethodsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentMethodsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis 
                      type="number" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(value).replace(/[^0-9]/g, '')}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      width={80}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Financial Indicators */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'مؤشرات مالية سريعة' : 'Quick Financial Indicators'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'هامش الربح' : 'Profit Margin'}
                </span>
                <span className="font-medium">{metrics.profitMargin.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(100, Math.max(0, metrics.profitMargin))} 
                className="h-2" 
                indicatorClassName={metrics.profitMargin >= 0 ? 'bg-success' : 'bg-destructive'}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'نسبة المصروفات' : 'Expense Ratio'}
                </span>
                <span className="font-medium">
                  {metrics.totalSalesAmount > 0 ? ((metrics.totalExpensesAmount / metrics.totalSalesAmount) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress 
                value={metrics.totalSalesAmount > 0 ? (metrics.totalExpensesAmount / metrics.totalSalesAmount) * 100 : 0} 
                className="h-2"
                indicatorClassName="bg-warning"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-3 rounded-lg bg-gradient-to-br from-primary/5 to-transparent">
                <p className="text-3xl font-bold text-primary">{currentSales.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'معاملة' : 'Transactions'}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-br from-accent/5 to-transparent">
                <p className="text-3xl font-bold text-accent">
                  {currentSales.length > 0 
                    ? Math.round(metrics.totalSalesAmount / currentSales.length).toLocaleString()
                    : '0'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'متوسط' : 'Average'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{language === 'ar' ? 'أعلى يوم' : 'Peak Day'}: {
                  dailySalesData.length > 0 
                    ? dailySalesData.reduce((max, item) => item.amount > max.amount ? item : max).date
                    : '-'
                }</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>{language === 'ar' ? 'أكثر طريقة' : 'Top Method'}: {
                  paymentMethodsData.length > 0
                    ? paymentMethodsData.reduce((max, item) => item.amount > max.amount ? item : max).name
                    : '-'
                }</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;