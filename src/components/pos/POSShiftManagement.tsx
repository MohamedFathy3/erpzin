import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Printer,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface POSShift {
  id: string;
  shift_number: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  cash_sales: number;
  card_sales: number;
  other_sales: number;
  total_sales: number;
  total_returns: number;
  transactions_count: number;
  variance: number | null;
  variance_notes: string | null;
  status: string;
  notes: string | null;
}

interface POSShiftManagementProps {
  currentShift: POSShift | null;
  onShiftChange: (shift: POSShift | null) => void;
}

const POSShiftManagement: React.FC<POSShiftManagementProps> = ({ currentShift, onShiftChange }) => {
  const queryClient = useQueryClient();
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [varianceNotes, setVarianceNotes] = useState('');

  // Fetch current open shift
  const { data: activeShift, isLoading } = useQuery({
    queryKey: ['active-shift'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('pos_shifts')
        .select('*')
        .eq('cashier_id', user.id)
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;
      return data as POSShift | null;
    },
  });

  // Open shift mutation
  const openShiftMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');

      // Generate shift number
      const { data: shiftNumber } = await supabase.rpc('generate_shift_number');

      const { data, error } = await supabase
        .from('pos_shifts')
        .insert({
          shift_number: shiftNumber,
          cashier_id: user.id,
          opening_amount: amount,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      onShiftChange(data as POSShift);
      setOpenShiftModal(false);
      setOpeningAmount('');
      toast.success('تم فتح الوردية بنجاح');
    },
    onError: (error: any) => {
      toast.error('خطأ في فتح الوردية: ' + error.message);
    }
  });

  // Close shift mutation
  const closeShiftMutation = useMutation({
    mutationFn: async ({ amount, notes }: { amount: number; notes: string }) => {
      if (!activeShift) throw new Error('لا توجد وردية مفتوحة');

      // Calculate expected amount
      const expectedAmount = activeShift.opening_amount + activeShift.cash_sales - activeShift.total_returns;
      const variance = amount - expectedAmount;

      const { data, error } = await supabase
        .from('pos_shifts')
        .update({
          closed_at: new Date().toISOString(),
          closing_amount: amount,
          expected_amount: expectedAmount,
          variance: variance,
          variance_notes: notes || null,
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeShift.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      onShiftChange(null);
      setCloseShiftModal(false);
      setClosingAmount('');
      setVarianceNotes('');
      toast.success('تم إغلاق الوردية بنجاح');
    },
    onError: (error: any) => {
      toast.error('خطأ في إغلاق الوردية: ' + error.message);
    }
  });

  React.useEffect(() => {
    if (activeShift) {
      onShiftChange(activeShift);
    }
  }, [activeShift, onShiftChange]);

  const handleOpenShift = () => {
    const amount = parseFloat(openingAmount) || 0;
    openShiftMutation.mutate(amount);
  };

  const handleCloseShift = () => {
    const amount = parseFloat(closingAmount) || 0;
    closeShiftMutation.mutate({ amount, notes: varianceNotes });
  };

  const expectedAmount = activeShift 
    ? activeShift.opening_amount + activeShift.cash_sales - activeShift.total_returns 
    : 0;

  const currentVariance = activeShift && closingAmount 
    ? parseFloat(closingAmount) - expectedAmount 
    : 0;

  const printZReport = () => {
    if (!activeShift) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>تقرير Z - ${activeShift.shift_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
          .header { text-align: center; margin-bottom: 20px; }
          .section { margin: 15px 0; padding: 10px; border: 1px solid #ddd; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #000; padding-top: 10px; }
          .variance-positive { color: green; }
          .variance-negative { color: red; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير إغلاق الوردية (Z-Report)</h1>
          <p>رقم الوردية: ${activeShift.shift_number}</p>
          <p>تاريخ الفتح: ${format(new Date(activeShift.opened_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</p>
          <p>تاريخ الإغلاق: ${format(new Date(), 'yyyy/MM/dd HH:mm', { locale: ar })}</p>
        </div>
        
        <div class="section">
          <h3>ملخص المبيعات</h3>
          <div class="row"><span>عدد المعاملات:</span><span>${activeShift.transactions_count}</span></div>
          <div class="row"><span>مبيعات نقدية:</span><span>${activeShift.cash_sales.toLocaleString()} ر.ي</span></div>
          <div class="row"><span>مبيعات بطاقة:</span><span>${activeShift.card_sales.toLocaleString()} ر.ي</span></div>
          <div class="row"><span>مبيعات أخرى:</span><span>${activeShift.other_sales.toLocaleString()} ر.ي</span></div>
          <div class="row total"><span>إجمالي المبيعات:</span><span>${activeShift.total_sales.toLocaleString()} ر.ي</span></div>
        </div>
        
        <div class="section">
          <h3>حركة الصندوق</h3>
          <div class="row"><span>رصيد الافتتاح:</span><span>${activeShift.opening_amount.toLocaleString()} ر.ي</span></div>
          <div class="row"><span>المبيعات النقدية:</span><span>+ ${activeShift.cash_sales.toLocaleString()} ر.ي</span></div>
          <div class="row"><span>المرتجعات:</span><span>- ${activeShift.total_returns.toLocaleString()} ر.ي</span></div>
          <div class="row total"><span>المتوقع في الصندوق:</span><span>${expectedAmount.toLocaleString()} ر.ي</span></div>
        </div>
        
        ${closingAmount ? `
        <div class="section">
          <h3>التسوية</h3>
          <div class="row"><span>المبلغ الفعلي:</span><span>${parseFloat(closingAmount).toLocaleString()} ر.ي</span></div>
          <div class="row ${currentVariance >= 0 ? 'variance-positive' : 'variance-negative'}">
            <span>${currentVariance >= 0 ? 'زيادة:' : 'عجز:'}</span>
            <span>${Math.abs(currentVariance).toLocaleString()} ر.ي</span>
          </div>
        </div>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading) {
    return <div className="p-4 text-center">جاري التحميل...</div>;
  }

  return (
    <>
      {/* Current Shift Status */}
      {activeShift ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                الوردية الحالية
              </CardTitle>
              <Badge variant="default" className="bg-green-600">مفتوحة</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">رقم الوردية:</span>
                <span className="font-medium mr-2">{activeShift.shift_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground">وقت الفتح:</span>
                <span className="font-medium mr-2">
                  {format(new Date(activeShift.opened_at), 'HH:mm', { locale: ar })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">رصيد الافتتاح:</span>
                <span className="font-medium mr-2">{activeShift.opening_amount.toLocaleString()} ر.ي</span>
              </div>
              <div>
                <span className="text-muted-foreground">المعاملات:</span>
                <span className="font-medium mr-2">{activeShift.transactions_count}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-green-100 dark:bg-green-900/30">
                <div className="text-xs text-muted-foreground">نقدي</div>
                <div className="font-bold text-green-700 dark:text-green-400">
                  {activeShift.cash_sales.toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                <div className="text-xs text-muted-foreground">بطاقة</div>
                <div className="font-bold text-blue-700 dark:text-blue-400">
                  {activeShift.card_sales.toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded bg-red-100 dark:bg-red-900/30">
                <div className="text-xs text-muted-foreground">مرتجعات</div>
                <div className="font-bold text-red-700 dark:text-red-400">
                  {activeShift.total_returns.toLocaleString()}
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              variant="destructive"
              onClick={() => setCloseShiftModal(true)}
            >
              <X className="h-4 w-4 ml-2" />
              إغلاق الوردية
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <h3 className="font-bold text-lg mb-2">لا توجد وردية مفتوحة</h3>
            <p className="text-muted-foreground text-sm mb-4">
              يجب فتح وردية جديدة لبدء البيع
            </p>
            <Button onClick={() => setOpenShiftModal(true)} className="w-full">
              <DollarSign className="h-4 w-4 ml-2" />
              فتح وردية جديدة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Open Shift Modal */}
      <Dialog open={openShiftModal} onOpenChange={setOpenShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              فتح وردية جديدة
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opening-amount">المبلغ الموجود في الصندوق</Label>
              <Input
                id="opening-amount"
                type="number"
                placeholder="0"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="text-left"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                أدخل المبلغ النقدي الموجود في درج الكاشير عند بداية الوردية
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenShiftModal(false)}>
              إلغاء
            </Button>
            <Button onClick={handleOpenShift} disabled={openShiftMutation.isPending}>
              {openShiftMutation.isPending ? 'جاري الفتح...' : 'فتح الوردية'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal (Z-Report) */}
      <Dialog open={closeShiftModal} onOpenChange={setCloseShiftModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              إغلاق الوردية - تقرير Z
            </DialogTitle>
          </DialogHeader>
          
          {activeShift && (
            <div className="space-y-4 py-4">
              {/* Shift Summary */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span>رصيد الافتتاح:</span>
                  <span className="font-medium">{activeShift.opening_amount.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>المبيعات النقدية:</span>
                  <span className="font-medium">+ {activeShift.cash_sales.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>المرتجعات:</span>
                  <span className="font-medium">- {activeShift.total_returns.toLocaleString()} ر.ي</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>المتوقع في الصندوق:</span>
                  <span>{expectedAmount.toLocaleString()} ر.ي</span>
                </div>
              </div>

              {/* Closing Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="closing-amount">المبلغ الفعلي في الصندوق</Label>
                <Input
                  id="closing-amount"
                  type="number"
                  placeholder="0"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  className="text-left text-lg"
                  dir="ltr"
                />
              </div>

              {/* Variance Display */}
              {closingAmount && (
                <div className={`p-4 rounded-lg flex items-center justify-between ${
                  currentVariance === 0 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : currentVariance > 0 
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentVariance === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : currentVariance > 0 ? (
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {currentVariance === 0 ? 'مطابق' : currentVariance > 0 ? 'زيادة' : 'عجز'}
                    </span>
                  </div>
                  <span className="font-bold text-lg">
                    {Math.abs(currentVariance).toLocaleString()} ر.ي
                  </span>
                </div>
              )}

              {/* Variance Notes */}
              {closingAmount && currentVariance !== 0 && (
                <div className="space-y-2">
                  <Label htmlFor="variance-notes">ملاحظات الفرق</Label>
                  <Textarea
                    id="variance-notes"
                    placeholder="اشرح سبب الفرق..."
                    value={varianceNotes}
                    onChange={(e) => setVarianceNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={printZReport} disabled={!closingAmount}>
              <Printer className="h-4 w-4 ml-2" />
              طباعة التقرير
            </Button>
            <Button variant="outline" onClick={() => setCloseShiftModal(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleCloseShift} 
              disabled={closeShiftMutation.isPending || !closingAmount}
              variant="destructive"
            >
              {closeShiftMutation.isPending ? 'جاري الإغلاق...' : 'إغلاق الوردية'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default POSShiftManagement;
