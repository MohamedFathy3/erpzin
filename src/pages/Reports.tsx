import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Package,
  DollarSign,
  Users,
  Calendar,
  Filter,
  Wallet,
  Building2,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  User
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ar } from 'date-fns/locale';

const Reports = () => {
  const { language, direction } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'week': return { start: subWeeks(now, 1), end: now };
      case 'month': return { start: subMonths(now, 1), end: now };
      case 'quarter': return { start: subQuarters(now, 1), end: now };
      case 'halfYear': return { start: subMonths(now, 6), end: now };
      case 'year': return { start: subYears(now, 1), end: now };
      case 'custom': return { start: new Date(startDate), end: new Date(endDate) };
      default: return { start: subMonths(now, 1), end: now };
    }
  };

  const range = getDateRange();

  // Fetch users/profiles
  const { data: users = [] } = useQuery({
    queryKey: ['reports-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['reports-branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch sales data
  const { data: sales = [] } = useQuery({
    queryKey: ['reports-sales', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('sale_date', range.start.toISOString())
        .lte('sale_date', range.end.toISOString())
        .order('sale_date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['reports-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(name, name_ar)');
      if (error) throw error;
      return data;
    }
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['reports-expenses', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', format(range.start, 'yyyy-MM-dd'))
        .lte('expense_date', format(range.end, 'yyyy-MM-dd'))
        .order('expense_date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch revenues
  const { data: revenues = [] } = useQuery({
    queryKey: ['reports-revenues', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .gte('revenue_date', format(range.start, 'yyyy-MM-dd'))
        .lte('revenue_date', format(range.end, 'yyyy-MM-dd'))
        .order('revenue_date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['reports-customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch treasuries
  const { data: treasuries = [] } = useQuery({
    queryKey: ['reports-treasuries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('treasuries').select('*, branches(name, name_ar)');
      if (error) throw error;
      return data;
    }
  });

  // Fetch banks
  const { data: banks = [] } = useQuery({
    queryKey: ['reports-banks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banks').select('*, branches(name, name_ar)');
      if (error) throw error;
      return data;
    }
  });

  // Fetch treasury transactions
  const { data: treasuryTransactions = [] } = useQuery({
    queryKey: ['reports-treasury-transactions', dateRange, startDate, endDate, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('treasury_transactions')
        .select('*, treasuries(name, name_ar)')
        .gte('transaction_date', range.start.toISOString())
        .lte('transaction_date', range.end.toISOString())
        .order('transaction_date', { ascending: false });
      
      if (selectedUser !== 'all') {
        query = query.eq('created_by', selectedUser);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch bank transactions
  const { data: bankTransactions = [] } = useQuery({
    queryKey: ['reports-bank-transactions', dateRange, startDate, endDate, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*, banks(name, name_ar)')
        .gte('transaction_date', range.start.toISOString())
        .lte('transaction_date', range.end.toISOString())
        .order('transaction_date', { ascending: false });
      
      if (selectedUser !== 'all') {
        query = query.eq('created_by', selectedUser);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const translations = {
    en: {
      title: 'Reports & Analytics',
      sales: 'Sales',
      inventory: 'Inventory',
      finance: 'Finance',
      treasury: 'Treasury & Banks',
      customers: 'Customers',
      print: 'Print',
      exportPdf: 'Export PDF',
      exportExcel: 'Export Excel',
      dateRange: 'Date Range',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      quarter: 'Quarter',
      halfYear: 'Half Year',
      year: 'This Year',
      custom: 'Custom',
      from: 'From',
      to: 'To',
      totalSales: 'Total Sales',
      totalOrders: 'Total Orders',
      avgOrder: 'Avg Order Value',
      topProducts: 'Top Products',
      salesTrend: 'Sales Trend',
      salesByBranch: 'Sales by Branch',
      stockLevel: 'Stock Levels',
      lowStock: 'Low Stock Items',
      categoryStock: 'Stock by Category',
      revenue: 'Revenue',
      expenses: 'Expenses',
      profit: 'Net Profit',
      expensesByCategory: 'Expenses by Category',
      monthlyComparison: 'Monthly Comparison',
      totalCustomers: 'Total Customers',
      newCustomers: 'New Customers',
      loyaltyPoints: 'Loyalty Points',
      topCustomers: 'Top Customers',
      product: 'Product',
      quantity: 'Quantity',
      amount: 'Amount',
      name: 'Name',
      stock: 'Stock',
      status: 'Status',
      category: 'Category',
      user: 'User',
      allUsers: 'All Users',
      branch: 'Branch',
      allBranches: 'All Branches',
      treasuryBalance: 'Treasury Balance',
      bankBalance: 'Bank Balance',
      totalLiquidity: 'Total Liquidity',
      transfers: 'Transfers',
      treasuryTransactions: 'Treasury Transactions',
      bankTransactions: 'Bank Transactions',
      date: 'Date',
      type: 'Type',
      balanceAfter: 'Balance After',
      description: 'Description',
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      transferIn: 'Transfer In',
      transferOut: 'Transfer Out'
    },
    ar: {
      title: 'التقارير والتحليلات',
      sales: 'المبيعات',
      inventory: 'المخزون',
      finance: 'المالية',
      treasury: 'الخزائن والبنوك',
      customers: 'العملاء',
      print: 'طباعة',
      exportPdf: 'تصدير PDF',
      exportExcel: 'تصدير Excel',
      dateRange: 'الفترة الزمنية',
      today: 'اليوم',
      week: 'هذا الأسبوع',
      month: 'هذا الشهر',
      quarter: 'ربع سنوي',
      halfYear: 'نصف سنوي',
      year: 'هذا العام',
      custom: 'مخصص',
      from: 'من',
      to: 'إلى',
      totalSales: 'إجمالي المبيعات',
      totalOrders: 'إجمالي الطلبات',
      avgOrder: 'متوسط قيمة الطلب',
      topProducts: 'أفضل المنتجات',
      salesTrend: 'اتجاه المبيعات',
      salesByBranch: 'المبيعات حسب الفرع',
      stockLevel: 'مستويات المخزون',
      lowStock: 'منتجات منخفضة المخزون',
      categoryStock: 'المخزون حسب الفئة',
      revenue: 'الإيرادات',
      expenses: 'المصروفات',
      profit: 'صافي الربح',
      expensesByCategory: 'المصروفات حسب الفئة',
      monthlyComparison: 'المقارنة الشهرية',
      totalCustomers: 'إجمالي العملاء',
      newCustomers: 'عملاء جدد',
      loyaltyPoints: 'نقاط الولاء',
      topCustomers: 'أفضل العملاء',
      product: 'المنتج',
      quantity: 'الكمية',
      amount: 'المبلغ',
      name: 'الاسم',
      stock: 'المخزون',
      status: 'الحالة',
      category: 'الفئة',
      user: 'المستخدم',
      allUsers: 'كل المستخدمين',
      branch: 'الفرع',
      allBranches: 'كل الفروع',
      treasuryBalance: 'رصيد الخزائن',
      bankBalance: 'رصيد البنوك',
      totalLiquidity: 'إجمالي السيولة',
      transfers: 'التحويلات',
      treasuryTransactions: 'حركات الخزينة',
      bankTransactions: 'حركات البنك',
      date: 'التاريخ',
      type: 'النوع',
      balanceAfter: 'الرصيد بعد',
      description: 'الوصف',
      deposit: 'إيداع',
      withdrawal: 'سحب',
      transferIn: 'تحويل وارد',
      transferOut: 'تحويل صادر'
    }
  };

  const t = translations[language];

  const COLORS = ['hsl(217, 47%, 19%)', 'hsl(160, 55%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(0, 84%, 60%)', 'hsl(280, 60%, 50%)', 'hsl(330, 70%, 50%)'];

  // Calculate stats
  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRevenues = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const netProfit = totalSales + totalRevenues - totalExpenses;

  // Treasury & Bank stats
  const totalTreasuryBalance = treasuries.reduce((sum, t) => sum + Number(t.balance || 0), 0);
  const totalBankBalance = banks.reduce((sum, b) => sum + Number(b.balance || 0), 0);
  const totalLiquidity = totalTreasuryBalance + totalBankBalance;

  // Transaction summaries
  const treasuryDeposits = treasuryTransactions.filter(t => t.transaction_type === 'deposit' || t.transaction_type === 'transfer_in').reduce((sum, t) => sum + Number(t.amount), 0);
  const treasuryWithdrawals = treasuryTransactions.filter(t => t.transaction_type === 'withdrawal' || t.transaction_type === 'transfer_out').reduce((sum, t) => sum + Number(t.amount), 0);
  const bankDeposits = bankTransactions.filter(t => t.transaction_type === 'deposit' || t.transaction_type === 'transfer_in').reduce((sum, t) => sum + Number(t.amount), 0);
  const bankWithdrawals = bankTransactions.filter(t => t.transaction_type === 'withdrawal' || t.transaction_type === 'transfer_out').reduce((sum, t) => sum + Number(t.amount), 0);

  // Prepare chart data
  const salesTrendData = sales.reduce((acc: any[], sale) => {
    const date = format(new Date(sale.sale_date), 'MM/dd');
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.amount += Number(sale.total_amount);
    } else {
      acc.push({ date, amount: Number(sale.total_amount) });
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
    } else {
      acc.push({ category: categoryName, stock: product.stock });
    }
    return acc;
  }, []);

  const lowStockProducts = products.filter(p => p.stock <= (p.min_stock || 5));

  // Treasury balance by branch chart data
  const treasuryByBranch = treasuries.reduce((acc: any[], treasury) => {
    const branchName = treasury.branches 
      ? (language === 'ar' ? treasury.branches.name_ar || treasury.branches.name : treasury.branches.name)
      : (language === 'ar' ? 'بدون فرع' : 'No Branch');
    const existing = acc.find(b => b.branch === branchName);
    if (existing) {
      existing.balance += Number(treasury.balance || 0);
    } else {
      acc.push({ branch: branchName, balance: Number(treasury.balance || 0) });
    }
    return acc;
  }, []);

  const bankByBranch = banks.reduce((acc: any[], bank) => {
    const branchName = bank.branches 
      ? (language === 'ar' ? bank.branches.name_ar || bank.branches.name : bank.branches.name)
      : (language === 'ar' ? 'بدون فرع' : 'No Branch');
    const existing = acc.find(b => b.branch === branchName);
    if (existing) {
      existing.balance += Number(bank.balance || 0);
    } else {
      acc.push({ branch: branchName, balance: Number(bank.balance || 0) });
    }
    return acc;
  }, []);

  // Export functions
  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeTab === 'treasury') {
      headers = ['Date', 'Type', 'Amount', 'Balance After', 'Description'];
      rows = [...treasuryTransactions, ...bankTransactions].map(tx => [
        format(new Date(tx.transaction_date), 'yyyy-MM-dd HH:mm'),
        tx.transaction_type,
        tx.amount,
        tx.balance_after,
        tx.description || ''
      ]);
    } else {
      headers = ['Date', 'Invoice', 'Amount', 'Status'];
      rows = sales.map(s => [
        format(new Date(s.sale_date), 'yyyy-MM-dd'),
        s.invoice_number,
        s.total_amount,
        s.status
      ]);
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

  const handleExportPDF = () => {
    const printContent = printRef.current;
    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Report</title>');
        printWindow.document.write('<style>body { font-family: Arial; padding: 20px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background: #f4f4f4; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<h1>${t.title}</h1>`);
        printWindow.document.write(`<p>${t.dateRange}: ${format(range.start, 'yyyy-MM-dd')} - ${format(range.end, 'yyyy-MM-dd')}</p>`);
        
        if (activeTab === 'treasury') {
          printWindow.document.write(`<h2>${t.treasuryBalance}: ${totalTreasuryBalance.toLocaleString()} YER</h2>`);
          printWindow.document.write(`<h2>${t.bankBalance}: ${totalBankBalance.toLocaleString()} YER</h2>`);
          printWindow.document.write(`<h2>${t.totalLiquidity}: ${totalLiquidity.toLocaleString()} YER</h2>`);
        } else {
          printWindow.document.write(`<h2>${t.totalSales}: ${totalSales.toLocaleString()} YER</h2>`);
          printWindow.document.write(`<h2>${t.expenses}: ${totalExpenses.toLocaleString()} YER</h2>`);
          printWindow.document.write(`<h2>${t.profit}: ${netProfit.toLocaleString()} YER</h2>`);
        }
        
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const dateRangeOptions = [
    { value: 'today', label: t.today },
    { value: 'week', label: t.week },
    { value: 'month', label: t.month },
    { value: 'quarter', label: t.quarter },
    { value: 'halfYear', label: t.halfYear },
    { value: 'year', label: t.year },
    { value: 'custom', label: t.custom }
  ];

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return t.deposit;
      case 'withdrawal': return t.withdrawal;
      case 'transfer_in': return t.transferIn;
      case 'transfer_out': return t.transferOut;
      default: return type;
    }
  };

  return (
    <MainLayout activeItem="reports">
      <div className="space-y-6 print:p-4" dir={direction} ref={printRef}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t.dateRange} />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">{t.from}</span>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">{t.to}</span>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
              </div>
            )}

            {/* User Filter */}
            <div className="flex items-center gap-2">
              <User size={18} className="text-muted-foreground" />
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t.user} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allUsers}</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {language === 'ar' ? user.full_name_ar || user.full_name : user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Filter */}
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-muted-foreground" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t.branch} />
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

            {/* Export buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer size={16} className="me-1" />
                {t.print}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText size={16} className="me-1" />
                {t.exportPdf}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} className="me-1" />
                {t.exportExcel}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
          <TabsList>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <TrendingUp size={16} />
              {t.sales}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package size={16} />
              {t.inventory}
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center gap-2">
              <DollarSign size={16} />
              {t.finance}
            </TabsTrigger>
            <TabsTrigger value="treasury" className="flex items-center gap-2">
              <Wallet size={16} />
              {t.treasury}
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users size={16} />
              {t.customers}
            </TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="mt-6 space-y-6">
            {/* Sales KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <DollarSign className="text-accent" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.totalSales}</p>
                      <p className="text-2xl font-bold text-foreground">{totalSales.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <TrendingUp className="text-primary" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.totalOrders}</p>
                      <p className="text-2xl font-bold text-foreground">{sales.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-warning/10">
                      <Calendar className="text-warning" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.avgOrder}</p>
                      <p className="text-2xl font-bold text-foreground">
                        {sales.length > 0 ? Math.round(totalSales / sales.length).toLocaleString() : 0} YER
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sales Chart */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>{t.salesTrend}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesTrendData}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(160, 55%, 45%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(160, 55%, 45%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                      <XAxis dataKey="date" stroke="hsl(215, 16%, 47%)" />
                      <YAxis stroke="hsl(215, 16%, 47%)" />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(0, 0%, 100%)', 
                          border: '1px solid hsl(214, 32%, 91%)',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="hsl(160, 55%, 45%)" 
                        fillOpacity={1} 
                        fill="url(#salesGradient)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stock by Category */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>{t.categoryStock}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stockByCategory}
                          dataKey="stock"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        >
                          {stockByCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Low Stock Items */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {t.lowStock}
                    <Badge variant="destructive">{lowStockProducts.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[280px] overflow-y-auto">
                    {lowStockProducts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {language === 'ar' ? 'لا توجد منتجات منخفضة المخزون' : 'No low stock items'}
                      </p>
                    ) : (
                      lowStockProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{language === 'ar' ? product.name_ar || product.name : product.name}</p>
                            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                          </div>
                          <Badge variant={product.stock === 0 ? 'destructive' : 'secondary'}>
                            {product.stock} {language === 'ar' ? 'قطعة' : 'units'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="mt-6 space-y-6">
            {/* Finance KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <TrendingUp className="text-green-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.totalSales}</p>
                      <p className="text-xl font-bold text-green-600">{totalSales.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <ArrowDownCircle className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.revenue}</p>
                      <p className="text-xl font-bold text-blue-600">{totalRevenues.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-red-500/10">
                      <ArrowUpCircle className="text-red-600" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.expenses}</p>
                      <p className="text-xl font-bold text-red-600">{totalExpenses.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${netProfit >= 0 ? 'bg-accent/10' : 'bg-destructive/10'}`}>
                      <DollarSign className={netProfit >= 0 ? 'text-accent' : 'text-destructive'} size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.profit}</p>
                      <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        {netProfit.toLocaleString()} YER
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expenses by Category */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>{t.expensesByCategory}</CardTitle>
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
                        outerRadius={100}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treasury & Banks Tab */}
          <TabsContent value="treasury" className="mt-6 space-y-6">
            {/* Treasury KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-8 w-8 text-amber-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t.treasuryBalance}</p>
                      <p className="text-xl font-bold text-amber-600">{totalTreasuryBalance.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t.bankBalance}</p>
                      <p className="text-xl font-bold text-blue-600">{totalBankBalance.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t.totalLiquidity}</p>
                      <p className="text-xl font-bold text-green-600">{totalLiquidity.toLocaleString()} YER</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t.transfers}</p>
                      <p className="text-xl font-bold text-purple-600">
                        {treasuryTransactions.filter(t => t.transaction_type.includes('transfer')).length + 
                         bankTransactions.filter(t => t.transaction_type.includes('transfer')).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'رصيد الخزائن حسب الفرع' : 'Treasury Balance by Branch'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={treasuryByBranch}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                        <XAxis dataKey="branch" stroke="hsl(215, 16%, 47%)" />
                        <YAxis stroke="hsl(215, 16%, 47%)" />
                        <Tooltip />
                        <Bar dataKey="balance" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'رصيد البنوك حسب الفرع' : 'Bank Balance by Branch'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bankByBranch}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                        <XAxis dataKey="branch" stroke="hsl(215, 16%, 47%)" />
                        <YAxis stroke="hsl(215, 16%, 47%)" />
                        <Tooltip />
                        <Bar dataKey="balance" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet size={20} />
                    {t.treasuryTransactions}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الإيداعات' : 'Total Deposits'}</p>
                      <p className="text-xl font-bold text-green-600">{treasuryDeposits.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي السحوبات' : 'Total Withdrawals'}</p>
                      <p className="text-xl font-bold text-red-600">{treasuryWithdrawals.toLocaleString()}</p>
                    </div>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.date}</TableHead>
                          <TableHead>{t.type}</TableHead>
                          <TableHead>{t.amount}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treasuryTransactions.slice(0, 10).map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs">{format(new Date(tx.transaction_date), 'MM/dd HH:mm')}</TableCell>
                            <TableCell>
                              <Badge variant={tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? 'default' : 'destructive'} className="text-xs">
                                {getTransactionTypeLabel(tx.transaction_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className={`font-medium ${tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                              {Number(tx.amount).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 size={20} />
                    {t.bankTransactions}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الإيداعات' : 'Total Deposits'}</p>
                      <p className="text-xl font-bold text-green-600">{bankDeposits.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي السحوبات' : 'Total Withdrawals'}</p>
                      <p className="text-xl font-bold text-red-600">{bankWithdrawals.toLocaleString()}</p>
                    </div>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.date}</TableHead>
                          <TableHead>{t.type}</TableHead>
                          <TableHead>{t.amount}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankTransactions.slice(0, 10).map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs">{format(new Date(tx.transaction_date), 'MM/dd HH:mm')}</TableCell>
                            <TableCell>
                              <Badge variant={tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? 'default' : 'destructive'} className="text-xs">
                                {getTransactionTypeLabel(tx.transaction_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className={`font-medium ${tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                              {Number(tx.amount).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="mt-6 space-y-6">
            {/* Customer KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Users className="text-primary" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.totalCustomers}</p>
                      <p className="text-2xl font-bold text-foreground">{customers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-accent/10">
                      <TrendingUp className="text-accent" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.newCustomers}</p>
                      <p className="text-2xl font-bold text-foreground">
                        {customers.filter(c => new Date(c.created_at) >= range.start).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-warning/10">
                      <DollarSign className="text-warning" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.loyaltyPoints}</p>
                      <p className="text-2xl font-bold text-foreground">
                        {customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Customers */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>{t.topCustomers}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={customers.sort((a, b) => Number(b.total_purchases) - Number(a.total_purchases)).slice(0, 5)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                      <XAxis type="number" stroke="hsl(215, 16%, 47%)" />
                      <YAxis 
                        dataKey={language === 'ar' ? 'name_ar' : 'name'} 
                        type="category" 
                        stroke="hsl(215, 16%, 47%)"
                        width={100}
                      />
                      <Tooltip />
                      <Bar dataKey="total_purchases" fill="hsl(160, 55%, 45%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
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