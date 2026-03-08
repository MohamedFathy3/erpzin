import React, { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext'; // ✅ إضافة useAuth
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Edit2, FileDown, Printer, Building2, Calendar, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import api from '@/lib/api';
import { useReactToPrint } from 'react-to-print';

// ✅ قالب الطباعة المنفصل
const PurchaseOrderPrintTemplate = React.forwardRef<HTMLDivElement, { 
  order: PurchaseOrder; 
  items: PurchaseOrderItem[];
  language: string;
  user: any;
}>(({ order, items, language, user }, ref) => {
  const isRTL = language === 'ar';
  
  // بيانات الشركة من auth
  const companyInfo = {
    name: user?.name || 'INJAZ',
    nameAr: user?.name_ar || user?.name || 'INJAZ',
    logo: user?.logoUrl || user?.logo?.fullUrl,
    address: user?.address,
    addressAr: user?.address_ar,
    phone: user?.phone,
    email: user?.email,
    tax_id: user?.tax_id,
    commercial_register: user?.commercial_register,
  };

  // نصوص التقرير
  const texts = {
    purchaseOrder: isRTL ? 'أمر شراء' : 'Purchase Order',
    orderNo: isRTL ? 'رقم الأمر' : 'Order No.',
    date: isRTL ? 'التاريخ' : 'Date',
    supplier: isRTL ? 'المورد' : 'Supplier',
    expectedDelivery: isRTL ? 'التسليم المتوقع' : 'Expected Delivery',
    status: isRTL ? 'الحالة' : 'Status',
    product: isRTL ? 'المنتج' : 'Product',
    quantity: isRTL ? 'الكمية' : 'Qty',
    unitCost: isRTL ? 'سعر الوحدة' : 'Unit Cost',
    total: isRTL ? 'الإجمالي' : 'Total',
    notes: isRTL ? 'ملاحظات' : 'Notes',
    grandTotal: isRTL ? 'الإجمالي الكلي' : 'Grand Total',
    thankYou: isRTL ? 'شكراً لتعاملكم معنا' : 'Thank you for your business',
    poweredBy: isRTL ? 'تم بواسطة Zain ERP' : 'Powered by Zain ERP',
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: isRTL ? 'معلق' : 'Pending',
      approved: isRTL ? 'معتمد' : 'Approved',
      sent: isRTL ? 'مرسل' : 'Sent',
      received: isRTL ? 'مستلم' : 'Received',
      cancelled: isRTL ? 'ملغي' : 'Cancelled'
    };
    return statusMap[status] || status;
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
      {/* Header - اللوجو وبيانات الشركة */}
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

      {/* عنوان التقرير */}
      <h2 className="text-center font-bold text-[11px] mb-2">{texts.purchaseOrder}</h2>

      {/* معلومات الأمر */}
      <div className="flex justify-between text-[9px] mb-2 border-b border-dashed border-gray-300 pb-2">
        <div className="text-left">
          <div><span className="font-bold">{texts.orderNo}:</span> <span className="font-mono">{order.order_number}</span></div>
          <div><span className="font-bold">{texts.date}:</span> <span>{new Date(order.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}</span></div>
        </div>
        <div className="text-right">
          <div><span className="font-bold">{texts.status}:</span> <span>{getStatusText(order.status)}</span></div>
          {order.expected_delivery && (
            <div><span className="font-bold">{texts.expectedDelivery}:</span> <span>{new Date(order.expected_delivery).toLocaleDateString(isRTL ? 'ar' : 'en')}</span></div>
          )}
        </div>
      </div>

      {/* المورد */}
      <div className="text-[9px] mb-2 border-b border-dashed border-gray-300 pb-2">
        <div className="flex justify-between">
          <span className="font-bold">{texts.supplier}:</span>
          <span>{order.supplier?.name}</span>
        </div>
      </div>

      {/* جدول الأصناف */}
      <table className="w-full text-[9px] mb-2 border-collapse">
        <thead>
          <tr className="border-y border-gray-400">
            <th className="py-1 text-center w-6">#</th>
            <th className="py-1 text-right">{texts.product}</th>
            <th className="py-1 text-center w-8">{texts.quantity}</th>
            <th className="py-1 text-right w-14">{texts.unitCost}</th>
            <th className="py-1 text-right w-14">{texts.total}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, index: number) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-1 text-center">{index + 1}</td>
              <td className="py-1 text-right">
                <div>{isRTL ? item.products?.name_ar || item.products?.name : item.products?.name}</div>
              </td>
              <td className="py-1 text-center">{item.quantity}</td>
              <td className="py-1 text-right">{Number(item.unit_cost).toLocaleString()} YER</td>
              <td className="py-1 text-right">{Number(item.total_cost).toLocaleString()} YER</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* الإجمالي */}
      <div className="flex justify-end mb-2">
        <div className="w-3/4 text-[9px]">
          <div className="flex justify-between py-1 font-bold border-t border-gray-400">
            <span>{texts.grandTotal}:</span>
            <span>{Number(order.total_amount).toLocaleString()} YER</span>
          </div>
        </div>
      </div>

      {/* ملاحظات */}
      {order.notes && (
        <div className="mb-2 border-t border-dashed border-gray-300 pt-2">
          <div className="w-full text-[9px]">
            <div className="font-bold mb-1">{texts.notes}:</div>
            <p className="text-gray-600">{order.notes}</p>
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
});

PurchaseOrderPrintTemplate.displayName = 'PurchaseOrderPrintTemplate';

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier: {
    id: number;
    name: string;
  };
  expected_delivery: string | null;
  total_amount: string;
  notes: string;
  status: string;
  supplier_id: string;
  items: {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_cost: string;
    total: string;
  }[];
  created_at: string;
  order_date?: string;
}

interface PurchaseOrderItem {
  id: number;
  quantity: number;
  unit_cost: string;
  total_cost: string;
  products?: {
    name: string;
    name_ar: string;
    sku: string;
  };
}

interface PurchaseOrderDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  onEdit: () => void;
}

