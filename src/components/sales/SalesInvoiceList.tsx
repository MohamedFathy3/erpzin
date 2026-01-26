import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Printer } from "lucide-react";
import { formatDate } from "@/lib/utils";
import SalesInvoiceForm from "./SalesInvoiceForm";
import InvoiceDetails from "./InvoiceDetails";
import AdvancedFilter, { FilterField, FilterValues } from "@/components/ui/advanced-filter";

const SalesInvoiceList = () => {
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  // Fetch branches for filter
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, name_ar').eq('is_active', true);
      return data || [];
    }
  });

  // Fetch salesmen for filter
  const { data: salesmen = [] } = useQuery({
    queryKey: ['salesmen'],
    queryFn: async () => {
      const { data } = await supabase.from('salesmen').select('id, name, name_ar').eq('is_active', true);
      return data || [];
    }
  });

  const filterFields: FilterField[] = [
    { key: 'search', label: 'Invoice/Customer', labelAr: 'الفاتورة/العميل', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
    { key: 'payment_status', label: 'Payment Status', labelAr: 'حالة الدفع', type: 'select', options: [
      { value: 'paid', label: 'Paid', labelAr: 'مدفوع' },
      { value: 'pending', label: 'Pending', labelAr: 'معلق' },
      { value: 'partial', label: 'Partial', labelAr: 'جزئي' },
    ]},
    { key: 'invoice_type', label: 'Invoice Type', labelAr: 'نوع الفاتورة', type: 'select', options: [
      { value: 'cash', label: 'Cash', labelAr: 'نقدي' },
      { value: 'credit', label: 'Credit', labelAr: 'آجل' },
    ]},
    { key: 'branch_id', label: 'Branch', labelAr: 'الفرع', type: 'select', options: branches.map((b: any) => ({ value: b.id, label: b.name, labelAr: b.name_ar })) },
    { key: 'salesman_id', label: 'Salesman', labelAr: 'المندوب', type: 'select', options: salesmen.map((s: any) => ({ value: s.id, label: s.name, labelAr: s.name_ar })) },
    { key: 'date', label: 'Date', labelAr: 'التاريخ', type: 'dateRange' },
    { key: 'amount', label: 'Amount', labelAr: 'المبلغ', type: 'numberRange' },
  ];

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['sales-invoices', filterValues],
    queryFn: async () => {
      let query = supabase
        .from('sales_invoices')
        .select(`
          *,
          customer:customers(id, name, name_ar, phone),
          salesman:salesmen(id, name, name_ar),
          branch:branches(id, name, name_ar)
        `)
        .order('created_at', { ascending: false });

      if (filterValues.search) {
        query = query.or(`invoice_number.ilike.%${filterValues.search}%`);
      }
      if (filterValues.payment_status && filterValues.payment_status !== 'all') {
        query = query.eq('payment_status', filterValues.payment_status);
      }
      if (filterValues.invoice_type && filterValues.invoice_type !== 'all') {
        query = query.eq('invoice_type', filterValues.invoice_type);
      }
      if (filterValues.branch_id && filterValues.branch_id !== 'all') {
        query = query.eq('branch_id', filterValues.branch_id);
      }
      if (filterValues.salesman_id && filterValues.salesman_id !== 'all') {
        query = query.eq('salesman_id', filterValues.salesman_id);
      }
      if (filterValues.date_from) {
        query = query.gte('invoice_date', filterValues.date_from.split('T')[0]);
      }
      if (filterValues.date_to) {
        query = query.lte('invoice_date', filterValues.date_to.split('T')[0]);
      }
      if (filterValues.amount_min) {
        query = query.gte('total_amount', Number(filterValues.amount_min));
      }
      if (filterValues.amount_max) {
        query = query.lte('total_amount', Number(filterValues.amount_max));
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: language === 'ar' ? 'مدفوع' : 'Paid', variant: 'default' },
      pending: { label: language === 'ar' ? 'معلق' : 'Pending', variant: 'secondary' },
      partial: { label: language === 'ar' ? 'جزئي' : 'Partial', variant: 'outline' },
      cancelled: { label: language === 'ar' ? 'ملغي' : 'Cancelled', variant: 'destructive' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{language === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices'}</CardTitle>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Advanced Filter */}
          <div className="mb-4">
            <AdvancedFilter
              fields={filterFields}
              values={filterValues}
              onChange={setFilterValues}
              onReset={() => setFilterValues({})}
              language={language}
            />
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                  <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </TableCell>
                  </TableRow>
                ) : invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices?.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          {language === 'ar' 
                            ? invoice.customer?.name_ar || invoice.customer?.name 
                            : invoice.customer?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.customer?.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.invoice_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.total_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {invoice.paid_amount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.payment_status || 'pending')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SalesInvoiceForm 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
      />

      {selectedInvoice && (
        <InvoiceDetails
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </>
  );
};

export default SalesInvoiceList;
