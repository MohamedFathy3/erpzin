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
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, ComposedChart
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
  RefreshCw,
  ClipboardList,
  Target,
  Zap,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Eye,
  LayoutGrid,
  List,
  ChevronRight
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import ReadyReports from '@/components/reports/ReadyReports';
import ProfitLossReport from '@/components/reports/ProfitLossReport';
import SalesAnalysisReport from '@/components/reports/SalesAnalysisReport';
import CustomerSupplierMovement from '@/components/reports/CustomerSupplierMovement';

const Reports = () => {
  const { language, direction } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // Fetch all data
  const { data: branches = [] } = useQuery({
    queryKey: ['reports-branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('*').eq('is_active', true);
      return data || [];
    }
  });

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

  const { data: salesInvoices = [] } = useQuery({
    queryKey: ['reports-sales-invoices', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_invoices')
        .select('*, customers(name, name_ar)')
        .gte('invoice_date', format(range.start, 'yyyy-MM-dd'))
        .lte('invoice_date', format(range.end, 'yyyy-MM-dd'));
      return data || [];
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['reports-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, categories(name, name_ar)');
      return data || [];
    }
  });

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

  const { data: customers = [] } = useQuery({
    queryKey: ['reports-customers'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*');
      return data || [];
    }
  });

  const { data: treasuries = [] } = useQuery({
    queryKey: ['reports-treasuries'],
    queryFn: async () => {
      const { data } = await supabase.from('treasuries').select('*, branches(name, name_ar)');
      return data || [];
    }
  });

  const { data: banks = [] } = useQuery({
    queryKey: ['reports-banks'],
    queryFn: async () => {
      const { data } = await supabase.from('banks').select('*, branches(name, name_ar)');
      return data || [];
    }
  });

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

  const { data: posShifts = [] } = useQuery({
    queryKey: ['reports-pos-shifts', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('pos_shifts')
        .select('*')
        .gte('opened_at', range.start.toISOString())
        .lte('opened_at', range.end.toISOString());
      return data || [];
    }
  });

  const translations = {
    en: {
      title: 'Reports & Analytics',
      subtitle: 'Comprehensive business intelligence dashboard',
      dashboard: 'Dashboard',
      readyReports: 'Ready Reports',
      salesAnalysis: 'Sales Analysis',
      inventoryAnalysis: 'Inventory',
      financeAnalysis: 'Finance',
      performance: 'Performance',
      print: 'Print',
      exportExcel: 'Export',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      quarter: 'Quarter',
      year: 'Year',
      custom: 'Custom',
      from: 'From',
      to: 'To',
      allBranches: 'All Branches',
      // KPIs
      totalRevenue: 'Total Revenue',
      totalSales: 'Total Sales',
      netProfit: 'Net Profit',
      profitMargin: 'Profit Margin',
      totalOrders: 'Total Orders',
      avgOrderValue: 'Avg Order Value',
      totalExpenses: 'Total Expenses',
      totalPurchases: 'Purchases',
      // Inventory
      totalProducts: 'Total Products',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      stockValue: 'Stock Value',
      // Finance
      treasuryBalance: 'Treasury',
      bankBalance: 'Banks',
      totalLiquidity: 'Liquidity',
      accountsReceivable: 'Receivables',
      accountsPayable: 'Payables',
      // Performance
      growthRate: 'Growth Rate',
      targetAchievement: 'Target Achievement',
      efficiency: 'Efficiency Score',
      // Charts
      salesTrend: 'Sales Trend',
      revenueVsExpenses: 'Revenue vs Expenses',
      topProducts: 'Top Products',
      salesByCategory: 'Sales by Category',
      stockDistribution: 'Stock Distribution',
      paymentMethods: 'Payment Methods',
      // Other
      comparedToPrevious: 'vs previous period',
      noData: 'No data available',
      viewDetails: 'View Details',
      refresh: 'Refresh',
      filter: 'Filter'
    },
    ar: {
      title: 'التقارير والتحليلات',
      subtitle: 'لوحة تحكم ذكاء الأعمال الشاملة',
      dashboard: 'لوحة التحكم',
      readyReports: 'التقارير الجاهزة',
      salesAnalysis: 'تحليل المبيعات',
      inventoryAnalysis: 'المخزون',
      financeAnalysis: 'المالية',
      performance: 'الأداء',
      print: 'طباعة',
      exportExcel: 'تصدير',
      today: 'اليوم',
      week: 'هذا الأسبوع',
      month: 'هذا الشهر',
      quarter: 'ربع سنة',
      year: 'سنة',
      custom: 'مخصص',
      from: 'من',
      to: 'إلى',
      allBranches: 'كل الفروع',
      // KPIs
      totalRevenue: 'إجمالي الإيرادات',
      totalSales: 'إجمالي المبيعات',
      netProfit: 'صافي الربح',
      profitMargin: 'هامش الربح',
      totalOrders: 'إجمالي الطلبات',
      avgOrderValue: 'متوسط قيمة الطلب',
      totalExpenses: 'إجمالي المصروفات',
      totalPurchases: 'المشتريات',
      // Inventory
      totalProducts: 'إجمالي المنتجات',
      lowStock: 'مخزون منخفض',
      outOfStock: 'نفذ المخزون',
      stockValue: 'قيمة المخزون',
      // Finance
      treasuryBalance: 'الخزائن',
      bankBalance: 'البنوك',
      totalLiquidity: 'السيولة',
      accountsReceivable: 'المستحقات',
      accountsPayable: 'الالتزامات',
      // Performance
      growthRate: 'معدل النمو',
      targetAchievement: 'تحقيق الهدف',
      efficiency: 'نقاط الكفاءة',
      // Charts
      salesTrend: 'اتجاه المبيعات',
      revenueVsExpenses: 'الإيرادات مقابل المصروفات',
      topProducts: 'أفضل المنتجات',
      salesByCategory: 'المبيعات حسب الفئة',
      stockDistribution: 'توزيع المخزون',
      paymentMethods: 'طرق الدفع',
      // Other
      comparedToPrevious: 'مقارنة بالفترة السابقة',
      noData: 'لا توجد بيانات',
      viewDetails: 'عرض التفاصيل',
      refresh: 'تحديث',
      filter: 'فلتر'
    }
  };

  const t = translations[language];

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--warning))',
    'hsl(199, 89%, 48%)',
    'hsl(280, 60%, 50%)',
    'hsl(330, 70%, 50%)',
    'hsl(160, 60%, 45%)',
    'hsl(45, 90%, 50%)'
  ];

  // Calculate comprehensive stats
  const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalInvoicesAmount = salesInvoices.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalRevenue = totalSalesAmount + totalInvoicesAmount + revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPurchasesAmount = purchaseInvoices.reduce((sum, p) => sum + Number(p.total_amount), 0);
  const netProfit = totalRevenue - totalExpensesAmount - totalPurchasesAmount;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
  const totalOrders = sales.length + salesInvoices.length;
  const avgOrderValue = totalOrders > 0 ? (totalSalesAmount + totalInvoicesAmount) / totalOrders : 0;

  // Treasury & Bank stats
  const totalTreasuryBalance = treasuries.reduce((sum, t) => sum + Number(t.balance || 0), 0);
  const totalBankBalance = banks.reduce((sum, b) => sum + Number(b.balance || 0), 0);
  const totalLiquidity = totalTreasuryBalance + totalBankBalance;

  // Inventory stats
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock <= (p.min_stock || 5) && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const stockValue = products.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0);

  // Customers
  const newCustomers = customers.filter(c => new Date(c.created_at) >= range.start).length;

  // POS Performance
  const totalPOSSales = posShifts.reduce((sum, s) => sum + Number(s.total_sales || 0), 0);

  // Prepare chart data
  const salesTrendData = sales.reduce((acc: any[], sale) => {
    const date = format(new Date(sale.sale_date), 'MM/dd');
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.sales += Number(sale.total_amount);
      existing.orders += 1;
    } else {
      acc.push({ date, sales: Number(sale.total_amount), orders: 1 });
    }
    return acc;
  }, []).slice(-14);

  const revenueVsExpensesData = [
    { name: language === 'ar' ? 'الإيرادات' : 'Revenue', value: totalRevenue, fill: 'hsl(var(--accent))' },
    { name: language === 'ar' ? 'المصروفات' : 'Expenses', value: totalExpensesAmount, fill: 'hsl(var(--destructive))' },
    { name: language === 'ar' ? 'الربح' : 'Profit', value: Math.max(0, netProfit), fill: 'hsl(var(--primary))' }
  ];

  const stockByCategory = products.reduce((acc: any[], product) => {
    const categoryName = language === 'ar' 
      ? product.categories?.name_ar || product.categories?.name || 'غير مصنف'
      : product.categories?.name || 'Uncategorized';
    const existing = acc.find(c => c.name === categoryName);
    if (existing) {
      existing.stock += product.stock;
      existing.value += product.stock * (product.cost || 0);
    } else {
      acc.push({ name: categoryName, stock: product.stock, value: product.stock * (product.cost || 0) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 6);

  const expensesByCategory = expenses.reduce((acc: any[], expense) => {
    const existing = acc.find(e => e.name === expense.category);
    if (existing) {
      existing.value += Number(expense.amount);
    } else {
      acc.push({ name: expense.category, value: Number(expense.amount) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value).slice(0, 6);

  // Performance metrics
  const performanceData = [
    { name: language === 'ar' ? 'المبيعات' : 'Sales', value: 85, fill: 'hsl(var(--primary))' },
    { name: language === 'ar' ? 'الأرباح' : 'Profits', value: 72, fill: 'hsl(var(--accent))' },
    { name: language === 'ar' ? 'الكفاءة' : 'Efficiency', value: 90, fill: 'hsl(var(--warning))' }
  ];

  // Export functions
  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === 'salesAnalysis' || activeTab === 'dashboard') {
      headers = ['Date', 'Invoice', 'Customer', 'Amount', 'Status'];
      rows = sales.map(s => [
        format(new Date(s.sale_date), 'yyyy-MM-dd'),
        s.invoice_number,
        s.customers?.name || '-',
        s.total_amount,
        s.status || 'completed'
      ]);
    } else if (activeTab === 'inventoryAnalysis') {
      headers = ['SKU', 'Product', 'Category', 'Stock', 'Cost', 'Value'];
      rows = products.map(p => [
        p.sku,
        language === 'ar' ? p.name_ar || p.name : p.name,
        p.categories?.name || '-',
        p.stock,
        p.cost || 0,
        p.stock * (p.cost || 0)
      ]);
    } else if (activeTab === 'financeAnalysis') {
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

  // Enhanced KPI Card Component
  const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    color = 'primary',
    subtitle,
    progress
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    trend?: 'up' | 'down'; 
    trendValue?: string;
    color?: 'primary' | 'accent' | 'warning' | 'destructive';
    subtitle?: string;
    progress?: number;
  }) => {
    const colorClasses = {
      primary: 'from-primary/20 to-primary/5 border-primary/20',
      accent: 'from-accent/20 to-accent/5 border-accent/20',
      warning: 'from-warning/20 to-warning/5 border-warning/20',
      destructive: 'from-destructive/20 to-destructive/5 border-destructive/20'
    };

    const iconClasses = {
      primary: 'bg-primary/10 text-primary',
      accent: 'bg-accent/10 text-accent',
      warning: 'bg-warning/10 text-warning',
      destructive: 'bg-destructive/10 text-destructive'
    };

    return (
      <Card className={`relative overflow-hidden border bg-gradient-to-br ${colorClasses[color]} shadow-sm hover:shadow-lg transition-all duration-300 group`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-8 translate-x-8" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trendValue && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-accent' : 'text-destructive'}`}>
                  {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{trendValue}</span>
                  <span className="text-muted-foreground ms-1">{t.comparedToPrevious}</span>
                </div>
              )}
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              {progress !== undefined && (
                <Progress value={progress} className="h-1.5 mt-2" />
              )}
            </div>
            <div className={`p-3 rounded-xl ${iconClasses[color]} group-hover:scale-110 transition-transform`}>
              <Icon size={22} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Mini stat card
  const MiniStatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
    </div>
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US').format(value);
  };

  return (
    <MainLayout activeItem="reports">
      <div className="space-y-6 print:p-4" dir={direction} ref={printRef}>
        {/* Enhanced Header */}
        <div className="flex flex-col gap-4 print:hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <BarChart3 className="text-primary" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
                  <p className="text-sm text-muted-foreground">{t.subtitle}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                <Printer size={16} />
                {t.print}
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} />
                {t.exportExcel}
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <Card className="border-0 bg-gradient-to-r from-muted/30 to-muted/10">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{t.filter}:</span>
                </div>
                
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[140px] h-9 bg-background">
                    <Calendar size={14} className="me-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {dateRange === 'custom' && (
                  <>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-[140px] h-9"
                    />
                    <ChevronRight size={16} className="text-muted-foreground" />
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[140px] h-9"
                    />
                  </>
                )}

                <Separator orientation="vertical" className="h-6" />
                
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[160px] h-9 bg-background">
                    <Building2 size={14} className="me-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBranches}</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1 ms-auto border rounded-lg p-0.5 bg-muted/50">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={14} />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewMode('list')}
                  >
                    <List size={14} />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>
                  {format(range.start, 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined })} - {format(range.end, 'dd MMM yyyy', { locale: language === 'ar' ? ar : undefined })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
          <TabsList className="w-full flex-wrap h-auto p-1 bg-muted/50">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity size={16} />
              {t.dashboard}
            </TabsTrigger>
            <TabsTrigger value="readyReports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList size={16} />
              {t.readyReports}
            </TabsTrigger>
            <TabsTrigger value="salesAnalysis" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShoppingCart size={16} />
              {t.salesAnalysis}
            </TabsTrigger>
            <TabsTrigger value="inventoryAnalysis" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package size={16} />
              {t.inventoryAnalysis}
            </TabsTrigger>
            <TabsTrigger value="financeAnalysis" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wallet size={16} />
              {t.financeAnalysis}
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target size={16} />
              {t.performance}
            </TabsTrigger>
            <TabsTrigger value="profitLoss" className="gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <DollarSign size={16} />
              {language === 'ar' ? 'الأرباح والخسائر' : 'Profit & Loss'}
            </TabsTrigger>
            <TabsTrigger value="advancedSales" className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <TrendingUp size={16} />
              {language === 'ar' ? 'تحليل المبيعات' : 'Sales Analysis'}
            </TabsTrigger>
            <TabsTrigger value="customerSupplier" className="gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <Users size={16} />
              {language === 'ar' ? 'حركة العملاء/الموردين' : 'Customer/Supplier'}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Primary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title={t.totalRevenue}
                value={formatCurrency(totalRevenue)}
                icon={DollarSign}
                trend="up"
                trendValue="+12.5%"
                color="primary"
              />
              <KPICard
                title={t.totalSales}
                value={formatCurrency(totalSalesAmount + totalInvoicesAmount)}
                icon={ShoppingCart}
                trend="up"
                trendValue="+8.2%"
                color="accent"
              />
              <KPICard
                title={t.netProfit}
                value={formatCurrency(netProfit)}
                icon={TrendingUp}
                trend={netProfit >= 0 ? 'up' : 'down'}
                trendValue={`${profitMargin.toFixed(1)}%`}
                color={netProfit >= 0 ? 'accent' : 'destructive'}
              />
              <KPICard
                title={t.totalLiquidity}
                value={formatCurrency(totalLiquidity)}
                icon={Wallet}
                color="warning"
                subtitle={`${t.treasuryBalance}: ${formatCurrency(totalTreasuryBalance)}`}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <MiniStatCard
                label={t.totalOrders}
                value={formatNumber(totalOrders)}
                icon={ClipboardList}
                color="bg-blue-500/10 text-blue-500"
              />
              <MiniStatCard
                label={t.avgOrderValue}
                value={formatCurrency(avgOrderValue)}
                icon={CreditCard}
                color="bg-purple-500/10 text-purple-500"
              />
              <MiniStatCard
                label={t.totalProducts}
                value={formatNumber(totalProducts)}
                icon={Package}
                color="bg-cyan-500/10 text-cyan-500"
              />
              <MiniStatCard
                label={t.lowStock}
                value={formatNumber(lowStockProducts.length)}
                icon={AlertTriangle}
                color="bg-warning/10 text-warning"
              />
              <MiniStatCard
                label={t.stockValue}
                value={formatCurrency(stockValue)}
                icon={Landmark}
                color="bg-emerald-500/10 text-emerald-500"
              />
              <MiniStatCard
                label={t.totalExpenses}
                value={formatCurrency(totalExpensesAmount)}
                icon={TrendingDown}
                color="bg-destructive/10 text-destructive"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Trend */}
              <Card className="card-elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity size={18} className="text-primary" />
                    {t.salesTrend}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={salesTrendData}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fill="url(#salesGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue vs Expenses */}
              <Card className="card-elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChartIcon size={18} className="text-primary" />
                    {t.revenueVsExpenses}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={revenueVsExpensesData}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {revenueVsExpensesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stock Distribution */}
              <Card className="card-elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package size={18} className="text-primary" />
                    {t.stockDistribution}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stockByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expenses by Category */}
              <Card className="card-elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingDown size={18} className="text-destructive" />
                    {language === 'ar' ? 'المصروفات حسب الفئة' : 'Expenses by Category'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        innerRadius={0}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ready Reports Tab */}
          <TabsContent value="readyReports" className="mt-6">
            <ReadyReports />
          </TabsContent>

          {/* Sales Analysis Tab */}
          <TabsContent value="salesAnalysis" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title={t.totalSales}
                value={formatCurrency(totalSalesAmount + totalInvoicesAmount)}
                icon={ShoppingCart}
                trend="up"
                trendValue="+15.3%"
                color="primary"
              />
              <KPICard
                title={t.totalOrders}
                value={formatNumber(totalOrders)}
                icon={ClipboardList}
                trend="up"
                trendValue="+8"
                color="accent"
              />
              <KPICard
                title={t.avgOrderValue}
                value={formatCurrency(avgOrderValue)}
                icon={CreditCard}
                color="warning"
              />
              <KPICard
                title={language === 'ar' ? 'عملاء جدد' : 'New Customers'}
                value={formatNumber(newCustomers)}
                icon={Users}
                color="primary"
              />
            </div>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'آخر المبيعات' : 'Recent Sales'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                        <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.slice(0, 20).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{format(new Date(sale.sale_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{sale.invoice_number}</TableCell>
                          <TableCell>{sale.customers?.name || '-'}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                              {sale.status || 'completed'}
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

          {/* Inventory Analysis Tab */}
          <TabsContent value="inventoryAnalysis" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title={t.totalProducts}
                value={formatNumber(totalProducts)}
                icon={Package}
                color="primary"
              />
              <KPICard
                title={t.stockValue}
                value={formatCurrency(stockValue)}
                icon={Landmark}
                color="accent"
              />
              <KPICard
                title={t.lowStock}
                value={formatNumber(lowStockProducts.length)}
                icon={AlertTriangle}
                color="warning"
              />
              <KPICard
                title={t.outOfStock}
                value={formatNumber(outOfStockProducts.length)}
                icon={Package}
                color="destructive"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-warning" size={18} />
                    {t.lowStock}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {lowStockProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                          <div>
                            <p className="font-medium">{language === 'ar' ? product.name_ar || product.name : product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <div className="text-end">
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                              {product.stock} / {product.min_stock || 5}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {lowStockProducts.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">{t.noData}</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>{t.stockDistribution}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Finance Analysis Tab */}
          <TabsContent value="financeAnalysis" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title={t.totalRevenue}
                value={formatCurrency(totalRevenue)}
                icon={TrendingUp}
                trend="up"
                trendValue="+18.5%"
                color="accent"
              />
              <KPICard
                title={t.totalExpenses}
                value={formatCurrency(totalExpensesAmount)}
                icon={TrendingDown}
                color="destructive"
              />
              <KPICard
                title={t.netProfit}
                value={formatCurrency(netProfit)}
                icon={DollarSign}
                trend={netProfit >= 0 ? 'up' : 'down'}
                color={netProfit >= 0 ? 'primary' : 'destructive'}
              />
              <KPICard
                title={t.profitMargin}
                value={`${profitMargin.toFixed(1)}%`}
                icon={Target}
                color="warning"
                progress={Math.min(100, Math.max(0, profitMargin))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="card-elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Landmark size={18} className="text-primary" />
                    {t.treasuryBalance}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {treasuries.map((treasury) => (
                      <div key={treasury.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Wallet size={16} className="text-primary" />
                          <span className="font-medium">
                            {language === 'ar' ? treasury.name_ar || treasury.name : treasury.name}
                          </span>
                        </div>
                        <span className="font-bold">{formatCurrency(treasury.balance || 0)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                      <span className="font-semibold">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="font-bold text-primary">{formatCurrency(totalTreasuryBalance)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 size={18} className="text-primary" />
                    {t.bankBalance}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {banks.map((bank) => (
                      <div key={bank.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Landmark size={16} className="text-accent" />
                          <span className="font-medium">
                            {language === 'ar' ? bank.name_ar || bank.name : bank.name}
                          </span>
                        </div>
                        <span className="font-bold">{formatCurrency(bank.balance || 0)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
                      <span className="font-semibold">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="font-bold text-accent">{formatCurrency(totalBankBalance)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target size={32} className="text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">85%</h3>
                    <p className="text-muted-foreground">{t.targetAchievement}</p>
                    <Progress value={85} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
                      <TrendingUp size={32} className="text-accent" />
                    </div>
                    <h3 className="text-2xl font-bold text-accent">+12.5%</h3>
                    <p className="text-muted-foreground">{t.growthRate}</p>
                    <Progress value={62} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-elevated">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
                      <Zap size={32} className="text-warning" />
                    </div>
                    <h3 className="text-2xl font-bold">92%</h3>
                    <p className="text-muted-foreground">{t.efficiency}</p>
                    <Progress value={92} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'مؤشرات الأداء' : 'Performance Indicators'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="20%" 
                    outerRadius="90%" 
                    data={performanceData}
                    startAngle={180} 
                    endAngle={0}
                  >
                    <RadialBar
                      label={{ fill: 'hsl(var(--foreground))', position: 'insideStart' }}
                      background
                      dataKey="value"
                    />
                    <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Profit & Loss Report */}
          <TabsContent value="profitLoss" className="mt-6">
            <ProfitLossReport />
          </TabsContent>

          {/* Advanced Sales Analysis Report */}
          <TabsContent value="advancedSales" className="mt-6">
            <SalesAnalysisReport />
          </TabsContent>

          {/* Customer/Supplier Movement Report */}
          <TabsContent value="customerSupplier" className="mt-6">
            <CustomerSupplierMovement />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;
