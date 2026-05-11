/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

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
    const { user } = useAuth();
    const { formatCurrency } = useRegionalSettings();

    const t = {
      en: {
        companyName: 'Yemen Company',
        invoice: 'SALES INVOICE',
        return: 'RETURN INVOICE',
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
        discount: 'Discount',
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
        cashier: 'Cashier',
        color: 'Color',
        size: 'Size',
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
        subtotal: 'المجموع',
        discount: 'الخصم',
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
        cashier: 'الكاشير',
        color: 'اللون',
        size: 'المقاس',
      },
    };

    const texts = t[language];

    const formatNumber = (value: string | number, decimals: number = 2): string => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '0.00';
      return num.toFixed(decimals).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US');
    };

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

    const company = {
      name: user?.name || propCompanyInfo?.name || 'Yemen Company',
      name_ar: user?.name || propCompanyInfo?.name_ar || 'شركة اليمن',
      phone: user?.phone || propCompanyInfo?.phone || '01-234567',
      address: user?.address || propCompanyInfo?.address || 'اليمن - صنعاء',
      taxNumber: user?.tax_id || propCompanyInfo?.taxNumber || '',
      logo: user?.logo_icon || user?.logoUrl || propCompanyInfo?.logo,
    };

    const displayName = isRtl ? company.name_ar : company.name;

    // حساب الخصم إذا كان موجود
    const hasDiscount = data.discount_percentage > 0 || data.discount_amount > 0;
    const discountPercent = data.discount_percentage || 0;
    const discountAmount = data.discount_amount || 0;
// ========== دالة مساعدة لاستخراج اسم المنتج ==========
const getProductName = (item: any): string => {
  // الحالة 1: product_name موجود مباشر
  if (item.product_name) return item.product_name;
  
  // الحالة 2: product.name داخل كائن product
  if (item.product?.name) return item.product.name;
  
  // الحالة 3: name مباشر
  if (item.name) return item.name;
  
  // الحالة 4: اسم المنتج من invoice_items
  if (item.product?.product_name) return item.product.product_name;
  
  return '-';
};

// ========== دالة مساعدة لاستخراج اللون ==========
const getColor = (item: any): string | null => {
  if (item.color) return item.color;
  if (item.product_color?.color) return item.product_color.color;
  if (item.variant?.color) return item.variant.color;
  return null;
};

// ========== دالة مساعدة لاستخراج المقاس ==========
const getSize = (item: any): string | null => {
  if (item.size) return item.size;
  if (item.product_unit?.size) return item.product_unit.size;
  if (item.variant?.size) return item.variant.size;
  return null;
};
    // ستايل الطباعة
    const printStyles = {
      container: {
        width: '80mm', // عرض ورقة الكاشير
        margin: '0 auto',
        padding: '8px',
        fontFamily: isRtl ? 'Cairo, "Segoe UI", monospace' : 'monospace',
        fontSize: '12px',
        lineHeight: '1.4',
        backgroundColor: 'white',
        color: 'black',
      },
      header: {
        textAlign: 'center' as const,
        borderBottom: '1px dashed #000',
        paddingBottom: '8px',
        marginBottom: '8px',
      },
      companyName: {
        fontSize: '16px',
        fontWeight: 'bold' as const,
        marginBottom: '4px',
      },
      row: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
      },
      divider: {
        borderTop: '1px dashed #000',
        margin: '8px 0',
      },
      table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        marginBottom: '8px',
      },
      th: {
        borderBottom: '1px dotted #000',
        padding: '4px 0',
        textAlign: 'right' as const,
        fontSize: '10px',
      },
      td: {
        padding: '2px 0',
        textAlign: 'right' as const,
      },
      totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: 'bold' as const,
        borderTop: '1px solid #000',
        paddingTop: '4px',
        marginTop: '4px',
      },
      footer: {
        textAlign: 'center' as const,
        borderTop: '1px dashed #000',
        paddingTop: '8px',
        marginTop: '8px',
        fontSize: '10px',
      },
    };

    if (type === 'sale') {
      return (
        <div ref={ref} dir={dir} style={printStyles.container}>
          {/* Header */}
          <div style={printStyles.header}>
            <div style={printStyles.companyName}>{displayName}</div>
            <div style={{ fontSize: '10px' }}>{company.address}</div>
            <div style={{ fontSize: '10px' }}>📞 {company.phone}</div>
            {company.taxNumber && (
              <div style={{ fontSize: '9px' }}>ضريبي: {company.taxNumber}</div>
            )}
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>
              {texts.invoice}
            </div>
          </div>

          {/* Invoice Info */}
          <div style={{ marginBottom: '8px' }}>
            <div style={printStyles.row}>
              <span>{texts.invoiceNumber}:</span>
              <span style={{ fontFamily: 'monospace' }}>{data.invoice_number}</span>
            </div>
            <div style={printStyles.row}>
              <span>{texts.date}:</span>
              <span>{formatDate(data.created_at)}</span>
            </div>
            {data.cashier && (
              <div style={printStyles.row}>
                <span>{texts.cashier}:</span>
                <span>{data.cashier?.name || '-'}</span>
              </div>
            )}
          </div>

          {/* Customer */}
          {data.customer && data.customer.name && (
            <div style={{ marginBottom: '8px', padding: '4px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={printStyles.row}>
                <span>{texts.customer}:</span>
                <span>{isRtl ? data.customer.name_ar || data.customer.name : data.customer.name}</span>
              </div>
              {data.customer.phone && (
                <div style={printStyles.row}>
                  <span>{texts.phone}:</span>
                  <span>{data.customer.phone}</span>
                </div>
              )}
            </div>
          )}

          <div style={printStyles.divider} />

          {/* Items Table */}
          <table style={printStyles.table}>
            <thead>
              <tr>
                <th style={{ ...printStyles.th, width: '30%' }}>{texts.product}</th>
                <th style={{ ...printStyles.th, width: '15%', textAlign: 'center' }}>{texts.quantity}</th>
                <th style={{ ...printStyles.th, width: '25%', textAlign: 'right' }}>{texts.price}</th>
                <th style={{ ...printStyles.th, width: '30%', textAlign: 'right' }}>{texts.total}</th>
              </tr>
            </thead>
<tbody>
  {(data.return_items || data.items)?.map((item: any, index: number) => {
    const productName = item.product_name || item.product?.name || item.name || '-';
    const color = item.color;
    const size = item.size;
    
    return (
      <tr key={index}>
        <td style={printStyles.td}>
          {productName}
          {(color || size) && (
            <div style={{ fontSize: '9px', color: '#666' }}>
              {color && `${texts.color}: ${color}`}
              {size && ` ${texts.size}: ${size}`}
            </div>
          )}
        </td>
        <td style={{ ...printStyles.td, textAlign: 'center' }}>{item.quantity}</td>
        <td style={{ ...printStyles.td, textAlign: 'right' }}>
          {formatNumber(item.unit_price || item.price || 0)}
        </td>
        <td style={{ ...printStyles.td, textAlign: 'right', color: '#e53e3e' }}>
          -{formatNumber(item.total_price || item.total || 0)}
        </td>
      </tr>
    );
  })}
</tbody>
          </table>

          <div style={printStyles.divider} />

          {/* Totals */}
          <div style={{ marginBottom: '8px' }}>
            <div style={printStyles.row}>
              <span>{texts.subtotal}:</span>
              <span>{formatNumber(data.amounts?.total || data.total_amount || 0)}</span>
            </div>
            
            {/* Discount Section */}
            {hasDiscount && (
              <>
                <div style={printStyles.row}>
                  <span>{texts.discount}:</span>
                  <span style={{ color: '#e53e3e' }}>
                    {discountPercent > 0 && `-${discountPercent}% `}
                    {discountAmount > 0 && `-${formatNumber(discountAmount)}`}
                  </span>
                </div>
                <div style={printStyles.row}>
                  <span>{texts.total}:</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {formatNumber(data.amounts?.total || data.total_amount || 0)}
                  </span>
                </div>
              </>
            )}
            
            <div style={printStyles.row}>
              <span>{texts.paid}:</span>
              <span>{formatNumber(data.amounts?.paid || data.total_amount || 0)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          {data.payments && data.payments.length > 0 && (
            <div style={{ marginBottom: '8px', padding: '4px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{texts.paymentMethod}</div>
              {data.payments.map((payment: any, idx: number) => (
                <div key={idx} style={printStyles.row}>
                  <span>
                    {payment.method === 'cash' ? texts.cash :
                     payment.method === 'card' ? texts.card :
                     payment.method === 'wallet' ? texts.wallet :
                     payment.method === 'credit' ? texts.credit : payment.method}
                  </span>
                  <span>{formatNumber(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={printStyles.footer}>
            <div>{texts.thankYou}</div>
            <div style={{ fontSize: '9px', marginTop: '4px' }}>
              {formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>
      );
    } else {
      // Return Invoice
  return (
    <div ref={ref} dir={dir} style={printStyles.container}>
      {/* Header */}
      <div style={printStyles.header}>
        <div style={printStyles.companyName}>{displayName}</div>
        <div style={{ fontSize: '10px' }}>{company.address}</div>
        <div style={{ fontSize: '10px' }}>📞 {company.phone}</div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px', color: '#e53e3e' }}>
          {texts.return}
        </div>
      </div>

      {/* Return Info */}
      <div style={{ marginBottom: '8px' }}>
        <div style={printStyles.row}>
          <span>{texts.returnNumber}:</span>
          <span style={{ fontFamily: 'monospace' }}>{data.return_number}</span>
        </div>
        <div style={printStyles.row}>
          <span>{texts.date}:</span>
          <span>{formatDate(data.return_date || data.created_at)}</span>
        </div>
      </div>

      {/* Customer */}
      {(data.customer || data.invoice?.customer) && (
        <div style={{ marginBottom: '8px', padding: '4px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={printStyles.row}>
            <span>{texts.customer}:</span>
            <span>
              {isRtl 
                ? (data.customer?.name_ar || data.invoice?.customer?.name_ar || data.customer?.name || data.invoice?.customer?.name)
                : (data.customer?.name || data.invoice?.customer?.name)}
            </span>
          </div>
        </div>
      )}

      {/* Original Invoice Reference */}
      {data.invoice && (
        <div style={{ marginBottom: '8px', padding: '4px', backgroundColor: '#eef2ff', borderRadius: '4px' }}>
          <div style={printStyles.row}>
            <span>{texts.invoiceNumber}:</span>
            <span style={{ fontFamily: 'monospace' }}>{data.invoice.invoice_number}</span>
          </div>
        </div>
      )}

      {/* Reason */}
      {data.reason && (
        <div style={{ marginBottom: '8px', padding: '4px', backgroundColor: '#fff5f5', borderRadius: '4px', color: '#e53e3e' }}>
          <div style={printStyles.row}>
            <span>{texts.reason}:</span>
            <span>{data.reason}</span>
          </div>
        </div>
      )}

      <div style={printStyles.divider} />

      {/* Items Table */}
      <table style={printStyles.table}>
        <thead>
          <tr>
            <th style={{ ...printStyles.th, width: '35%' }}>{texts.product}</th>
            <th style={{ ...printStyles.th, width: '15%', textAlign: 'center' }}>{texts.quantity}</th>
            <th style={{ ...printStyles.th, width: '25%', textAlign: 'right' }}>{texts.price}</th>
            <th style={{ ...printStyles.th, width: '25%', textAlign: 'right' }}>{texts.total}</th>
          </tr>
        </thead>
        <tbody>
          {(data.return_items || data.items)?.map((item: any, index: number) => {
            // ✅ التصحيح هنا - استخراج اسم المنتج من product.name
            const productName = item.product_name || item.product?.name || item.name || '-';
            const color = item.color;
            const size = item.size;
            
            return (
              <tr key={index}>
                <td style={printStyles.td}>
                  {productName}
                  {(color || size) && (
                    <div style={{ fontSize: '9px', color: '#666' }}>
                      {color && `${texts.color}: ${color}`}
                      {size && ` ${texts.size}: ${size}`}
                    </div>
                  )}
                </td>
                <td style={{ ...printStyles.td, textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ ...printStyles.td, textAlign: 'right' }}>
                  {formatNumber(item.unit_price || item.price || 0)}
                </td>
                <td style={{ ...printStyles.td, textAlign: 'right', color: '#e53e3e' }}>
                  -{formatNumber(item.total_price || item.total || 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={printStyles.divider} />

      {/* Refund Method & Total */}
      <div style={{ marginBottom: '8px' }}>
        <div style={printStyles.row}>
          <span>{texts.refundMethod}:</span>
          <span>
            {data.refund_method === 'cash' ? texts.cash :
             data.refund_method === 'card' ? texts.card :
             data.refund_method === 'wallet' ? texts.wallet :
             data.refund_method === 'credit' ? texts.credit : data.refund_method}
          </span>
        </div>
        <div style={{ ...printStyles.totalRow, color: '#e53e3e' }}>
          <span>{texts.total}:</span>
          <span>-{formatNumber(data.refunded_amount || data.total_amount || 0)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={printStyles.footer}>
        <div>{texts.returnProcessed}</div>
        <div style={{ fontSize: '9px', marginTop: '4px' }}>
          {formatDate(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
    }
  }
);

PrintableInvoice.displayName = 'PrintableInvoice';

export default PrintableInvoice;