import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalSettings } from "@/contexts/RegionalSettingsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatDate } from "@/lib/utils";
import CompanyHeader from "@/components/shared/CompanyHeader";
import api from "@/lib/api";

interface InvoiceDetailsProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceDetails = ({ invoice, isOpen, onClose }: InvoiceDetailsProps) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  // ✅ Items جاهزة من الفاتورة نفسها
  const items = invoice?.items || [];

  // ✅ دالة عرض طريقة الدفع
  const getPaymentMethodBadge = (method: string) => {
    const methodConfig: Record<string, { label: string; className: string }> = {
      cash: { 
        label: language === 'ar' ? 'نقدي' : 'Cash', 
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
      },
      card: { 
        label: language === 'ar' ? 'بطاقة' : 'Card', 
        className: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
      },
      wallet: { 
        label: language === 'ar' ? 'محفظة' : 'Wallet', 
        className: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400'
      },
      credit: { 
        label: language === 'ar' ? 'آجل' : 'Credit', 
        className: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
      }
    };
    const config = methodConfig[method] || methodConfig.cash;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible">
        <DialogHeader className="flex flex-row items-center justify-between print:hidden">
          <DialogTitle>
            {language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'}
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 ml-2" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:p-8 print:bg-white">
          {/* Company Header */}
          <CompanyHeader 
            variant="print" 
            showBranch={true}
          />
          
          {/* Invoice Number */}
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="text-xl font-bold">{invoice.invoice_number}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {formatDate(invoice.created_at, true)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getPaymentMethodBadge(invoice.payment_method)}
            </div>
          </div>

          {/* Customer & Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  {language === 'ar' ? 'معلومات العميل' : 'Customer Info'}
                </h4>
                <div className="space-y-2">
                  <p className="font-medium text-lg">
                    {language === 'ar' 
                      ? invoice.customer?.name_ar || invoice.customer?.name 
                      : invoice.customer?.name}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Info */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  {language === 'ar' ? 'معلومات الفاتورة' : 'Invoice Info'}
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'طريقة الدفع:' : 'Payment:'}
                  </span>
                  <span className="font-medium">{getPaymentMethodBadge(invoice.payment_method)}</span>
                  
                  {invoice.due_date && (
                    <>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'تاريخ الاستحقاق:' : 'Due Date:'}
                      </span>
                      <span className="font-medium">{formatDate(invoice.due_date)}</span>
                    </>
                  )}
                  
                  {invoice.sales_representative && (
                    <>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'المندوب:' : 'Salesman:'}
                      </span>
                      <span className="font-medium">
                        {language === 'ar' 
                          ? invoice.sales_representative?.name_ar || invoice.sales_representative?.name 
                          : invoice.sales_representative?.name}
                      </span>
                    </>
                  )}

                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'الفرع:' : 'Branch:'}
                  </span>
                  <span className="font-medium">
                    {invoice.branch || '---'}
                  </span>

                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'المخزن:' : 'Warehouse:'}
                  </span>
                  <span className="font-medium">
                    {invoice.warehouse || '---'}
                  </span>

                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'العملة:' : 'Currency:'}
                  </span>
                  <span className="font-medium">
                    {invoice.currency || 'USD'}
                  </span>

                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'الضريبة:' : 'Tax:'}
                  </span>
                  <span className="font-medium">
                    {invoice.tax || '---'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12 font-bold">#</TableHead>
                  <TableHead className="font-bold">
                    {language === 'ar' ? 'المنتج' : 'Product'}
                  </TableHead>
                  <TableHead className="text-center font-bold">
                    {language === 'ar' ? 'الكمية' : 'Qty'}
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    {language === 'ar' ? 'السعر' : 'Price'}
                  </TableHead>
                  <TableHead className="text-right font-bold">
                    {language === 'ar' ? 'الإجمالي' : 'Total'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد أصناف' : 'No items found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: any, index: number) => (
                    <TableRow key={item.product_id || index} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.product_name}</div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(Number(item.price) || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {formatCurrency(Number(item.total) || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-72 space-y-3">
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                <span className="text-primary font-mono">
                  {formatCurrency(Number(invoice.total_amount) || 0)} {invoice.currency || 'USD'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.note && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full" />
                {language === 'ar' ? 'ملاحظات' : 'Notes'}
              </h4>
              <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {invoice.note}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 text-center text-xs text-muted-foreground">
            <p>
              {language === 'ar' 
                ? 'شكراً لتعاملكم معنا' 
                : 'Thank you for your business'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetails;