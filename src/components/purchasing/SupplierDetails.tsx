import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building2, Phone, Mail, MapPin, CreditCard, FileText, 
  TrendingUp, TrendingDown, Wallet, Calendar, Edit2, X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SupplierDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: any;
  onEdit: () => void;
}

const SupplierDetails: React.FC<SupplierDetailsProps> = ({
  isOpen,
  onClose,
  supplier,
  onEdit
}) => {
  const { language } = useLanguage();

  // Fetch supplier transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['supplier-transactions', supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      const { data, error } = await supabase
        .from('supplier_transactions')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('transaction_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!supplier?.id
  });

  // Fetch purchase invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['supplier-invoices', supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('invoice_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!supplier?.id
  });

  // Fetch purchase orders
  const { data: orders = [] } = useQuery({
    queryKey: ['supplier-orders', supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('order_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!supplier?.id
  });

  if (!supplier) return null;

  const totalPurchases = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const balance = supplier.balance || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="text-primary" size={24} />
              {language === 'ar' ? supplier.name_ar || supplier.name : supplier.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 size={16} className="me-1" />
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Supplier Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {language === 'ar' ? 'معلومات الاتصال' : 'Contact Info'}
                </h4>
                {supplier.contact_person && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 size={14} className="text-muted-foreground" />
                    <span>{supplier.contact_person}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-muted-foreground" />
                    <span dir="ltr">{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</span>
                  <span className="font-semibold">{totalPurchases.toLocaleString()} YER</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{language === 'ar' ? 'المدفوع' : 'Paid'}</span>
                  <span className="font-semibold text-success">{totalPaid.toLocaleString()} YER</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">{language === 'ar' ? 'الرصيد المستحق' : 'Balance Due'}</span>
                  <span className={cn(
                    "font-bold text-lg",
                    balance > 0 ? "text-destructive" : "text-success"
                  )}>
                    {balance.toLocaleString()} YER
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Credit Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {language === 'ar' ? 'معلومات الائتمان' : 'Credit Info'}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{language === 'ar' ? 'حد الائتمان' : 'Credit Limit'}</span>
                  <span className="font-semibold">{(supplier.credit_limit || 0).toLocaleString()} YER</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</span>
                  <span className="font-semibold">{supplier.payment_terms || 30} {language === 'ar' ? 'يوم' : 'days'}</span>
                </div>
                {supplier.tax_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{language === 'ar' ? 'الرقم الضريبي' : 'Tax Number'}</span>
                    <span className="font-mono text-sm">{supplier.tax_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs for History */}
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transactions">
                {language === 'ar' ? 'كشف الحساب' : 'Transactions'}
              </TabsTrigger>
              <TabsTrigger value="invoices">
                {language === 'ar' ? 'الفواتير' : 'Invoices'}
              </TabsTrigger>
              <TabsTrigger value="orders">
                {language === 'ar' ? 'أوامر الشراء' : 'Orders'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead className="text-end">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead className="text-end">{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد معاملات' : 'No transactions'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx: any) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {new Date(tx.transaction_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.transaction_type === 'payment' ? 'default' : 'secondary'}>
                              {tx.transaction_type === 'invoice' 
                                ? (language === 'ar' ? 'فاتورة' : 'Invoice')
                                : tx.transaction_type === 'payment'
                                ? (language === 'ar' ? 'دفعة' : 'Payment')
                                : tx.transaction_type
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell className={cn(
                            "text-end font-medium",
                            tx.transaction_type === 'payment' ? 'text-success' : 'text-destructive'
                          )}>
                            {tx.transaction_type === 'payment' ? '-' : '+'}{Number(tx.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-end font-semibold">
                            {Number(tx.balance_after).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد فواتير' : 'No invoices'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                          <TableCell>
                            {new Date(inv.invoice_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}
                          </TableCell>
                          <TableCell>{Number(inv.total_amount).toLocaleString()} YER</TableCell>
                          <TableCell>{Number(inv.paid_amount).toLocaleString()} YER</TableCell>
                          <TableCell>
                            <Badge variant={
                              inv.payment_status === 'paid' ? 'default' :
                              inv.payment_status === 'partial' ? 'secondary' : 'destructive'
                            }>
                              {inv.payment_status === 'paid' 
                                ? (language === 'ar' ? 'مدفوعة' : 'Paid')
                                : inv.payment_status === 'partial'
                                ? (language === 'ar' ? 'جزئي' : 'Partial')
                                : (language === 'ar' ? 'غير مدفوعة' : 'Unpaid')
                              }
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'رقم الطلب' : 'Order #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد أوامر شراء' : 'No purchase orders'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.order_number}</TableCell>
                          <TableCell>
                            {new Date(order.order_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}
                          </TableCell>
                          <TableCell>{Number(order.total_amount).toLocaleString()} YER</TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === 'received' ? 'default' :
                              order.status === 'approved' ? 'secondary' :
                              order.status === 'cancelled' ? 'destructive' : 'outline'
                            }>
                              {order.status === 'received' 
                                ? (language === 'ar' ? 'مستلم' : 'Received')
                                : order.status === 'approved'
                                ? (language === 'ar' ? 'معتمد' : 'Approved')
                                : order.status === 'cancelled'
                                ? (language === 'ar' ? 'ملغي' : 'Cancelled')
                                : (language === 'ar' ? 'قيد الانتظار' : 'Pending')
                              }
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierDetails;
