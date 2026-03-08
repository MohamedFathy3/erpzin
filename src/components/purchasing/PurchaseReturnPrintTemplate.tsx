// Create new file: components/purchasing/PurchaseReturnPrintTemplate.tsx
import React, { forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseReturnPrintTemplateProps {
  returnData: {
    return_number: string;
    invoice_number: string;
    date: string;
    items: Array<{
      product: string;
      quantity: number;
      unit_price: string;
      total_price: string;
    }>;
    total_amount: string;
    reason?: string | null;
  };
}

const PurchaseReturnPrintTemplate = forwardRef<HTMLDivElement, PurchaseReturnPrintTemplateProps>(
  ({ returnData }, ref) => {
    const { language } = useLanguage();
    const isRTL = language === 'ar';
    const { formatCurrency } = useRegionalSettings();
    const { user } = useAuth();

    // بيانات الشركة من auth
    const companyInfo = {
      name: user?.name || '',
      nameAr: user?.name_ar || '',
      logo: user?.logoUrl || user?.logo?.fullUrl,
      address: user?.address,
      addressAr: user?.address_ar,
      phone: user?.phone,
      tax_id: user?.tax_id,
    };

    const texts = {
      returnInvoice: isRTL ? 'مرتجع مشتريات' : 'Purchase Return',
      returnNo: isRTL ? 'رقم المرتجع' : 'Return No.',
      invoiceNo: isRTL ? 'رقم الفاتورة' : 'Invoice No.',
      date: isRTL ? 'التاريخ' : 'Date',
      product: isRTL ? 'المنتج' : 'Product',
      quantity: isRTL ? 'الكمية' : 'Qty',
      unitPrice: isRTL ? 'سعر الوحدة' : 'Unit Price',
      total: isRTL ? 'الإجمالي' : 'Total',
      reason: isRTL ? 'السبب' : 'Reason',
      grandTotal: isRTL ? 'الإجمالي الكلي' : 'Grand Total',
      phone: isRTL ? 'تليفون' : 'Phone',
      thankYou: isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business',
      poweredBy: isRTL ? 'تم بواسطة Zain ERP' : 'Powered by Zain ERP',
    };

    const formatAmount = (amount: string) => {
      const num = parseFloat(amount);
      return formatCurrency ? formatCurrency(num) : `${num.toLocaleString()} YER`;
    };

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
        {/* Header */}
        <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
          {companyInfo.logo && (
            <div className="flex justify-center mb-1">
              <img 
                src={companyInfo.logo} 
                alt={companyInfo.name}
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          
          <h1 className="text-sm font-bold text-black">
            {isRTL ? companyInfo.nameAr : companyInfo.name}
          </h1>
          
          {companyInfo.address && (
            <p className="text-[9px] text-gray-700">
              {isRTL ? companyInfo.addressAr || companyInfo.address : companyInfo.address}
            </p>
          )}
          
          {companyInfo.phone && (
            <p className="text-[9px] text-gray-700">{texts.phone}: {companyInfo.phone}</p>
          )}
          
          {companyInfo.tax_id && (
            <p className="text-[9px] text-gray-700">VAT: {companyInfo.tax_id}</p>
          )}
        </div>

        {/* عنوان المرتجع */}
        <h2 className="text-center font-bold text-[11px] mb-2">{texts.returnInvoice}</h2>

        {/* معلومات المرتجع */}
        <div className="flex justify-between text-[9px] mb-2 border-b border-dashed border-gray-300 pb-2">
          <div className="text-left">
            <div><span className="font-bold">{texts.returnNo}:</span> <span className="font-mono">{returnData.return_number}</span></div>
            <div><span className="font-bold">{texts.invoiceNo}:</span> <span className="font-mono">{returnData.invoice_number}</span></div>
          </div>
          <div className="text-right">
            <div><span className="font-bold">{texts.date}:</span> <span>{new Date(returnData.date).toLocaleDateString(isRTL ? 'ar' : 'en')}</span></div>
          </div>
        </div>

        {/* جدول الأصناف */}
        <table className="w-full text-[9px] mb-2 border-collapse">
          <thead>
            <tr className="border-y border-gray-400">
              <th className="py-1 text-center w-6">#</th>
              <th className="py-1 text-right">{texts.product}</th>
              <th className="py-1 text-center w-8">{texts.quantity}</th>
              <th className="py-1 text-right w-14">{texts.unitPrice}</th>
              <th className="py-1 text-right w-14">{texts.total}</th>
            </tr>
          </thead>
          <tbody>
            {returnData.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-1 text-center">{index + 1}</td>
                <td className="py-1 text-right">
                  <div>{item.product}</div>
                </td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">{formatAmount(item.unit_price)}</td>
                <td className="py-1 text-right">{formatAmount(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* الإجمالي */}
        <div className="flex justify-end mb-2">
          <div className="w-3/4 text-[9px]">
            <div className="flex justify-between py-1 font-bold border-t border-gray-400">
              <span>{texts.grandTotal}:</span>
              <span>{formatAmount(returnData.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* السبب إذا وجد */}
        {returnData.reason && (
          <div className="mb-2 border-t border-dashed border-gray-300 pt-2">
            <div className="w-full text-[9px]">
              <div className="font-bold mb-1">{texts.reason}:</div>
              <p className="text-gray-600">{returnData.reason}</p>
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

PurchaseReturnPrintTemplate.displayName = 'PurchaseReturnPrintTemplate';
export default PurchaseReturnPrintTemplate;