import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface FinancialReportsProps {
  language: string;
}

const FinancialReports: React.FC<FinancialReportsProps> = ({ language }) => {
  const [reportPeriod, setReportPeriod] = useState('current_month');
  const [reportType, setReportType] = useState('profit_loss');

  const getDateRange = () => {
    const now = new Date();
    switch (reportPeriod) {
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'current_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  // Fetch sales data
  const { data: sales = [] } = useQuery({
    queryKey: ['report-sales', reportPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('sale_date', start.toISOString())
        .lte('sale_date', end.toISOString())
        .eq('status', 'completed');
      if (error) throw error;
      return data;
    }
  });

  // Fetch expenses data
  const { data: expenses = [] } = useQuery({
    queryKey: ['report-expenses', reportPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', format(start, 'yyyy-MM-dd'))
        .lte('expense_date', format(end, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    }
  });

  // Fetch purchase invoices
  const { data: purchases = [] } = useQuery({
    queryKey: ['report-purchases', reportPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .gte('invoice_date', start.toISOString())
        .lte('invoice_date', end.toISOString());
      if (error) throw error;
      return data;
    }
  });

  // Calculate financials
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalTax = sales.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0);
  const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount_amount || 0), 0);
  const netSales = totalRevenue - totalDiscount;
  
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0);
  
  const grossProfit = netSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = netSales > 0 ? ((netProfit / netSales) * 100).toFixed(1) : 0;

  // Expense breakdown by category
  const expensesByCategory = expenses.reduce((acc: Record<string, number>, exp) => {
    const cat = exp.category || 'other';
    acc[cat] = (acc[cat] || 0) + Number(exp.amount);
    return acc;
  }, {});

  const categoryLabels: Record<string, { en: string; ar: string }> = {
    rent: { en: 'Rent', ar: 'إيجار' },
    utilities: { en: 'Utilities', ar: 'مرافق' },
    salaries: { en: 'Salaries', ar: 'رواتب' },
    supplies: { en: 'Supplies', ar: 'مستلزمات' },
    marketing: { en: 'Marketing', ar: 'تسويق' },
    maintenance: { en: 'Maintenance', ar: 'صيانة' },
    transport: { en: 'Transport', ar: 'نقل' },
    insurance: { en: 'Insurance', ar: 'تأمين' },
    taxes: { en: 'Taxes', ar: 'ضرائب' },
    other: { en: 'Other', ar: 'أخرى' }
  };

  // Monthly trend data
  const getMonthlyData = () => {
    const months: Record<string, { sales: number; expenses: number; profit: number }> = {};
    
    sales.forEach(sale => {
      const month = format(new Date(sale.sale_date), 'yyyy-MM');
      if (!months[month]) months[month] = { sales: 0, expenses: 0, profit: 0 };
      months[month].sales += Number(sale.total_amount);
    });

    expenses.forEach(exp => {
      const month = format(new Date(exp.expense_date), 'yyyy-MM');
      if (!months[month]) months[month] = { sales: 0, expenses: 0, profit: 0 };
      months[month].expenses += Number(exp.amount);
    });

    return Object.entries(months)
      .map(([month, data]) => ({
        month: format(new Date(month + '-01'), 'MMM', { locale: language === 'ar' ? ar : undefined }),
        sales: data.sales,
        expenses: data.expenses,
        profit: data.sales - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${language === 'ar' ? 'التقرير المالي' : 'Financial Report'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; direction: ${language === 'ar' ? 'rtl' : 'ltr'}; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; background: #f5f5f5; padding: 10px; }
          .row { display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; background: #f0f0f0; font-size: 16px; }
          .profit { color: green; }
          .loss { color: red; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${language === 'ar' ? 'تقرير الأرباح والخسائر' : 'Profit & Loss Statement'}</h1>
          <p>${language === 'ar' ? 'الفترة:' : 'Period:'} ${format(start, 'yyyy/MM/dd')} - ${format(end, 'yyyy/MM/dd')}</p>
        </div>
        
        <div class="section">
          <div class="section-title">${language === 'ar' ? 'الإيرادات' : 'Revenue'}</div>
          <div class="row">
            <span>${language === 'ar' ? 'إجمالي المبيعات' : 'Gross Sales'}</span>
            <span>${totalRevenue.toLocaleString()} ${language === 'ar' ? 'ر.ي' : 'YER'}</span>
          </div>
          <div class="row">
            <span>${language === 'ar' ? 'الخصومات' : 'Discounts'}</span>
            <span>(${totalDiscount.toLocaleString()}) ${language === 'ar' ? 'ر.ي' : 'YER'}</span>
          </div>
          <div class="row total">
            <span>${language === 'ar' ? 'صافي المبيعات' : 'Net Sales'}</span>
            <span>${netSales.toLocaleString()} ${language === 'ar' ? 'ر.ي' : 'YER'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${language === 'ar' ? 'تكلفة المبيعات' : 'Cost of Goods Sold'}</div>
          <div class="row">
            <span>${language === 'ar' ? 'المشتريات' : 'Purchases'}</span>
            <span>${totalPurchases.toLocaleString()} ${language === 'ar' ? 'ر.ي' : 'YER'}</span>
          </div>
          <div class="row total">
            <span>${language === 'ar' ? 'إجمالي الربح' : 'Gross Profit'}</span>
            <span class="${grossProfit >= 0 ? 'profit' : 'loss'}">${grossProfit.toLocaleString()} ${language === 'ar' ? 'ر.ي' : 'YER'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${language === 'ar' ? 'المصروفات التشغيلية' : 'Operating Expenses'}</div>
          ${Object.entries(expensesByCategory).map(([cat, amount]) => `
            <div class="row">
              <span>${language === 'ar' ? categoryLabels[cat]?.ar : categoryLabels[cat]?.en || cat}</span>
              <span>${Number(amount).toLocaleString()} ${language === 'ar' ? 'ر.ي' : 'YER'}</span>
            </div>
          `).join('')}
          <div class="row total">
            <span>${language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
            <span>${totalExpenses.toLocaleString()} ${language === 'ar' ? 'ر.ي' : 'YER'}</span>
          </div>
        </div>

        <div class="section">
          <div class="row total" style="font-size: 20px; background: ${netProfit >= 0 ? '#d4edda' : '#f8d7da'};">
            <span>${language === 'ar' ? 'صافي الربح' : 'Net Profit'}</span>
            <span class="${netProfit >= 0 ? 'profit' : 'loss'}">${netProfit.toLocaleString()} ${language === 'ar' ? 'ر.ي' : 'YER'}</span>
          </div>
          <div class="row">
            <span>${language === 'ar' ? 'هامش الربح' : 'Profit Margin'}</span>
            <span>${profitMargin}%</span>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">
                {language === 'ar' ? 'الشهر الحالي' : 'Current Month'}
              </SelectItem>
              <SelectItem value="last_month">
                {language === 'ar' ? 'الشهر السابق' : 'Last Month'}
              </SelectItem>
              <SelectItem value="last_3_months">
                {language === 'ar' ? 'آخر 3 أشهر' : 'Last 3 Months'}
              </SelectItem>
              <SelectItem value="current_year">
                {language === 'ar' ? 'السنة الحالية' : 'Current Year'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={printReport}>
          <Printer size={18} className="me-2" />
          {language === 'ar' ? 'طباعة التقرير' : 'Print Report'}
        </Button>
      </div>

      {/* Profit & Loss Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'ar' ? 'تقرير الأرباح والخسائر' : 'Profit & Loss Statement'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Revenue Section */}
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600 flex items-center gap-2">
                  <TrendingUp size={16} />
                  {language === 'ar' ? 'الإيرادات' : 'Revenue'}
                </h4>
                <div className="ps-4 space-y-1">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'إجمالي المبيعات' : 'Gross Sales'}
                    </span>
                    <span>{totalRevenue.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'الخصومات' : 'Discounts'}
                    </span>
                    <span className="text-red-600">({totalDiscount.toLocaleString()}) ر.ي</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1 font-medium">
                    <span>{language === 'ar' ? 'صافي المبيعات' : 'Net Sales'}</span>
                    <span className="text-green-600">{netSales.toLocaleString()} ر.ي</span>
                  </div>
                </div>
              </div>

              {/* Cost of Goods */}
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                  <DollarSign size={16} />
                  {language === 'ar' ? 'تكلفة المبيعات' : 'Cost of Goods Sold'}
                </h4>
                <div className="ps-4 space-y-1">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">
                      {language === 'ar' ? 'المشتريات' : 'Purchases'}
                    </span>
                    <span>{totalPurchases.toLocaleString()} ر.ي</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1 font-medium">
                    <span>{language === 'ar' ? 'إجمالي الربح' : 'Gross Profit'}</span>
                    <span className={grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {grossProfit.toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600 flex items-center gap-2">
                  <TrendingDown size={16} />
                  {language === 'ar' ? 'المصروفات التشغيلية' : 'Operating Expenses'}
                </h4>
                <div className="ps-4 space-y-1">
                  {Object.entries(expensesByCategory).map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between py-1">
                      <span className="text-muted-foreground">
                        {language === 'ar' ? categoryLabels[cat]?.ar : categoryLabels[cat]?.en || cat}
                      </span>
                      <span>{Number(amount).toLocaleString()} ر.ي</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between py-1 font-medium">
                    <span>{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
                    <span className="text-red-600">{totalExpenses.toLocaleString()} ر.ي</span>
                  </div>
                </div>
              </div>

              {/* Net Profit */}
              <div className={`p-4 rounded-lg ${netProfit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">
                    {language === 'ar' ? 'صافي الربح' : 'Net Profit'}
                  </span>
                  <span className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netProfit.toLocaleString()} ر.ي
                  </span>
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'هامش الربح' : 'Profit Margin'}
                  </span>
                  <span className="font-medium">{profitMargin}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {language === 'ar' ? 'إحصائيات سريعة' : 'Quick Stats'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'عدد المبيعات' : 'Total Sales'}
              </p>
              <p className="text-2xl font-bold text-green-600">{sales.length}</p>
            </div>

            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'متوسط قيمة الفاتورة' : 'Avg. Order Value'}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {sales.length > 0 ? Math.round(totalRevenue / sales.length).toLocaleString() : 0}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الضرائب المحصلة' : 'Tax Collected'}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {totalTax.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'فواتير الشراء' : 'Purchase Invoices'}
              </p>
              <p className="text-2xl font-bold text-orange-600">{purchases.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            {language === 'ar' ? 'اتجاه المبيعات والمصروفات' : 'Sales vs Expenses Trend'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString()} ر.ي`]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="sales" 
                  name={language === 'ar' ? 'المبيعات' : 'Sales'} 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="expenses" 
                  name={language === 'ar' ? 'المصروفات' : 'Expenses'} 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReports;
