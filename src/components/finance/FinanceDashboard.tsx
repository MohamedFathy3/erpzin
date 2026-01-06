import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

interface FinanceDashboardProps {
  language: string;
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ language }) => {
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const lastMonthStart = startOfMonth(subMonths(currentDate, 1));
  const lastMonthEnd = endOfMonth(subMonths(currentDate, 1));

  // Fetch current month sales
  const { data: currentSales = [] } = useQuery({
    queryKey: ['finance-sales-current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('sale_date', monthStart.toISOString())
        .lte('sale_date', monthEnd.toISOString())
        .eq('status', 'completed');
      if (error) throw error;
      return data;
    }
  });

  // Fetch last month sales for comparison
  const { data: lastMonthSales = [] } = useQuery({
    queryKey: ['finance-sales-last'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('sale_date', lastMonthStart.toISOString())
        .lte('sale_date', lastMonthEnd.toISOString())
        .eq('status', 'completed');
      if (error) throw error;
      return data;
    }
  });

  // Fetch current month expenses
  const { data: currentExpenses = [] } = useQuery({
    queryKey: ['finance-expenses-current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', monthStart.toISOString().split('T')[0])
        .lte('expense_date', monthEnd.toISOString().split('T')[0]);
      if (error) throw error;
      return data;
    }
  });

  // Fetch last month expenses
  const { data: lastMonthExpenses = [] } = useQuery({
    queryKey: ['finance-expenses-last'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', lastMonthStart.toISOString().split('T')[0])
        .lte('expense_date', lastMonthEnd.toISOString().split('T')[0]);
      if (error) throw error;
      return data;
    }
  });

  // Fetch purchase invoices (payables)
  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['finance-purchase-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('payment_status', 'unpaid');
      if (error) throw error;
      return data;
    }
  });

  // Fetch supplier payments
  const { data: supplierPayments = [] } = useQuery({
    queryKey: ['finance-supplier-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select('*')
        .gte('payment_date', monthStart.toISOString())
        .lte('payment_date', monthEnd.toISOString());
      if (error) throw error;
      return data;
    }
  });

  // Calculate metrics
  const totalSalesAmount = currentSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const lastMonthSalesAmount = lastMonthSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const salesGrowth = lastMonthSalesAmount > 0 
    ? ((totalSalesAmount - lastMonthSalesAmount) / lastMonthSalesAmount * 100).toFixed(1)
    : 0;

  const totalExpensesAmount = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const lastMonthExpensesAmount = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expensesChange = lastMonthExpensesAmount > 0
    ? ((totalExpensesAmount - lastMonthExpensesAmount) / lastMonthExpensesAmount * 100).toFixed(1)
    : 0;

  const netProfit = totalSalesAmount - totalExpensesAmount;
  const profitMargin = totalSalesAmount > 0 ? ((netProfit / totalSalesAmount) * 100).toFixed(1) : 0;

  const totalPayables = purchaseInvoices.reduce((sum, inv) => sum + Number(inv.remaining_amount || 0), 0);
  const totalPaymentsThisMonth = supplierPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Expense breakdown by category
  const expensesByCategory = currentExpenses.reduce((acc: Record<string, number>, exp) => {
    const cat = exp.category || 'other';
    acc[cat] = (acc[cat] || 0) + Number(exp.amount);
    return acc;
  }, {});

  const categoryLabels: Record<string, { en: string; ar: string; color: string }> = {
    rent: { en: 'Rent', ar: 'إيجار', color: '#3b82f6' },
    utilities: { en: 'Utilities', ar: 'مرافق', color: '#10b981' },
    salaries: { en: 'Salaries', ar: 'رواتب', color: '#f59e0b' },
    supplies: { en: 'Supplies', ar: 'مستلزمات', color: '#8b5cf6' },
    marketing: { en: 'Marketing', ar: 'تسويق', color: '#ec4899' },
    maintenance: { en: 'Maintenance', ar: 'صيانة', color: '#06b6d4' },
    other: { en: 'Other', ar: 'أخرى', color: '#6b7280' }
  };

  const pieData = Object.entries(expensesByCategory).map(([key, value]) => ({
    name: language === 'ar' ? categoryLabels[key]?.ar || key : categoryLabels[key]?.en || key,
    value,
    color: categoryLabels[key]?.color || '#6b7280'
  }));

  // Daily sales trend
  const getDailySalesData = () => {
    const dailyData: Record<string, number> = {};
    currentSales.forEach(sale => {
      const day = format(new Date(sale.sale_date), 'MM/dd');
      dailyData[day] = (dailyData[day] || 0) + Number(sale.total_amount);
    });
    return Object.entries(dailyData)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Payment methods breakdown
  const paymentMethodsData = () => {
    const methods: Record<string, number> = {};
    currentSales.forEach(sale => {
      const method = sale.payment_method || 'cash';
      methods[method] = (methods[method] || 0) + Number(sale.total_amount);
    });
    return Object.entries(methods).map(([method, amount]) => ({
      name: method === 'cash' ? (language === 'ar' ? 'نقدي' : 'Cash') 
           : method === 'card' ? (language === 'ar' ? 'بطاقة' : 'Card')
           : method,
      amount
    }));
  };

  const stats = [
    {
      title: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
      value: totalSalesAmount,
      change: Number(salesGrowth),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      title: language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses',
      value: totalExpensesAmount,
      change: Number(expensesChange),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      invertChange: true
    },
    {
      title: language === 'ar' ? 'صافي الربح' : 'Net Profit',
      value: netProfit,
      subtitle: `${profitMargin}% ${language === 'ar' ? 'هامش الربح' : 'margin'}`,
      icon: DollarSign,
      color: netProfit >= 0 ? 'text-primary' : 'text-red-600',
      bgColor: netProfit >= 0 ? 'bg-primary/10' : 'bg-red-100 dark:bg-red-900/30'
    },
    {
      title: language === 'ar' ? 'المستحقات للموردين' : 'Accounts Payable',
      value: totalPayables,
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
                    {stat.value.toLocaleString()} <span className="text-sm font-normal">ر.ي</span>
                  </p>
                  {stat.change !== undefined && (
                    <div className={`flex items-center gap-1 text-sm ${
                      (stat.invertChange ? stat.change <= 0 : stat.change >= 0) 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(stat.invertChange ? stat.change <= 0 : stat.change >= 0) 
                        ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span>{Math.abs(stat.change)}%</span>
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
                <AreaChart data={getDailySalesData()}>
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
                    formatter={(value: number) => [`${value.toLocaleString()} ر.ي`, language === 'ar' ? 'المبيعات' : 'Sales']}
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
                    formatter={(value: number) => [`${value.toLocaleString()} ر.ي`]}
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
                  <span className="font-medium">{item.value.toLocaleString()}</span>
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
                <BarChart data={paymentMethodsData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={60} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} ر.ي`]}
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
                <span className="font-medium">{profitMargin}%</span>
              </div>
              <Progress value={Number(profitMargin)} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'نسبة المصروفات' : 'Expense Ratio'}
                </span>
                <span className="font-medium">
                  {totalSalesAmount > 0 ? ((totalExpensesAmount / totalSalesAmount) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress 
                value={totalSalesAmount > 0 ? (totalExpensesAmount / totalSalesAmount) * 100 : 0} 
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
                  {currentSales.length > 0 ? Math.round(totalSalesAmount / currentSales.length).toLocaleString() : 0}
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
