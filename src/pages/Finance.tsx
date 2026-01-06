import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Receipt,
  Wallet,
  CreditCard,
  PieChart
} from 'lucide-react';

const Finance = () => {
  const { language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('sales');

  // Fetch sales
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, customers(name, name_ar)')
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const translations = {
    en: {
      title: 'Financial Management',
      sales: 'Sales',
      expenses: 'Expenses',
      newExpense: 'New Expense',
      search: 'Search...',
      invoice: 'Invoice',
      customer: 'Customer',
      amount: 'Amount',
      payment: 'Payment',
      date: 'Date',
      status: 'Status',
      category: 'Category',
      description: 'Description',
      totalSales: 'Total Sales',
      totalExpenses: 'Total Expenses',
      netProfit: 'Net Profit',
      transactions: 'Transactions'
    },
    ar: {
      title: 'الإدارة المالية',
      sales: 'المبيعات',
      expenses: 'المصروفات',
      newExpense: 'مصروف جديد',
      search: 'بحث...',
      invoice: 'الفاتورة',
      customer: 'العميل',
      amount: 'المبلغ',
      payment: 'الدفع',
      date: 'التاريخ',
      status: 'الحالة',
      category: 'الفئة',
      description: 'الوصف',
      totalSales: 'إجمالي المبيعات',
      totalExpenses: 'إجمالي المصروفات',
      netProfit: 'صافي الربح',
      transactions: 'المعاملات'
    }
  };

  const t = translations[language];

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalSales - totalExpenses;

  const stats = [
    { 
      label: t.totalSales, 
      value: `${totalSales.toLocaleString()} YER`, 
      icon: <TrendingUp className="text-accent" size={24} />,
      color: 'bg-accent/10',
      trend: '+12%'
    },
    { 
      label: t.totalExpenses, 
      value: `${totalExpenses.toLocaleString()} YER`, 
      icon: <TrendingDown className="text-destructive" size={24} />,
      color: 'bg-destructive/10',
      trend: '-5%'
    },
    { 
      label: t.netProfit, 
      value: `${netProfit.toLocaleString()} YER`, 
      icon: <DollarSign className="text-primary" size={24} />,
      color: 'bg-primary/10',
      trend: netProfit > 0 ? '+' : ''
    },
    { 
      label: t.transactions, 
      value: sales.length + expenses.length, 
      icon: <Receipt className="text-info" size={24} />,
      color: 'bg-info/10'
    }
  ];

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard size={16} />;
      default: return <Wallet size={16} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; labelAr: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      completed: { label: 'Completed', labelAr: 'مكتمل', variant: 'default' },
      pending: { label: 'Pending', labelAr: 'قيد الانتظار', variant: 'secondary' },
      refunded: { label: 'Refunded', labelAr: 'مسترجع', variant: 'destructive' }
    };
    const c = config[status] || config.completed;
    return <Badge variant={c.variant}>{language === 'ar' ? c.labelAr : c.label}</Badge>;
  };

  const expenseCategories = [
    { value: 'rent', label: language === 'ar' ? 'إيجار' : 'Rent' },
    { value: 'utilities', label: language === 'ar' ? 'مرافق' : 'Utilities' },
    { value: 'salaries', label: language === 'ar' ? 'رواتب' : 'Salaries' },
    { value: 'supplies', label: language === 'ar' ? 'مستلزمات' : 'Supplies' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' }
  ];

  return (
    <MainLayout activeItem="finance">
      <div className="space-y-6" dir={direction}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    {stat.trend && (
                      <p className={`text-xs ${stat.trend.startsWith('+') ? 'text-accent' : 'text-destructive'}`}>
                        {stat.trend}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sales">{t.sales}</TabsTrigger>
            <TabsTrigger value="expenses">{t.expenses}</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-4">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="relative max-w-sm">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input placeholder={t.search} className="ps-10" />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.invoice}</TableHead>
                      <TableHead>{t.customer}</TableHead>
                      <TableHead>{t.amount}</TableHead>
                      <TableHead>{t.payment}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.date}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد مبيعات' : 'No sales yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                          <TableCell>
                            {sale.customers 
                              ? (language === 'ar' ? sale.customers.name_ar || sale.customers.name : sale.customers.name)
                              : '-'}
                          </TableCell>
                          <TableCell>{Number(sale.total_amount).toLocaleString()} YER</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentIcon(sale.payment_method || 'cash')}
                              <span className="capitalize">{sale.payment_method}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(sale.status)}</TableCell>
                          <TableCell>{new Date(sale.sale_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="relative max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input placeholder={t.search} className="ps-10" />
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="gradient-success">
                        <Plus size={18} className="me-2" />
                        {t.newExpense}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.newExpense}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t.category}</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder={t.category} />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseCategories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t.amount}</Label>
                          <Input type="number" placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.description}</Label>
                          <Input placeholder={t.description} />
                        </div>
                        <Button className="w-full gradient-success">{t.newExpense}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.category}</TableHead>
                      <TableHead>{t.description}</TableHead>
                      <TableHead>{t.amount}</TableHead>
                      <TableHead>{t.payment}</TableHead>
                      <TableHead>{t.date}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد مصروفات' : 'No expenses yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{expense.category}</Badge>
                          </TableCell>
                          <TableCell>{expense.description || '-'}</TableCell>
                          <TableCell className="text-destructive font-medium">
                            -{Number(expense.amount).toLocaleString()} YER
                          </TableCell>
                          <TableCell className="capitalize">{expense.payment_method}</TableCell>
                          <TableCell>{new Date(expense.expense_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Finance;
