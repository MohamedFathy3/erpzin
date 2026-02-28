import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Calendar,
  Download,
  Store,
  Target,
  Package
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

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
  items: SalesInvoiceItem[];
  created_at: string;
}

interface SalesInvoiceItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: string;
  total: string;
}

interface SalesInvoiceResponse {
  data: SalesInvoice[];
  links: any;
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
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
  price: string;
  category: {
    id: number;
    name: string;
  } | null;
}

interface ProductResponse {
  data: Product[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface SalesByDate {
  date: string;
  sales: number;
  orders: number;
  formattedDate: string;
}

interface CategorySales {
  name: string;
  value: number;
  count: number;
}

interface ProductSales {
  name: string;
  quantity: number;
  revenue: number;
  productId: number;
}

interface CustomerSales {
  name: string;
  orders: number;
  total: number;
  customerId: number;
}

interface PaymentMethodData {
  name: string;
  value: number;
  count: number;
  methodKey: string;
}

const SalesAnalysisReport: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBranch, setSelectedBranch] = useState('all');

  // ==================== Helper Functions ====================
  const getPaymentMethodName = (method: string): string => {
    const methods: Record<string, { en: string; ar: string }> = {
      cash: { en: 'Cash', ar: 'نقدي' },
      card: { en: 'Card', ar: 'بطاقة' },
      wallet: { en: 'Wallet', ar: 'محفظة' },
      bank_transfer: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
      credit: { en: 'Credit', ar: 'آجل' }
    };
    return language === 'ar' 
      ? (methods[method]?.ar || method) 
      : (methods[method]?.en || method);
  };

  // Get date range based on selection
  const dateRangeObj = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'week': 
        return { 
          start: format(subDays(now, 7), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
      case 'month': 
        return { 
          start: format(subMonths(now, 1), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
      case 'quarter': 
        return { 
          start: format(subMonths(now, 3), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
      case 'year': 
        return { 
          start: format(subMonths(now, 12), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
      case 'custom': 
        return { 
          start: startDate, 
          end: endDate 
        };
      default: 
        return { 
          start: format(subMonths(now, 1), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
    }
  }, [dateRange, startDate, endDate]);

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
    queryKey: ['sales-analysis', dateRangeObj.start, dateRangeObj.end, selectedBranch],
    queryFn: async () => {
      try {
        const params: any = {
          date_from: `${dateRangeObj.start} 00:00:00`,
          date_to: `${dateRangeObj.end} 23:59:59`,
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

  // ==================== Calculate Statistics ====================
  const stats = useMemo(() => {
    const totalSales = salesInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const totalOrders = salesInvoices.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const uniqueCustomers = new Set(salesInvoices.map(inv => inv.customer.id)).size;

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      uniqueCustomers
    };
  }, [salesInvoices]);

  // ==================== Sales by Day ====================
  const salesByDay = useMemo<SalesByDate[]>(() => {
    const salesMap = new Map<string, { sales: number; orders: number }>();

    salesInvoices.forEach(inv => {
      const date = inv.created_at.split(' ')[0]; // YYYY-MM-DD
      const amount = Number(inv.total_amount);
      
      const existing = salesMap.get(date);
      if (existing) {
        existing.sales += amount;
        existing.orders += 1;
      } else {
        salesMap.set(date, { sales: amount, orders: 1 });
      }
    });

    // Generate all dates in range
    const result: SalesByDate[] = [];
    const currentDate = new Date(dateRangeObj.start);
    const endDateObj = new Date(dateRangeObj.end);

    while (currentDate <= endDateObj) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const displayDate = format(currentDate, 'MM/dd');
      const dayData = salesMap.get(dateStr) || { sales: 0, orders: 0 };
      
      result.push({
        date: displayDate,
        sales: dayData.sales,
        orders: dayData.orders,
        formattedDate: dateStr
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }, [salesInvoices, dateRangeObj]);

  // ==================== Sales by Category ====================
  const salesByCategory = useMemo<CategorySales[]>(() => {
    const categoryMap = new Map<string, { value: number; count: number }>();

    salesInvoices.forEach(inv => {
      inv.items.forEach(item => {
        // Find product to get its category
        const product = products.find(p => p.id === item.product_id);
        const categoryName = language === 'ar'
          ? product?.category?.name || 'غير مصنف'
          : product?.category?.name || 'Uncategorized';

        const amount = Number(item.total);
        const existing = categoryMap.get(categoryName);
        
        if (existing) {
          existing.value += amount;
          existing.count += item.quantity;
        } else {
          categoryMap.set(categoryName, { value: amount, count: item.quantity });
        }
      });
    });

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, value: data.value, count: data.count }))
      .sort((a, b) => b.value - a.value);
  }, [salesInvoices, products, language]);

  // ==================== Top Products ====================
  const topProducts = useMemo<ProductSales[]>(() => {
    const productMap = new Map<number, { name: string; quantity: number; revenue: number }>();

    salesInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const productId = item.product_id;
        const productName = item.product_name;
        const quantity = item.quantity;
        const revenue = Number(item.total);

        const existing = productMap.get(productId);
        if (existing) {
          existing.quantity += quantity;
          existing.revenue += revenue;
        } else {
          productMap.set(productId, { name: productName, quantity, revenue });
        }
      });
    });

    return Array.from(productMap.entries())
      .map(([productId, data]) => ({ ...data, productId }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [salesInvoices]);

  // ==================== Top Customers ====================
  const topCustomers = useMemo<CustomerSales[]>(() => {
    const customerMap = new Map<number, { name: string; orders: number; total: number }>();

    salesInvoices.forEach(inv => {
      const customerId = inv.customer.id;
      const customerName = inv.customer.name;
      const amount = Number(inv.total_amount);

      const existing = customerMap.get(customerId);
      if (existing) {
        existing.orders += 1;
        existing.total += amount;
      } else {
        customerMap.set(customerId, { name: customerName, orders: 1, total: amount });
      }
    });

    return Array.from(customerMap.entries())
      .map(([customerId, data]) => ({ ...data, customerId }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [salesInvoices]);

  // ==================== Payment Methods ====================
  const paymentMethods = useMemo<PaymentMethodData[]>(() => {
    const methodMap = new Map<string, { value: number; count: number }>();

    salesInvoices.forEach(inv => {
      const method = inv.payment_method || 'cash';
      const amount = Number(inv.total_amount);

      const existing = methodMap.get(method);
      if (existing) {
        existing.value += amount;
        existing.count += 1;
      } else {
        methodMap.set(method, { value: amount, count: 1 });
      }
    });

    return Array.from(methodMap.entries())
      .map(([methodKey, data]) => ({
        name: getPaymentMethodName(methodKey),
        value: data.value,
        count: data.count,
        methodKey
      }))
      .sort((a, b) => b.value - a.value);
  }, [salesInvoices, language]); // اللغة هنا عشان الدالة هتتجدد لو اللغة اتغيرت

  // ==================== Export to Excel ====================
  const handleExport = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['تقرير تحليل المبيعات', 'Sales Analysis Report'],
        ['الفترة من', dateRangeObj.start, 'إلى', dateRangeObj.end],
        [''],
        ['المؤشر', 'القيمة'],
        ['إجمالي المبيعات', stats.totalSales],
        ['إجمالي الطلبات', stats.totalOrders],
        ['متوسط قيمة الطلب', stats.avgOrderValue],
        ['عدد العملاء الفريدين', stats.uniqueCustomers]
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Sales by Day Sheet
      const salesByDayData = [
        ['التاريخ', 'المبيعات', 'عدد الطلبات'],
        ...salesByDay.map(d => [d.date, d.sales, d.orders])
      ];
      const salesByDayWs = XLSX.utils.aoa_to_sheet(salesByDayData);
      XLSX.utils.book_append_sheet(wb, salesByDayWs, 'Daily Sales');

      // Top Products Sheet
      const productsData = [
        ['المنتج', 'الكمية', 'الإيرادات'],
        ...topProducts.map(p => [p.name, p.quantity, p.revenue])
      ];
      const productsWs = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(wb, productsWs, 'Top Products');

      // Top Customers Sheet
      const customersData = [
        ['العميل', 'عدد الطلبات', 'الإجمالي'],
        ...topCustomers.map(c => [c.name, c.orders, c.total])
      ];
      const customersWs = XLSX.utils.aoa_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, customersWs, 'Top Customers');

      // Payment Methods Sheet
      const paymentData = [
        ['طريقة الدفع', 'المبلغ', 'عدد المعاملات'],
        ...paymentMethods.map(p => [p.name, p.value, p.count])
      ];
      const paymentWs = XLSX.utils.aoa_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(wb, paymentWs, 'Payment Methods');

      XLSX.writeFile(wb, `sales_analysis_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(language === 'ar' ? 'حدث خطأ في التصدير' : 'Export failed');
    }
  };

  // ==================== Translations ====================
  const t = {
    title: language === 'ar' ? 'تحليل المبيعات' : 'Sales Analysis',
    description: language === 'ar' ? 'تحليل شامل لأداء المبيعات' : 'Comprehensive sales performance analysis',
    overview: language === 'ar' ? 'نظرة عامة' : 'Overview',
    products: language === 'ar' ? 'المنتجات' : 'Products',
    customers: language === 'ar' ? 'العملاء' : 'Customers',
    trends: language === 'ar' ? 'الاتجاهات' : 'Trends',
    totalSales: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
    totalOrders: language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders',
    avgOrderValue: language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value',
    uniqueCustomers: language === 'ar' ? 'العملاء الفريدين' : 'Unique Customers',
    salesTrend: language === 'ar' ? 'اتجاه المبيعات' : 'Sales Trend',
    salesByCategory: language === 'ar' ? 'المبيعات حسب الفئة' : 'Sales by Category',
    topProducts: language === 'ar' ? 'أفضل المنتجات' : 'Top Products',
    topCustomers: language === 'ar' ? 'أفضل العملاء' : 'Top Customers',
    paymentMethods: language === 'ar' ? 'طرق الدفع' : 'Payment Methods',
    week: language === 'ar' ? 'أسبوع' : 'Week',
    month: language === 'ar' ? 'شهر' : 'Month',
    quarter: language === 'ar' ? 'ربع سنة' : 'Quarter',
    year: language === 'ar' ? 'سنة' : 'Year',
    custom: language === 'ar' ? 'مخصص' : 'Custom',
    allBranches: language === 'ar' ? 'كل الفروع' : 'All Branches',
    export: language === 'ar' ? 'تصدير' : 'Export',
    productName: language === 'ar' ? 'المنتج' : 'Product',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    revenue: language === 'ar' ? 'الإيرادات' : 'Revenue',
    customerName: language === 'ar' ? 'العميل' : 'Customer',
    orders: language === 'ar' ? 'الطلبات' : 'Orders',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    rank: language === 'ar' ? 'الترتيب' : 'Rank',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    noData: language === 'ar' ? 'لا توجد بيانات للعرض' : 'No data to display',
    branch: language === 'ar' ? 'الفرع' : 'Branch',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    amount: language === 'ar' ? 'المبلغ' : 'Amount'
  };

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--warning))',
    'hsl(199, 89%, 48%)',
    'hsl(280, 60%, 50%)',
    'hsl(330, 70%, 50%)',
    'hsl(120, 60%, 50%)',
    'hsl(30, 80%, 55%)'
  ];

  const isLoading = loadingSales || loadingBranches;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar size={16} className="me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t.week}</SelectItem>
              <SelectItem value="month">{t.month}</SelectItem>
              <SelectItem value="quarter">{t.quarter}</SelectItem>
              <SelectItem value="year">{t.year}</SelectItem>
              <SelectItem value="custom">{t.custom}</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === 'custom' && (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px]"
              />
            </>
          )}

          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[160px]">
              <Store size={16} className="me-2" />
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

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="me-2" />
            {t.export}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.totalSales}</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.totalOrders}</p>
                <p className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-accent opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.avgOrderValue}</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
              </div>
              <Target className="h-8 w-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.uniqueCustomers}</p>
                <p className="text-2xl font-bold">{stats.uniqueCustomers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="products">{t.products}</TabsTrigger>
          <TabsTrigger value="customers">{t.customers}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.salesTrend}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {salesByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesByDay}>
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
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(value) => formatCurrency(value).replace(/[^0-9]/g, '')}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="hsl(var(--primary))" 
                          fill="url(#salesGradient)" 
                          strokeWidth={2}
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

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.salesByCategory}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {salesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesByCategory.slice(0, 6)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={(entry) => entry.name}
                        >
                          {salesByCategory.slice(0, 6).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      {t.noData}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.paymentMethods}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {paymentMethods.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentMethods} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number" 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => formatCurrency(value).replace(/[^0-9]/g, '')}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="hsl(var(--muted-foreground))" 
                        width={80}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                        {paymentMethods.map((_, index) => (
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
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.topProducts}</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">{t.rank}</TableHead>
                        <TableHead>{t.productName}</TableHead>
                        <TableHead className="text-center w-24">{t.quantity}</TableHead>
                        <TableHead className="text-end w-32">{t.revenue}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((product, index) => (
                        <TableRow key={product.productId}>
                          <TableCell>
                            <Badge variant={index < 3 ? 'default' : 'secondary'}>
                              {index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-center">{product.quantity}</TableCell>
                          <TableCell className="text-end font-mono">
                            {formatCurrency(product.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  {t.noData}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.topCustomers}</CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">{t.rank}</TableHead>
                        <TableHead>{t.customerName}</TableHead>
                        <TableHead className="text-center w-24">{t.orders}</TableHead>
                        <TableHead className="text-end w-32">{t.total}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers.map((customer, index) => (
                        <TableRow key={customer.customerId}>
                          <TableCell>
                            <Badge variant={index < 3 ? 'default' : 'secondary'}>
                              {index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-primary/10 rounded-full">
                                <Users size={14} className="text-primary" />
                              </div>
                              <span className="font-medium">{customer.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{customer.orders}</TableCell>
                          <TableCell className="text-end font-mono">
                            {formatCurrency(customer.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  {t.noData}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesAnalysisReport;