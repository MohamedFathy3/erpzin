import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Printer, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import SalesInvoiceForm from "./SalesInvoiceForm";
import InvoiceDetails from "./InvoiceDetails";

const SalesInvoiceList = () => {
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['sales-invoices', searchQuery],
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

      if (searchQuery) {
        query = query.or(`invoice_number.ilike.%${searchQuery}%`);
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
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'بحث برقم الفاتورة...' : 'Search by invoice number...'}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
                        {format(new Date(invoice.invoice_date), 'yyyy/MM/dd', {
                          locale: language === 'ar' ? ar : undefined
                        })}
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
