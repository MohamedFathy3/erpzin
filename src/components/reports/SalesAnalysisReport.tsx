import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Calendar,
  Download,
  Filter,
  User,
  Store,
  Award,
  Target,
  Package
} from 'lucide-react';
import { format, subDays, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SalesAnalysisReport: React.FC = () => {
  const { language } = useLanguage();
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBranch, setSelectedBranch] = useState('all');

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week': return { start: subDays(now, 7), end: now };
      case 'month': return { start: subMonths(now, 1), end: now };
      case 'quarter': return { start: subMonths(now, 3), end: now };
      case 'year': return { start: subMonths(now, 12), end: now };
      case 'custom': return { start: new Date(startDate), end: new Date(endDate) };
      default: return { start: subMonths(now, 1), end: now };
    }
  };

  const range = getDateRange();

  // Fetch sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales-analysis', dateRange, startDate, endDate, selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customers(name, name_ar),
          sale_items(quantity, unit_price, total_price, products(name, name_ar, category_id, categories(name, name_ar)))
        `)
        .gte('sale_date', range.start.toISOString())
        .lte('sale_date', range.end.toISOString());

      if (selectedBranch !== 'all') {
        query = query.eq('branch', selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('*').eq('is_active', true);
      return data || [];
    }
  });

  // Calculate statistics
  const totalSales = salesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const totalOrders = salesData?.length || 0;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const uniqueCustomers = new Set(salesData?.filter(s => s.customer_id).map(s => s.customer_id)).size;

  // Sales by day
  const salesByDay = salesData?.reduce((acc: any[], sale) => {
    const date = format(new Date(sale.sale_date), 'MM/dd');
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.sales += Number(sale.total_amount);
      existing.orders += 1;
    } else {
      acc.push({ date, sales: Number(sale.total_amount), orders: 1 });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date)) || [];

  // Sales by category
  const salesByCategory = salesData?.reduce((acc: any[], sale) => {
    sale.sale_items?.forEach((item: any) => {
      const categoryName = language === 'ar' 
        ? item.products?.categories?.name_ar || item.products?.categories?.name || 'غير مصنف'
        : item.products?.categories?.name || 'Uncategorized';
      const existing = acc.find(c => c.name === categoryName);
      if (existing) {
        existing.value += Number(item.total_price);
      } else {
        acc.push({ name: categoryName, value: Number(item.total_price) });
      }
    });
    return acc;
  }, []).sort((a, b) => b.value - a.value) || [];

  // Top products
  const topProducts = salesData?.reduce((acc: any[], sale) => {
    sale.sale_items?.forEach((item: any) => {
      const productName = language === 'ar' 
        ? item.products?.name_ar || item.products?.name 
        : item.products?.name;
      const existing = acc.find(p => p.name === productName);
      if (existing) {
        existing.quantity += Number(item.quantity);
        existing.revenue += Number(item.total_price);
      } else {
        acc.push({ 
          name: productName, 
          quantity: Number(item.quantity), 
          revenue: Number(item.total_price) 
        });
      }
    });
    return acc;
  }, []).sort((a, b) => b.revenue - a.revenue).slice(0, 10) || [];

  // Top customers
  const topCustomers = salesData?.reduce((acc: any[], sale) => {
    if (!sale.customer_id) return acc;
    const customerName = language === 'ar' 
      ? sale.customers?.name_ar || sale.customers?.name 
      : sale.customers?.name;
    const existing = acc.find(c => c.name === customerName);
    if (existing) {
      existing.orders += 1;
      existing.total += Number(sale.total_amount);
    } else {
      acc.push({ 
        name: customerName || 'Unknown', 
        orders: 1, 
        total: Number(sale.total_amount) 
      });
    }
    return acc;
  }, []).sort((a, b) => b.total - a.total).slice(0, 10) || [];

  // Payment methods distribution
  const paymentMethods = salesData?.reduce((acc: any[], sale) => {
    const method = sale.payment_method || 'cash';
    const existing = acc.find(p => p.name === method);
    if (existing) {
      existing.value += Number(sale.total_amount);
      existing.count += 1;
    } else {
      acc.push({ name: method, value: Number(sale.total_amount), count: 1 });
    }
    return acc;
  }, []) || [];

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
    uniqueCustomers: language === 'ar' ? 'العملاء' : 'Customers',
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
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(199, 89%, 48%)', 'hsl(280, 60%, 50%)', 'hsl(330, 70%, 50%)'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex items-center gap-3">
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
              {branches.map((branch: any) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {language === 'ar' && branch.name_ar ? branch.name_ar : branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
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
                <p className="text-2xl font-bold">{totalSales.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{totalOrders.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{avgOrderValue.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{uniqueCustomers.toLocaleString()}</p>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesByDay}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
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
                      >
                        {salesByCategory.slice(0, 6).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentMethods} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t.productName}</TableHead>
                      <TableHead className="text-center">{t.quantity}</TableHead>
                      <TableHead className="text-end">{t.revenue}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'secondary'}>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-center">{product.quantity}</TableCell>
                        <TableCell className="text-end font-mono">{product.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.topCustomers}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t.customerName}</TableHead>
                      <TableHead className="text-center">{t.orders}</TableHead>
                      <TableHead className="text-end">{t.total}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant={index < 3 ? 'default' : 'secondary'}>
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-full">
                              <User size={14} className="text-primary" />
                            </div>
                            <span className="font-medium">{customer.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{customer.orders}</TableCell>
                        <TableCell className="text-end font-mono">{customer.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesAnalysisReport;
