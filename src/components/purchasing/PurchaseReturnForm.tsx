import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, Package, Loader2, AlertCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import api from '@/lib/api';

interface PurchaseReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  invoiceId?: number | null;
}

interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: {
    id: number;
    name: string;
  };
  items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    price: string;
  }>;
}

interface ReturnItem {
  product_id: number;
  product_name: string;
  max_quantity: number;
  quantity: number;
  unit_price: number;
}

const PurchaseReturnForm: React.FC<PurchaseReturnFormProps> = ({
  isOpen,
  onClose,
  onSave,
  invoiceId
}) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  
  // ========== جلب تفاصيل الفاتورة ==========
  const { data: invoice, isLoading: invoiceLoading } = useQuery<PurchaseInvoice>({
    queryKey: ['purchase-invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) throw new Error('No invoice ID');
      
      const response = await api.get(`/purchases-invoices/${invoiceId}`);
      
      if (response.data.result === 'Success') {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to fetch invoice');
    },
    enabled: isOpen && !!invoiceId,
  });
  
  // State for items
  const [items, setItems] = useState<ReturnItem[]>([]);

  // Update items when invoice data loads
  useEffect(() => {
    if (invoice?.items) {
      setItems(invoice.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        max_quantity: item.quantity,
        quantity: 0,
        unit_price: parseFloat(item.price)
      })));
    }
    setReason('');
  }, [invoice]);

  const updateItemQuantity = (productId: number, quantity: number) => {
    setItems(prev => prev.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: Math.min(quantity, item.max_quantity) }
        : item
    ));
  };

  const selectedItems = items.filter(item => item.quantity > 0);
  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const hasItems = selectedItems.length > 0;

  // ========== إنشاء مرتجع ==========
  const createReturnMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) {
        throw new Error('No invoice selected');
      }

      const payload = {
        purchase_invoices_id: invoiceId,
        reason: reason || null,
        items: selectedItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      console.log('📦 Creating return with payload:', payload);

      const response = await api.post('/purchase-returns/store', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' 
          ? 'تم إنشاء المرتجع بنجاح' 
          : 'Return created successfully'
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      onSave();
    },
    onError: (error: any) => {
      console.error('Error creating return:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.response?.data?.message || error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = () => {
    if (!hasItems) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يجب اختيار منتج واحد على الأقل' : 'Select at least one item',
        variant: 'destructive'
      });
      return;
    }

    createReturnMutation.mutate();
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  // لو لسه بيجيب بيانات الفاتورة
  if (isOpen && invoiceLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              {language === 'ar' ? 'إنشاء مرتجع مشتريات' : 'Create Purchase Return'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-600" />
            {language === 'ar' ? 'إنشاء مرتجع مشتريات' : 'Create Purchase Return'}
          </DialogTitle>
        </DialogHeader>

        {invoice ? (
          <div className="space-y-4 py-2">
            {/* Invoice Info */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}
                    </p>
                    <p className="font-mono font-medium">{invoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'المورد' : 'Supplier'}
                    </p>
                    <p className="font-medium">{invoice.supplier.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reason */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'السبب' : 'Reason'}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={language === 'ar' ? 'أدخل سبب المرتجع...' : 'Enter return reason...'}
                rows={2}
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package size={16} />
                {language === 'ar' ? 'المنتجات المرتجعة' : 'Return Items'}
              </Label>

              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد منتجات في هذه الفاتورة' : 'No items in this invoice'}
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                          <TableHead className="text-center w-24">{language === 'ar' ? 'متاح' : 'Available'}</TableHead>
                          <TableHead className="text-center w-24">{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
                          <TableHead className="text-right w-28">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                          <TableHead className="text-right w-32">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.product_id}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="text-center">{item.max_quantity}</TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min="0"
                                max={item.max_quantity}
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value) || 0)}
                                className="w-20 text-center mx-auto h-8"
                              />
                            </TableCell>
                            <TableCell className="text-right">{item.unit_price.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {(item.quantity * item.unit_price).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Total */}
                  {hasItems && (
                    <div className="flex justify-end mt-4">
                      <div className="w-64 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                          <span className="text-xl font-bold text-orange-600">
                            {totalAmount.toLocaleString()} YER
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning if no items selected */}
                  {!hasItems && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
                      <AlertCircle size={16} />
                      <span className="text-sm">
                        {language === 'ar' 
                          ? 'يرجى تحديد كمية لمنتج واحد على الأقل' 
                          : 'Please select quantity for at least one product'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'لم يتم العثور على الفاتورة' : 'Invoice not found'}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createReturnMutation.isPending || !hasItems || items.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {createReturnMutation.isPending ? (
              <>
                <Loader2 size={16} className="me-2 animate-spin" />
                {language === 'ar' ? 'جاري...' : 'Saving...'}
              </>
            ) : (
              language === 'ar' ? 'إنشاء المرتجع' : 'Create Return'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseReturnForm;