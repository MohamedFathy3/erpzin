import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalSettings } from "@/contexts/RegionalSettingsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import CompanyHeader from "@/components/shared/CompanyHeader";

interface InvoiceDetailsProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceDetails = ({ invoice, isOpen, onClose }: InvoiceDetailsProps) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  // Fetch invoice items
  const { data: items } = useQuery({
    queryKey: ['sales-invoice-items', invoice?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      if (error) throw error;
      return data;
    },
    enabled: !!invoice?.id
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

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            {language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'}
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:p-8">
          {/* Company Header with Logo */}
          <CompanyHeader 
            variant="print" 
            branchId={invoice.branch_id}
            showBranch={true}
          />
          
          {/* Invoice Number and Status */}
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="text-xl font-bold">{invoice.invoice_number}</h3>
              <p className="text-muted-foreground">
                {formatDate(invoice.invoice_date, true)}
              </p>
            </div>
            <div>
              {getStatusBadge(invoice.payment_status)}
            </div>
          </div>

          {/* Customer & Invoice Info */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-2">
                  {language === 'ar' ? 'معلومات العميل' : 'Customer Info'}
                </h4>
                <p className="font-medium">
                  {language === 'ar' 
                    ? invoice.customer?.name_ar || invoice.customer?.name 
                    : invoice.customer?.name}
                </p>
                <p className="text-muted-foreground">{invoice.customer?.phone}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-2">
                  {language === 'ar' ? 'معلومات الفاتورة' : 'Invoice Info'}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'طريقة الدفع:' : 'Payment:'}
                  </span>
                  <span>{invoice.payment_method}</span>
                  {invoice.due_date && (
                    <>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'الاستحقاق:' : 'Due:'}
                      </span>
                      <span>{formatDate(invoice.due_date)}</span>
                    </>
                  )}
                  {invoice.salesman && (
                    <>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'المندوب:' : 'Salesman:'}
                      </span>
                      <span>
                        {language === 'ar' 
                          ? invoice.salesman?.name_ar || invoice.salesman?.name 
                          : invoice.salesman?.name}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الخصم' : 'Discount'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.discount_amount || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total_price || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}
                </span>
                <span>{formatCurrency(invoice.subtotal || 0)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>{language === 'ar' ? 'الخصم:' : 'Discount:'}</span>
                  <span>-{formatCurrency(invoice.discount_amount || 0)}</span>
                </div>
              )}
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'الضريبة:' : 'Tax:'} ({invoice.tax_percent}%)
                  </span>
                  <span>{formatCurrency(invoice.tax_amount || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                <span className="text-primary">{formatCurrency(invoice.total_amount || 0)}</span>
              </div>
              {invoice.remaining_amount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>{language === 'ar' ? 'المتبقي:' : 'Remaining:'}</span>
                  <span>{formatCurrency(invoice.remaining_amount || 0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">
                {language === 'ar' ? 'ملاحظات' : 'Notes'}
              </h4>
              <p className="text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetails;
