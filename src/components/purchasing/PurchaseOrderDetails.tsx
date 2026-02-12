import React, { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const printRef = useRef<HTMLDivElement>(null);

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

  // Fetch company settings
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

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <title>${displayOrder.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: bold; }
          .order-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-block { margin-bottom: 10px; }
          .label { color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: ${language === 'ar' ? 'right' : 'left'}; }
          th { background: #f5f5f5; }
          .total-row { font-weight: bold; background: #f9f9f9; }
          .footer { margin-top: 40px; text-align: center; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${companySettings?.name || 'INJAZ'}</div>
          <div>${companySettings?.address || ''}</div>
          <div>${companySettings?.phone || ''}</div>
        </div>
        <h2 style="text-align: center;">${language === 'ar' ? 'أمر شراء' : 'Purchase Order'}</h2>
        <div class="order-info">
          <div>
            <div class="info-block">
              <div class="label">${language === 'ar' ? 'رقم الأمر' : 'Order #'}</div>
              <div><strong>${displayOrder.order_number}</strong></div>
            </div>
            <div class="info-block">
              <div class="label">${language === 'ar' ? 'التاريخ' : 'Date'}</div>
              <div>${new Date(displayOrder.created_at).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</div>
            </div>
          </div>
          <div>
            <div class="info-block">
              <div class="label">${language === 'ar' ? 'المورد' : 'Supplier'}</div>
              <div><strong>${displayOrder.supplier?.name}</strong></div>
            </div>
            ${displayOrder.expected_delivery ? `
            <div class="info-block">
              <div class="label">${language === 'ar' ? 'التسليم المتوقع' : 'Expected Delivery'}</div>
              <div>${new Date(displayOrder.expected_delivery).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</div>
            </div>
            ` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${language === 'ar' ? 'المنتج' : 'Product'}</th>
              <th>${language === 'ar' ? 'الكمية' : 'Qty'}</th>
              <th>${language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}</th>
              <th>${language === 'ar' ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: PurchaseOrderItem, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>${language === 'ar' ? item.products?.name_ar || item.products?.name : item.products?.name}</td>
                <td>${item.quantity}</td>
                <td>${Number(item.unit_cost).toLocaleString()} YER</td>
                <td>${Number(item.total_cost).toLocaleString()} YER</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align: ${language === 'ar' ? 'left' : 'right'};">${language === 'ar' ? 'الإجمالي' : 'Total'}</td>
              <td>${Number(displayOrder.total_amount).toLocaleString()} YER</td>
            </tr>
          </tbody>
        </table>
        ${displayOrder.notes ? `<div><strong>${language === 'ar' ? 'ملاحظات:' : 'Notes:'}</strong> ${displayOrder.notes}</div>` : ''}
        <div class="footer">
          <p>${language === 'ar' ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
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

        <div ref={printRef} className="space-y-6">
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
            <Button variant="outline" onClick={handlePrint}>
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
  );
};

export default PurchaseOrderDetails;