import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Search,
  Building2,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Eye
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AccountsPayableProps {
  language: string;
}

const AccountsPayable: React.FC<AccountsPayableProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Fetch purchase invoices with supplier info
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['accounts-payable', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('purchase_invoices')
        .select(`
          *,
          supplier:suppliers(id, name, name_ar, phone, balance)
        `)
        .order('invoice_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent payments
  const { data: recentPayments = [] } = useQuery({
    queryKey: ['recent-supplier-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select(`
          *,
          supplier:suppliers(name, name_ar),
          invoice:purchase_invoices(invoice_number)
        `)
        .order('payment_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Make payment mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount, method }: { invoiceId: string; amount: number; method: string }) => {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      // Generate payment number
      const { data: paymentNumber } = await supabase.rpc('generate_payment_number');

      // Create payment record
      const { error: paymentError } = await supabase
        .from('supplier_payments')
        .insert({
          payment_number: paymentNumber,
          supplier_id: invoice.supplier_id,
          invoice_id: invoiceId,
          amount,
          payment_method: method
        });

      if (paymentError) throw paymentError;

      // Update invoice paid amount
      const newPaidAmount = (Number(invoice.paid_amount) || 0) + amount;
      const newRemainingAmount = Number(invoice.total_amount) - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

      const { error: invoiceError } = await supabase
        .from('purchase_invoices')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: Math.max(0, newRemainingAmount),
          payment_status: newStatus
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Update supplier balance
      if (invoice.supplier_id) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('balance')
          .eq('id', invoice.supplier_id)
          .single();

        if (supplier) {
          await supabase
            .from('suppliers')
            .update({ balance: (Number(supplier.balance) || 0) - amount })
            .eq('id', invoice.supplier_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['recent-supplier-payments'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(language === 'ar' ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully');
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setSelectedInvoice(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handlePayment = () => {
    if (!selectedInvoice || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    const remaining = Number(selectedInvoice.remaining_amount) || Number(selectedInvoice.total_amount);

    if (amount <= 0 || amount > remaining) {
      toast.error(language === 'ar' ? 'مبلغ غير صحيح' : 'Invalid amount');
      return;
    }

    paymentMutation.mutate({
      invoiceId: selectedInvoice.id,
      amount,
      method: paymentMethod
    });
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.supplier?.name_ar?.includes(searchQuery)
  );

  const totalPayable = invoices
    .filter(inv => inv.payment_status !== 'paid')
    .reduce((sum, inv) => sum + Number(inv.remaining_amount || inv.total_amount), 0);

  const overdueInvoices = invoices.filter(inv => 
    inv.payment_status !== 'paid' && 
    inv.due_date && 
    new Date(inv.due_date) < new Date()
  );

  const getStatusBadge = (status: string, dueDate: string | null) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'paid';
    
    if (isOverdue) {
      return <Badge variant="destructive">{language === 'ar' ? 'متأخرة' : 'Overdue'}</Badge>;
    }

    const config: Record<string, { label: string; labelAr: string; variant: 'default' | 'secondary' | 'outline' }> = {
      paid: { label: 'Paid', labelAr: 'مدفوعة', variant: 'default' },
      partial: { label: 'Partial', labelAr: 'جزئي', variant: 'secondary' },
      unpaid: { label: 'Unpaid', labelAr: 'غير مدفوعة', variant: 'outline' }
    };
    const c = config[status] || config.unpaid;
    return <Badge variant={c.variant}>{language === 'ar' ? c.labelAr : c.label}</Badge>;
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { days: Math.abs(days), overdue: true };
    return { days, overdue: false };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-200 dark:border-orange-800">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي المستحقات' : 'Total Payable'}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {totalPayable.toLocaleString()} <span className="text-sm">ر.ي</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'فواتير معلقة' : 'Pending Invoices'}
                </p>
                <p className="text-2xl font-bold">
                  {invoices.filter(i => i.payment_status === 'unpaid').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={overdueInvoices.length > 0 ? 'border-red-500' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'فواتير متأخرة' : 'Overdue'}
                </p>
                <p className={`text-2xl font-bold ${overdueInvoices.length > 0 ? 'text-red-600' : ''}`}>
                  {overdueInvoices.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'مدفوعة هذا الشهر' : 'Paid This Month'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {invoices.filter(i => i.payment_status === 'paid').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">
            {language === 'ar' ? 'الفواتير' : 'Invoices'}
          </TabsTrigger>
          <TabsTrigger value="payments">
            {language === 'ar' ? 'المدفوعات الأخيرة' : 'Recent Payments'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="ps-10 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                      <SelectItem value="unpaid">{language === 'ar' ? 'غير مدفوعة' : 'Unpaid'}</SelectItem>
                      <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                      <SelectItem value="paid">{language === 'ar' ? 'مدفوعة' : 'Paid'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المتبقي' : 'Remaining'}</TableHead>
                      <TableHead>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                        </TableCell>
                      </TableRow>
                    ) : filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => {
                        const dueInfo = getDaysUntilDue(invoice.due_date);
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell>
                              {language === 'ar' 
                                ? invoice.supplier?.name_ar || invoice.supplier?.name 
                                : invoice.supplier?.name}
                            </TableCell>
                            <TableCell className="font-medium">
                              {Number(invoice.total_amount).toLocaleString()} ر.ي
                            </TableCell>
                            <TableCell className="text-green-600">
                              {Number(invoice.paid_amount || 0).toLocaleString()} ر.ي
                            </TableCell>
                            <TableCell className="text-orange-600 font-medium">
                              {Number(invoice.remaining_amount || invoice.total_amount).toLocaleString()} ر.ي
                            </TableCell>
                            <TableCell>
                              <div>
                                {invoice.due_date 
                                  ? format(new Date(invoice.due_date), 'yyyy/MM/dd')
                                  : '-'}
                                {dueInfo && (
                                  <p className={`text-xs ${dueInfo.overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {dueInfo.overdue 
                                      ? `${language === 'ar' ? 'متأخر' : 'Overdue'} ${dueInfo.days} ${language === 'ar' ? 'يوم' : 'days'}`
                                      : `${dueInfo.days} ${language === 'ar' ? 'يوم متبقي' : 'days left'}`}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.payment_status, invoice.due_date)}
                            </TableCell>
                            <TableCell>
                              {invoice.payment_status !== 'paid' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setPaymentAmount((Number(invoice.remaining_amount) || Number(invoice.total_amount)).toString());
                                    setShowPaymentDialog(true);
                                  }}
                                >
                                  <CreditCard size={14} className="me-1" />
                                  {language === 'ar' ? 'دفع' : 'Pay'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الدفعة' : 'Payment #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الفاتورة' : 'Invoice'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Method'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد مدفوعات' : 'No payments yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentPayments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.payment_number}</TableCell>
                          <TableCell>
                            {language === 'ar' 
                              ? payment.supplier?.name_ar || payment.supplier?.name 
                              : payment.supplier?.name}
                          </TableCell>
                          <TableCell>{payment.invoice?.invoice_number || '-'}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {Number(payment.amount).toLocaleString()} ر.ي
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.payment_date), 'yyyy/MM/dd HH:mm')}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ar' ? 'الفاتورة:' : 'Invoice:'}</span>
                  <span className="font-medium">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ar' ? 'المورد:' : 'Supplier:'}</span>
                  <span className="font-medium">
                    {language === 'ar' 
                      ? selectedInvoice.supplier?.name_ar || selectedInvoice.supplier?.name 
                      : selectedInvoice.supplier?.name}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>{language === 'ar' ? 'المتبقي:' : 'Remaining:'}</span>
                  <span className="text-orange-600">
                    {Number(selectedInvoice.remaining_amount || selectedInvoice.total_amount).toLocaleString()} ر.ي
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'مبلغ الدفعة' : 'Payment Amount'}</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{language === 'ar' ? 'نقدي' : 'Cash'}</SelectItem>
                    <SelectItem value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                    <SelectItem value="check">{language === 'ar' ? 'شيك' : 'Check'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handlePayment} disabled={paymentMutation.isPending}>
              {paymentMutation.isPending 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPayable;
