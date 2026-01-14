import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  ShoppingCart,
  Package,
  Download,
  Printer,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { format, subMonths, subQuarters, subYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const ProfitLossReport: React.FC = () => {
  const { language } = useLanguage();
  const [period, setPeriod] = useState('month');
  const [compareWith, setCompareWith] = useState('previous');

  const getPeriodRange = (periodType: string, offset: number = 0) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (periodType) {
      case 'month':
        start = startOfMonth(subMonths(now, offset));
        end = endOfMonth(subMonths(now, offset));
        break;
      case 'quarter':
        start = startOfQuarter(subQuarters(now, offset));
        end = endOfQuarter(subQuarters(now, offset));
        break;
      case 'year':
        start = startOfYear(subYears(now, offset));
        end = endOfYear(subYears(now, offset));
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start, end };
  };

  const currentPeriod = getPeriodRange(period, 0);
  const previousPeriod = getPeriodRange(period, 1);

  // Fetch current period data
  const { data: currentData, isLoading } = useQuery({
    queryKey: ['profit-loss-current', period],
    queryFn: async () => {
      const [salesRes, purchasesRes, expensesRes, revenuesRes] = await Promise.all([
        supabase.from('sales').select('total_amount').gte('sale_date', currentPeriod.start.toISOString()).lte('sale_date', currentPeriod.end.toISOString()),
        supabase.from('purchase_invoices').select('total_amount').gte('invoice_date', format(currentPeriod.start, 'yyyy-MM-dd')).lte('invoice_date', format(currentPeriod.end, 'yyyy-MM-dd')),
        supabase.from('expenses').select('amount, category').gte('expense_date', format(currentPeriod.start, 'yyyy-MM-dd')).lte('expense_date', format(currentPeriod.end, 'yyyy-MM-dd')),
        supabase.from('revenues').select('amount, category').gte('revenue_date', format(currentPeriod.start, 'yyyy-MM-dd')).lte('revenue_date', format(currentPeriod.end, 'yyyy-MM-dd'))
      ]);

      return {
        sales: salesRes.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
        purchases: purchasesRes.data?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
        expenses: expensesRes.data || [],
        revenues: revenuesRes.data || []
      };
    }
  });

  // Fetch previous period data for comparison
  const { data: previousData } = useQuery({
    queryKey: ['profit-loss-previous', period],
    queryFn: async () => {
      const [salesRes, purchasesRes, expensesRes, revenuesRes] = await Promise.all([
        supabase.from('sales').select('total_amount').gte('sale_date', previousPeriod.start.toISOString()).lte('sale_date', previousPeriod.end.toISOString()),
        supabase.from('purchase_invoices').select('total_amount').gte('invoice_date', format(previousPeriod.start, 'yyyy-MM-dd')).lte('invoice_date', format(previousPeriod.end, 'yyyy-MM-dd')),
        supabase.from('expenses').select('amount, category').gte('expense_date', format(previousPeriod.start, 'yyyy-MM-dd')).lte('expense_date', format(previousPeriod.end, 'yyyy-MM-dd')),
        supabase.from('revenues').select('amount, category').gte('revenue_date', format(previousPeriod.start, 'yyyy-MM-dd')).lte('revenue_date', format(previousPeriod.end, 'yyyy-MM-dd'))
      ]);

      return {
        sales: salesRes.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
        purchases: purchasesRes.data?.reduce((sum, p) => sum + Number(p.total_amount), 0) || 0,
        expenses: expensesRes.data || [],
        revenues: revenuesRes.data || []
      };
    }
  });

  // Calculate totals
  const totalSales = currentData?.sales || 0;
  const totalRevenues = currentData?.revenues?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const totalExpenses = currentData?.expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const totalPurchases = currentData?.purchases || 0;
  const costOfGoodsSold = totalPurchases;
  const grossProfit = totalSales - costOfGoodsSold;
  const operatingExpenses = totalExpenses;
  const operatingIncome = grossProfit - operatingExpenses;
  const otherIncome = totalRevenues;
  const netIncome = operatingIncome + otherIncome;
  const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
  const netProfitMargin = totalSales > 0 ? (netIncome / totalSales) * 100 : 0;

  // Previous period totals
  const prevTotalSales = previousData?.sales || 0;
  const prevNetIncome = (prevTotalSales - (previousData?.purchases || 0)) - 
    (previousData?.expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0) +
    (previousData?.revenues?.reduce((sum, r) => sum + Number(r.amount), 0) || 0);

  // Calculate changes
  const salesChange = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;
  const profitChange = prevNetIncome !== 0 ? ((netIncome - prevNetIncome) / Math.abs(prevNetIncome)) * 100 : 0;

  // Expenses by category
  const expensesByCategory = currentData?.expenses?.reduce((acc: any[], e) => {
    const existing = acc.find(x => x.name === e.category);
    if (existing) {
      existing.value += Number(e.amount);
    } else {
      acc.push({ name: e.category, value: Number(e.amount) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value) || [];

  const t = {
    title: language === 'ar' ? 'تقرير الأرباح والخسائر' : 'Profit & Loss Report',
    description: language === 'ar' ? 'تحليل مالي شامل' : 'Comprehensive financial analysis',
    period: language === 'ar' ? 'الفترة' : 'Period',
    month: language === 'ar' ? 'شهر' : 'Month',
    quarter: language === 'ar' ? 'ربع سنة' : 'Quarter',
    year: language === 'ar' ? 'سنة' : 'Year',
    revenue: language === 'ar' ? 'الإيرادات' : 'Revenue',
    sales: language === 'ar' ? 'المبيعات' : 'Sales',
    otherIncome: language === 'ar' ? 'إيرادات أخرى' : 'Other Income',
    costOfGoods: language === 'ar' ? 'تكلفة البضاعة المباعة' : 'Cost of Goods Sold',
    grossProfit: language === 'ar' ? 'مجمل الربح' : 'Gross Profit',
    operatingExpenses: language === 'ar' ? 'المصروفات التشغيلية' : 'Operating Expenses',
    operatingIncome: language === 'ar' ? 'الدخل التشغيلي' : 'Operating Income',
    netIncome: language === 'ar' ? 'صافي الدخل' : 'Net Income',
    grossMargin: language === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Margin',
    netMargin: language === 'ar' ? 'هامش صافي الربح' : 'Net Margin',
    vsLastPeriod: language === 'ar' ? 'مقارنة بالفترة السابقة' : 'vs last period',
    expenseBreakdown: language === 'ar' ? 'تفصيل المصروفات' : 'Expense Breakdown',
    print: language === 'ar' ? 'طباعة' : 'Print',
    export: language === 'ar' ? 'تصدير' : 'Export',
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(199, 89%, 48%)', 'hsl(280, 60%, 50%)'];

  const LineItem = ({ 
    label, 
    value, 
    indent = 0, 
    isBold = false, 
    isTotal = false,
    change
  }: { 
    label: string; 
    value: number; 
    indent?: number; 
    isBold?: boolean;
    isTotal?: boolean;
    change?: number;
  }) => (
    <div className={cn(
      "flex items-center justify-between py-2",
      isTotal && "border-t-2 border-border pt-3 mt-2"
    )}>
      <span 
        className={cn(
          "text-sm",
          isBold && "font-semibold",
          !isBold && !isTotal && "text-muted-foreground"
        )}
        style={{ marginInlineStart: `${indent * 16}px` }}
      >
        {label}
      </span>
      <div className="flex items-center gap-3">
        {change !== undefined && (
          <Badge 
            variant={change > 0 ? 'default' : change < 0 ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {change > 0 ? <ArrowUpRight size={12} /> : change < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {Math.abs(change).toFixed(1)}%
          </Badge>
        )}
        <span className={cn(
          "font-mono",
          isBold && "font-bold text-lg",
          value < 0 && "text-destructive"
        )}>
          {value.toLocaleString()} {language === 'ar' ? 'ر.ي' : 'YER'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar size={16} className="me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t.month}</SelectItem>
              <SelectItem value="quarter">{t.quarter}</SelectItem>
              <SelectItem value="year">{t.year}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Printer size={16} className="me-2" />
            {t.print}
          </Button>
          <Button variant="outline" size="sm">
            <Download size={16} className="me-2" />
            {t.export}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.sales}</p>
                <p className="text-2xl font-bold">{totalSales.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-primary/20 rounded-full">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {salesChange >= 0 ? (
                <Badge variant="secondary" className="bg-success/20 text-success">
                  <ArrowUpRight size={12} className="me-1" />
                  {salesChange.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-destructive/20 text-destructive">
                  <ArrowDownRight size={12} className="me-1" />
                  {Math.abs(salesChange).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{t.vsLastPeriod}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.grossProfit}</p>
                <p className="text-2xl font-bold">{grossProfit.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-accent/20 rounded-full">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={grossProfitMargin} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{t.grossMargin}: {grossProfitMargin.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.operatingExpenses}</p>
                <p className="text-2xl font-bold">{operatingExpenses.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-warning/20 rounded-full">
                <CreditCard className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-gradient-to-br border",
          netIncome >= 0 
            ? "from-success/10 to-success/5 border-success/20" 
            : "from-destructive/10 to-destructive/5 border-destructive/20"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.netIncome}</p>
                <p className={cn("text-2xl font-bold", netIncome < 0 && "text-destructive")}>
                  {netIncome.toLocaleString()}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                netIncome >= 0 ? "bg-success/20" : "bg-destructive/20"
              )}>
                <Wallet className={cn("h-6 w-6", netIncome >= 0 ? "text-success" : "text-destructive")} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {profitChange >= 0 ? (
                <Badge variant="secondary" className="bg-success/20 text-success">
                  <ArrowUpRight size={12} className="me-1" />
                  {profitChange.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-destructive/20 text-destructive">
                  <ArrowDownRight size={12} className="me-1" />
                  {Math.abs(profitChange).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{t.vsLastPeriod}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t.title}</CardTitle>
            <CardDescription>
              {format(currentPeriod.start, 'MMM d, yyyy', { locale: language === 'ar' ? ar : undefined })} - {format(currentPeriod.end, 'MMM d, yyyy', { locale: language === 'ar' ? ar : undefined })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Revenue Section */}
            <div className="font-semibold text-lg mb-2">{t.revenue}</div>
            <LineItem label={t.sales} value={totalSales} indent={1} change={salesChange} />
            <LineItem label={t.otherIncome} value={otherIncome} indent={1} />
            <LineItem label={`${t.revenue} ${language === 'ar' ? 'الإجمالي' : 'Total'}`} value={totalSales + otherIncome} isBold isTotal />

            <Separator className="my-4" />

            {/* Cost of Goods Sold */}
            <LineItem label={t.costOfGoods} value={-costOfGoodsSold} />
            <LineItem label={t.grossProfit} value={grossProfit} isBold isTotal />

            <Separator className="my-4" />

            {/* Operating Expenses */}
            <div className="font-semibold text-lg mb-2">{t.operatingExpenses}</div>
            {expensesByCategory.slice(0, 5).map((expense, index) => (
              <LineItem key={index} label={expense.name} value={-expense.value} indent={1} />
            ))}
            <LineItem label={`${t.operatingExpenses} ${language === 'ar' ? 'الإجمالي' : 'Total'}`} value={-operatingExpenses} isBold isTotal />

            <Separator className="my-4" />

            {/* Net Income */}
            <LineItem label={t.netIncome} value={netIncome} isBold isTotal change={profitChange} />
          </CardContent>
        </Card>

        {/* Expense Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.expenseBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {expensesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {expensesByCategory.map((expense, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{expense.name}</span>
                  </div>
                  <span className="font-mono">{expense.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitLossReport;
