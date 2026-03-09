import React, { forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseInvoiceA4TemplateProps {
  invoiceData: {
    id: string;
    invoice_number: string;
    date: string;
    supplier: { 
      name: string; 
      nameAr?: string; 
      phone?: string;
      tax_number?: string;
      address?: string;
    } | null;
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
      discount_percent?: number;
      tax_percent?: number;
    }>;
    subtotal: number;
    tax: number;
    discount_total: number;
    total: number;
    paid_amount: number;
    remaining_amount: number;
    payment_method: string;
    notes?: string;
  };
}

const PurchaseInvoiceA4Template = forwardRef<HTMLDivElement, PurchaseInvoiceA4TemplateProps>(
  ({ invoiceData }, ref) => {
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
      email: user?.email,
      tax_id: user?.tax_id,
      commercial_register: user?.commercial_register,
      website: user?.website,
      currency: user?.currency || 'SAR',
    };

    // نصوص ثابتة حسب اللغة
    const texts = {
      invoice: isRTL ? 'فاتورة مشتريات' : 'PURCHASE INVOICE',
      invoiceNo: isRTL ? 'رقم الفاتورة' : 'Invoice No.',
      date: isRTL ? 'التاريخ' : 'Date',
      paymentMethod: isRTL ? 'طريقة الدفع' : 'Payment Method',
      cash: isRTL ? 'نقدي' : 'Cash',
      card: isRTL ? 'بطاقة' : 'Card',
      credit: isRTL ? 'آجل' : 'Credit',
      bank_transfer: isRTL ? 'تحويل بنكي' : 'Bank Transfer',
      supplier: isRTL ? 'المورد' : 'Supplier',
      supplierDetails: isRTL ? 'بيانات المورد' : 'Supplier Details',
      cashier: isRTL ? 'الكاشير' : 'Cashier',
      branch: isRTL ? 'الفرع' : 'Branch',
      phone: isRTL ? 'تليفون' : 'Phone',
      taxNumber: isRTL ? 'الرقم الضريبي' : 'Tax Number',
      address: isRTL ? 'العنوان' : 'Address',
      product: isRTL ? 'المنتج' : 'Product',
      quantity: isRTL ? 'الكمية' : 'Quantity',
      price: isRTL ? 'السعر' : 'Price',
      discount: isRTL ? 'الخصم' : 'Discount',
      total: isRTL ? 'الإجمالي' : 'Total',
      subtotal: isRTL ? 'المجموع الفرعي' : 'Subtotal',
      tax: isRTL ? `الضريبة (${invoiceData.taxRate || 0}%)` : `VAT (${invoiceData.taxRate || 0}%)`,
      grandTotal: isRTL ? 'الإجمالي الكلي' : 'Grand Total',
      paid: isRTL ? 'المدفوع' : 'Paid',
      remaining: isRTL ? 'المتبقي' : 'Remaining',
      notes: isRTL ? 'ملاحظات' : 'Notes',
      thankYou: isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business',
      poweredBy: isRTL ? 'تم بواسطة Zain ERP' : 'Powered by Zain ERP',
      page: isRTL ? 'صفحة' : 'Page',
      of: isRTL ? 'من' : 'of',
    };

    // تجهيز نص طريقة الدفع
    const getPaymentMethodText = (method: string) => {
      switch (method.toLowerCase()) {
        case 'cash': return texts.cash;
        case 'card': return texts.card;
        case 'credit': return texts.credit;
        case 'bank_transfer': return texts.bank_transfer;
        default: return method;
      }
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black font-sans"
        style={{ 
          direction: isRTL ? 'rtl' : 'ltr',
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          padding: '15mm 20mm',
          fontSize: '12px',
          lineHeight: '1.5',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* Header with Logo and Company Info */}
        <div className="flex justify-between items-start border-b-2 border-gray-300 pb-6 mb-6">
          {/* Logo and Company Name */}
          <div className="flex items-center gap-4">
            {companyInfo.logo && (
              <div className="w-20 h-20 flex items-center justify-center border border-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={companyInfo.logo} 
                  alt={companyInfo.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {isRTL ? companyInfo.nameAr : companyInfo.name}
              </h1>
              {companyInfo.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? companyInfo.addressAr || companyInfo.address : companyInfo.address}
                </p>
              )}
              <div className="flex gap-4 mt-1 text-sm text-gray-600">
                {companyInfo.phone && <span>{texts.phone}: {companyInfo.phone}</span>}
                {companyInfo.email && <span>Email: {companyInfo.email}</span>}
              </div>
            </div>
          </div>

          {/* Invoice Title */}
          <div className="text-right">
            <h2 className="text-3xl font-bold text-primary">{texts.invoice}</h2>
            <div className="mt-2 p-3 bg-primary/5 rounded-lg">
              <div className="text-sm">
                <span className="font-semibold">{texts.invoiceNo}:</span>
                <span className="font-mono ml-2">{invoiceData.invoice_number}</span>
              </div>
              <div className="text-sm mt-1">
                <span className="font-semibold">{texts.date}:</span>
                <span className="ml-2">{new Date(invoiceData.date).toLocaleDateString(isRTL ? 'ar' : 'en', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier and Branch Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Supplier Info */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              {texts.supplierDetails}
            </h3>
            {invoiceData.supplier ? (
              <div className="space-y-2">
                <p className="font-medium text-base">{invoiceData.supplier.name}</p>
                {invoiceData.supplier.address && (
                  <p className="text-sm text-gray-600">{invoiceData.supplier.address}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {invoiceData.supplier.phone && (
                    <div>
                      <span className="text-gray-500">{texts.phone}:</span>
                      <span className="mr-2">{invoiceData.supplier.phone}</span>
                    </div>
                  )}
                  {invoiceData.supplier.tax_number && (
                    <div>
                      <span className="text-gray-500">{texts.taxNumber}:</span>
                      <span className="mr-2">{invoiceData.supplier.tax_number}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">-</p>
            )}
          </div>

          {/* Branch & Payment Info */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              {isRTL ? 'معلومات الفاتورة' : 'Invoice Information'}
            </h3>
            <div className="space-y-2">
              {invoiceData.branchName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{texts.branch}:</span>
                  <span className="font-medium">{invoiceData.branchName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{texts.cashier}:</span>
                <span className="font-medium">{invoiceData.cashierName || user?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{texts.paymentMethod}:</span>
                <span className="font-medium">{getPaymentMethodText(invoiceData.payment_method)}</span>
              </div>
              {companyInfo.tax_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">VAT:</span>
                  <span className="font-medium">{companyInfo.tax_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full"></span>
            {isRTL ? 'الأصناف' : 'Items'}
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/10 border-b">
                  <th className="py-3 px-4 text-center w-16">#</th>
                  <th className="py-3 px-4 text-right">{texts.product}</th>
                  <th className="py-3 px-4 text-center w-20">{texts.quantity}</th>
                  <th className="py-3 px-4 text-right w-28">{texts.price}</th>
                  <th className="py-3 px-4 text-center w-20">{texts.discount}</th>
                  <th className="py-3 px-4 text-right w-28">{texts.total}</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-center text-gray-500">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{isRTL ? item.nameAr : item.name}</div>
                      {(item.sizeName || item.colorName) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.sizeName && `${item.sizeName} `}
                          {item.colorName && `- ${item.colorName}`}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.price)}</td>
                    <td className="py-3 px-4 text-center">
                      {item.discount_percent ? `${item.discount_percent}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{texts.subtotal}:</span>
                <span>{formatCurrency(invoiceData.subtotal)}</span>
              </div>
              
              {invoiceData.discount_total > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>{texts.discount}:</span>
                  <span>-{formatCurrency(invoiceData.discount_total)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{texts.tax}:</span>
                <span>{formatCurrency(invoiceData.tax)}</span>
              </div>
              
              <div className="border-t border-gray-300 my-2"></div>
              
              <div className="flex justify-between font-bold text-base">
                <span>{texts.grandTotal}:</span>
                <span className="text-primary text-lg">{formatCurrency(invoiceData.total)}</span>
              </div>

              {/* Payment Details */}
              <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{texts.paid}:</span>
                  <span className="text-green-600 font-medium">{formatCurrency(invoiceData.paid_amount)}</span>
                </div>
                
                {invoiceData.remaining_amount > 0 && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">{texts.remaining}:</span>
                    <span className="text-red-600 font-medium">{formatCurrency(invoiceData.remaining_amount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoiceData.notes && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              {texts.notes}
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-gray-700 whitespace-pre-wrap">{invoiceData.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 mt-8">
          <div className="text-center">
            <p className="text-gray-600 font-medium">{texts.thankYou}</p>
            <p className="text-xs text-gray-400 mt-2">{texts.poweredBy}</p>
          </div>
        </div>
      </div>
    );
  }
);

PurchaseInvoiceA4Template.displayName = 'PurchaseInvoiceA4Template';
export default PurchaseInvoiceA4Template;