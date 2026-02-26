
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users,
  Truck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Search,
  Eye,
  FileText,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Type definitions for entities and transactions
interface EntityBase {
  id: string | number;
  name: string;
  name_ar?: string;
  phone?: string;
}

interface CustomerEntity extends EntityBase {
  loyalty_points?: number;
  totalAmount: number;
  orderCount: number;
  avgOrderValue: number;
}

interface SupplierEntity extends EntityBase {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceCount: number;
}

interface SalesTransaction {
  id: string | number;
  branch_id: string;
  created_at: string;
  created_by: string;
  customer_id: string;
  discount_amount: number;
  due_date: string;
  invoice_date: string;
  invoice_number: string;
  notes: string;
  paid_amount: number;
  payment_method: string;
  tax_amount: number;
  total_amount: number | string;
  warehouse_id: string;
}

interface PurchaseTransaction {
  id: string | number;
  branch_id: string;
  created_at: string;
  created_by: string;
  supplier_id: string;
  discount_amount: number;
  due_date: string;
  invoice_date: string;
  invoice_number: string;
  notes: string;
  paid_amount: number;
  payment_method: string;
  payment_status: string;
  tax_amount: number;
  total_amount: number | string;
  warehouse_id: string;
}

const CustomerSupplierMovement: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEntity, setSelectedEntity] = useState<CustomerEntity | SupplierEntity | null>(null);


  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week': return { start: subMonths(now, 0.25), end: now };
      case 'month': return { start: subMonths(now, 1), end: now };
      case 'quarter': return { start: subMonths(now, 3), end: now };
      case 'year': return { start: subMonths(now, 12), end: now };
      case 'custom': return { start: new Date(startDate), end: new Date(endDate) };
      default: return { start: subMonths(now, 1), end: now };
    }
  };

  const range = getDateRange();

  // Fetch customers with their sales
  const { data: customers = [] } = useQuery({
    queryKey: ['customer-movement', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data: customersData } = await supabase.from('customers').select('*');
      const { data: salesData } = await supabase
        .from('sales')
        .select('customer_id, total_amount, sale_date')
        .gte('sale_date', range.start.toISOString())
        .lte('sale_date', range.end.toISOString());

      return customersData?.map(customer => {
        const customerSales = salesData?.filter(s => s.customer_id === customer.id) || [];
        const totalAmount = customerSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
        const orderCount = customerSales.length;
        return {
          ...customer,
          totalAmount,
          orderCount,
          avgOrderValue: orderCount > 0 ? totalAmount / orderCount : 0
        };
      }).sort((a, b) => b.totalAmount - a.totalAmount) || [];
    }
  });

  // Fetch suppliers with their purchases
  const { data: suppliers = [] } = useQuery({
    queryKey: ['supplier-movement', dateRange, startDate, endDate],
    queryFn: async () => {
      const { data: suppliersData } = await supabase.from('suppliers').select('*');
      const { data: purchasesData } = await supabase
        .from('purchase_invoices')
        .select('supplier_id, total_amount, paid_amount, remaining_amount, invoice_date, payment_status')
        .gte('invoice_date', format(range.start, 'yyyy-MM-dd'))
        .lte('invoice_date', format(range.end, 'yyyy-MM-dd'));

      return suppliersData?.map(supplier => {
        const supplierPurchases = purchasesData?.filter(p => p.supplier_id === supplier.id) || [];
        const totalAmount = supplierPurchases.reduce((sum, p) => sum + Number(p.total_amount), 0);
        const paidAmount = supplierPurchases.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
        const remainingAmount = supplierPurchases.reduce((sum, p) => sum + Number(p.remaining_amount || 0), 0);
        const invoiceCount = supplierPurchases.length;
        return {
          ...supplier,
          totalAmount,
          paidAmount,
          remainingAmount,
          invoiceCount
        };
      }).sort((a, b) => b.totalAmount - a.totalAmount) || [];
    }
  });

  // Fetch detailed transactions for selected entity
  const { data: entityTransactions = [] } = useQuery({
    queryKey: ['entity-transactions', selectedEntity?.id, activeTab],
    queryFn: async () => {
      if (!selectedEntity) return [];

      if (activeTab === 'customers') {
        const { data } = await supabase
          .from('sales')
          .select('*')
          .eq('customer_id', String(selectedEntity.id))

          .order('sale_date', { ascending: false })
          .limit(50);
        return data || [];
      } else {
        const { data } = await supabase
          .from('purchase_invoices')
          .select('*')
          .eq('supplier_id', String(selectedEntity.id))

          .order('invoice_date', { ascending: false })
          .limit(50);
        return data || [];
      }
    },
    enabled: !!selectedEntity
  });

  const t = {
    title: language === 'ar' ? 'حركة العملاء والموردين' : 'Customer & Supplier Movement',
    description: language === 'ar' ? 'تحليل تفصيلي للعلاقات التجارية' : 'Detailed analysis of business relationships',
    customers: language === 'ar' ? 'العملاء' : 'Customers',
    suppliers: language === 'ar' ? 'الموردين' : 'Suppliers',
    search: language === 'ar' ? 'بحث...' : 'Search...',
    week: language === 'ar' ? 'أسبوع' : 'Week',
    month: language === 'ar' ? 'شهر' : 'Month',
    quarter: language === 'ar' ? 'ربع سنة' : 'Quarter',
    year: language === 'ar' ? 'سنة' : 'Year',
    custom: language === 'ar' ? 'مخصص' : 'Custom',
    name: language === 'ar' ? 'الاسم' : 'Name',
    phone: language === 'ar' ? 'الهاتف' : 'Phone',
    totalAmount: language === 'ar' ? 'إجمالي المبلغ' : 'Total Amount',
    orders: language === 'ar' ? 'الطلبات' : 'Orders',
    invoices: language === 'ar' ? 'الفواتير' : 'Invoices',
    paid: language === 'ar' ? 'المدفوع' : 'Paid',
    remaining: language === 'ar' ? 'المتبقي' : 'Remaining',
    avgOrder: language === 'ar' ? 'متوسط الطلب' : 'Avg Order',
    viewDetails: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
    transactions: language === 'ar' ? 'الحركات' : 'Transactions',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    amount: language === 'ar' ? 'المبلغ' : 'Amount',
    status: language === 'ar' ? 'الحالة' : 'Status',
    export: language === 'ar' ? 'تصدير' : 'Export',
    totalCustomers: language === 'ar' ? 'إجمالي العملاء' : 'Total Customers',
    totalSuppliers: language === 'ar' ? 'إجمالي الموردين' : 'Total Suppliers',
    activeCustomers: language === 'ar' ? 'عملاء نشطين' : 'Active Customers',
    activeSuppliers: language === 'ar' ? 'موردين نشطين' : 'Active Suppliers',
    totalSales: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
    totalPurchases: language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases',
    balance: language === 'ar' ? 'الرصيد' : 'Balance',
  };

  const filteredCustomers = customers.filter(c =>
    !searchQuery ||
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name_ar?.includes(searchQuery) ||
    c.phone?.includes(searchQuery)
  );

  const filteredSuppliers = suppliers.filter(s =>
    !searchQuery ||
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name_ar?.includes(searchQuery) ||
    s.phone?.includes(searchQuery)
  );

  const totalCustomerSales = customers.reduce((sum, c) => sum + c.totalAmount, 0);
  const activeCustomers = customers.filter(c => c.orderCount > 0).length;
  const totalSupplierPurchases = suppliers.reduce((sum, s) => sum + s.totalAmount, 0);
  const activeSuppliers = suppliers.filter(s => s.invoiceCount > 0).length;

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
          <Button variant="outline" size="sm">
            <Download size={16} className="me-2" />
            {t.export}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customers" className="gap-2">
            <Users size={16} />
            {t.customers}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck size={16} />
            {t.suppliers}
          </TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalCustomers}</p>
                    <p className="text-2xl font-bold">{customers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.activeCustomers}</p>
                    <p className="text-2xl font-bold">{activeCustomers}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalSales}</p>
                    <p className="text-2xl font-bold">{totalCustomerSales.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.orders}</p>
                    <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + c.orderCount, 0)}</p>
                  </div>
                  <FileText className="h-8 w-8 text-warning opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>

          {/* Customers Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.phone}</TableHead>
                      <TableHead className="text-center">{t.orders}</TableHead>
                      <TableHead className="text-end">{t.totalAmount}</TableHead>
                      <TableHead className="text-end">{t.avgOrder}</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-full">
                              <Users size={14} className="text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {language === 'ar' && customer.name_ar ? customer.name_ar : customer.name}
                              </p>
                              {customer.loyalty_points > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {customer.loyalty_points} {language === 'ar' ? 'نقطة' : 'pts'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={customer.orderCount > 0 ? 'default' : 'secondary'}>
                            {customer.orderCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-mono font-medium">
                          {customer.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-end text-muted-foreground">
                          {customer.avgOrderValue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedEntity(customer)}
                              >
                                <Eye size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Users size={18} />
                                  {language === 'ar' && customer.name_ar ? customer.name_ar : customer.name}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.totalAmount}</p>
                                      <p className="text-xl font-bold">{customer.totalAmount.toLocaleString()}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.orders}</p>
                                      <p className="text-xl font-bold">{customer.orderCount}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.avgOrder}</p>
                                      <p className="text-xl font-bold">{customer.avgOrderValue.toLocaleString()}</p>
                                    </CardContent>
                                  </Card>
                                </div>
                                <ScrollArea className="h-[300px] border rounded-lg">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>{t.date}</TableHead>
                                        <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                                        <TableHead className="text-end">{t.amount}</TableHead>
                                        <TableHead>{t.status}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {entityTransactions.map((tx: SalesTransaction) => (
                                        <TableRow key={tx.id}>
                                          <TableCell>
                                            {format(new Date(tx.sale_date), 'yyyy-MM-dd')}
                                          </TableCell>
                                          <TableCell className="font-mono">{tx.invoice_number}</TableCell>
                                          <TableCell className="text-end font-mono">
                                            {Number(tx.total_amount).toLocaleString()}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                                              {tx.status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>

                                  </Table>
                                </ScrollArea>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalSuppliers}</p>
                    <p className="text-2xl font-bold">{suppliers.length}</p>
                  </div>
                  <Truck className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.activeSuppliers}</p>
                    <p className="text-2xl font-bold">{activeSuppliers}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalPurchases}</p>
                    <p className="text-2xl font-bold">{totalSupplierPurchases.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.remaining}</p>
                    <p className="text-2xl font-bold text-destructive">
                      {suppliers.reduce((sum, s) => sum + s.remainingAmount, 0).toLocaleString()}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-destructive opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>

          {/* Suppliers Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.phone}</TableHead>
                      <TableHead className="text-center">{t.invoices}</TableHead>
                      <TableHead className="text-end">{t.totalAmount}</TableHead>
                      <TableHead className="text-end">{t.paid}</TableHead>
                      <TableHead className="text-end">{t.remaining}</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-accent/10 rounded-full">
                              <Truck size={14} className="text-accent" />
                            </div>
                            <p className="font-medium">
                              {language === 'ar' && supplier.name_ar ? supplier.name_ar : supplier.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={supplier.invoiceCount > 0 ? 'default' : 'secondary'}>
                            {supplier.invoiceCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-mono font-medium">
                          {supplier.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-end font-mono text-success">
                          {supplier.paidAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-end font-mono text-destructive">
                          {supplier.remainingAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedEntity(supplier)}
                              >
                                <Eye size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Truck size={18} />
                                  {language === 'ar' && supplier.name_ar ? supplier.name_ar : supplier.name}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4">
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.invoices}</p>
                                      <p className="text-xl font-bold">{supplier.invoiceCount}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.totalAmount}</p>
                                      <p className="text-xl font-bold">{supplier.totalAmount.toLocaleString()}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.paid}</p>
                                      <p className="text-xl font-bold text-success">{supplier.paidAmount.toLocaleString()}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.remaining}</p>
                                      <p className="text-xl font-bold text-destructive">{supplier.remainingAmount.toLocaleString()}</p>
                                    </CardContent>
                                  </Card>
                                </div>
                                <ScrollArea className="h-[300px] border rounded-lg">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>{t.date}</TableHead>
                                        <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                                        <TableHead className="text-end">{t.amount}</TableHead>
                                        <TableHead>{t.status}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {entityTransactions.map((tx: PurchaseTransaction) => (
                                        <TableRow key={tx.id}>
                                          <TableCell>
                                            {format(new Date(tx.invoice_date), 'yyyy-MM-dd')}
                                          </TableCell>
                                          <TableCell className="font-mono">{tx.invoice_number}</TableCell>
                                          <TableCell className="text-end font-mono">
                                            {Number(tx.total_amount).toLocaleString()}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={
                                              tx.payment_status === 'paid' ? 'default' :
                                                tx.payment_status === 'partial' ? 'secondary' : 'destructive'
                                            }>
                                              {tx.payment_status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>

                                  </Table>
                                </ScrollArea>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
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

export default CustomerSupplierMovement;
