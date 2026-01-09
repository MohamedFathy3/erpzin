import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileText,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Users,
  Calendar,
  Wallet,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ShoppingCart,
  CreditCard,
  Landmark,
  RefreshCw
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

const Reports = () => {
  const { language, direction } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBranch, setSelectedBranch] = useState('all');

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'week': return { start: subWeeks(now, 1), end: now };
      case 'month': return { start: subMonths(now, 1), end: now };
      case 'quarter': return { start: subQuarters(now, 1), end: now };
      case 'year': return { start: subYears(now, 1), end: now };
      case 'custom': return { start: new Date(startDate), end: new Date(endDate) };
      default: return { start: subMonths(now, 1), end: now };
    }
  };

  const range = getDateRange();

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['reports-branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('*').eq('is_active', true);
      return data || [];
    }
  });

  // Fetch sales data
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['reports-sales', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales')
        .select('*, customers(name, name_ar)')
        .gte('sale_date', range.start.toISOString())
        .lte('sale_date', range.end.toISOString())
        .order('sale_date', { ascending: true });
      return data || [];
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['reports-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, categories(name, name_ar)');
      return data || [];
    }
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['reports-expenses', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', format(range.start, 'yyyy-MM-dd'))
        .lte('expense_date', format(range.end, 'yyyy-MM-dd'));
      return data || [];
    }
  });

  // Fetch revenues
  const { data: revenues = [] } = useQuery({
    queryKey: ['reports-revenues', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('revenues')
        .select('*')
        .gte('revenue_date', format(range.start, 'yyyy-MM-dd'))
        .lte('revenue_date', format(range.end, 'yyyy-MM-dd'));
      return data || [];
    }
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['reports-customers'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*');
      return data || [];
    }
  });

  // Fetch treasuries
  const { data: treasuries = [] } = useQuery({
    queryKey: ['reports-treasuries'],
    queryFn: async () => {
      const { data } = await supabase.from('treasuries').select('*, branches(name, name_ar)');
      return data || [];
    }
  });

  // Fetch banks
  const { data: banks = [] } = useQuery({
    queryKey: ['reports-banks'],
    queryFn: async () => {
      const { data } = await supabase.from('banks').select('*, branches(name, name_ar)');
      return data || [];
    }
  });

  // Fetch purchase invoices
  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['reports-purchases', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_invoices')
        .select('*, suppliers(name, name_ar)')
        .gte('invoice_date', format(range.start, 'yyyy-MM-dd'))
        .lte('invoice_date', format(range.end, 'yyyy-MM-dd'));
      return data || [];
    }
  });

  const translations = {
    en: {
      title: 'Reports & Analytics',
      overview: 'Overview',
      sales: 'Sales',
      inventory: 'Inventory',
      finance: 'Finance',
      customers: 'Customers',
      print: 'Print',
      exportExcel: 'Excel',
      today: 'Today',
      week: 'Week',
      month: 'Month',
      quarter: 'Quarter',
      year: 'Year',
      custom: 'Custom',
      from: 'From',
      to: 'To',
      totalSales: 'Total Sales',
      totalOrders: 'Orders',
      avgOrder: 'Avg Order',
      revenue: 'Revenue',
      expenses: 'Expenses',
      netProfit: 'Net Profit',
      totalProducts: 'Products',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      stockValue: 'Stock Value',
      totalCustomers: 'Customers',
      newCustomers: 'New Customers',
      totalPurchases: 'Total Purchases',
      treasuryBalance: 'Treasury',
      bankBalance: 'Banks',
      totalLiquidity: 'Total Liquidity',
      topProducts: 'Top Products',
      salesTrend: 'Sales Trend',
      stockByCategory: 'Stock by Category',
      expensesByCategory: 'Expenses by Category',
      recentTransactions: 'Recent Transactions',
      allBranches: 'All Branches',
      profitMargin: 'Profit Margin',
      growthRate: 'Growth Rate',
      comparedToPrevious: 'vs previous period'
    },
    ar: {
      title: 'التقارير والتحليلات',
      overview: 'نظرة عامة',
      sales: 'المبيعات',
      inventory: 'المخزون',
      finance: 'المالية',
      customers: 'العملاء',
      print: 'طباعة',
      exportExcel: 'Excel',
      today: 'اليوم',
      week: 'أسبوع',
      month: 'شهر',
      quarter: 'ربع سنة',
      year: 'سنة',
      custom: 'مخصص',
      from: 'من',
      to: 'إلى',
      totalSales: 'إجمالي المبيعات',
      totalOrders: 'الطلبات',
      avgOrder: 'متوسط الطلب',
      revenue: 'الإيرادات',
      expenses: 'المصروفات',
      netProfit: 'صافي الربح',
      totalProducts: 'المنتجات',
      lowStock: 'مخزون منخفض',
      outOfStock: 'نفذ المخزون',
      stockValue: 'قيمة المخزون',
      totalCustomers: 'العملاء',
      newCustomers: 'عملاء جدد',
      totalPurchases: 'إجمالي المشتريات',
      treasuryBalance: 'الخزائن',
      bankBalance: 'البنوك',
      totalLiquidity: 'إجمالي السيولة',
      topProducts: 'أفضل المنتجات',
      salesTrend: 'اتجاه المبيعات',
      stockByCategory: 'المخزون حسب الفئة',
      expensesByCategory: 'المصروفات حسب الفئة',
      recentTransactions: 'آخر المعاملات',
      allBranches: 'كل الفروع',
      profitMargin: 'هامش الربح',
      growthRate: 'معدل النمو',
      comparedToPrevious: 'مقارنة بالفترة السابقة'
    }
  };

  const t = translations[language];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(199, 89%, 48%)', 'hsl(280, 60%, 50%)', 'hsl(330, 70%, 50%)'];

  // Calculate stats
  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRevenues = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalPurchases = purchaseInvoices.reduce((sum, p) => sum + Number(p.total_amount), 0);
  const netProfit = totalSales + totalRevenues - totalExpenses;
  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;

  // Treasury & Bank stats
  const totalTreasuryBalance = treasuries.reduce((sum, t) => sum + Number(t.balance || 0), 0);
  const totalBankBalance = banks.reduce((sum, b) => sum + Number(b.balance || 0), 0);
  const totalLiquidity = totalTreasuryBalance + totalBankBalance;

  // Inventory stats
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock <= (p.min_stock || 5) && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const stockValue = products.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0);

  // New customers this period
  const newCustomers = customers.filter(c => new Date(c.created_at) >= range.start).length;

  // Prepare chart data
  const salesTrendData = sales.reduce((acc: any[], sale) => {
    const date = format(new Date(sale.sale_date), 'MM/dd');
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.amount += Number(sale.total_amount);
      existing.orders += 1;
    } else {
      acc.push({ date, amount: Number(sale.total_amount), orders: 1 });
    }
    return acc;
  }, []);

  const expensesByCategory = expenses.reduce((acc: any[], expense) => {
    const existing = acc.find(e => e.category === expense.category);
    if (existing) {
      existing.amount += Number(expense.amount);
    } else {
      acc.push({ category: expense.category, amount: Number(expense.amount) });
    }
    return acc;
  }, []);

  const stockByCategory = products.reduce((acc: any[], product) => {
    const categoryName = language === 'ar' 
      ? product.categories?.name_ar || product.categories?.name || 'غير مصنف'
      : product.categories?.name || 'Uncategorized';
    const existing = acc.find(c => c.category === categoryName);
    if (existing) {
      existing.stock += product.stock;
      existing.value += product.stock * (product.cost || 0);
    } else {
      acc.push({ category: categoryName, stock: product.stock, value: product.stock * (product.cost || 0) });
    }
    return acc;
  }, []);

  // Export functions
  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === 'sales' || activeTab === 'overview') {
      headers = ['Date', 'Invoice', 'Customer', 'Amount', 'Status'];
      rows = sales.map(s => [
        format(new Date(s.sale_date), 'yyyy-MM-dd'),
        s.invoice_number,
        s.customers?.name || '-',
        s.total_amount,
        s.status || 'completed'
      ]);
    } else if (activeTab === 'inventory') {
      headers = ['SKU', 'Product', 'Category', 'Stock', 'Cost', 'Value'];
      rows = products.map(p => [
        p.sku,
        language === 'ar' ? p.name_ar || p.name : p.name,
        p.categories?.name || '-',
        p.stock,
        p.cost || 0,
        p.stock * (p.cost || 0)
      ]);
    } else if (activeTab === 'finance') {
      headers = ['Type', 'Date', 'Category', 'Amount'];
      const allTransactions = [
        ...expenses.map(e => ({ type: 'Expense', date: e.expense_date, category: e.category, amount: -e.amount })),
        ...revenues.map(r => ({ type: 'Revenue', date: r.revenue_date, category: r.category, amount: r.amount }))
      ];
      rows = allTransactions.map(tx => [tx.type, tx.date, tx.category, tx.amount]);
    }
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const dateRangeOptions = [
    { value: 'today', label: t.today },
    { value: 'week', label: t.week },
    { value: 'month', label: t.month },
    { value: 'quarter', label: t.quarter },
    { value: 'year', label: t.year },
    { value: 'custom', label: t.custom }
  ];

  // KPI Card Component
  const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    color = 'primary',
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    trend?: 'up' | 'down'; 
    trendValue?: string;
    color?: 'primary' | 'accent' | 'warning' | 'destructive';
    subtitle?: string;
  }) => {
    const colorClasses = {
      primary: 'bg-primary/10 text-primary',
      accent: 'bg-accent/10 text-accent',
      warning: 'bg-warning/10 text-warning',
      destructive: 'bg-destructive/10 text-destructive'
    };

    return (
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/80 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trendValue && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-accent' : 'text-destructive'}`}>
                  {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{trendValue}</span>
                </div>
              )}
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
              <Icon size={22} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout activeItem="reports">
      <div className="space-y-6 print:p-4" dir={direction} ref={printRef}>
        {/* Header */}
        <div className="flex flex-col gap-4 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {format(range.start, 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined })} - {format(range.end, 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined })}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer size={16} className="me-1.5" />
                {t.print}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} className="me-1.5" />
                {t.exportExcel}
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[120px] h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {dateRange === 'custom' && (
              <>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[140px] h-9"
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[140px] h-9"
                />
              </>
            )}

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-muted-foreground" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[140px] h-9 bg-background">
                  <SelectValue placeholder={t.allBranches} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allBranches}</SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
          <TabsList className="bg-muted/50 p-1 h-auto">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background">
              <Activity size={16} />
              {t.overview}
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2 data-[state=active]:bg-background">
              <ShoppingCart size={16} />
              {t.sales}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-background">
              <Package size={16} />
              {t.inventory}
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-2 data-[state=active]:bg-background">
              <Landmark size={16} />
              {t.finance}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Main KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                title={t.totalSales}
                value={`${totalSales.toLocaleString()} YER`}
                icon={TrendingUp}
                color="accent"
                trend="up"
                trendValue={`${sales.length} ${t.totalOrders}`}
              />
              <KPICard
                title={t.netProfit}
                value={`${netProfit.toLocaleString()} YER`}
                icon={DollarSign}
                color={netProfit >= 0 ? 'accent' : 'destructive'}
                subtitle={`${profitMargin}% ${t.profitMargin}`}
              />
              <KPICard
                title={t.totalLiquidity}
                value={`${totalLiquidity.toLocaleString()} YER`}
                icon={Wallet}
                color="primary"
                subtitle={`${t.treasuryBalance}: ${totalTreasuryBalance.toLocaleString()}`}
              />
              <KPICard
                title={t.totalCustomers}
                value={customers.length}
                icon={Users}
                color="warning"
                trend="up"
                trendValue={`+${newCustomers} ${t.newCustomers}`}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Trend Chart */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 size={18} className="text-primary" />
                    {t.salesTrend}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrendData}>
                        <defs>
                          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="hsl(var(--accent))" 
                          fillOpacity={1} 
                          fill="url(#salesGradient)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <PieChartIcon size={18} className="text-primary" />
                    {t.expensesByCategory}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {expensesByCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {expensesByCategory.slice(0, 4).map((item, index) => (
                      <Badge key={item.category} variant="secondary" className="text-xs">
                        <span className="w-2 h-2 rounded-full me-1.5" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        {item.category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                title={t.totalProducts}
                value={totalProducts}
                icon={Package}
                color="primary"
              />
              <KPICard
                title={t.lowStock}
                value={lowStockProducts.length}
                icon={TrendingDown}
                color={lowStockProducts.length > 0 ? 'warning' : 'accent'}
              />
              <KPICard
                title={t.expenses}
                value={`${totalExpenses.toLocaleString()} YER`}
                icon={CreditCard}
                color="destructive"
              />
              <KPICard
                title={t.totalPurchases}
                value={`${totalPurchases.toLocaleString()} YER`}
                icon={ShoppingCart}
                color="primary"
              />
            </div>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title={t.totalSales} value={`${totalSales.toLocaleString()} YER`} icon={DollarSign} color="accent" />
              <KPICard title={t.totalOrders} value={sales.length} icon={ShoppingCart} color="primary" />
              <KPICard title={t.avgOrder} value={`${sales.length > 0 ? Math.round(totalSales / sales.length).toLocaleString() : 0} YER`} icon={TrendingUp} color="warning" />
              <KPICard title={t.totalCustomers} value={customers.length} icon={Users} color="primary" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.salesTrend}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Bar dataKey="amount" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sales Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.recentTransactions}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الفاتورة' : 'Invoice'}</TableHead>
                        <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                        <TableHead className="text-end">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.slice(-10).reverse().map((sale: any) => (
                        <TableRow key={sale.id}>
                          <TableCell className="text-muted-foreground">{format(new Date(sale.sale_date), 'MM/dd')}</TableCell>
                          <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                          <TableCell>{language === 'ar' ? sale.customers?.name_ar || sale.customers?.name || '-' : sale.customers?.name || '-'}</TableCell>
                          <TableCell className="text-end font-semibold text-accent">{Number(sale.total_amount).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title={t.totalProducts} value={totalProducts} icon={Package} color="primary" />
              <KPICard title={t.stockValue} value={`${stockValue.toLocaleString()} YER`} icon={DollarSign} color="accent" />
              <KPICard title={t.lowStock} value={lowStockProducts.length} icon={TrendingDown} color="warning" />
              <KPICard title={t.outOfStock} value={outOfStockProducts.length} icon={Package} color="destructive" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.stockByCategory}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockByCategory} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="category" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {t.lowStock}
                    <Badge variant="destructive">{lowStockProducts.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-2">
                      {lowStockProducts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد منتجات منخفضة المخزون' : 'No low stock items'}
                        </p>
                      ) : (
                        lowStockProducts.slice(0, 10).map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{language === 'ar' ? product.name_ar || product.name : product.name}</p>
                              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                            </div>
                            <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'}>
                              {product.stock}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard title={t.totalSales} value={`${totalSales.toLocaleString()} YER`} icon={TrendingUp} color="accent" />
              <KPICard title={t.revenue} value={`${totalRevenues.toLocaleString()} YER`} icon={ArrowUpRight} color="primary" />
              <KPICard title={t.expenses} value={`${totalExpenses.toLocaleString()} YER`} icon={ArrowDownRight} color="destructive" />
              <KPICard title={t.netProfit} value={`${netProfit.toLocaleString()} YER`} icon={DollarSign} color={netProfit >= 0 ? 'accent' : 'destructive'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-200/50 dark:border-amber-800/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/10">
                      <Wallet className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.treasuryBalance}</p>
                      <p className="text-2xl font-bold text-amber-600">{totalTreasuryBalance.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-200/50 dark:border-blue-800/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.bankBalance}</p>
                      <p className="text-2xl font-bold text-blue-600">{totalBankBalance.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.expensesByCategory}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;
