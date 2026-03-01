import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Users
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
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

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ language }) => {
  const { formatCurrency } = useRegionalSettings();
  
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const lastMonthStart = startOfMonth(subMonths(currentDate, 1));
  const lastMonthEnd = endOfMonth(subMonths(currentDate, 1));

  // Format dates for API
  const currentMonthStart = format(monthStart, 'yyyy-MM-dd');
  const currentMonthEnd = format(monthEnd, 'yyyy-MM-dd');
  const lastMonthStartStr = format(lastMonthStart, 'yyyy-MM-dd');
  const lastMonthEndStr = format(lastMonthEnd, 'yyyy-MM-dd');

  // ==================== Fetch Current Month Sales ====================
  const { data: currentSales = [] } = useQuery<SalesInvoice[]>({
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

  // ==================== Fetch Last Month Sales ====================
  const { data: lastMonthSales = [] } = useQuery<SalesInvoice[]>({
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

  // ==================== Fetch Current Month Expenses ====================
  const { data: currentExpenses = [] } = useQuery<Expense[]>({
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

  // ==================== Fetch Last Month Expenses ====================
  const { data: lastMonthExpenses = [] } = useQuery<Expense[]>({
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

  // ==================== Fetch Purchase Invoices (Payables) ====================
  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
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

  // ==================== Calculate Metrics with useMemo ====================
  const metrics = useMemo(() => {
    // Current month totals
    const totalSalesAmount = currentSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const lastMonthSalesAmount = lastMonthSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    
    const totalExpensesAmount = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const lastMonthExpensesAmount = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Calculate growth
    const salesGrowth = lastMonthSalesAmount > 0 
      ? ((totalSalesAmount - lastMonthSalesAmount) / lastMonthSalesAmount * 100)
      : 0;

    const expensesChange = lastMonthExpensesAmount > 0
      ? ((totalExpensesAmount - lastMonthExpensesAmount) / lastMonthExpensesAmount * 100)
      : 0;

    // Profit calculations
    const netProfit = totalSalesAmount - totalExpensesAmount;
    const profitMargin = totalSalesAmount > 0 ? (netProfit / totalSalesAmount) * 100 : 0;

    // Payables
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

  // ==================== Expense Breakdown by Category ====================
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

  const stats = [
    {
      title: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
      value: metrics.totalSalesAmount,
      change: metrics.salesGrowth,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden">
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
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'من الشهر السابق' : 'vs last month'}
                      </span>
                    </div>
                  )}
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {language === 'ar' ? 'اتجاه المبيعات اليومية' : 'Daily Sales Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySalesData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), language === 'ar' ? 'المبيعات' : 'Sales']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
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
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              {language === 'ar' ? 'توزيع المصروفات' : 'Expense Breakdown'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
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
                    formatter={(value: number) => [formatCurrency(value)]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieData.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {language === 'ar' ? 'طرق الدفع' : 'Payment Methods'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={60} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value)]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Financial Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
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
              <Progress value={Math.min(100, Math.max(0, metrics.profitMargin))} className="h-2" />
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
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-600">{currentSales.length}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'عدد المبيعات' : 'Transactions'}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">
                  {currentSales.length > 0 
                    ? formatCurrency(Math.round(metrics.totalSalesAmount / currentSales.length))
                    : formatCurrency(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'متوسط الفاتورة' : 'Avg. Order'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;