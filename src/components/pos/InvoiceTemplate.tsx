import React, { forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CompanyInfo {
  name: string;
  nameAr?: string;
  logo?: string;
  address?: string | null;
  addressAr?: string | null; // ✅ العنوان بالعربي
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
    customer: { name: string; nameAr?: string; phone?: string } | null; // ✅ اسم العميل بالعربي
    salesRep: { name: string; nameAr?: string } | null; // ✅ اسم المندوب بالعربي
    items: Array<{
      name: string;
      nameAr: string;
      quantity: number;
      price: number;
      sizeName?: string;
      sizeNameAr?: string; // ✅ المقاس بالعربي
      colorName?: string;
      colorNameAr?: string; // ✅ اللون بالعربي
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

    // نصوص ثابتة حسب اللغة
    const texts = {
      invoice: isRTL ? 'فاتورة مبيعات' : 'Sales Invoice',
      invoiceNo: isRTL ? 'رقم الفاتورة' : 'Invoice No.',
      date: isRTL ? 'التاريخ' : 'Date',
      customer: isRTL ? 'العميل' : 'Customer',
      salesRep: isRTL ? 'مندوب المبيعات' : 'Sales Rep',
      walkInCustomer: isRTL ? 'عميل عابر' : 'Walk-in Customer',
      notSpecified: isRTL ? 'غير محدد' : 'Not specified',
      product: isRTL ? 'المنتج' : 'Product',
      quantity: isRTL ? 'الكمية' : 'Qty',
      price: isRTL ? 'السعر' : 'Price',
      total: isRTL ? 'الإجمالي' : 'Total',
      subtotal: isRTL ? 'المجموع' : 'Subtotal',
      tax: isRTL ? 'الضريبة (5%)' : 'Tax (5%)',
      grandTotal: isRTL ? 'الإجمالي الكلي' : 'Grand Total',
      paymentMethods: isRTL ? 'طرق الدفع' : 'Payment Methods',
      cash: isRTL ? 'نقدي' : 'Cash',
      card: isRTL ? 'شبكة' : 'Card',
      wallet: isRTL ? 'محفظة' : 'Wallet',
      change: isRTL ? 'الباقي' : 'Change',
      phone: isRTL ? 'هاتف' : 'Phone',
      email: isRTL ? 'بريد' : 'Email',
      taxId: isRTL ? 'رقم ضريبي' : 'Tax ID',
      commercialReg: isRTL ? 'سجل تجاري' : 'Commercial Reg',
      thankYou: isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business',
      electronicInvoice: isRTL ? 'تم إنشاء هذه الفاتورة إلكترونياً' : 'This is an electronically generated invoice',
    };

    return (
      <div 
        ref={ref} 
        className="p-6 bg-white text-black" 
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        {/* Header - مع بيانات الشركة */}
        <div className="text-center border-b pb-4 mb-4">
          {/* Logo إذا كان موجود */}
          {companyInfo.logo && (
            <img 
              src={companyInfo.logo} 
              alt={companyInfo.name}
              className="h-16 mx-auto mb-2 object-contain"
            />
          )}
          
          {/* اسم الشركة حسب اللغة */}
          <h1 className="text-2xl font-bold text-primary">
            {isRTL && companyInfo.nameAr ? companyInfo.nameAr : companyInfo.name}
          </h1>
          
          {/* بيانات الشركة الإضافية حسب اللغة */}
          <div className="text-xs text-gray-600 mt-2 space-y-1">
            {/* العنوان حسب اللغة */}
            {isRTL ? (
              companyInfo.addressAr && <p>{companyInfo.addressAr}</p>
            ) : (
              companyInfo.address && <p>{companyInfo.address}</p>
            )}
            
            <div className="flex justify-center gap-4">
              {companyInfo.phone && (
                <p>{texts.phone}: {companyInfo.phone}</p>
              )}
              {companyInfo.email && (
                <p>{texts.email}: {companyInfo.email}</p>
              )}
            </div>
            
            <div className="flex justify-center gap-4">
              {companyInfo.tax_id && (
                <p>{texts.taxId}: {companyInfo.tax_id}</p>
              )}
              {companyInfo.commercial_register && (
                <p>{texts.commercialReg}: {companyInfo.commercial_register}</p>
              )}
            </div>
            
            {companyInfo.website && (
              <p>{companyInfo.website}</p>
            )}
          </div>

          <h2 className="text-xl font-semibold mt-4">{texts.invoice}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {texts.invoiceNo}: {invoiceData.id}
          </p>
          <p className="text-sm text-gray-600">
            {texts.date}: {new Date(invoiceData.date).toLocaleString(isRTL ? 'ar' : 'en')}
          </p>
        </div>

        {/* Customer & Sales Rep Info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="font-semibold">{texts.customer}:</p>
            <p>
              {invoiceData.customer 
                ? (isRTL && invoiceData.customer.nameAr ? invoiceData.customer.nameAr : invoiceData.customer.name)
                : texts.walkInCustomer
              }
            </p>
            {invoiceData.customer?.phone && <p className="text-gray-600">{invoiceData.customer.phone}</p>}
          </div>
          <div>
            <p className="font-semibold">{texts.salesRep}:</p>
            <p>
              {invoiceData.salesRep 
                ? (isRTL && invoiceData.salesRep.nameAr ? invoiceData.salesRep.nameAr : invoiceData.salesRep.name)
                : texts.notSpecified
              }
            </p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-y">
              <th className="py-2 text-right">{texts.product}</th>
              <th className="py-2 text-center">{texts.quantity}</th>
              <th className="py-2 text-left">{texts.price}</th>
              <th className="py-2 text-left">{texts.total}</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-2">
                  {/* اسم المنتج حسب اللغة */}
                  {isRTL ? item.nameAr : item.name}
                  
                  {/* المقاس واللون حسب اللغة */}
                  {(item.sizeName || item.colorName) && (
                    <div className="text-xs text-gray-500">
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
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-left">
                  {item.price.toLocaleString()} {companyInfo.currency || 'YER'}
                </td>
                <td className="py-2 text-left">
                  {(item.price * item.quantity).toLocaleString()} {companyInfo.currency || 'YER'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex flex-col items-end mb-4">
          <div className="w-64">
            <div className="flex justify-between py-1">
              <span>{texts.subtotal}:</span>
              <span>{invoiceData.subtotal.toLocaleString()} {companyInfo.currency || 'YER'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>{texts.tax}:</span>
              <span>{invoiceData.tax.toLocaleString()} {companyInfo.currency || 'YER'}</span>
            </div>
            <div className="flex justify-between py-2 font-bold border-t">
              <span>{texts.grandTotal}:</span>
              <span>{invoiceData.total.toLocaleString()} {companyInfo.currency || 'YER'}</span>
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="border-t pt-4 mb-4">
          <p className="font-semibold mb-2">{texts.paymentMethods}:</p>
          {invoiceData.payments.map((payment, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {payment.method === 'cash' ? texts.cash : 
                 payment.method === 'card' ? texts.card : 
                 payment.method === 'wallet' ? texts.wallet : payment.method}
              </span>
              <span>{payment.amount.toLocaleString()} {companyInfo.currency || 'YER'}</span>
            </div>
          ))}
          {invoiceData.change && invoiceData.change > 0 && (
            <div className="flex justify-between text-sm mt-2 pt-2 border-t">
              <span>{texts.change}:</span>
              <span className="text-success">
                {invoiceData.change.toLocaleString()} {companyInfo.currency || 'YER'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t pt-4">
          <p>{texts.thankYou}</p>
          <p>{texts.electronicInvoice}</p>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = 'InvoiceTemplate';
export default InvoiceTemplate;