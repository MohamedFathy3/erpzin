import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SupplierForm from '@/components/purchasing/SupplierForm';
import SupplierDetails from '@/components/purchasing/SupplierDetails';
import PurchaseInvoiceForm from '@/components/purchasing/PurchaseInvoiceForm';
import SupplierPaymentForm from '@/components/purchasing/SupplierPaymentForm';
import PurchaseOrderList from '@/components/purchasing/PurchaseOrderList';
import { cn } from '@/lib/utils';
import { 
  Plus, Search, Truck, Package, FileText, Building2, Phone, Mail, User, 
  Eye, Edit2, Wallet, CreditCard, TrendingUp, Receipt, ShoppingCart
} from 'lucide-react';

const Purchasing = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('invoices');
  
  // Modals
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch purchase invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['purchase_invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*, suppliers(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch purchase orders
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_invoices'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
  };

  const totalBalance = suppliers.reduce((sum, s) => sum + Number(s.balance || 0), 0);
  const totalInvoices = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const stats = [
    { label: language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices', value: invoices.length, icon: <FileText className="text-primary" size={24} />, color: 'bg-primary/10' },
    { label: language === 'ar' ? 'قيمة المشتريات' : 'Purchase Value', value: `${totalInvoices.toLocaleString()} YER`, icon: <Receipt className="text-chart-2" size={24} />, color: 'bg-chart-2/10' },
    { label: language === 'ar' ? 'أوامر الشراء' : 'Orders', value: purchaseOrders.length, icon: <ShoppingCart className="text-chart-3" size={24} />, color: 'bg-chart-3/10' },
    { label: language === 'ar' ? 'المستحق للموردين' : 'Payables', value: `${totalBalance.toLocaleString()} YER`, icon: <Wallet className="text-destructive" size={24} />, color: 'bg-destructive/10' },
  ];

  return (
    <MainLayout activeItem="purchasing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'إدارة المشتريات والموردين' : 'Purchasing & Suppliers'}</h1>
            <p className="text-muted-foreground">{language === 'ar' ? 'إدارة فواتير الشراء والموردين والمدفوعات' : 'Manage purchase invoices, suppliers and payments'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowPaymentForm(true)}>
              <Wallet size={16} className="me-2" />
              {language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
            </Button>
            <Button onClick={() => setShowInvoiceForm(true)} className="bg-primary">
              <Plus size={16} className="me-2" />
              {language === 'ar' ? 'فاتورة شراء' : 'Purchase Invoice'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${stat.color}`}>{stat.icon}</div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="invoices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText size={16} className="me-2" />
              {language === 'ar' ? 'فواتير الشراء' : 'Invoices'}
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 dark:data-[state=active]:bg-emerald-900 dark:data-[state=active]:text-emerald-100">
              <ShoppingCart size={16} className="me-2" />
              {language === 'ar' ? 'أوامر الشراء' : 'Orders'}
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-800 dark:data-[state=active]:bg-violet-900 dark:data-[state=active]:text-violet-100">
              <Building2 size={16} className="me-2" />
              {language === 'ar' ? 'الموردين' : 'Suppliers'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} className="ps-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد فواتير' : 'No invoices yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                          <TableCell>{language === 'ar' ? inv.suppliers?.name_ar || inv.suppliers?.name : inv.suppliers?.name}</TableCell>
                          <TableCell>{Number(inv.total_amount).toLocaleString()} YER</TableCell>
                          <TableCell>{Number(inv.paid_amount).toLocaleString()} YER</TableCell>
                          <TableCell>
                            <Badge variant={inv.payment_status === 'paid' ? 'default' : inv.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                              {inv.payment_status === 'paid' ? (language === 'ar' ? 'مدفوعة' : 'Paid') : inv.payment_status === 'partial' ? (language === 'ar' ? 'جزئي' : 'Partial') : (language === 'ar' ? 'غير مدفوعة' : 'Unpaid')}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(inv.invoice_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} className="ps-10" />
                  </div>
                  <Button variant="outline" onClick={() => { setSelectedSupplier(null); setShowSupplierForm(true); }}>
                    <Plus size={18} className="me-2" />
                    {language === 'ar' ? 'مورد جديد' : 'New Supplier'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {suppliers.map((supplier: any) => (
                    <Card key={supplier.id} className="border hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedSupplier(supplier); setShowSupplierDetails(true); }}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10"><Building2 className="text-primary" size={20} /></div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{language === 'ar' ? supplier.name_ar || supplier.name : supplier.name}</h3>
                            {supplier.phone && <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground"><Phone size={14} /><span dir="ltr">{supplier.phone}</span></div>}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t">
                              <span className="text-xs text-muted-foreground">{language === 'ar' ? 'الرصيد' : 'Balance'}</span>
                              <span className={cn("font-semibold", Number(supplier.balance) > 0 ? "text-destructive" : "text-success")}>{Number(supplier.balance || 0).toLocaleString()} YER</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <PurchaseOrderList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <SupplierForm isOpen={showSupplierForm} onClose={() => setShowSupplierForm(false)} onSave={refetchAll} editSupplier={selectedSupplier} />
      <SupplierDetails isOpen={showSupplierDetails} onClose={() => setShowSupplierDetails(false)} supplier={selectedSupplier} onEdit={() => { setShowSupplierDetails(false); setShowSupplierForm(true); }} />
      <PurchaseInvoiceForm isOpen={showInvoiceForm} onClose={() => setShowInvoiceForm(false)} onSave={refetchAll} />
      <SupplierPaymentForm isOpen={showPaymentForm} onClose={() => setShowPaymentForm(false)} onSave={refetchAll} />
    </MainLayout>
  );
};

export default Purchasing;
