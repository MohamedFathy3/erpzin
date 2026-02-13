import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // 👈 استيراد useAuth

interface PrintableInvoiceProps {
  data: any;
  type: 'sale' | 'return';
  language: 'ar' | 'en';
  companyInfo?: {
    name: string;
    name_ar: string;
    phone: string;
    fax?: string;
    address: string;
    taxNumber?: string;
    logo?: string;
  };
}

const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ data, type, language, companyInfo: propCompanyInfo }, ref) => {
    const isRtl = language === 'ar';
    const dir = isRtl ? 'rtl' : 'ltr';
    
    // 👇 جلب بيانات المستخدم من AuthContext
    const { user } = useAuth();
    
    // الترجمات
    const t = {
      en: {
        companyName: 'Yemen Company',
        invoice: 'Sales Invoice',
        return: 'Return Invoice',
        invoiceNumber: 'Invoice No.',
        returnNumber: 'Return No.',
        date: 'Date',
        customer: 'Customer',
        phone: 'Phone',
        items: 'Items',
        product: 'Product',
        quantity: 'Qty',
        price: 'Price',
        total: 'Total',
        subtotal: 'Subtotal',
        paid: 'Paid',
        remaining: 'Remaining',
        overpaid: 'Overpaid',
        paymentMethod: 'Payment Method',
        cash: 'Cash',
        card: 'Card',
        wallet: 'Wallet',
        credit: 'Credit',
        reason: 'Reason',
        refundMethod: 'Refund Method',
        thankYou: 'Thank you for your business',
        returnProcessed: 'Return processed successfully',
        taxNumber: 'Tax No.',
        pageOf: 'Page {current} of {total}',
      },
      ar: {
        companyName: 'شركة اليمن',
        invoice: 'فاتورة مبيعات',
        return: 'فاتورة مرتجع',
        invoiceNumber: 'رقم الفاتورة',
        returnNumber: 'رقم المرتجع',
        date: 'التاريخ',
        customer: 'العميل',
        phone: 'الهاتف',
        items: 'الأصناف',
        product: 'المنتج',
        quantity: 'الكمية',
        price: 'السعر',
        total: 'الإجمالي',
        subtotal: 'المجموع الفرعي',
        paid: 'المدفوع',
        remaining: 'المتبقي',
        overpaid: 'مدفوع زيادة',
        paymentMethod: 'طريقة الدفع',
        cash: 'نقدي',
        card: 'بطاقة',
        wallet: 'محفظة',
        credit: 'رصيد',
        reason: 'السبب',
        refundMethod: 'طريقة الاسترداد',
        thankYou: 'شكراً لتسوقكم معنا',
        returnProcessed: 'تمت عملية الإرجاع بنجاح',
        taxNumber: 'الرقم الضريبي',
        pageOf: 'صفحة {current} من {total}',
      },
    };

    const texts = t[language];

    // تنسيق الأرقام
    const formatNumber = (value: string | number, decimals: number = 2): string => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '0.00';
      return num.toFixed(decimals).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US');
    };

    // تنسيق التاريخ
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '-';
      try {
        return format(new Date(dateStr), 'yyyy-MM-dd HH:mm', {
          locale: language === 'ar' ? ar : undefined,
        });
      } catch {
        return dateStr;
      }
    };

    // 👇 معلومات الشركة من الـ API (مع fallback للقيم الافتراضية)
    const company = {
      name: user?.name || propCompanyInfo?.name || 'Yemen Company',
      name_ar: user?.name || propCompanyInfo?.name_ar || 'شركة اليمن', // لو مفيش اسم عربي، استخدم الاسم الإنجليزي
      phone: user?.phone || propCompanyInfo?.phone || '01-234567',
      fax: propCompanyInfo?.fax, // الفاكس لسه مش موجود في الـ API
      address: user?.address || propCompanyInfo?.address || 'اليمن - صنعاء',
      taxNumber: user?.tax_id || propCompanyInfo?.taxNumber || '',
      logo: user?.logo_icon || user?.logoUrl || propCompanyInfo?.logo || '/injaz-logo.png',
      website: user?.website,
      email: user?.email,
      commercial_register: user?.commercial_register,
      currency: user?.currency || 'YER',
    };

    const displayName = isRtl ? company.name_ar : company.name;

    if (type === 'sale') {
      // ========== فاتورة مبيعات ==========
      return (
        <div
          ref={ref}
          dir={dir}
          className="p-6 max-w-4xl mx-auto bg-white font-sans"
          style={{
            fontFamily: isRtl ? 'Cairo, sans-serif' : 'Inter, sans-serif',
          }}
        >
          {/* Header with Logo */}
          {/* <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div className="flex items-center gap-3">
              {company.logo && (
                <img
                  src={company.logo}
                  alt={displayName}
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    // لو الصورة مش موجودة، نخفيها
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-primary">{displayName}</h1>
                <p className="text-sm text-gray-600">{company.address}</p>
                {company.website && (
                  <p className="text-xs text-gray-500">{company.website}</p>
                )}
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm">📞 {company.phone}</p>
              {company.email && <p className="text-sm">✉️ {company.email}</p>}
              {company.taxNumber && (
                <p className="text-sm">🏷️ {texts.taxNumber}: {company.taxNumber}</p>
              )}
              {company.commercial_register && (
                <p className="text-sm">📋 سجل تجاري: {company.commercial_register}</p>
              )}
            </div>
          </div> */}

          {/* Invoice Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold border-b-2 border-primary inline-block pb-2 px-8">
              {texts.invoice}
            </h2>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600">{texts.invoiceNumber}</p>
              <p className="text-xl font-bold font-mono">{data.invoice_number}</p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600">{texts.date}</p>
              <p className="text-xl font-bold">{formatDate(data.created_at)}</p>
            </div>
          </div>

          {/* Customer Info */}
          {data.customer && (
            <div className="border p-4 rounded-lg mb-6 bg-gray-50">
              <h3 className="font-semibold mb-3 text-primary">{texts.customer}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{texts.customer}</p>
                  <p className="font-medium">
                    {isRtl ? data.customer.name_ar || data.customer.name : data.customer.name}
                  </p>
                </div>
                {data.customer.phone && (
                  <div>
                    <p className="text-sm text-gray-600">{texts.phone}</p>
                    <p className="font-medium" dir="ltr">{data.customer.phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-primary">{texts.items}</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary/10">
                  <th className="border p-2 text-right">#</th>
                  <th className="border p-2 text-right">{texts.product}</th>
                  <th className="border p-2 text-center">{texts.quantity}</th>
                  <th className="border p-2 text-right">{texts.price}</th>
                  <th className="border p-2 text-right">{texts.total}</th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item: any, index: number) => (
                  <tr key={index} className="even:bg-gray-50">
                    <td className="border p-2 text-right">{index + 1}</td>
                    <td className="border p-2">
                      {item.product_name || '-'}
                      {(item.color || item.size) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.color && <span>🎨 {item.color}</span>}
                          {item.size && (
                            <span className="mr-2">📏 {item.size}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="border p-2 text-center">{item.quantity || 0}</td>
                    <td className="border p-2 text-right">{formatNumber(item.price || '0')}</td>
                    <td className="border p-2 text-right font-medium">
                      {formatNumber(item.total || '0')} {company.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Payment Methods */}
            <div className="border p-4 rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-3 text-primary">{texts.paymentMethod}</h3>
              {data.payments?.map((payment: any, idx: number) => (
                <div key={idx} className="flex justify-between mb-2">
                  <span className="text-gray-600">
                    {payment.method === 'cash'
                      ? texts.cash
                      : payment.method === 'card'
                      ? texts.card
                      : payment.method === 'wallet'
                      ? texts.wallet
                      : payment.method === 'credit'
                      ? texts.credit
                      : payment.method}
                  </span>
                  <span className="font-medium">{formatNumber(payment.amount)} {company.currency}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border p-4 rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-3 text-primary">{texts.total}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{texts.subtotal}:</span>
                  <span>{formatNumber(data.amounts?.total || '0')} {company.currency}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>{texts.paid}:</span>
                  <span>{formatNumber(data.amounts?.paid || '0')} {company.currency}</span>
                </div>
                {parseFloat(data.amounts?.remaining || '0') !== 0 && (
                  <div
                    className={cn(
                      'flex justify-between font-bold border-t pt-2',
                      parseFloat(data.amounts?.remaining || '0') > 0
                        ? 'text-amber-600'
                        : 'text-blue-600'
                    )}
                  >
                    <span>
                      {parseFloat(data.amounts?.remaining || '0') > 0
                        ? texts.remaining
                        : texts.overpaid}
                      :
                    </span>
                    <span>
                      {formatNumber(
                        Math.abs(parseFloat(data.amounts?.remaining || '0'))
                      )}{' '}
                      {company.currency}
                      {parseFloat(data.amounts?.remaining || '0') < 0 && ' ↑'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-4 border-t text-gray-500 text-sm">
            <p>{texts.thankYou}</p>
            <p className="mt-1">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      );
    } else {
      // ========== فاتورة مرتجع ==========
      return (
        <div
          ref={ref}
          dir={dir}
          className="p-6 max-w-4xl mx-auto bg-white font-sans"
          style={{
            fontFamily: isRtl ? 'Cairo, sans-serif' : 'Inter, sans-serif',
          }}
        >
          {/* Header with Logo */}
          {/* <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div className="flex items-center gap-3">
              {company.logo && (
                <img
                  src={company.logo}
                  alt={displayName}
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-primary">{displayName}</h1>
                <p className="text-sm text-gray-600">{company.address}</p>
                {company.website && (
                  <p className="text-xs text-gray-500">{company.website}</p>
                )}
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm">📞 {company.phone}</p>
              {company.email && <p className="text-sm">✉️ {company.email}</p>}
              {company.taxNumber && (
                <p className="text-sm">🏷️ {texts.taxNumber}: {company.taxNumber}</p>
              )}
              {company.commercial_register && (
                <p className="text-sm">📋 سجل تجاري: {company.commercial_register}</p>
              )}
            </div>
          </div> */}

          {/* Return Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold border-b-2 border-red-500 inline-block pb-2 px-8 text-red-600">
              {texts.return}
            </h2>
          </div>

          {/* Return Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600">{texts.returnNumber}</p>
              <p className="text-xl font-bold font-mono">{data.return_number}</p>
            </div>
            <div className="border p-4 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600">{texts.date}</p>
              <p className="text-xl font-bold">
                {formatDate(data.return_date || data.created_at)}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          {(data.customer || data.invoice?.customer) && (
            <div className="border p-4 rounded-lg mb-6 bg-gray-50">
              <h3 className="font-semibold mb-3 text-primary">{texts.customer}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{texts.customer}</p>
                  <p className="font-medium">
                    {isRtl 
                      ? (data.customer?.name_ar || data.invoice?.customer?.name_ar || data.customer?.name || data.invoice?.customer?.name)
                      : (data.customer?.name || data.invoice?.customer?.name)
                    }
                  </p>
                </div>
                {(data.customer?.phone || data.invoice?.customer?.phone) && (
                  <div>
                    <p className="text-sm text-gray-600">{texts.phone}</p>
                    <p className="font-medium" dir="ltr">
                      {data.customer?.phone || data.invoice?.customer?.phone}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reason */}
          {data.reason && (
            <div className="border p-4 rounded-lg mb-6 bg-red-50 border-red-200">
              <p className="text-sm text-gray-600 mb-1">{texts.reason}</p>
              <p className="font-medium text-red-600">{data.reason}</p>
            </div>
          )}

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-primary">{texts.items}</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-red-500/10">
                  <th className="border p-2 text-right">#</th>
                  <th className="border p-2 text-right">{texts.product}</th>
                  <th className="border p-2 text-center">{texts.quantity}</th>
                  <th className="border p-2 text-right">{texts.price}</th>
                  <th className="border p-2 text-right">{texts.total}</th>
                </tr>
              </thead>
              <tbody>
                {data.return_items?.map((item: any, index: number) => (
                  <tr key={index} className="even:bg-gray-50">
                    <td className="border p-2 text-right">{index + 1}</td>
                    <td className="border p-2">
                      {item.product_name || '-'}
                      {(item.color || item.size) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.color && <span>🎨 {item.color}</span>}
                          {item.size && (
                            <span className="mr-2">📏 {item.size}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="border p-2 text-center">{item.quantity || 0}</td>
                    <td className="border p-2 text-right">
                      {formatNumber(item.unit_price || 0)}
                    </td>
                    <td className="border p-2 text-right font-medium text-red-600">
                      -{formatNumber(item.total_price || 0)} {company.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Refund Method and Total */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border p-4 rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-2 text-primary">{texts.refundMethod}</h3>
              <p className="text-lg">
                {data.refund_method === 'cash'
                  ? texts.cash
                  : data.refund_method === 'card'
                  ? texts.card
                  : data.refund_method === 'wallet'
                  ? texts.wallet
                  : data.refund_method === 'credit'
                  ? texts.credit
                  : data.refund_method}
              </p>
            </div>
            <div className="border p-4 rounded-lg bg-red-50 border-red-200">
              <h3 className="font-semibold mb-2 text-red-600">{texts.total}</h3>
              <p className="text-2xl font-bold text-red-600">
                -{formatNumber(data.total_amount || 0)} {company.currency}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-4 border-t text-gray-500 text-sm">
            <p>{texts.returnProcessed}</p>
            <p className="mt-1">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      );
    }
  }
);

PrintableInvoice.displayName = 'PrintableInvoice';

export default PrintableInvoice;