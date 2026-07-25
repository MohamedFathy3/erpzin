/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from "react";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalSettings } from "@/contexts/RegionalSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, DollarSign, CreditCard, Wallet, Clock, User, Building2, Package, Truck, Calendar, Hash, Percent, Tag, Info, Receipt, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import CompanyHeader from "@/components/shared/CompanyHeader";
import api from "@/lib/api";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

interface InvoiceDetailsProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

// مكون الطباعة المتقدم
const PrintTemplate = ({ invoice, companyInfo, language, formatCurrency }: any) => {
  const isArabic = language === 'ar';

  // حساب خصم المنتجات
  const getItemsDiscount = () => {
    return invoice.items?.reduce((sum: number, item: any) => {
      const itemDiscount = item.discount_amount || 
                          (item.price * item.quantity - item.total) || 0;
      return sum + Number(itemDiscount);
    }, 0) || 0;
  };

  // حساب التفاصيل المالية
  const subtotal = Number(invoice.total_amount || 0);
  const itemsDiscount = getItemsDiscount();
  const discountPercent = Number(invoice.discount_percentage || 0);
  const discountAmount = Number(invoice.discount_amount || 0);
  const totalDiscount = itemsDiscount + discountAmount;
  const netTotal = Number(invoice.net_total || subtotal);
  const taxAmount = Number(invoice.tax_amount || 0);
  const total = netTotal + taxAmount;
  const taxRate = Number(invoice.tax || 0);

  const paidAmount = Number(invoice.paid_amount || 0);
  const remainingAmount = Number(invoice.remaining_amount || 0);

  const getPaymentMethodText = (method: string) => {
    const methods: Record<string, { ar: string; en: string }> = {
      cash: { ar: 'نقدي', en: 'Cash' },
      card: { ar: 'بطاقة ائتمان', en: 'Credit Card' },
      wallet: { ar: 'محفظة إلكترونية', en: 'Digital Wallet' },
      credit: { ar: 'آجل', en: 'Credit' }
    };
    return isArabic ? methods[method]?.ar : methods[method]?.en;
  };

  const getPaymentStatusText = (status: string) => {
    const statuses: Record<string, { ar: string; en: string }> = {
      paid: { ar: 'مدفوع', en: 'Paid' },
      pending: { ar: 'معلق', en: 'Pending' },
      partial: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' }
    };
    return isArabic ? statuses[status]?.ar : statuses[status]?.en;
  };

  return (
    <div style={{ direction: isArabic ? 'rtl' : 'ltr', fontFamily: 'Arial, sans-serif', padding: '32px', backgroundColor: 'white' }}>
      {/* Header */}
      <div style={{ borderBottom: '4px solid #2563eb', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {companyInfo?.logo && (
              <img src={companyInfo.logo} alt="Logo" style={{ height: '64px', width: 'auto', marginBottom: '12px', objectFit: 'contain' }} />
            )}
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              {isArabic ? companyInfo?.nameAr || companyInfo?.name : companyInfo?.name}
            </h1>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              {companyInfo?.address && <div>📍 {isArabic ? companyInfo?.addressAr || companyInfo?.address : companyInfo?.address}</div>}
              {companyInfo?.phone && <div>📞 {companyInfo?.phone}</div>}
              {companyInfo?.email && <div>✉️ {companyInfo?.email}</div>}
              {companyInfo?.tax_id && <div>🆔 {isArabic ? 'الرقم الضريبي' : 'Tax ID'}: {companyInfo?.tax_id}</div>}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb', marginBottom: '8px' }}>
              {isArabic ? 'فاتورة مبيعات ' : 'TAX INVOICE'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: '#374151' }}>
              #{invoice.invoice_number}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {isArabic ? 'تاريخ الإصدار' : 'Issue Date'}: {formatDate(invoice.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Business Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
            <User size={18} color="#2563eb" />
            <h3 style={{ fontWeight: '600', margin: 0 }}>{isArabic ? 'بيانات العميل' : 'Customer Information'}</h3>
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <div><strong>{isArabic ? 'الاسم' : 'Name'}:</strong> {isArabic ? invoice.customer?.name_ar || invoice.customer?.name : invoice.customer?.name}</div>
            <div><strong>{isArabic ? 'رقم العميل' : 'Customer ID'}:</strong> #{invoice.customer?.id}</div>
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
            <Building2 size={18} color="#2563eb" />
            <h3 style={{ fontWeight: '600', margin: 0 }}>{isArabic ? 'معلومات الفاتورة' : 'Invoice Information'}</h3>
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{isArabic ? 'الفرع' : 'Branch'}:</strong></span>
              <span>{invoice.branch || '---'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{isArabic ? 'المخزن' : 'Warehouse'}:</strong></span>
              <span>{invoice.warehouse || '---'}</span>
            </div>
            {invoice.sales_representative && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>{isArabic ? 'المندوب' : 'Sales Rep'}:</strong></span>
                <span>{isArabic ? invoice.sales_representative?.name_ar || invoice.sales_representative?.name : invoice.sales_representative?.name}</span>
              </div>
            )}
            {invoice.treasury && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>{isArabic ? 'الخزينة' : 'Treasury'}:</strong></span>
                <span>{invoice.treasury}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{isArabic ? 'العملة' : 'Currency'}:</strong></span>
              <span>{invoice.currency || 'ر.ي'}</span>
            </div>
            {invoice.tax && invoice.tax !== '0' && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>{isArabic ? 'الضريبة' : 'Tax'}:</strong></span>
                <span>{invoice.tax}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#2563eb', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #3b82f6' }}>#</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #3b82f6' }}>{isArabic ? 'المنتج' : 'Product'}</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #3b82f6' }}>{isArabic ? 'الكمية' : 'Qty'}</th>
              <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #3b82f6' }}>{isArabic ? 'السعر' : 'Price'}</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #3b82f6' }}>{isArabic ? 'الخصم' : 'Discount'}</th>
              <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #3b82f6' }}>{isArabic ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item: any, idx: number) => {
              const itemDiscountAmount = item.discount_amount || 
                                        (item.price * item.quantity - item.total) || 0;
              const itemDiscountPercent = item.discount_percentage || 
                                         item.discount_percent || 
                                         (itemDiscountAmount > 0 ? (itemDiscountAmount / (item.price * item.quantity)) * 100 : 0);
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>{idx + 1}</td>
                  <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: '500' }}>{item.product_name}</div>
                    {item.product_id && <div style={{ fontSize: '11px', color: '#6b7280' }}>ID: {item.product_id}</div>}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>{item.quantity}</td>
                  <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #e5e7eb' }}>{formatCurrency(Number(item.price))}</td>
                  <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                    {itemDiscountAmount > 0 ? (
                      <div>
                        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                          {formatCurrency(itemDiscountAmount)}
                        </span>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                          ({Number(itemDiscountPercent).toFixed(1)}%)
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                    <div>
                      {itemDiscountAmount > 0 && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                          {formatCurrency(Number(item.price * item.quantity))}
                        </div>
                      )}
                      {formatCurrency(Number(item.total || item.price * item.quantity))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <div style={{ width: '360px' }}>
          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
            <span><strong>{isArabic ? 'المجموع الفرعي' : 'Subtotal'}:</strong></span>
            <span>{formatCurrency(Number(invoice.total_amount || 0))}</span>
          </div>

          {/* Items Discount */}
          {itemsDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#dc2626' }}>
              <span><strong>{isArabic ? 'خصم المنتجات' : 'Items Discount'}:</strong></span>
              <span>- {formatCurrency(itemsDiscount)}</span>
            </div>
          )}

          {/* Invoice Discount */}
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#dc2626' }}>
              <span><strong>{isArabic ? 'خصم الفاتورة' : 'Invoice Discount'} ({discountPercent}%):</strong></span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
          )}

          {/* Total Discount */}
          {totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb', color: '#b91c1c', fontWeight: 'bold' }}>
              <span><strong>{isArabic ? 'إجمالي الخصم' : 'Total Discount'}:</strong></span>
              <span>- {formatCurrency(totalDiscount)}</span>
            </div>
          )}

          {/* Tax */}
          {taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
              <span><strong>{isArabic ? 'الضريبة' : 'Tax'} ({taxRate || 0}%):</strong></span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}

          {/* Net Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb', fontWeight: 'bold', fontSize: '16px' }}>
            <span>{isArabic ? 'الصافي' : 'Net Total'}:</span>
            <span style={{ color: '#2563eb' }}>{formatCurrency(netTotal)}</span>
          </div>

          {/* Paid */}
          {paidAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#10b981' }}>
              <span><strong>{isArabic ? 'المدفوع' : 'Paid'}:</strong></span>
              <span>{formatCurrency(paidAmount)}</span>
            </div>
          )}

          {/* Remaining */}
          {remainingAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#f59e0b' }}>
              <span><strong>{isArabic ? 'المتبقي' : 'Remaining'}:</strong></span>
              <span>{formatCurrency(remainingAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment & Notes Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Wallet size={18} color="#16a34a" />
            <h4 style={{ fontWeight: '600', margin: 0, color: '#166534' }}>{isArabic ? 'معلومات الدفع' : 'Payment Information'}</h4>
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#166534' }}>{isArabic ? 'طريقة الدفع' : 'Payment Method'}:</span>
              <span style={{ fontWeight: '500' }}>{getPaymentMethodText(invoice.payment_method)}</span>
            </div>
            {invoice.due_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#166534' }}>{isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}:</span>
                <span>{formatDate(invoice.due_date)}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Info size={18} color="#2563eb" />
            <h4 style={{ fontWeight: '600', margin: 0, color: '#1e40af' }}>{isArabic ? 'ملاحظات' : 'Notes'}</h4>
          </div>
          <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
            {invoice.note || (isArabic ? 'لا توجد ملاحظات' : 'No notes')}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>
        <p style={{ margin: 0 }}>{isArabic ? 'شكراً لتسوقكم معنا' : 'Thank you for shopping with us'}</p>
        <p style={{ margin: '4px 0 0 0' }}>{isArabic ? 'هذه الفاتورة صادرة إلكترونياً وتعتبر صالحة بدون توقيع' : 'This invoice is electronically generated and valid without signature'}</p>
      </div>
    </div>
  );
};

const InvoiceDetails = ({ invoice, isOpen, onClose }: InvoiceDetailsProps) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const { user: authUser } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  // Company Info للطباعة
  const companyInfo = {
    name: authUser?.company_name || 'Company Name',
    nameAr: authUser?.company_name_ar || 'اسم الشركة',
    logo: authUser?.company_logo,
    address: authUser?.company_address,
    addressAr: authUser?.company_address_ar,
    phone: authUser?.company_phone,
    email: authUser?.company_email,
    tax_id: authUser?.company_tax_id,
  };

  const items = invoice?.items || [];

  // حساب الإحصائيات
  const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const total = parseFloat(invoice?.total_amount) || 0;
  const discountAmount = subtotal - total;

  // حساب خصم المنتجات
  const getItemsDiscount = (invoice: any) => {
    return invoice.items?.reduce((sum: number, item: any) => {
      const itemDiscount = item.discount_amount || 
                          (item.price * item.quantity - item.total) || 0;
      return sum + Number(itemDiscount);
    }, 0) || 0;
  };

  const getTotalDiscount = (invoice: any) => {
    return Number(invoice.discount_amount || 0) + getItemsDiscount(invoice);
  };

  // دالة عرض طريقة الدفع
  const getPaymentMethodBadge = (method: string) => {
    const methodConfig: Record<string, { label: string; className: string; icon: JSX.Element }> = {
      cash: {
        label: language === 'ar' ? 'نقدي' : 'Cash',
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        icon: <DollarSign className="h-3 w-3" />
      },
      card: {
        label: language === 'ar' ? 'بطاقة' : 'Card',
        className: 'bg-blue-500/10 text-blue-600 border-blue-200',
        icon: <CreditCard className="h-3 w-3" />
      },
      wallet: {
        label: language === 'ar' ? 'محفظة' : 'Wallet',
        className: 'bg-purple-500/10 text-purple-600 border-purple-200',
        icon: <Wallet className="h-3 w-3" />
      },
      credit: {
        label: language === 'ar' ? 'آجل' : 'Credit',
        className: 'bg-amber-500/10 text-amber-600 border-amber-200',
        icon: <Clock className="h-3 w-3" />
      }
    };
    const config = methodConfig[method] || methodConfig.cash;
    return (
      <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // دالة عرض حالة الفرق (للمقارنة بين المجموع الفرعي والإجمالي)
  const getDifferenceBadge = () => {
    const diff = subtotal - total;
    if (diff > 0) {
      return (
        <Badge className="bg-green-500/10 text-green-600 flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          خصم: {formatCurrency(diff)}
        </Badge>
      );
    } else if (diff < 0) {
      return (
        <Badge className="bg-red-500/10 text-red-600 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          زيادة: {formatCurrency(Math.abs(diff))}
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500/10 text-gray-600 flex items-center gap-1">
        <Minus className="h-3 w-3" />
        بدون خصم
      </Badge>
    );
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `invoice-${invoice?.invoice_number || 'print'}`,
    onAfterPrint: () => {
      toast.success(language === 'ar' ? 'تمت الطباعة بنجاح' : 'Print completed successfully');
    },
  });

  if (!invoice) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible p-0">
          {/* رأس الديالوج - يختفي عند الطباعة */}
          <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                {language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </div>
          </div>

          {/* محتوى الفاتورة - للطباعة */}
          <div ref={printRef}>
            <PrintTemplate
              invoice={invoice}
              companyInfo={companyInfo}
              language={language}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* محتوى العرض في الديالوج - نسخة محسنة للشاشة */}
          <div className="p-6 space-y-6 print:hidden">
            {/* بطاقة الملخص السريع */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600">{language === 'ar' ? 'الصافي' : 'Net Total'}</p>
                      <p className="text-xl font-bold text-blue-700">{formatCurrency(Number(invoice.net_total || invoice.total_amount))}</p>
                    </div>
                    <div className="p-2 bg-blue-200/50 rounded-lg"><DollarSign className="h-5 w-5 text-blue-600" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600">{language === 'ar' ? 'عدد الأصناف' : 'Items'}</p>
                      <p className="text-xl font-bold text-emerald-700">{items.length}</p>
                    </div>
                    <div className="p-2 bg-emerald-200/50 rounded-lg"><Package className="h-5 w-5 text-emerald-600" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-600">{language === 'ar' ? 'الكمية الإجمالية' : 'Total Qty'}</p>
                      <p className="text-xl font-bold text-purple-700">{totalItems}</p>
                    </div>
                    <div className="p-2 bg-purple-200/50 rounded-lg"><Hash className="h-5 w-5 text-purple-600" /></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-600">{language === 'ar' ? 'إجمالي الخصم' : 'Total Discount'}</p>
                      <p className="text-xl font-bold text-red-700">{formatCurrency(getTotalDiscount(invoice))}</p>
                    </div>
                    <div className="p-2 bg-red-200/50 rounded-lg"><Percent className="h-5 w-5 text-red-600" /></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* معلومات العميل والفاتورة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    <User className="h-4 w-4 text-primary" />
                    {language === 'ar' ? 'معلومات العميل' : 'Customer Info'}
                  </h4>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">
                      {language === 'ar' ? invoice.customer?.name_ar || invoice.customer?.name : invoice.customer?.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Hash className="h-3 w-3" />
                      ID: {invoice.customer?.id}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    <Building2 className="h-4 w-4 text-primary" />
                    {language === 'ar' ? 'معلومات الفاتورة' : 'Invoice Info'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'رقم الفاتورة:' : 'Invoice #:'}</span>
                    <span className="font-mono font-medium">{invoice.invoice_number}</span>

                    <span className="text-muted-foreground">{language === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                    <span>{formatDate(invoice.created_at, true)}</span>

                    <span className="text-muted-foreground">{language === 'ar' ? 'الفرع:' : 'Branch:'}</span>
                    <span>{invoice.branch || '---'}</span>

                    <span className="text-muted-foreground">{language === 'ar' ? 'المخزن:' : 'Warehouse:'}</span>
                    <span>{invoice.warehouse || '---'}</span>

                    {invoice.sales_representative && (
                      <>
                        <span className="text-muted-foreground">{language === 'ar' ? 'المندوب:' : 'Sales Rep:'}</span>
                        <span>{invoice.sales_representative?.name}</span>
                      </>
                    )}

                    {invoice.treasury && (
                      <>
                        <span className="text-muted-foreground">{language === 'ar' ? 'الخزينة:' : 'Treasury:'}</span>
                        <span>{invoice.treasury}</span>
                      </>
                    )}

                    <span className="text-muted-foreground">{language === 'ar' ? 'العملة:' : 'Currency:'}</span>
                    <span>{invoice.currency || 'YER'}</span>

                    {invoice.tax && invoice.tax !== '0' && (
                      <>
                        <span className="text-muted-foreground">{language === 'ar' ? 'الضريبة:' : 'Tax:'}</span>
                        <span>{invoice.tax}%</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* جدول المنتجات */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead className="text-center w-20">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead className="text-right w-32">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                    <TableHead className="text-right w-32">{language === 'ar' ? 'الخصم' : 'Discount'}</TableHead>
                    <TableHead className="text-right w-32">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد أصناف' : 'No items found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: any, index: number) => {
                      const qty = Number(item.quantity || 0);
                      const itemDiscountAmount = item.discount_amount || 
                                                (item.price * qty - item.total) || 0;
                      const total = Number(item.total || item.price * qty);

                      return (
                        <TableRow key={item.product_id || index}>
                          <TableCell className="font-mono text-sm">{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-muted-foreground">ID: {item.product_id}</div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{qty}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(Number(item.price))}</TableCell>
                          <TableCell className="text-right">
                            {itemDiscountAmount > 0 ? (
                              <span className="text-red-600 font-medium">
                                - {formatCurrency(itemDiscountAmount)}
                                {item.discount_percentage && 
                                  ` (${item.discount_percentage}%)`
                                }
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono text-primary">
                            {formatCurrency(total)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ملخص الفاتورة */}
            <div className="flex justify-end">
              <div className="w-96 space-y-2">
                <div className="space-y-2">
                  {/* السعر الأصلي */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'السعر الأصلي:' : 'Original Price:'}</span>
                    <span className="font-mono">{formatCurrency(Number(invoice.total_amount || 0))}</span>
                  </div>

                  {/* خصم المنتجات */}
                  {getItemsDiscount(invoice) > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>{language === 'ar' ? 'خصم المنتجات:' : 'Items Discount:'}</span>
                      <span className="font-mono">- {formatCurrency(getItemsDiscount(invoice))}</span>
                    </div>
                  )}

                  {/* خصم الفاتورة */}
                  {Number(invoice.discount_amount) > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>{language === 'ar' ? 'خصم الفاتورة:' : 'Invoice Discount:'}</span>
                      <span className="font-mono">
                        - {formatCurrency(Number(invoice.discount_amount))}
                        {invoice.discount_percentage && 
                          ` (${invoice.discount_percentage}%)`
                        }
                      </span>
                    </div>
                  )}

                  {/* إجمالي الخصم */}
                  {getTotalDiscount(invoice) > 0 && (
                    <div className="flex justify-between text-sm font-semibold text-red-700 border-t pt-2">
                      <span>{language === 'ar' ? 'إجمالي الخصم:' : 'Total Discount:'}</span>
                      <span className="font-mono">- {formatCurrency(getTotalDiscount(invoice))}</span>
                    </div>
                  )}

                  {/* الصافي */}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>{language === 'ar' ? 'الصافي:' : 'Net Total:'}</span>
                    <span className="text-primary font-mono">
                      {formatCurrency(Number(invoice.net_total || invoice.total_amount))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* الملاحظات */}
            {invoice.note && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  <Info className="h-4 w-4 text-primary" />
                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                </h4>
                <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {invoice.note}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceDetails;