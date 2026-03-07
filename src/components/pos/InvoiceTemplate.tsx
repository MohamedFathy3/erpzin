import React, { forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

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
    salesRep: { name: string; nameAr?: string } | null;
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
    const currency = companyInfo.currency || 'ج.م'; // العملة الافتراضية من الصورة

    // نصوص ثابتة حسب اللغة
    const texts = {
      invoice: isRTL ? 'فاتورة ضريبية' : 'Tax Invoice', // أو 'ERP زين' إذا أردت
      invoiceNo: isRTL ? 'رقم الفاتورة' : 'Invoice No.',
      date: isRTL ? 'التاريخ' : 'Date',
      paymentMethod: isRTL ? 'طريقة الدفع' : 'Payment Method',
      cash: isRTL ? 'نقدي' : 'Cash',
      card: isRTL ? 'شبكة' : 'Card',
      wallet: isRTL ? 'محفظة' : 'Wallet',
      customer: isRTL ? 'العميل' : 'Customer',
      salesRep: isRTL ? 'مندوب المبيعات' : 'Sales Rep',
      walkInCustomer: isRTL ? 'عميل عابر' : 'Walk-in Customer',
      notSpecified: isRTL ? 'غير محدد' : 'Not specified',
      product: isRTL ? 'الصنف' : 'Item', // كلمة "الصف" في الصورة تعني المنتج
      quantity: isRTL ? 'الكمية' : 'Qty',
      price: isRTL ? 'السعر' : 'Price',
      total: isRTL ? 'الإجمالي' : 'Total',
      subtotal: isRTL ? 'المجموع الفرعي' : 'Subtotal',
      tax: isRTL ? 'الضريبة (%14)' : 'Tax (14%)', // تم التعديل حسب الصورة
      grandTotal: isRTL ? 'الإجمالي' : 'Grand Total', // تم التعديل حسب الصورة
      paid: isRTL ? 'المدفوع' : 'Paid',
      change: isRTL ? 'الباقي' : 'Change',
      thankYou: isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business',
      poweredBy: isRTL ? 'تم بواسطة Zain ERP' : 'Powered by Zain ERP', // تم الإضافة
    };

    // تجهيز نص طريقة الدفع
    const getPaymentMethodText = (method: string) => {
      switch (method) {
        case 'cash': return texts.cash;
        case 'card': return texts.card;
        case 'wallet': return texts.wallet;
        default: return method;
      }
    };
    // دمج طرق الدفع في نص واحد (مثل الصورة)
    const paymentMethodsText = invoiceData.payments.map(p => getPaymentMethodText(p.method)).join(' - ');

    return (
      <div
        ref={ref}
        className="p-8 bg-white text-black font-sans text-sm" // تم تعديل padding والخط
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        {/* Header - مبسط بدون تفاصيل كثيرة كما في الصورة */}
        <div className="text-center border-b-2 border-double border-gray-300 pb-2 mb-4"> {/* خط مزدوج تحت الترويسة */}
          {/* اسم الشركة فقط بارز */}
          <h1 className="text-3xl font-bold text-black tracking-wider">
            {isRTL && companyInfo.nameAr ? companyInfo.nameAr : companyInfo.name}
          </h1>
          {/* رقم الفاتورة والتاريخ في سطر واحد */}
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{texts.invoiceNo}: {invoiceData.id}</span>
            <span>{texts.date}: {new Date(invoiceData.date).toLocaleDateString(isRTL ? 'ar' : 'en')}</span>
          </div>
           {/* طريقة الدفع كما في الصورة */}
          <div className="flex justify-between text-xs text-gray-600 mt-1">
             <span>{texts.paymentMethod}: {paymentMethodsText}</span>
             <span></span> {/* مكان فارغ للمحاذاة */}
          </div>
        </div>

        {/* يمكن إضافة معلومات العميل والموظف هنا إذا أردت، لكن الصورة لا تظهرها */}
        {/* <div className="mb-2 text-xs"> ... </div> */}

        {/* Items Table - تصميم مشابه للصورة */}
        <table className="w-full text-xs mb-4 border-collapse">
          <thead>
            <tr className="border-y border-gray-400 bg-gray-100"> {/* خلفية خفيفة للرأس */}
              <th className="py-1 text-center w-12">{isRTL ? 'م' : '#'}</th> {/* عمود "الصف" */}
              <th className="py-1 text-right">{texts.product}</th>
              <th className="py-1 text-center w-16">{texts.quantity}</th>
              <th className="py-1 text-left w-20">{texts.price}</th>
              <th className="py-1 text-left w-20">{texts.total}</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-1 text-center">{index + 1}</td>
                <td className="py-1 text-right">
                  {isRTL ? item.nameAr : item.name}
                  {/* عرض المقاس واللون إذا وجد */}
                  {(item.sizeName || item.colorName) && (
                    <span className="text-gray-500 text-[10px] block">
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
                    </span>
                  )}
                </td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-left">{item.price.toFixed(2)}</td> {/* عرض السعر بدون عملة بجانبه */}
                <td className="py-1 text-left">{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section - بشكل مشابه جداً للصورة */}
        <div className="flex flex-col items-end mb-4">
          <div className="w-48 text-sm border-t-2 border-double border-gray-300 pt-1"> {/* خط مزدوج قبل المجاميع */}
            <div className="flex justify-between py-0.5">
              <span>{texts.subtotal}:</span>
              <span>{invoiceData.subtotal.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>{texts.tax}:</span>
              <span>{invoiceData.tax.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between py-1 font-bold border-t border-gray-400 mt-1">
              <span>{texts.grandTotal}:</span>
              <span>{invoiceData.total.toFixed(2)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Payment Details - كما في الصورة */}
        <div className="flex flex-col items-end mb-4">
            <div className="w-48 text-sm">
                {invoiceData.payments.map((payment, index) => (
                    <div key={index} className="flex justify-between py-0.5">
                        <span>{getPaymentMethodText(payment.method)}:</span>
                        <span>{payment.amount.toFixed(2)} {currency}</span>
                    </div>
                ))}
                {invoiceData.change && invoiceData.change > 0 && (
                    <div className="flex justify-between py-0.5 border-t border-gray-300 mt-1">
                        <span>{texts.change}:</span>
                        <span className="text-green-600">{invoiceData.change.toFixed(2)} {currency}</span>
                    </div>
                )}
            </div>
        </div>

        {/* Footer - مطابق للصورة تماماً */}
        <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-3 mt-4">
          <p className="font-semibold">{texts.thankYou}</p>
          <p className="text-[10px] mt-1">{texts.poweredBy}</p>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
export default InvoiceTemplate;