const PurchaseOrderDetails: React.FC<PurchaseOrderDetailsProps> = ({ isOpen, onClose, order, onEdit }) => {
  const { language } = useLanguage();
  const { user } = useAuth(); // ✅ استخدام useAuth
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrint, setShowPrint] = useState(false);

  // دالة الطباعة
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `أمر-شراء-${order.order_number}`,
    onAfterPrint: () => {
      setShowPrint(false);
    },
  });

  // Fetch purchase order details
  const { data: orderDetails = order } = useQuery({
    queryKey: ['purchase_order_details', order?.id],
    queryFn: async () => {
      if (!order?.id) return order;
      const response = await api.get(`/purchases-orders/${order.id}`);
      console.log("Full Response:", response.data);
      return response.data.data ?? order;
    },
    enabled: !!order?.id
  });

  // Use fetched orderDetails for rendering, fallback to order
  const displayOrder = orderDetails || order;

  // Fetch order items
  const { data: items = [] } = useQuery({
    queryKey: ['purchase_order_items', order?.id, orderDetails?.id],
    queryFn: async () => {
      if (orderDetails?.items) {
        return orderDetails.items.map(item => ({
          ...item,
          products: { name: item.product_name, name_ar: item.product_name, sku: '' },
          total_cost: item.total
        }));
      }
      if (!order?.id) return [];
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, products(name, name_ar, sku)')
        .eq('purchase_order_id', order.id);
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id
  });

  // Fetch company settings (للاحتياط)
  const { data: companySettings } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('*').limit(1).single();
      if (error) return null;
      return data;
    }
  });

  if (!order) return null;

  const getStatusConfig = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', label: language === 'ar' ? 'معلق' : 'Pending', icon: <Clock size={14} /> },
      approved: { variant: 'default', label: language === 'ar' ? 'معتمد' : 'Approved', icon: <CheckCircle size={14} /> },
      sent: { variant: 'outline', label: language === 'ar' ? 'مرسل' : 'Sent', icon: <Truck size={14} /> },
      received: { variant: 'default', label: language === 'ar' ? 'مستلم' : 'Received', icon: <CheckCircle size={14} /> },
      cancelled: { variant: 'destructive', label: language === 'ar' ? 'ملغي' : 'Cancelled', icon: <XCircle size={14} /> }
    };
    return config[status] || config.pending;
  };

  const statusConfig = getStatusConfig(displayOrder.status);

  // معالج الطباعة
  const handlePrintClick = () => {
    setShowPrint(true);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <span>{language === 'ar' ? 'أمر الشراء' : 'Purchase Order'}</span>
                <span className="font-mono text-primary">{order.order_number}</span>
                <Badge variant={statusConfig.variant} className="gap-1">
                  {statusConfig.icon} {statusConfig.label}
                </Badge>
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Building2 size={16} />
                    <span className="text-xs">{language === 'ar' ? 'المورد' : 'Supplier'}</span>
                  </div>
                  <p className="font-semibold">{order.supplier?.name}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar size={16} />
                    <span className="text-xs">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</span>
                  </div>
                  <p className="font-semibold">{new Date(displayOrder.created_at).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Truck size={16} />
                    <span className="text-xs">{language === 'ar' ? 'التسليم المتوقع' : 'Expected'}</span>
                  </div>
                  <p className="font-semibold">
                    {displayOrder.expected_delivery
                      ? new Date(displayOrder.expected_delivery).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')
                      : '-'
                    }
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'الإجمالي' : 'Total'}</div>
                  <p className="text-xl font-bold text-primary">{Number(displayOrder.total_amount).toLocaleString()} YER</p>
                </CardContent>
              </Card>
            </div>

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead>{language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: PurchaseOrderItem, index: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {language === 'ar' ? item.products?.name_ar || item.products?.name : item.products?.name}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{Number(item.unit_cost).toLocaleString()} YER</TableCell>
                        <TableCell className="font-medium">{Number(item.total_cost).toLocaleString()} YER</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={4} className="text-end font-bold">
                        {language === 'ar' ? 'الإجمالي' : 'Total'}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {Number(displayOrder.total_amount).toLocaleString()} YER
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Notes */}
            {displayOrder.notes && (
              <div>
                <h4 className="font-medium mb-2">{language === 'ar' ? 'ملاحظات' : 'Notes'}</h4>
                <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg">{displayOrder.notes}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrintClick}>
                <Printer size={16} className="me-2" />
                {language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
              {order.status === 'pending' && (
                <Button onClick={onEdit}>
                  <Edit2 size={16} className="me-2" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* قالب الطباعة المخفي */}
      {showPrint && (
        <div style={{ display: 'none' }}>
          <PurchaseOrderPrintTemplate
            ref={printRef}
            order={displayOrder}
            items={items}
            language={language}
            user={user}
          />
        </div>
      )}
    </>
  );
};

export default PurchaseOrderDetails;