import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Search, 
  Receipt, 
  RotateCcw, 
  Calendar, 
  DollarSign, 
  User, 
  Building2, 
  Filter,
  Eye,
  Printer,
  Download,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface POSTransactionsListProps {
  onClose?: () => void;
}

const POSTransactionsList: React.FC<POSTransactionsListProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);

  const t = {
    title: language === 'ar' ? 'فواتير نقطة البيع' : 'POS Invoices',
    sales: language === 'ar' ? 'المبيعات' : 'Sales',
    returns: language === 'ar' ? 'المرتجعات' : 'Returns',
    search: language === 'ar' ? 'بحث برقم الفاتورة أو العميل...' : 'Search by invoice or customer...',
    dateFrom: language === 'ar' ? 'من تاريخ' : 'From Date',
    dateTo: language === 'ar' ? 'إلى تاريخ' : 'To Date',
    timeFrom: language === 'ar' ? 'من وقت' : 'From Time',
    timeTo: language === 'ar' ? 'إلى وقت' : 'To Time',
    branch: language === 'ar' ? 'الفرع' : 'Branch',
    allBranches: language === 'ar' ? 'جميع الفروع' : 'All Branches',
    paymentMethod: language === 'ar' ? 'طريقة الدفع' : 'Payment Method',
    allMethods: language === 'ar' ? 'الكل' : 'All Methods',
    status: language === 'ar' ? 'الحالة' : 'Status',
    allStatuses: language === 'ar' ? 'الكل' : 'All',
    user: language === 'ar' ? 'المستخدم' : 'User',
    allUsers: language === 'ar' ? 'جميع المستخدمين' : 'All Users',
    invoiceNumber: language === 'ar' ? 'رقم الفاتورة' : 'Invoice #',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    customer: language === 'ar' ? 'العميل' : 'Customer',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    actions: language === 'ar' ? 'إجراءات' : 'Actions',
    noData: language === 'ar' ? 'لا توجد بيانات' : 'No data found',
    totalSales: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
    totalReturns: language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns',
    transactionCount: language === 'ar' ? 'عدد العمليات' : 'Transaction Count',
    viewDetails: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
    print: language === 'ar' ? 'طباعة' : 'Print',
    export: language === 'ar' ? 'تصدير' : 'Export',
    completed: language === 'ar' ? 'مكتمل' : 'Completed',
    pending: language === 'ar' ? 'معلق' : 'Pending',
    cancelled: language === 'ar' ? 'ملغي' : 'Cancelled',
    cash: language === 'ar' ? 'نقدي' : 'Cash',
    card: language === 'ar' ? 'بطاقة' : 'Card',
    invoiceDetails: language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details',
    items: language === 'ar' ? 'الأصناف' : 'Items',
    quantity: language === 'ar' ? 'الكمية' : 'Qty',
    price: language === 'ar' ? 'السعر' : 'Price',
    subtotal: language === 'ar' ? 'المجموع الفرعي' : 'Subtotal',
    tax: language === 'ar' ? 'الضريبة' : 'Tax',
    discount: language === 'ar' ? 'الخصم' : 'Discount',
    netTotal: language === 'ar' ? 'الإجمالي الصافي' : 'Net Total',
    cashier: language === 'ar' ? 'الكاشير' : 'Cashier',
  };

  // Fetch cashiers from pos_shifts for filter
  const { data: cashiers = [] } = useQuery({
    queryKey: ['cashiers-pos-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_shifts')
        .select('cashier_id')
        .not('cashier_id', 'is', null);
      if (error) throw error;
      
      // Get unique cashier IDs
      const uniqueCashierIds = [...new Set(data?.map(s => s.cashier_id).filter(Boolean))];
      
      if (uniqueCashierIds.length === 0) return [];
      
      // Fetch profiles for these cashiers
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, full_name_ar')
        .in('id', uniqueCashierIds);
      
      return profiles || [];
    }
  });

  // Fetch POS sales
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ['pos-sales', dateFrom, dateTo, timeFrom, timeTo, selectedBranch, selectedUser],
    queryFn: async () => {
      // First, get shift IDs for selected user if filtering by user
      let userShiftIds: string[] = [];
      if (selectedUser !== 'all') {
        const { data: shifts } = await supabase
          .from('pos_shifts')
          .select('id')
          .eq('cashier_id', selectedUser);
        userShiftIds = shifts?.map(s => s.id) || [];
      }

      let query = supabase
        .from('sales')
        .select(`
          id, invoice_number, sale_date, status, payment_method,
          tax_amount, discount_amount, total_amount, branch,
          customer_id, created_at, notes,
          customers(name, name_ar, phone),
          sale_items(id, quantity, unit_price, total_price, product_id, products(name, name_ar, sku))
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      const { data, error } = await query;

      if (error) throw error;
      
      // Apply client-side filters
      let filtered = data || [];
      
      // Date and time filtering
      if (dateFrom) {
        const fromDateTime = timeFrom ? `${dateFrom}T${timeFrom}` : `${dateFrom}T00:00:00`;
        filtered = filtered.filter(s => s.sale_date >= fromDateTime || s.created_at >= fromDateTime);
      }
      if (dateTo) {
        const toDateTime = timeTo ? `${dateTo}T${timeTo}` : `${dateTo}T23:59:59`;
        filtered = filtered.filter(s => s.sale_date <= toDateTime || s.created_at <= toDateTime);
      }
      
      if (selectedBranch !== 'all') filtered = filtered.filter(s => s.branch === selectedBranch);
      
      return filtered;
    }
  });

  // Fetch POS returns
  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['pos-returns', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_returns')
        .select(`
          id, return_number, return_date, status, reason, refund_method,
          subtotal, tax_amount, total_amount, customer_id, created_at,
          customers(name, name_ar, phone),
          pos_return_items(id, quantity, unit_price, total_price, product_name, product_id, products(name, name_ar, sku))
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      // Apply client-side filters
      let filtered = data || [];
      if (dateFrom) filtered = filtered.filter(r => r.return_date >= dateFrom);
      if (dateTo) filtered = filtered.filter(r => r.return_date <= dateTo);
      
      return filtered;
    }
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-pos-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const matchesSearch = searchTerm === '' ||
      sale.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customers?.name_ar?.includes(searchTerm);
    
    const matchesPayment = selectedPaymentMethod === 'all' || sale.payment_method === selectedPaymentMethod;
    const matchesStatus = selectedStatus === 'all' || sale.status === selectedStatus;

    return matchesSearch && matchesPayment && matchesStatus;
  });

  // Filter returns
  const filteredReturns = returns.filter(ret => {
    const matchesSearch = searchTerm === '' ||
      ret.return_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.customers?.name_ar?.includes(searchTerm);
    
    const matchesStatus = selectedStatus === 'all' || ret.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalSalesAmount = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalReturnsAmount = filteredReturns.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      completed: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', label: t.completed },
      pending: { color: 'bg-amber-500/10 text-amber-600 border-amber-200', label: t.pending },
      cancelled: { color: 'bg-red-500/10 text-red-600 border-red-200', label: t.cancelled },
    };
    const { color, label } = config[status] || config.pending;
    return <Badge variant="outline" className={cn(color)}>{label}</Badge>;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setTimeFrom('');
    setTimeTo('');
    setSelectedBranch('all');
    setSelectedPaymentMethod('all');
    setSelectedStatus('all');
    setSelectedUser('all');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{t.title}</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalSalesAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t.totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalReturnsAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t.totalReturns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{filteredSales.length}</p>
                <p className="text-xs text-muted-foreground">{t.sales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{filteredReturns.length}</p>
                <p className="text-xs text-muted-foreground">{t.returns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="col-span-2 relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder={t.dateFrom}
                title={t.dateFrom}
              />
            </div>
            <div>
              <Input
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                placeholder={t.timeFrom}
                title={t.timeFrom}
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder={t.dateTo}
                title={t.dateTo}
              />
            </div>
            <div>
              <Input
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                placeholder={t.timeTo}
                title={t.timeTo}
              />
            </div>
            <div>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder={t.allBranches} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allBranches}</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {language === 'ar' ? b.name_ar || b.name : b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder={t.allUsers} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allUsers}</SelectItem>
                  {cashiers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {language === 'ar' ? c.full_name_ar || c.full_name : c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder={t.allMethods} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allMethods}</SelectItem>
                  <SelectItem value="cash">{t.cash}</SelectItem>
                  <SelectItem value="card">{t.card}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t.allStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allStatuses}</SelectItem>
                  <SelectItem value="completed">{t.completed}</SelectItem>
                  <SelectItem value="pending">{t.pending}</SelectItem>
                  <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                <Filter size={14} />
                {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'returns')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart size={16} />
            {t.sales} ({filteredSales.length})
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-2">
            <RotateCcw size={16} />
            {t.returns} ({filteredReturns.length})
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.invoiceNumber}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.customer}</TableHead>
                      <TableHead>{t.branch}</TableHead>
                      <TableHead>{t.paymentMethod}</TableHead>
                      <TableHead>{t.total}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead className="text-center">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t.noData}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm">{sale.invoice_number}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(sale.sale_date), 'yyyy-MM-dd HH:mm', { locale: language === 'ar' ? ar : undefined })}
                          </TableCell>
                          <TableCell>
                            {sale.customers ? (language === 'ar' ? sale.customers.name_ar || sale.customers.name : sale.customers.name) : '-'}
                          </TableCell>
                          <TableCell>
                            {sale.branch || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {sale.payment_method === 'cash' ? t.cash : t.card}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{sale.total_amount?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(sale.status || 'completed')}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSale(sale)}>
                                <Eye size={16} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Printer size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.invoiceNumber}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.customer}</TableHead>
                      <TableHead>{language === 'ar' ? 'طريقة الاسترداد' : 'Refund Method'}</TableHead>
                      <TableHead>{t.total}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead className="text-center">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredReturns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t.noData}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReturns.map((ret) => (
                        <TableRow key={ret.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm">{ret.return_number}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(ret.return_date), 'yyyy-MM-dd HH:mm', { locale: language === 'ar' ? ar : undefined })}
                          </TableCell>
                          <TableCell>
                            {ret.customers ? (language === 'ar' ? ret.customers.name_ar || ret.customers.name : ret.customers.name) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {ret.refund_method === 'cash' ? t.cash : t.card}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">-{ret.total_amount?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(ret.status || 'completed')}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedReturn(ret)}>
                                <Eye size={16} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Printer size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sale Details Modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt size={20} />
              {t.invoiceDetails} - {selectedSale?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">{t.date}:</span> {format(new Date(selectedSale.sale_date), 'yyyy-MM-dd HH:mm')}</div>
                <div><span className="text-muted-foreground">{t.customer}:</span> {selectedSale.customers?.name || '-'}</div>
                <div><span className="text-muted-foreground">{t.paymentMethod}:</span> {selectedSale.payment_method}</div>
                <div><span className="text-muted-foreground">{t.status}:</span> {selectedSale.status}</div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead className="text-center">{t.quantity}</TableHead>
                      <TableHead>{t.price}</TableHead>
                      <TableHead>{t.total}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.sale_items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{language === 'ar' ? item.products?.name_ar || item.products?.name : item.products?.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{item.unit_price?.toLocaleString()}</TableCell>
                        <TableCell>{item.total_price?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between"><span>{t.subtotal}:</span><span>{selectedSale.subtotal?.toLocaleString()}</span></div>
                  {selectedSale.tax_amount > 0 && <div className="flex justify-between"><span>{t.tax}:</span><span>{selectedSale.tax_amount?.toLocaleString()}</span></div>}
                  {selectedSale.discount_amount > 0 && <div className="flex justify-between text-red-600"><span>{t.discount}:</span><span>-{selectedSale.discount_amount?.toLocaleString()}</span></div>}
                  <div className="flex justify-between font-bold text-lg border-t pt-2"><span>{t.netTotal}:</span><span>{selectedSale.total_amount?.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Details Modal */}
      <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw size={20} />
              {language === 'ar' ? 'تفاصيل المرتجع' : 'Return Details'} - {selectedReturn?.return_number}
            </DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">{t.date}:</span> {format(new Date(selectedReturn.return_date), 'yyyy-MM-dd HH:mm')}</div>
                <div><span className="text-muted-foreground">{t.customer}:</span> {selectedReturn.customers?.name || '-'}</div>
                <div><span className="text-muted-foreground">{language === 'ar' ? 'سبب الإرجاع' : 'Reason'}:</span> {selectedReturn.reason || '-'}</div>
                <div><span className="text-muted-foreground">{t.status}:</span> {selectedReturn.status}</div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead className="text-center">{t.quantity}</TableHead>
                      <TableHead>{t.price}</TableHead>
                      <TableHead>{t.total}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReturn.pos_return_items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{language === 'ar' ? item.products?.name_ar || item.product_name : item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{item.unit_price?.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">-{item.total_price?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between font-bold text-lg text-red-600"><span>{t.netTotal}:</span><span>-{selectedReturn.total_amount?.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTransactionsList;
