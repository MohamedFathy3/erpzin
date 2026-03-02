  import React, { useState, useRef, useMemo } from 'react';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
  import MainLayout from '@/components/layout/MainLayout';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Button } from '@/components/ui/button';
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
    Filter,
    LayoutGrid,
    List,
    Receipt,
    Truck,
    Minus,
    Info,
    FileText
  } from 'lucide-react';
  import { format, subDays, subMonths, subQuarters, subYears, startOfDay, endOfDay } from 'date-fns';
  import { ar } from 'date-fns/locale';
  import { toast } from 'sonner';
  import * as XLSX from 'xlsx';
  import ReadyReports from '@/components/reports/ReadyReports';
  import ProfitLossReport from '@/components/reports/ProfitLossReport';
  import SalesAnalysisReport from '@/components/reports/SalesAnalysisReport';
  import CustomerSupplierMovement from '@/components/reports/CustomerSupplierMovement';
  import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  // ==================== POS Invoice Type (جديد) ====================
  interface POSInvoice {
    id: number;
    invoice_number: string;
    customer: {
      id: number;
      name: string;
    };
    status: string;
    amounts: {
      total: string;
      paid: string;
      remaining: string;
    };
    items: Array<{
      product_id: number;
      product_name: string;
      quantity: number;
      price: string;
      total: string;
    }>;
    payments: Array<{
      method: string;
      amount: string;
    }>;
    created_at: string;
  }

  interface POSInvoiceResponse {
    data: POSInvoice[];
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
    created_at: string;
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

  interface Revenue {
    id: number;
    category: string;
    amount: string;
    description: string;
    date: string;
    payment_method: string;
    payment_method_arabic: string;
  }

  interface RevenueResponse {
    data: Revenue[];
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
    percentage: number;
  }

  interface ExpenseCategory {
    name: string;
    value: number;
    count: number;
    percentage: number;
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
            paginate: false,
            perPage: 300
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

    // ==================== Fetch POS Invoices (جديد) ====================
    const { data: posInvoices = [] } = useQuery<POSInvoice[]>({
      queryKey: ['pos-invoices', dateFrom, dateTo, selectedBranch],
      queryFn: async () => {
        try {
          const params: any = {
            orderBy: 'id',
            orderByDirection: 'desc',
            perPage: 300,
            paginate: false
          };
          
          // إضافة فلتر التاريخ
          params.date_from = `${dateFrom} 00:00:00`;
          params.date_to = `${dateTo} 23:59:59`;
          
          if (selectedBranch !== 'all') {
            params.branch_id = selectedBranch;
          }

          const response = await api.post<POSInvoiceResponse>('/invoices/index', params);
          return response.data.data || [];
        } catch (error) {
          console.error('Error fetching POS invoices:', error);
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

    // ==================== Fetch Expenses ====================
    const { data: expenses = [] } = useQuery<Expense[]>({
      queryKey: ['expenses', dateFrom, dateTo],
      queryFn: async () => {
        try {
          const response = await api.post<ExpenseResponse>('/finance/index', {
            date_from: dateFrom,
            date_to: dateTo
          });
          return response.data.data || [];
        } catch (error) {
          console.error('Error fetching expenses:', error);
          return [];
        }
      }
    });

    // ==================== Fetch Revenues ====================
    const { data: revenues = [] } = useQuery<Revenue[]>({
      queryKey: ['revenues', dateFrom, dateTo],
      queryFn: async () => {
        try {
          const response = await api.post<RevenueResponse>('/revenue/index', {
            date_from: dateFrom,
            date_to: dateTo
          });
          return response.data.data || [];
        } catch (error) {
          console.error('Error fetching revenues:', error);
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
          const response = await api.get<ShiftResponse>('/shifts', {});
          return response.data.data || [];
        } catch (error) {
          console.error('Error fetching shifts:', error);
          return [];
        }
      }
    });

    // ==================== دمج مبيعات الفواتير العادية و POS ====================
    const allSalesInvoices = useMemo(() => {
      return [...salesInvoices, ...posInvoices];
    }, [salesInvoices, posInvoices]);

    // ==================== Calculate Stats with useMemo ====================
    const stats = useMemo(() => {
      // Regular sales totals
      const totalRegularSales = salesInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      const totalRegularOrders = salesInvoices.length;
      // POS sales totals
      const totalPOSSales = posInvoices.reduce((sum, inv) => {
        const amount = inv.amounts?.total ? Number(inv.amounts.total) : 0;
        return sum + amount;
      }, 0);
      const totalPOSOrders = posInvoices.length;
      
      // Combined sales
      const totalSales = totalRegularSales + totalPOSSales;
      const totalOrders = totalRegularOrders + totalPOSOrders;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Purchases
      const totalPurchases = purchaseInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);

      // Expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      
      // Revenues
      const totalRevenues = revenues.reduce((sum, rev) => sum + Number(rev.amount), 0);

      // Calculate derived values
      const totalRevenue = totalSales + totalRevenues;
      const netProfit = totalRevenue - totalExpenses - totalPurchases;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      
      // نسب مالية إضافية
      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
      const grossProfit = totalSales - totalPurchases;
      const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

      // Treasury & Bank
      const totalTreasuryBalance = treasuries.reduce((sum, t) => sum + (t.balance || 0), 0);
      const totalBankBalance = banks.reduce((sum, b) => sum + (b.balance || 0), 0);
      const totalLiquidity = totalTreasuryBalance + totalBankBalance;

      // Inventory
      const totalProducts = products.length;
      const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
      const stockValue = products.reduce((sum, p) => sum + (p.stock * Number(p.cost || 0)), 0);
      
      // Low stock products
      const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= (p.reorder_level || 5));
      const outOfStockProducts = products.filter(p => p.stock === 0);

      // Customers
      const newCustomers = customers.filter(c => {
        const created = new Date(c.created_at);
        return created >= range.start && created <= range.end;
      }).length;

      return {
        totalSales,
        totalRegularSales,
        totalPOSSales,
        totalOrders,
        avgOrderValue,
        totalPurchases,
        totalExpenses,
        totalRevenues,
        totalRevenue,
        netProfit,
        profitMargin,
        expenseRatio,
        grossProfit,
        grossProfitMargin,
        totalTreasuryBalance,
        totalBankBalance,
        totalLiquidity,
        totalProducts,
        totalStock,
        stockValue,
        lowStockProducts: lowStockProducts.length,
        outOfStockProducts: outOfStockProducts.length,
        newCustomers
      };
    }, [salesInvoices, posInvoices, purchaseInvoices, expenses, revenues, treasuries, banks, products, customers, shifts, range]);

    // ==================== Prepare Chart Data ====================
    const salesTrendData = useMemo<ChartDataPoint[]>(() => {
      const salesMap = new Map<string, { sales: number; orders: number }>();

      // Helper function to add to map
      const addToMap = (date: string, amount: number, count: number = 1) => {
        const existing = salesMap.get(date);
        if (existing) {
          existing.sales += amount;
          existing.orders += count;
        } else {
          salesMap.set(date, { sales: amount, orders: count });
        }
      };

      // Add regular sales
      salesInvoices.forEach(inv => {
        const date = inv.created_at.split(' ')[0];
        const amount = Number(inv.total_amount);
        addToMap(date, amount, 1);
      });

      // Add POS sales
      posInvoices.forEach(inv => {
        const date = inv.created_at?.split(' ')[0];
        const amount = inv.amounts?.total ? Number(inv.amounts.total) : 0;
        if (date && amount > 0) {
          addToMap(date, amount, 1);
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
    }, [salesInvoices, posInvoices]);

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
      const totalValue = products.reduce((sum, p) => sum + (p.stock * Number(p.cost || 0)), 0);

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
        .map(([name, data]) => ({ 
          name, 
          stock: data.stock, 
          value: data.value,
          percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    }, [products, language]);

    const expensesByCategory = useMemo<ExpenseCategory[]>(() => {
      const categoryMap = new Map<string, { value: number; count: number }>();
      const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

      expenses.forEach(exp => {
        const category = exp.category;
        const amount = Number(exp.amount);
        
        const existing = categoryMap.get(category);
        if (existing) {
          existing.value += amount;
          existing.count += 1;
        } else {
          categoryMap.set(category, { value: amount, count: 1 });
        }
      });

      return Array.from(categoryMap.entries())
        .map(([name, data]) => ({ 
          name, 
          value: data.value, 
          count: data.count,
          percentage: totalExpense > 0 ? (data.value / totalExpense) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    }, [expenses]);

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
          ['مبيعات الفواتير العادية', stats.totalRegularSales],
          ['مبيعات نقطة البيع', stats.totalPOSSales],
          ['إجمالي الطلبات', stats.totalOrders],
          ['متوسط قيمة الطلب', stats.avgOrderValue],
          ['صافي الربح', stats.netProfit],
          ['هامش الربح', `${stats.profitMargin.toFixed(1)}%`],
          ['قيمة المخزون', stats.stockValue],
          ['إجمالي الخزنه', stats.totalLiquidity],
          ['أرصدة الخزائن', stats.totalTreasuryBalance],
          ['أرصدة البنوك', stats.totalBankBalance]
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        // Sales Sheet
        if (activeTab === 'salesAnalysis' || activeTab === 'dashboard') {
          const salesData = [
            ['التاريخ', 'رقم الفاتورة', 'العميل', 'المبلغ', 'طريقة الدفع', 'النوع'],
            ...salesInvoices.map(inv => [
              inv.created_at.split(' ')[0],
              inv.invoice_number,
              inv.customer.name,
              inv.total_amount,
              inv.payment_method,
              'فاتورة عادية'
            ]),
            ...posInvoices.map(inv => [
              inv.created_at?.split(' ')[0],
              inv.invoice_number,
              inv.customer.name,
              inv.amounts?.total,
              inv.payments?.[0]?.method || 'N/A',
              'نقطة بيع'
            ])
          ];
          const salesWs = XLSX.utils.aoa_to_sheet(salesData);
          XLSX.utils.book_append_sheet(wb, salesWs, 'All Sales');
        }

        // Products Sheet
        
        XLSX.writeFile(wb, `report_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        
        toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
      } catch (error) {
        console.error('Export error:', error);
        toast.error(language === 'ar' ? 'حدث خطأ في التصدير' : 'Export failed');
      }
    };

    const handleExportCSV = () => {
      try {
        const allSales = [
          ...salesInvoices.map(inv => ({
            'التاريخ': inv.created_at.split(' ')[0],
            'رقم الفاتورة': inv.invoice_number,
            'العميل': inv.customer.name,
            'المبلغ': inv.total_amount,
            'طريقة الدفع': inv.payment_method,
            'النوع': 'فاتورة عادية'
          })),
          ...posInvoices.map(inv => ({
            'التاريخ': inv.created_at?.split(' ')[0] || '',
            'رقم الفاتورة': inv.invoice_number,
            'العميل': inv.customer.name,
            'المبلغ': inv.amounts?.total || '0',
            'طريقة الدفع': inv.payments?.[0]?.method || '',
            'النوع': 'نقطة بيع'
          }))
        ];

        if (allSales.length === 0) {
          toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
          return;
        }

        const headers = Object.keys(allSales[0]);
        const csvContent = [
          headers.join(','),
          ...allSales.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sales_data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();

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
      exportExcel: language === 'ar' ? 'تصدير Excel' : 'Export Excel',
      exportCSV: language === 'ar' ? 'تصدير CSV' : 'Export CSV',
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
      netMargin: language === 'ar' ? 'هامش الربح الصافي' : 'Net Margin',
      grossMargin: language === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Margin',
      totalRevenue: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue',
      totalSales: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
      netProfit: language === 'ar' ? 'صافي الربح' : 'Net Profit',
      profitMargin: language === 'ar' ? 'هامش الربح' : 'Profit Margin',
      totalOrders: language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders',
      avgOrderValue: language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value',
      totalExpenses: language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses',
      totalPurchases: language === 'ar' ? 'المشتريات' : 'Purchases',
      totalLiquidity: language === 'ar' ? 'إجمالي الخزنه' : 'Total Liquidity',
      // Inventory
      totalProducts: language === 'ar' ? 'إجمالي المنتجات' : 'Total Products',
      totalStock: language === 'ar' ? 'إجمالي المخزون' : 'Total Stock',
      stockValue: language === 'ar' ? 'قيمة المخزون' : 'Stock Value',
      lowStock: language === 'ar' ? 'مخزون منخفض' : 'Low Stock',
      outOfStock: language === 'ar' ? 'نفذ المخزون' : 'Out of Stock',
      // Finance
      treasuryBalance: language === 'ar' ? 'الخزائن' : 'Treasury',
      bankBalance: language === 'ar' ? 'البنوك' : 'Banks',
      // Charts
      salesTrend: language === 'ar' ? 'اتجاه المبيعات' : 'Sales Trend',
      revenueVsExpenses: language === 'ar' ? 'الإيرادات مقابل المصروفات' : 'Revenue vs Expenses',
      stockDistribution: language === 'ar' ? 'توزيع المخزون' : 'Stock Distribution',
      expenseBreakdown: language === 'ar' ? 'تفصيل المصروفات' : 'Expense Breakdown',
      // Other
      comparedToPrevious: language === 'ar' ? 'مقارنة بالفترة السابقة' : 'vs previous period',
      noData: language === 'ar' ? 'لا توجد بيانات' : 'No data available',
      filter: language === 'ar' ? 'فلتر' : 'Filter',
      refresh: language === 'ar' ? 'تحديث' : 'Refresh',
      loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
      targetAchievement: language === 'ar' ? 'تحقيق الهدف' : 'Target Achievement',
      growthRate: language === 'ar' ? 'معدل النمو' : 'Growth Rate',
      efficiency: language === 'ar' ? 'الكفاءة' : 'Efficiency'
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
      progress,
      tooltip
    }: { 
      title: string; 
      value: string | number; 
      icon: any; 
      trend?: 'up' | 'down'; 
      trendValue?: string;
      color?: 'primary' | 'accent' | 'warning' | 'destructive';
      subtitle?: string;
      progress?: number;
      tooltip?: string;
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">{title}</p>
                  {tooltip && (
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info size={14} className="text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">{tooltip}</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {trend && trendValue && (
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
    const MiniStatCard = ({ 
      label, 
      value, 
      icon: Icon, 
      color,
      tooltip 
    }: { 
      label: string; 
      value: string | number; 
      icon: any; 
      color: string;
      tooltip?: string;
    }) => (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors relative group">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-sm">{value}</p>
        </div>
        {tooltip && (
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info size={12} className="text-muted-foreground absolute top-1 right-1 opacity-50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{tooltip}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        )}
      </div>
    );

    const formatCurrency = (value: number) => {
      return formatRegionalCurrency(value);
    };

    const formatNumber = (value: number) => {
      return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US').format(value);
    };

    const formatCompactNumber = (value: number) => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
      }
      return value.toString();
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

    const hasData = stats.totalSales > 0 || stats.totalExpenses > 0 || stats.totalProducts > 0;

    if (!hasData && !isLoading) {
      return (
        <MainLayout activeItem="reports">
          <div className="flex flex-col items-center justify-center h-64">
            <Package size={48} className="text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {language === 'ar' 
                ? 'لم يتم العثور على بيانات في الفترة المحددة. حاول تغيير نطاق التاريخ.'
                : 'No data found in the selected period. Try changing the date range.'}
            </p>
          </div>
        </MainLayout>
      );
    }

    return (
      <MainLayout activeItem="reports">
        <div className="space-y-6 print:p-4" dir={direction} ref={printRef}>
          {/* Header */}
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
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[140px] h-9">
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
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[140px] h-9"
                    />
                  </>
                )}

                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[160px] h-9">
                    <Building2 size={14} className="me-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBranches}</SelectItem>
                    {branches.map((branch: Branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                  <Printer size={16} />
                  {t.print}
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
                  <FileSpreadsheet size={16} />
                  {t.exportExcel}
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                  <FileText size={16} />
                  CSV
                </Button>
              </div>
            </div>
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
                  tooltip={language === 'ar' 
                    ? 'إجمالي الإيرادات = المبيعات + الإيرادات الأخرى'
                    : 'Total Revenue = Sales + Other Income'}
                />
                <KPICard
                  title={t.totalSales}
                  value={formatCurrency(stats.totalSales)}
                  icon={ShoppingCart}
                  trend="up"
                  trendValue="+8.2%"
                  color="accent"
                  subtitle={`${language === 'ar' ? 'فواتير' : 'Invoices'}: ${stats.totalRegularOrders} | ${language === 'ar' ? 'نقطة بيع' : 'POS'}: ${posInvoices.length}`}
                  tooltip={language === 'ar'
                    ? 'إجمالي المبيعات من الفواتير العادية ونقطة البيع'
                    : 'Total sales from regular invoices and POS'}
                />
                <KPICard
                  title={t.netProfit}
                  value={formatCurrency(stats.netProfit)}
                  icon={TrendingUp}
                  trend={stats.netProfit >= 0 ? 'up' : 'down'}
                  trendValue={`${stats.profitMargin.toFixed(1)}%`}
                  color={stats.netProfit >= 0 ? 'accent' : 'destructive'}
                  progress={Math.min(100, Math.max(0, stats.profitMargin))}
                  tooltip={language === 'ar'
                    ? 'صافي الربح = الإيرادات - المصروفات - المشتريات'
                    : 'Net Profit = Revenue - Expenses - Purchases'}
                />
                <KPICard
                  title={t.totalLiquidity}
                  value={formatCurrency(stats.totalTreasuryBalance)}
                  icon={Wallet}
                  color="warning"
                  subtitle={`${t.treasuryBalance}: ${formatCurrency(stats.totalTreasuryBalance)}`}
                  tooltip={language === 'ar'
                    ? 'إجمالي السيولة = أرصدة الخزائن + أرصدة البنوك'
                    : 'Total Liquidity = Treasury + Bank Balances'}
                />
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <MiniStatCard
                  label={t.totalOrders}
                  value={formatNumber(stats.totalOrders)}
                  icon={ClipboardList}
                  color="bg-blue-500/10 text-blue-500"
                  tooltip={language === 'ar' ? 'إجمالي عدد الطلبات' : 'Total number of orders'}
                />
                <MiniStatCard
                  label={t.avgOrderValue}
                  value={formatCurrency(stats.avgOrderValue)}
                  icon={CreditCard}
                  color="bg-purple-500/10 text-purple-500"
                  tooltip={language === 'ar' ? 'متوسط قيمة الطلب = إجمالي المبيعات ÷ عدد الطلبات' : 'Average order value = Total Sales ÷ Orders'}
                />
                <MiniStatCard
                  label={t.totalProducts}
                  value={stats.totalProducts}
                  icon={Package}
                  color="bg-cyan-500/10 text-cyan-500"
                  tooltip={language === 'ar' ? 'إجمالي عدد المنتجات' : 'Total number of products'}
                />
                <MiniStatCard
                  label={t.totalExpenses}
                  value={formatCurrency(stats.totalExpenses)}
                  icon={TrendingDown}
                  color="bg-red-500/10 text-red-500"
                  tooltip={language === 'ar' ? 'إجمالي المصروفات' : 'Total expenses'}
                />
                <MiniStatCard
                  label={t.stockValue}
                  value={formatCurrency(stats.stockValue)}
                  icon={Landmark}
                  color="bg-emerald-500/10 text-emerald-500"
                  tooltip={language === 'ar' ? 'قيمة المخزون = مجموع (الكمية × التكلفة)' : 'Stock value = Sum(Quantity × Cost)'}
                />
              </div>

              {/* Low Stock Alert */}
              {(stats.lowStockProducts > 0 || stats.outOfStockProducts > 0) && (
                <Card className="border-warning/50 bg-warning/5">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                      <AlertTriangle className="text-warning" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {language === 'ar' ? 'تنبيه المخزون' : 'Inventory Alert'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {stats.lowStockProducts > 0 && (
                          <span className="me-2">{stats.lowStockProducts} {language === 'ar' ? 'منتجات منخفضة المخزون' : 'low stock products'}</span>
                        )}
                        {stats.outOfStockProducts > 0 && (
                          <span>{stats.outOfStockProducts} {language === 'ar' ? 'منتجات نفذت' : 'out of stock products'}</span>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend Chart */}
                <Card className="card-elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity size={18} className="text-primary" />
                      {t.salesTrend}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      {salesTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={salesTrendData}>
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
                            />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={12}
                              tickFormatter={(value) => formatCompactNumber(value)}
                            />
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
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          {t.noData}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue vs Expenses Chart */}
                <Card className="card-elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PieChartIcon size={18} className="text-primary" />
                      {t.revenueVsExpenses}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueVsExpensesData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                    </div>
                  </CardContent>
                </Card>

                {/* Stock Distribution Chart */}
                <Card className="card-elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package size={18} className="text-primary" />
                      {t.stockDistribution}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      {stockByCategory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stockByCategory} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              type="number" 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={12}
                              tickFormatter={(value) => formatCompactNumber(value)}
                            />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={100} 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={11} 
                            />
                            <Tooltip 
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{ 
                                background: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }} 
                            />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                              {stockByCategory.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          {t.noData}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses by Category Chart */}
                <Card className="card-elevated">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingDown size={18} className="text-destructive" />
                      {t.expenseBreakdown}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      {expensesByCategory.length > 0 ? (
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
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          {t.noData}
                        </div>
                      )}
                    </div>
                    {expensesByCategory.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {expensesByCategory.slice(0, 4).map((expense, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span>{expense.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{expense.percentage.toFixed(1)}%</span>
                              <span className="font-mono text-xs">{formatCurrency(expense.value)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                          <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allSalesInvoices.slice(0, 20).map((inv: any) => {
                          const isRegular = 'total_amount' in inv;
                          return (
                            <TableRow key={`${isRegular ? 'reg' : 'pos'}-${inv.id}`}>
                              <TableCell>
                                {format(new Date(isRegular ? inv.created_at : inv.created_at), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                              <TableCell>{inv.customer.name}</TableCell>
                              <TableCell className="font-semibold">
                                {formatCurrency(isRegular ? Number(inv.total_amount) : Number(inv.amounts?.total || 0))}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {isRegular 
                                    ? (inv.payment_method === 'cash' ? (language === 'ar' ? 'نقدي' : 'Cash') :
                                      inv.payment_method === 'card' ? (language === 'ar' ? 'بطاقة' : 'Card') :
                                      inv.payment_method === 'wallet' ? (language === 'ar' ? 'محفظة' : 'Wallet') :
                                      inv.payment_method)
                                    : (inv.payments?.[0]?.method === 'cash' ? (language === 'ar' ? 'نقدي' : 'Cash') :
                                      inv.payments?.[0]?.method === 'card' ? (language === 'ar' ? 'بطاقة' : 'Card') :
                                      inv.payments?.[0]?.method === 'wallet' ? (language === 'ar' ? 'محفظة' : 'Wallet') :
                                      inv.payments?.[0]?.method || '-')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={isRegular ? '' : 'bg-blue-500/10 text-blue-500'}>
                                  {isRegular 
                                    ? (language === 'ar' ? 'فاتورة عادية' : 'Regular')
                                    : (language === 'ar' ? 'نقطة بيع' : 'POS')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
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
                    <ScrollArea className="h-[250px]">
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
                        {treasuries.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            {language === 'ar' ? 'لا توجد خزائن' : 'No treasuries'}
                          </div>
                        )}
                        <Separator />
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                          <span className="font-semibold">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                          <span className="font-bold text-primary">{formatCurrency(stats.totalTreasuryBalance)}</span>
                        </div>
                      </div>
                    </ScrollArea>
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
                    <ScrollArea className="h-[250px]">
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
                        {banks.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            {language === 'ar' ? 'لا توجد بنوك' : 'No banks'}
                          </div>
                        )}
                        <Separator />
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/10">
                          <span className="font-semibold">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                          <span className="font-bold text-accent">
                           {(stats.totalBankBalance)}

                          </span>
                        </div>
                      </div>
                    </ScrollArea>
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
                      <h3 className="text-2xl font-bold">{stats.grossProfitMargin.toFixed(1)}%</h3>
                      <p className="text-muted-foreground">{t.grossMargin}</p>
                      <Progress value={Math.min(100, Math.max(0, stats.grossProfitMargin))} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="card-elevated">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
                        <TrendingUp size={32} className="text-accent" />
                      </div>
                      <h3 className="text-2xl font-bold text-accent">{stats.profitMargin.toFixed(1)}%</h3>
                      <p className="text-muted-foreground">{t.netMargin}</p>
                      <Progress value={Math.min(100, Math.max(0, stats.profitMargin))} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="card-elevated">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <div className="mx-auto w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
                        <Zap size={32} className="text-warning" />
                      </div>
                      <h3 className="text-2xl font-bold">{stats.expenseRatio.toFixed(1)}%</h3>
                      <p className="text-muted-foreground">{language === 'ar' ? 'نسبة المصروفات' : 'Expense Ratio'}</p>
                      <Progress value={Math.min(100, Math.max(0, stats.expenseRatio))} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>{language === 'ar' ? 'مؤشرات الأداء' : 'Performance Indicators'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Reports */}
            <TabsContent value="profitLoss" className="mt-6">
              <ProfitLossReport />
            </TabsContent>

            <TabsContent value="advancedSales" className="mt-6">
              <SalesAnalysisReport />
            </TabsContent>

            <TabsContent value="customerSupplier" className="mt-6">
              <CustomerSupplierMovement />
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    );
  };

  export default Reports;