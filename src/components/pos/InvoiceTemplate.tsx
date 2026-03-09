import React, { forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

interface CompanyInfo {
  name: string;
  nameAr?: string;
  logo?: string;
  address?: string | null;
  addressAr?: string | null;
  phone?: string | null;
  email?: string;
  tax_id?: string | null;
  commercial_register?: string | null;
  website?: string | null;
  currency?: string | null;
}

interface InvoiceTemplateProps {
  invoiceData: {
    id: string;
    date: string;
    customer: { name: string; nameAr?: string; phone?: string } | null;
    cashierName?: string;
    branchName?: string;
    branchPhone?: string;
    branchAddress?: string;
    taxRate?: number;
    items: Array<{
      name: string;
      nameAr: string;
      quantity: number;
      price: number;
      sizeName?: string;
      sizeNameAr?: string;
      colorName?: string;
      colorNameAr?: string;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    payments: { method: string; amount: number }[];
    change?: number;
  };
  companyInfo: CompanyInfo;
}

const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceData, companyInfo }, ref) => {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const { formatCurrency } = useRegionalSettings();

    // ✅ قيم افتراضية آمنة
    const safeInvoiceData = {
      id: invoiceData.id || '',
      date: invoiceData.date || new Date().toISOString(),
      customer: invoiceData.customer || null,
      cashierName: invoiceData.cashierName || '---',
      branchName: invoiceData.branchName,
      branchPhone: invoiceData.branchPhone,
      branchAddress: invoiceData.branchAddress,
      items: invoiceData.items || [],
      subtotal: invoiceData.subtotal || 0,
      tax: invoiceData.tax || 0,
      total: invoiceData.total || 0,
      payments: invoiceData.payments || [],
      change: invoiceData.change || 0,
      taxRate: invoiceData.taxRate || 14,
    };

    // نصوص ثابتة حسب اللغة
    const texts = {
      invoice: isRTL ? 'فاتورة ضريبية' : 'Tax Invoice',
      invoiceNo: isRTL ? 'رقم الفاتورة' : 'Invoice No.',
      date: isRTL ? 'التاريخ' : 'Date',
      paymentMethod: isRTL ? 'طريقة الدفع' : 'Payment',
      cash: isRTL ? 'نقدي' : 'Cash',
      card: isRTL ? 'شبكة' : 'Card',
      customer: isRTL ? 'العميل' : 'Customer',
      cashier: isRTL ? 'الكاشير' : 'Cashier',
      branch: isRTL ? 'الفرع' : 'Branch',
      phone: isRTL ? 'تليفون' : 'Phone',
      address: isRTL ? 'العنوان' : 'Address',
      walkInCustomer: isRTL ? 'عميل عابر' : 'Walk-in Customer',
      notSpecified: isRTL ? 'غير محدد' : 'Not specified',
      product: isRTL ? 'الصنف' : 'Item',
      quantity: isRTL ? 'الكمية' : 'Qty',
      price: isRTL ? 'السعر' : 'Price',
      total: isRTL ? 'الإجمالي' : 'Total',
      subtotal: isRTL ? 'المجموع الفرعي' : 'Subtotal',
      tax: isRTL ? `الضريبة (${safeInvoiceData.taxRate}%)` : `VAT (${safeInvoiceData.taxRate}%)`,
      grandTotal: isRTL ? 'الإجمالي الكلي' : 'Grand Total',
      paid: isRTL ? 'المدفوع' : 'Paid',
      change: isRTL ? 'الباقي' : 'Change',
      thankYou: isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business',
      poweredBy: isRTL ? 'تم بواسطة Zain ERP' : 'Powered by Zain ERP',
    };

    // تجهيز نص طريقة الدفع
    const getPaymentMethodText = (method: string) => {
      switch (method.toLowerCase()) {
        case 'cash': return texts.cash;
        case 'card': return texts.card;
        default: return method;
      }
    };
    
    const paymentMethodsText = safeInvoiceData.payments.map(p => getPaymentMethodText(p.method)).join(' - ');

    return (
      <div
        ref={ref}
        className="bg-white text-black font-sans"
        style={{ 
          direction: isRTL ? 'rtl' : 'ltr',
          width: '80mm',
          maxWidth: '80mm',
          margin: '0 auto',
          padding: '4mm 3mm',
          fontSize: '10px',
          lineHeight: '1.3'
        }}
      >
        {/* Header - مع اللوجو وبيانات الشركة */}
        <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
          {/* اللوجو إذا كان موجود */}
          {companyInfo.logo && (
            <div className="flex justify-center mb-1">
              <img 
                src={companyInfo.logo} 
                alt={companyInfo.name}
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          
          {/* اسم الشركة - مع الاسم العربي */}
          <h1 className="text-sm font-bold text-black">
            {isRTL && companyInfo.nameAr ? companyInfo.nameAr : companyInfo.name}
          </h1>
          
          {/* بيانات الفرع إذا كانت موجودة */}
          {(safeInvoiceData.branchName || safeInvoiceData.branchAddress || safeInvoiceData.branchPhone) && (
            <div className="text-[9px] text-gray-700 mt-1">
              {safeInvoiceData.branchName && <p>{texts.branch}: {safeInvoiceData.branchName}</p>}
              {safeInvoiceData.branchAddress && <p>{safeInvoiceData.branchAddress}</p>}
              {safeInvoiceData.branchPhone && <p>{texts.phone}: {safeInvoiceData.branchPhone}</p>}
            </div>
          )}
          
          {/* بيانات الشركة الإضافية إذا لم يكن هناك بيانات فرع */}
          {!safeInvoiceData.branchName && companyInfo.address && (
            <p className="text-[9px] text-gray-700">
              {isRTL ? companyInfo.addressAr || companyInfo.address : companyInfo.address}
            </p>
          )}
          
          {!safeInvoiceData.branchPhone && companyInfo.phone && (
            <p className="text-[9px] text-gray-700">{texts.phone}: {companyInfo.phone}</p>
          )}
          
          {/* رقم الضريبة إذا كان موجود */}
          {companyInfo.tax_id && (
            <p className="text-[9px] text-gray-700">VAT: {companyInfo.tax_id}</p>
          )}
        </div>

        {/* Invoice Header - مع تنسيق جديد: رقم الفاتورة وطريقة الدفع يمين، التاريخ والكاشير يسار */}
        <div className="flex justify-between items-start text-[9px] mb-2 border-b border-dashed border-gray-300 pb-2">
          {/* الجانب الأيمن - رقم الفاتورة وطريقة الدفع */}
          <div className="text-left">
            <div><span className="font-bold">{texts.invoiceNo}:</span> <span className="font-mono">{String(safeInvoiceData.id).slice(-8)}</span></div>
            <div><span className="font-bold">{texts.paymentMethod}:</span> <span>{paymentMethodsText}</span></div>
          </div>
          
          {/* الجانب الأيسر - التاريخ والكاشير */}
          <div className="text-right">
            <div><span className="font-bold">{texts.date}:</span> <span>{new Date(safeInvoiceData.date).toLocaleDateString(isRTL ? 'ar' : 'en')}</span></div>
            <div><span className="font-bold">{texts.cashier}:</span> <span>{safeInvoiceData.cashierName}</span></div>
          </div>
        </div>

        {/* معلومات العميل إذا وجد */}
        {safeInvoiceData.customer ? (
          <div className="text-[9px] mb-2 border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between">
              <span className="font-bold">{texts.customer}:</span>
              <span>
                {isRTL && safeInvoiceData.customer.nameAr ? safeInvoiceData.customer.nameAr : safeInvoiceData.customer.name}
              </span>
            </div>
            {safeInvoiceData.customer.phone && (
              <div className="flex justify-between text-[8px] text-gray-600">
                <span>{texts.phone}:</span>
                <span>{safeInvoiceData.customer.phone}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[9px] mb-2 border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between">
              <span className="font-bold">{texts.customer}:</span>
              <span className="text-gray-500">{texts.walkInCustomer}</span>
            </div>
          </div>
        )}

        {/* Items Table */}
        <table className="w-full text-[9px] mb-2 border-collapse">
          <thead>
            <tr className="border-y border-gray-400">
              <th className="py-1 text-center w-6">#</th>
              <th className="py-1 text-right">{texts.product}</th>
              <th className="py-1 text-center w-8">{texts.quantity}</th>
              <th className="py-1 text-right w-14">{texts.price}</th>
              <th className="py-1 text-right w-14">{texts.total}</th>
            </tr>
          </thead>
          <tbody>
            {safeInvoiceData.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-1 text-center">{index + 1}</td>
                <td className="py-1 text-right">
                  <div>{isRTL ? item.nameAr : item.name}</div>
                  {(item.sizeName || item.colorName) && (
                    <div className="text-gray-500 text-[8px]">
                      {isRTL ? (
                        <>
                          {item.sizeNameAr && `${item.sizeNameAr} `}
                          {item.colorNameAr && ` - ${item.colorNameAr}`}
                        </>
                      ) : (
                        <>
                          {item.sizeName && `${item.sizeName} `}
                          {item.colorName && ` - ${item.colorName}`}
                        </>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">{formatCurrency(item.price)}</td>
                <td className="py-1 text-right">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="flex flex-col items-end mb-2 border-t border-gray-300 pt-2">
          <div className="w-3/4 text-[9px]">
            <div className="flex justify-between py-0.5">
              <span>{texts.subtotal}:</span>
              <span>{formatCurrency(safeInvoiceData.subtotal)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>{texts.tax}:</span>
              <span>{formatCurrency(safeInvoiceData.tax)}</span>
            </div>
            <div className="flex justify-between py-1 font-bold border-t border-gray-400 mt-1">
              <span>{texts.grandTotal}:</span>
              <span>{formatCurrency(safeInvoiceData.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        {safeInvoiceData.payments.length > 0 && (
          <div className="mb-2 border-t border-dashed border-gray-300 pt-2">
            <div className="w-full text-[9px]">
              <div className="font-bold mb-1">{texts.paid}:</div>
              {safeInvoiceData.payments.map((payment, index) => (
                <div key={index} className="flex justify-between py-0.5">
                  <span>{getPaymentMethodText(payment.method)}:</span>
                  <span>{formatCurrency(payment.amount)}</span>
                </div>
              ))}
              {safeInvoiceData.change > 0 && (
                <div className="flex justify-between py-0.5 border-t border-gray-300 mt-1 pt-1">
                  <span className="font-bold">{texts.change}:</span>
                  <span className="text-green-600">{formatCurrency(safeInvoiceData.change)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[8px] text-gray-500 border-t border-dashed border-gray-300 pt-2 mt-2">
          <p className="font-semibold">{texts.thankYou}</p>
          <p className="mt-1">{texts.poweredBy}</p>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
export default InvoiceTemplate;