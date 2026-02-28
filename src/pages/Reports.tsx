import React, { useState, useRef, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import api from '@/lib/api';
import { 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';
import { 
  Download, 
  Printer, 
  FileSpreadsheet, 
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
  ClipboardList,
  Target,
  Zap,
  AlertTriangle,
  Clock,
  Filter,
  LayoutGrid,
  List,
  ChevronRight,
  Receipt,
  Truck
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import ReadyReports from '@/components/reports/ReadyReports';
import ProfitLossReport from '@/components/reports/ProfitLossReport';
import SalesAnalysisReport from '@/components/reports/SalesAnalysisReport';
import CustomerSupplierMovement from '@/components/reports/CustomerSupplierMovement';

// ==================== Types ====================
interface Branch {
  id: number;
  name: string;
  code: string;
  phone: string;
  address: string;
  manager: string;
  active: boolean;
  main_branch: boolean;
  image: string;
  created_at: string;
  updated_at: string;
}

interface BranchResponse {
  data: Branch[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface SalesInvoice {
  id: number;
  invoice_number: string;
  customer: {
    id: number;
    name: string;
  };
  sales_representative: {
    id: number | null;
    name: string | null;
  };
  branch: string;
  warehouse: string;
  currency: string | null;
  tax: string | null;
  payment_method: string;
  due_date: string | null;
  note: string | null;
  total_amount: string;
  items: any[];
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

interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: {
    id: number | null;
    name: string | null;
  };
  branch: string;
  warehouse: string;
  currency: string | null;
  tax: string | null;
  invoice_date: string;
  due_date: string | null;
  payment_method: string;
  note: string | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total_amount: string;
  items: any[];
  created_at: string;
}

interface PurchaseInvoiceResponse {
  data: PurchaseInvoice[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Customer {
  id: number;
  name: string;
  address: string;
  email: string | null;
  phone: string;
  point: number | null;
  last_paid_amount: number | null;
}

interface CustomerResponse {
  data: Customer[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  stock: number;
  reorder_level: number;
  price: string;
  cost: string;
  active: boolean;
  category: {
    id: number;
    name: string;
  } | null;
  units: any[];
  created_at: string;
  updated_at: string;
}

interface ProductResponse {
  data: Product[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Finance {
  id: number;
  category: string;
  amount: string;
  description: string;
  date: string;
  payment_method: string;
  payment_method_arabic: string;
}

interface FinanceResponse {
  data: Finance[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Treasury {
  id: number;
  name: string;
  code: string;
  branch_id: number;
  branch: Branch;
  balance: number;
  currency: string;
  is_main: boolean;
  notes: string;
  created_at: string;
}

interface TreasuryResponse {
  data: Treasury[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Bank {
  id: number;
  name: string;
  code: string;
  branch_id: number;
  branch: Branch;
  balance: number;
  currency: string;
  is_main: boolean;
  notes: string;
  created_at: string;
}

interface BankResponse {
  data: Bank[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Shift {
  id: number;
  shift_number: string;
  branch_id: number;
  user_id: number;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  total_sales: number;
  status: string;
}

interface ShiftResponse {
  data: Shift[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface ChartDataPoint {
  date: string;
  sales: number;
  orders: number;
}

interface CategoryStock {
  name: string;
  stock: number;
  value: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
}

const Reports = () => {
  const { language, direction } = useLanguage();
  const { formatCurrency: formatRegionalCurrency } = useRegionalSettings();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ==================== Date Range Helper ====================
  const getDateRange = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today': 
        return { 
          start: startOfDay(now), 
          end: endOfDay(now) 
        };
      case 'week': 
        return { 
          start: subDays(now, 7), 
          end: now 
        };
      case 'month': 
        return { 
          start: subMonths(now, 1), 
          end: now 
        };
      case 'quarter': 
        return { 
          start: subQuarters(now, 1), 
          end: now 
        };
      case 'year': 
        return { 
          start: subYears(now, 1), 
          end: now 
        };
      case 'custom': 
        return { 
          start: new Date(startDate), 
          end: new Date(endDate) 
        };
      default: 
        return { 
          start: subMonths(now, 1), 
          end: now 
        };
    }
  }, [dateRange, startDate, endDate]);

  const range = getDateRange;

  // ==================== Format Dates for API ====================
  const dateFrom = format(range.start, 'yyyy-MM-dd');
  const dateTo = format(range.end, 'yyyy-MM-dd');
  const dateTimeFrom = `${dateFrom} 00:00:00`;
  const dateTimeTo = `${dateTo} 23:59:59`;

  // ==================== Fetch Branches ====================
  const { data: branches = [], isLoading: loadingBranches } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const response = await api.post<BranchResponse>('/branch/index');
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Sales Invoices ====================
  const { data: salesInvoices = [], isLoading: loadingSales } = useQuery<SalesInvoice[]>({
    queryKey: ['sales-invoices', dateFrom, dateTo, selectedBranch],
    queryFn: async () => {
      try {
        const params: any = {
          date_from: dateTimeFrom,
          date_to: dateTimeTo,
          paginate: false
        };
        
        if (selectedBranch !== 'all') {
          params.branch_id = selectedBranch;
        }

        const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', params);
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching sales invoices:', error);
        toast.error(language === 'ar' ? 'حدث خطأ في جلب بيانات المبيعات' : 'Error fetching sales data');
        return [];
      }
    }
  });

  // ==================== Fetch Purchase Invoices ====================
  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ['purchase-invoices', dateFrom, dateTo],
    queryFn: async () => {
      try {
        const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
          date_from: dateTimeFrom,
          date_to: dateTimeTo,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching purchase invoices:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Customers ====================
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await api.post<CustomerResponse>('/customer/index');
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Products ====================
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const response = await api.post<ProductResponse>('/product/index');
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Finances ====================
  const { data: finances = [] } = useQuery<Finance[]>({
    queryKey: ['finances', dateFrom, dateTo],
    queryFn: async () => {
      try {
        const response = await api.post<FinanceResponse>('/finance/index', {
          date_from: dateFrom,
          date_to: dateTo
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching finances:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Treasuries ====================
  const { data: treasuries = [] } = useQuery<Treasury[]>({
    queryKey: ['treasuries'],
    queryFn: async () => {
      try {
        const response = await api.post<TreasuryResponse>('/treasury/index');
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching treasuries:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Banks ====================
  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: async () => {
      try {
        const response = await api.post<BankResponse>('/bank/index');
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching banks:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Shifts ====================
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['shifts', dateFrom, dateTo],
    queryFn: async () => {
      try {
        const response = await api.post<ShiftResponse>('/shifts/index', {
          date_from: dateFrom,
          date_to: dateTo
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching shifts:', error);
        return [];
      }
    }
  });

  // ==================== Calculate Stats with useMemo ====================
  const stats = useMemo(() => {
    // Sales totals
    const totalSales = salesInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const totalOrders = salesInvoices.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Purchases
    const totalPurchases = purchaseInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    // Finances
    const totalExpenses = finances
      .filter(f => f.category === 'expense' || Number(f.amount) < 0)
      .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);
    
    const totalRevenues = finances
      .filter(f => f.category === 'revenue' || Number(f.amount) > 0)
      .reduce((sum, f) => sum + Number(f.amount), 0);

    // Calculate derived values
    const totalRevenue = totalSales + totalRevenues;
    const netProfit = totalRevenue - totalExpenses - totalPurchases;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Treasury & Bank
    const totalTreasuryBalance = treasuries.reduce((sum, t) => sum + (t.balance || 0), 0);
    const totalBankBalance = banks.reduce((sum, b) => sum + (b.balance || 0), 0);
    const totalLiquidity = totalTreasuryBalance + totalBankBalance;

    // Inventory
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= (p.reorder_level || 5));
    const outOfStockProducts = products.filter(p => p.stock === 0);
    const stockValue = products.reduce((sum, p) => sum + (p.stock * Number(p.cost || 0)), 0);

    // Customers
    const newCustomers = customers.filter(c => {
      const created = new Date(c.created_at);
      return created >= range.start && created <= range.end;
    }).length;

    // POS
    const totalPOSSales = shifts.reduce((sum, s) => sum + (s.total_sales || 0), 0);

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      totalPurchases,
      totalExpenses,
      totalRevenues,
      totalRevenue,
      netProfit,
      profitMargin,
      totalTreasuryBalance,
      totalBankBalance,
      totalLiquidity,
      totalProducts,
      lowStockProducts: lowStockProducts.length,
      outOfStockProducts: outOfStockProducts.length,
      stockValue,
      newCustomers,
      totalPOSSales
    };
  }, [salesInvoices, purchaseInvoices, finances, treasuries, banks, products, customers, shifts, range]);

  // ==================== Prepare Chart Data ====================
  const salesTrendData = useMemo<ChartDataPoint[]>(() => {
    const salesMap = new Map<string, { sales: number; orders: number }>();

    salesInvoices.forEach(inv => {
      const date = inv.created_at.split(' ')[0];
      const amount = Number(inv.total_amount);
      
      const existing = salesMap.get(date);
      if (existing) {
        existing.sales += amount;
        existing.orders += 1;
      } else {
        salesMap.set(date, { sales: amount, orders: 1 });
      }
    });

    // Generate last 14 days
    const result: ChartDataPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const displayDate = format(date, 'MM/dd');
      const dayData = salesMap.get(dateStr) || { sales: 0, orders: 0 };
      
      result.push({
        date: displayDate,
        sales: dayData.sales,
        orders: dayData.orders
      });
    }

    return result;
  }, [salesInvoices]);

  const revenueVsExpensesData = useMemo(() => [
    { 
      name: language === 'ar' ? 'الإيرادات' : 'Revenue', 
      value: stats.totalRevenue, 
      fill: 'hsl(var(--accent))' 
    },
    { 
      name: language === 'ar' ? 'المصروفات' : 'Expenses', 
      value: stats.totalExpenses, 
      fill: 'hsl(var(--destructive))' 
    },
    { 
      name: language === 'ar' ? 'الربح' : 'Profit', 
      value: Math.max(0, stats.netProfit), 
      fill: 'hsl(var(--primary))' 
    }
  ], [stats, language]);

  const stockByCategory = useMemo<CategoryStock[]>(() => {
    const categoryMap = new Map<string, { stock: number; value: number }>();

    products.forEach(product => {
      const categoryName = product.category?.name || (language === 'ar' ? 'غير مصنف' : 'Uncategorized');
      const stock = product.stock;
      const value = stock * Number(product.cost || 0);
      
      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.stock += stock;
        existing.value += value;
      } else {
        categoryMap.set(categoryName, { stock, value });
      }
    });

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [products, language]);

  const expensesByCategory = useMemo<ExpenseCategory[]>(() => {
    const categoryMap = new Map<string, number>();

    finances
      .filter(f => f.category === 'expense' || Number(f.amount) < 0)
      .forEach(f => {
        const category = f.category;
        const amount = Math.abs(Number(f.amount));
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [finances]);

  const performanceData = useMemo(() => [
    { 
      name: language === 'ar' ? 'المبيعات' : 'Sales', 
      value: 85, 
      fill: 'hsl(var(--primary))' 
    },
    { 
      name: language === 'ar' ? 'الأرباح' : 'Profits', 
      value: 72, 
      fill: 'hsl(var(--accent))' 
    },
    { 
      name: language === 'ar' ? 'الكفاءة' : 'Efficiency', 
      value: 90, 
      fill: 'hsl(var(--warning))' 
    }
  ], [language]);

  // ==================== Export Functions ====================
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['تقرير شامل', 'Comprehensive Report'],
        ['الفترة من', dateFrom, 'إلى', dateTo],
        [''],
        ['المؤشر', 'القيمة'],
        ['إجمالي المبيعات', stats.totalSales],
        ['إجمالي الطلبات', stats.totalOrders],
        ['صافي الربح', stats.netProfit],
        ['قيمة المخزون', stats.stockValue],
        ['سيولة الخزائن', stats.totalTreasuryBalance],
        ['سيولة البنوك', stats.totalBankBalance]
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Sales Sheet
      if (activeTab === 'salesAnalysis' || activeTab === 'dashboard') {
        const salesData = [
          ['التاريخ', 'رقم الفاتورة', 'العميل', 'المبلغ', 'طريقة الدفع'],
          ...salesInvoices.map(inv => [
            inv.created_at.split(' ')[0],
            inv.invoice_number,
            inv.customer.name,
            inv.total_amount,
            inv.payment_method
          ])
        ];
        const salesWs = XLSX.utils.aoa_to_sheet(salesData);
        XLSX.utils.book_append_sheet(wb, salesWs, 'Sales');
      }

      // Products Sheet
      if (activeTab === 'inventoryAnalysis') {
        const productsData = [
          ['SKU', 'المنتج', 'المخزون', 'السعر', 'التكلفة', 'القيمة'],
          ...products.map(p => [
            p.sku,
            p.name,
            p.stock,
            p.price,
            p.cost,
            p.stock * Number(p.cost)
          ])
        ];
        const productsWs = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, productsWs, 'Products');
      }

      XLSX.writeFile(wb, `report_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(language === 'ar' ? 'حدث خطأ في التصدير' : 'Export failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ==================== Translations ====================
  const t = {
    title: language === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics',
    subtitle: language === 'ar' ? 'لوحة تحكم ذكاء الأعمال الشاملة' : 'Comprehensive business intelligence dashboard',
    dashboard: language === 'ar' ? 'لوحة التحكم' : 'Dashboard',
    readyReports: language === 'ar' ? 'التقارير الجاهزة' : 'Ready Reports',
    salesAnalysis: language === 'ar' ? 'تحليل المبيعات' : 'Sales Analysis',
    inventoryAnalysis: language === 'ar' ? 'المخزون' : 'Inventory',
    financeAnalysis: language === 'ar' ? 'المالية' : 'Finance',
    performance: language === 'ar' ? 'الأداء' : 'Performance',
    print: language === 'ar' ? 'طباعة' : 'Print',
    exportExcel: language === 'ar' ? 'تصدير' : 'Export',
    today: language === 'ar' ? 'اليوم' : 'Today',
    week: language === 'ar' ? 'أسبوع' : 'Week',
    month: language === 'ar' ? 'شهر' : 'Month',
    quarter: language === 'ar' ? 'ربع سنة' : 'Quarter',
    year: language === 'ar' ? 'سنة' : 'Year',
    custom: language === 'ar' ? 'مخصص' : 'Custom',
    from: language === 'ar' ? 'من' : 'From',
    to: language === 'ar' ? 'إلى' : 'To',
    allBranches: language === 'ar' ? 'كل الفروع' : 'All Branches',
    // KPIs
    totalRevenue: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue',
    totalSales: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
    netProfit: language === 'ar' ? 'صافي الربح' : 'Net Profit',
    profitMargin: language === 'ar' ? 'هامش الربح' : 'Profit Margin',
    totalOrders: language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders',
    avgOrderValue: language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value',
    totalExpenses: language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses',
    totalPurchases: language === 'ar' ? 'المشتريات' : 'Purchases',
    // Inventory
    totalProducts: language === 'ar' ? 'إجمالي المنتجات' : 'Total Products',
    lowStock: language === 'ar' ? 'مخزون منخفض' : 'Low Stock',
    outOfStock: language === 'ar' ? 'نفذ المخزون' : 'Out of Stock',
    stockValue: language === 'ar' ? 'قيمة المخزون' : 'Stock Value',
    // Finance
    treasuryBalance: language === 'ar' ? 'الخزائن' : 'Treasury',
    bankBalance: language === 'ar' ? 'البنوك' : 'Banks',
    totalLiquidity: language === 'ar' ? 'السيولة' : 'Liquidity',
    // Charts
    salesTrend: language === 'ar' ? 'اتجاه المبيعات' : 'Sales Trend',
    revenueVsExpenses: language === 'ar' ? 'الإيرادات مقابل المصروفات' : 'Revenue vs Expenses',
    stockDistribution: language === 'ar' ? 'توزيع المخزون' : 'Stock Distribution',
    paymentMethods: language === 'ar' ? 'طرق الدفع' : 'Payment Methods',
    // Other
    comparedToPrevious: language === 'ar' ? 'مقارنة بالفترة السابقة' : 'vs previous period',
    noData: language === 'ar' ? 'لا توجد بيانات' : 'No data available',
    filter: language === 'ar' ? 'فلتر' : 'Filter',
    refresh: language === 'ar' ? 'تحديث' : 'Refresh',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...'
  };

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

  const dateRangeOptions = [
    { value: 'today', label: t.today },
    { value: 'week', label: t.week },
    { value: 'month', label: t.month },
    { value: 'quarter', label: t.quarter },
    { value: 'year', label: t.year },
    { value: 'custom', label: t.custom }
  ];

  const isLoading = loadingSales || loadingBranches;

  // ==================== KPI Card Component ====================
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

  // ==================== Mini Stat Card ====================
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
    return formatRegionalCurrency(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US').format(value);
  };

  if (isLoading) {
    return (
      <MainLayout activeItem="reports">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">{t.loading}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

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
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
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
                value={formatCurrency(stats.totalRevenue)}
                icon={DollarSign}
                trend="up"
                trendValue="+12.5%"
                color="primary"
              />
              <KPICard
                title={t.totalSales}
                value={formatCurrency(stats.totalSales)}
                icon={ShoppingCart}
                trend="up"
                trendValue="+8.2%"
                color="accent"
              />
              <KPICard
                title={t.netProfit}
                value={formatCurrency(stats.netProfit)}
                icon={TrendingUp}
                trend={stats.netProfit >= 0 ? 'up' : 'down'}
                trendValue={`${stats.profitMargin.toFixed(1)}%`}
                color={stats.netProfit >= 0 ? 'accent' : 'destructive'}
              />
              <KPICard
                title={t.totalLiquidity}
                value={formatCurrency(stats.totalLiquidity)}
                icon={Wallet}
                color="warning"
                subtitle={`${t.treasuryBalance}: ${formatCurrency(stats.totalTreasuryBalance)}`}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <MiniStatCard
                label={t.totalOrders}
                value={formatNumber(stats.totalOrders)}
                icon={ClipboardList}
                color="bg-blue-500/10 text-blue-500"
              />
              <MiniStatCard
                label={t.avgOrderValue}
                value={formatCurrency(stats.avgOrderValue)}
                icon={CreditCard}
                color="bg-purple-500/10 text-purple-500"
              />
              <MiniStatCard
                label={t.totalProducts}
                value={formatNumber(stats.totalProducts)}
                icon={Package}
                color="bg-cyan-500/10 text-cyan-500"
              />
              <MiniStatCard
                label={t.lowStock}
                value={formatNumber(stats.lowStockProducts)}
                icon={AlertTriangle}
                color="bg-warning/10 text-warning"
              />
              <MiniStatCard
                label={t.stockValue}
                value={formatCurrency(stats.stockValue)}
                icon={Landmark}
                color="bg-emerald-500/10 text-emerald-500"
              />
              <MiniStatCard
                label={t.totalExpenses}
                value={formatCurrency(stats.totalExpenses)}
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
                        formatter={(value: number) => formatCurrency(value)}
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
                value={formatCurrency(stats.totalSales)}
                icon={ShoppingCart}
                trend="up"
                trendValue="+15.3%"
                color="primary"
              />
              <KPICard
                title={t.totalOrders}
                value={formatNumber(stats.totalOrders)}
                icon={ClipboardList}
                trend="up"
                trendValue="+8"
                color="accent"
              />
              <KPICard
                title={t.avgOrderValue}
                value={formatCurrency(stats.avgOrderValue)}
                icon={CreditCard}
                color="warning"
              />
              <KPICard
                title={language === 'ar' ? 'عملاء جدد' : 'New Customers'}
                value={formatNumber(stats.newCustomers)}
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
                        <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesInvoices.slice(0, 20).map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>{format(new Date(inv.created_at), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.customer.name}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(Number(inv.total_amount))}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {inv.payment_method === 'cash' ? (language === 'ar' ? 'نقدي' : 'Cash') :
                               inv.payment_method === 'card' ? (language === 'ar' ? 'بطاقة' : 'Card') :
                               inv.payment_method === 'wallet' ? (language === 'ar' ? 'محفظة' : 'Wallet') :
                               inv.payment_method}
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
                value={formatNumber(stats.totalProducts)}
                icon={Package}
                color="primary"
              />
              <KPICard
                title={t.stockValue}
                value={formatCurrency(stats.stockValue)}
                icon={Landmark}
                color="accent"
              />
              <KPICard
                title={t.lowStock}
                value={formatNumber(stats.lowStockProducts)}
                icon={AlertTriangle}
                color="warning"
              />
              <KPICard
                title={t.outOfStock}
                value={formatNumber(stats.outOfStockProducts)}
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
                      {products
                        .filter(p => p.stock > 0 && p.stock <= (p.reorder_level || 5))
                        .map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                            <div className="text-end">
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                {product.stock} / {product.reorder_level || 5}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      {stats.lowStockProducts === 0 && (
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
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                value={formatCurrency(stats.totalRevenue)}
                icon={TrendingUp}
                trend="up"
                trendValue="+18.5%"
                color="accent"
              />
              <KPICard
                title={t.totalExpenses}
                value={formatCurrency(stats.totalExpenses)}
                icon={TrendingDown}
                color="destructive"
              />
              <KPICard
                title={t.netProfit}
                value={formatCurrency(stats.netProfit)}
                icon={DollarSign}
                trend={stats.netProfit >= 0 ? 'up' : 'down'}
                color={stats.netProfit >= 0 ? 'primary' : 'destructive'}
              />
              <KPICard
                title={t.profitMargin}
                value={`${stats.profitMargin.toFixed(1)}%`}
                icon={Target}
                color="warning"
                progress={Math.min(100, Math.max(0, stats.profitMargin))}
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
                          <span className="font-medium">{treasury.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrency(treasury.balance || 0)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                      <span className="font-semibold">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="font-bold text-primary">{formatCurrency(stats.totalTreasuryBalance)}</span>
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
                          <span className="font-medium">{bank.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrency(bank.balance || 0)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
                      <span className="font-semibold">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="font-bold text-accent">{formatCurrency(stats.totalBankBalance)}</span>
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