import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  FileText, Printer, TrendingUp, TrendingDown, DollarSign, 
  BarChart3, Calendar as CalendarIcon, Building2, Package, Users, ShoppingCart
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';

interface AdvancedReportsProps {
  language: string;
}

const AdvancedReports: React.FC<AdvancedReportsProps> = ({ language }) => {
  const [reportType, setReportType] = useState('profit_loss');
  const [periodType, setPeriodType] = useState('current_month');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState('all');

  const getDateRange = () => {
    const now = new Date();
    switch (periodType) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'this_week': return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'current_month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month': const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) };
      case 'current_quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'last_quarter': const lq = subQuarters(now, 1); return { start: startOfQuarter(lq), end: endOfQuarter(lq) };
      case 'first_half': return { start: startOfYear(now), end: endOfMonth(new Date(now.getFullYear(), 5, 30)) };
      case 'second_half': return { start: new Date(now.getFullYear(), 6, 1), end: endOfYear(now) };
      case 'current_year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'last_year': const ly = subYears(now, 1); return { start: startOfYear(ly), end: endOfYear(ly) };
      case 'custom': return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['report-sales', periodType, customStartDate, customEndDate, selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('*, sale_items(*, products(name, name_ar, category_id, categories(name, name_ar)))')
        .gte('sale_date', start.toISOString())
        .lte('sale_date', end.toISOString())
        .eq('status', 'completed');
      
      if (selectedBranch !== 'all') {
        query = query.eq('branch', selectedBranch);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['report-expenses', periodType, customStartDate, customEndDate],
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

  const { data: revenues = [] } = useQuery({
    queryKey: ['report-revenues', periodType, customStartDate, customEndDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .gte('revenue_date', format(start, 'yyyy-MM-dd'))
        .lte('revenue_date', format(end, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    }
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['report-purchases', periodType, customStartDate, customEndDate],
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

  // Calculations
  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalRevenues = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalIncome = totalSales + totalRevenues;
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit + totalRevenues - totalExpenses;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;

  // Category breakdown
  const salesByCategory: Record<string, number> = {};
  sales.forEach(sale => {
    sale.sale_items?.forEach((item: any) => {
      const catName = item.products?.categories?.name || 'Uncategorized';
      salesByCategory[catName] = (salesByCategory[catName] || 0) + Number(item.total_price);
    });
  });

  const expensesByCategory: Record<string, number> = {};
  expenses.forEach(exp => {
    expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + Number(exp.amount);
  });

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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

  const periodOptions = [
    { value: 'today', label: language === 'ar' ? 'اليوم' : 'Today' },
    { value: 'this_week', label: language === 'ar' ? 'هذا الأسبوع' : 'This Week' },
    { value: 'current_month', label: language === 'ar' ? 'الشهر الحالي' : 'Current Month' },
    { value: 'last_month', label: language === 'ar' ? 'الشهر السابق' : 'Last Month' },
    { value: 'current_quarter', label: language === 'ar' ? 'الربع الحالي' : 'Current Quarter' },
    { value: 'last_quarter', label: language === 'ar' ? 'الربع السابق' : 'Last Quarter' },
    { value: 'first_half', label: language === 'ar' ? 'النصف الأول' : 'First Half' },
    { value: 'second_half', label: language === 'ar' ? 'النصف الثاني' : 'Second Half' },
    { value: 'current_year', label: language === 'ar' ? 'السنة الحالية' : 'Current Year' },
    { value: 'last_year', label: language === 'ar' ? 'السنة السابقة' : 'Last Year' },
    { value: 'custom', label: language === 'ar' ? 'مخصص' : 'Custom' }
  ];

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الفترة' : 'Period'}</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodType === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'من' : 'From'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40">
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {format(customStartDate, 'yyyy/MM/dd')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={customStartDate} onSelect={(d) => d && setCustomStartDate(d)} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'إلى' : 'To'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40">
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {format(customEndDate, 'yyyy/MM/dd')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={customEndDate} onSelect={(d) => d && setCustomEndDate(d)} />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{language === 'ar' ? b.name_ar || b.name : b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={printReport}>
              <Printer size={16} className="me-2" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </div>

          <div className="mt-3 text-sm text-muted-foreground">
            {language === 'ar' ? 'الفترة:' : 'Period:'} {format(start, 'yyyy/MM/dd')} - {format(end, 'yyyy/MM/dd')}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي الدخل' : 'Total Income'}</p>
                <p className="text-xl font-bold text-green-600">{totalIncome.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</p>
                <p className="text-xl font-bold text-red-600">{(totalExpenses + totalPurchases).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'صافي الربح' : 'Net Profit'}</p>
                <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{netProfit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'هامش الربح' : 'Profit Margin'}</p>
                <p className="text-xl font-bold text-purple-600">{profitMargin}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profit_loss">{language === 'ar' ? 'الأرباح والخسائر' : 'P&L'}</TabsTrigger>
          <TabsTrigger value="sales">{language === 'ar' ? 'المبيعات' : 'Sales'}</TabsTrigger>
          <TabsTrigger value="expenses">{language === 'ar' ? 'المصروفات' : 'Expenses'}</TabsTrigger>
          <TabsTrigger value="purchases">{language === 'ar' ? 'المشتريات' : 'Purchases'}</TabsTrigger>
          <TabsTrigger value="branches">{language === 'ar' ? 'الفروع' : 'Branches'}</TabsTrigger>
        </TabsList>

        <TabsContent value="profit_loss" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{language === 'ar' ? 'تقرير الأرباح والخسائر' : 'Profit & Loss Statement'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</h4>
                  <div className="ps-4 space-y-1">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{language === 'ar' ? 'المبيعات' : 'Sales'}</span>
                      <span>{totalSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{language === 'ar' ? 'إيرادات أخرى' : 'Other Revenue'}</span>
                      <span>{totalRevenues.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between py-1 font-medium">
                      <span>{language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</span>
                      <span className="text-green-600">{totalIncome.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-600">{language === 'ar' ? 'تكلفة البضاعة' : 'Cost of Goods'}</h4>
                  <div className="ps-4 space-y-1">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{language === 'ar' ? 'المشتريات' : 'Purchases'}</span>
                      <span>{totalPurchases.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between py-1 font-medium">
                      <span>{language === 'ar' ? 'إجمالي الربح' : 'Gross Profit'}</span>
                      <span className={grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{grossProfit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-red-600">{language === 'ar' ? 'المصروفات' : 'Expenses'}</h4>
                  <div className="ps-4 space-y-1">
                    {Object.entries(expensesByCategory).map(([cat, amount]) => (
                      <div key={cat} className="flex justify-between py-1">
                        <span className="text-muted-foreground">{language === 'ar' ? categoryLabels[cat]?.ar : categoryLabels[cat]?.en || cat}</span>
                        <span>{Number(amount).toLocaleString()}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between py-1 font-medium">
                      <span>{language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</span>
                      <span className="text-red-600">{totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${netProfit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">{language === 'ar' ? 'صافي الربح' : 'Net Profit'}</span>
                    <span className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netProfit.toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{language === 'ar' ? 'توزيع المصروفات' : 'Expense Distribution'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(expensesByCategory).map(([name, value]) => ({ 
                        name: language === 'ar' ? categoryLabels[name]?.ar : categoryLabels[name]?.en || name, 
                        value 
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.keys(expensesByCategory).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{language === 'ar' ? 'المبيعات حسب الفئة' : 'Sales by Category'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(salesByCategory).map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Bar dataKey="value" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{language === 'ar' ? 'إحصائيات المبيعات' : 'Sales Statistics'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{sales.length}</p>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'عدد الفواتير' : 'Invoices'}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{sales.length > 0 ? Math.round(totalSales / sales.length).toLocaleString() : 0}</p>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'متوسط الفاتورة' : 'Avg. Invoice'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{language === 'ar' ? 'تفاصيل المصروفات' : 'Expense Details'}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((exp: any) => (
                      <TableRow key={exp.id}>
                        <TableCell>{format(new Date(exp.expense_date), 'yyyy/MM/dd')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {language === 'ar' ? categoryLabels[exp.category]?.ar : categoryLabels[exp.category]?.en || exp.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{exp.description || '-'}</TableCell>
                        <TableCell className="font-bold text-red-600">{Number(exp.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{language === 'ar' ? 'فواتير المشتريات' : 'Purchase Invoices'}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'حالة الدفع' : 'Payment Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                        <TableCell>{format(new Date(inv.invoice_date), 'yyyy/MM/dd')}</TableCell>
                        <TableCell className="font-bold">{Number(inv.total_amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={inv.payment_status === 'paid' ? 'default' : inv.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                            {inv.payment_status === 'paid' ? (language === 'ar' ? 'مدفوع' : 'Paid') : 
                             inv.payment_status === 'partial' ? (language === 'ar' ? 'جزئي' : 'Partial') : 
                             (language === 'ar' ? 'غير مدفوع' : 'Unpaid')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch: any) => {
              const branchSales = sales.filter(s => s.branch === branch.id);
              const branchTotal = branchSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
              return (
                <Card key={branch.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 size={18} />
                      {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'عدد الفواتير' : 'Invoices'}</span>
                        <span className="font-bold">{branchSales.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</span>
                        <span className="font-bold text-green-600">{branchTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReports;
