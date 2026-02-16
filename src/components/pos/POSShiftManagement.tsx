import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Printer,
  X,
  RefreshCw,
  User,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import api from '@/lib/api';

// ========== أنواع البيانات ==========
interface POSShift {
  id: number;
  employee_id: number | null;
  admin_id: number | null;
  opening_balance: string;
  closing_balance: string | null;
  cash_sales: string;
  card_sales: string;
  returns_amount: string;
  expected_amount: string | null;
  actual_amount: string | null;
  difference: string | null;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OpenShiftPayload {
  opening_balance: number;
  notes?: string;
}

interface CloseShiftPayload {
  actual_amount: number;
  notes?: string;
}

interface POSShiftManagementProps {
  onShiftChange?: (shift: POSShift | null) => void;
}

const POSShiftManagement: React.FC<POSShiftManagementProps> = ({ onShiftChange }) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  
  // ========== State ==========
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  
  // ========== جلب الوردية الحالية ==========
  const { 
    data: currentShift, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['current-shift'],
    queryFn: async () => {
      try {
        const response = await api.get('/shifts/current');
        if (response.data.status && response.data.data) {
          return response.data.data as POSShift;
        }
        return null;
      } catch (error) {
        console.error('Error fetching current shift:', error);
        return null;
      }
    }
  });

  // ========== فتح وردية جديدة ==========
  const openShiftMutation = useMutation({
    mutationFn: async (data: OpenShiftPayload) => {
      const response = await api.post('/shifts/open', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.status) {
        queryClient.invalidateQueries({ queryKey: ['current-shift'] });
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
        setOpenShiftModal(false);
        setOpeningAmount('');
        setOpeningNotes('');
        toast.success(language === 'ar' ? 'تم فتح الوردية بنجاح' : 'Shift opened successfully');
        
        // إشعار المكون الأب
        if (onShiftChange) {
          refetch().then(result => {
            onShiftChange(result.data || null);
          });
        }
      } else {
        toast.error(data.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'));
      }
    },
    onError: (error: any) => {
      console.error('Error opening shift:', error);
      toast.error(error.response?.data?.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'));
    }
  });

  // ========== إغلاق الوردية ==========
  const closeShiftMutation = useMutation({
    mutationFn: async (data: CloseShiftPayload) => {
      const response = await api.post('/shifts/close', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.status) {
        queryClient.invalidateQueries({ queryKey: ['current-shift'] });
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
        setCloseShiftModal(false);
        setClosingAmount('');
        setClosingNotes('');
        toast.success(language === 'ar' ? 'تم إغلاق الوردية بنجاح' : 'Shift closed successfully');
        
        // إشعار المكون الأب
        if (onShiftChange) {
          onShiftChange(null);
        }
      } else {
        toast.error(data.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'));
      }
    },
    onError: (error: any) => {
      console.error('Error closing shift:', error);
      toast.error(error.response?.data?.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'));
    }
  });

  // ========== إشعار المكون الأب عند تغير الوردية ==========
  useEffect(() => {
    if (onShiftChange) {
      onShiftChange(currentShift || null);
    }
  }, [currentShift, onShiftChange]);

  // ========== Translations ==========
  const t = {
    en: {
      currentShift: 'Current Shift',
      noActiveShift: 'No Active Shift',
      openShift: 'Open New Shift',
      closeShift: 'Close Shift',
      shiftNumber: 'Shift #',
      openTime: 'Open Time',
      openingBalance: 'Opening Balance',
      cash: 'Cash',
      card: 'Card',
      returns: 'Returns',
      expectedAmount: 'Expected Amount',
      actualAmount: 'Actual Amount',
      variance: 'Difference',
      surplus: 'Surplus',
      shortage: 'Shortage',
      exact: 'Exact',
      notes: 'Notes',
      varianceNotes: 'Notes',
      print: 'Print',
      cancel: 'Cancel',
      save: 'Save',
      openShiftSuccess: 'Shift opened successfully',
      closeShiftSuccess: 'Shift closed successfully',
      enterOpeningAmount: 'Enter opening balance',
      enterClosingAmount: 'Enter actual amount',
      loading: 'Loading...',
      totalSales: 'Total Sales',
      cashier: 'Cashier',
      date: 'Date',
      time: 'Time',
      thankYou:"thankYou",
      shiftDetails: 'Shift Details',
      openingNotes: 'Opening Notes',
      closingNotes: 'Closing Notes',
      optional: 'Optional'
    },
    ar: {
      currentShift: 'الوردية الحالية',
      noActiveShift: 'لا توجد وردية مفتوحة',
      openShift: 'فتح وردية جديدة',
      closeShift: 'إغلاق الوردية',
      shiftNumber: 'رقم الوردية',
      openTime: 'وقت الفتح',
      openingBalance: 'رصيد الافتتاح',
      cash: 'نقدي',
      card: 'بطاقة',
      returns: 'مرتجعات',
      expectedAmount: 'المتوقع',
      actualAmount: 'الفعلي',
      variance: 'الفرق',
      surplus: 'زيادة',
      shortage: 'عجز',
      exact: 'مطابق',
      notes: 'ملاحظات',
      varianceNotes: 'ملاحظات',
      print: 'طباعة',
      cancel: 'إلغاء',
      save: 'حفظ',
      openShiftSuccess: 'تم فتح الوردية بنجاح',
      closeShiftSuccess: 'تم إغلاق الوردية بنجاح',
      enterOpeningAmount: 'أدخل رصيد الافتتاح',
      enterClosingAmount: 'أدخل الرصيد الفعلي',
      loading: 'جاري التحميل...',
      totalSales: 'إجمالي المبيعات',
      cashier: 'الكاشير',
      date: 'التاريخ',
      thankYou:"شكرا لك",
      time: 'الوقت',
      shiftDetails: 'تفاصيل الوردية',
      openingNotes: 'ملاحظات الافتتاح',
      closingNotes: 'ملاحظات الإغلاق',
      optional: 'اختياري'
    }
  }[language === 'ar' ? 'ar' : 'en'];

  // ========== حساب المبلغ المتوقع ==========
  const expectedAmount = currentShift 
    ? parseFloat(currentShift.opening_balance) + 
      parseFloat(currentShift.cash_sales) - 
      parseFloat(currentShift.returns_amount)
    : 0;

  // ========== حساب الفرق ==========
  const currentVariance = currentShift && closingAmount 
    ? parseFloat(closingAmount) - expectedAmount 
    : 0;

  // ========== Handlers ==========
  const handleOpenShift = () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(language === 'ar' ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    openShiftMutation.mutate({
      opening_balance: amount,
      notes: openingNotes || undefined
    });
  };

  const handleCloseShift = () => {
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(language === 'ar' ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    closeShiftMutation.mutate({
      actual_amount: amount,
      notes: closingNotes || undefined
    });
  };

  // ========== طباعة تقرير Z ==========
  const printZReport = () => {
    if (!currentShift) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const varianceText = currentVariance === 0 ? t.exact : currentVariance > 0 ? t.surplus : t.shortage;
    const varianceClass = currentVariance === 0 ? '' : currentVariance > 0 ? 'variance-positive' : 'variance-negative';
    const varianceIcon = currentVariance === 0 ? '✓' : currentVariance > 0 ? '↑' : '↓';

    const content = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${t.closeShift} - #${currentShift.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; background: #fff; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #000; }
          .shop-name { font-size: 24px; font-weight: bold; margin: 0; }
          .shift-info { text-align: center; margin-bottom: 30px; }
          .section { margin: 25px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #000; padding-top: 15px; margin-top: 15px; }
          .variance-positive { color: #2563eb; }
          .variance-negative { color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ccc; text-align: center; color: #666; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
          .badge-open { background: #16a34a20; color: #16a34a; }
          .badge-closed { background: #6b728020; color: #6b7280; }
          .amount { font-family: monospace; font-size: 1.1em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">${localStorage.getItem('shop_name') || t.currentShift}</h1>
          <p>الوردية #${currentShift.id}</p>
          <span class="badge badge-closed">${t.closeShift}</span>
        </div>
        
        <div class="shift-info">
          <div class="row">
            <span>${t.openTime}:</span>
            <span>${format(new Date(currentShift.opened_at), 'yyyy/MM/dd HH:mm:ss', { locale: ar })}</span>
          </div>
          <div class="row">
            <span>${t.time || 'وقت الإغلاق'}:</span>
            <span>${format(new Date(), 'yyyy/MM/dd HH:mm:ss', { locale: ar })}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">💰 ${t.openingBalance}</div>
          <div class="row">
            <span>${t.openingBalance}:</span>
            <span class="amount">${parseFloat(currentShift.opening_balance).toLocaleString()} ر.ي</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">📊 ${t.totalSales || 'المبيعات'}</div>
          <div class="row">
            <span>💰 ${t.cash}:</span>
            <span class="amount">${parseFloat(currentShift.cash_sales).toLocaleString()} ر.ي</span>
          </div>
          <div class="row">
            <span>💳 ${t.card}:</span>
            <span class="amount">${parseFloat(currentShift.card_sales).toLocaleString()} ر.ي</span>
          </div>
          <div class="row">
            <span>↩️ ${t.returns}:</span>
            <span class="amount">-${parseFloat(currentShift.returns_amount).toLocaleString()} ر.ي</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">⚖️ ${t.variance}</div>
          <div class="row">
            <span>${t.expectedAmount}:</span>
            <span class="amount">${expectedAmount.toLocaleString()} ر.ي</span>
          </div>
          <div class="row">
            <span>${t.actualAmount}:</span>
            <span class="amount">${parseFloat(closingAmount || '0').toLocaleString()} ر.ي</span>
          </div>
          <div class="row ${varianceClass}">
            <span>${varianceIcon} ${varianceText}:</span>
            <span class="amount">${Math.abs(currentVariance).toLocaleString()} ر.ي</span>
          </div>
          ${closingNotes ? `
          <div class="row">
            <span>${t.notes}:</span>
            <span>${closingNotes}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>${t.thankYou || 'شكراً لتعاملكم معنا'}</p>
          <p style="font-size: 12px; margin-top: 10px;">${format(new Date(), 'yyyy/MM/dd HH:mm:ss', { locale: ar })}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  // ========== Badge الفرق ==========
  const getVarianceBadge = () => {
    if (!currentShift || !currentShift.difference) return null;
    
    const diff = parseFloat(currentShift.difference);
    if (diff === 0) {
      return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">✓ {t.exact}</Badge>;
    } else if (diff > 0) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">↑ {t.surplus} {diff.toLocaleString()} ر.ي</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">↓ {t.shortage} {Math.abs(diff).toLocaleString()} ر.ي</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t.loading}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Current Shift Status */}
      {currentShift ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {t.currentShift}
              </CardTitle>
              <Badge variant="default" className="bg-emerald-600">
                <CheckCircle2 className="h-3 w-3 ml-1" />
                {language === 'ar' ? 'مفتوحة' : 'Open'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar size={12} />
                  {t.openTime}:
                </span>
                <div className="font-medium">
                  {format(new Date(currentShift.opened_at), 'yyyy-MM-dd HH:mm', { locale: ar })}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign size={12} />
                  {t.openingBalance}:
                </span>
                <div className="font-medium">{parseFloat(currentShift.opening_balance).toLocaleString()} ر.ي</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 text-center">
                <div className="text-xs text-muted-foreground mb-1">{t.cash}</div>
                <div className="font-bold text-emerald-700 dark:text-emerald-400">
                  {parseFloat(currentShift.cash_sales).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 text-center">
                <div className="text-xs text-muted-foreground mb-1">{t.card}</div>
                <div className="font-bold text-blue-700 dark:text-blue-400">
                  {parseFloat(currentShift.card_sales).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 text-center">
                <div className="text-xs text-muted-foreground mb-1">{t.returns}</div>
                <div className="font-bold text-red-700 dark:text-red-400">
                  {parseFloat(currentShift.returns_amount).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">{t.expectedAmount}:</span>
              <span className="text-lg font-bold">{expectedAmount.toLocaleString()} ر.ي</span>
            </div>

            {currentShift.difference && getVarianceBadge()}

            {currentShift.notes && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t.notes}</p>
                <p className="text-sm">{currentShift.notes}</p>
              </div>
            )}

            <Button 
              className="w-full gap-2" 
              variant="destructive"
              onClick={() => setCloseShiftModal(true)}
            >
              <X className="h-4 w-4" />
              {t.closeShift}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">{t.noActiveShift}</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {language === 'ar' ? 'يجب فتح وردية جديدة لبدء البيع' : 'Open a new shift to start selling'}
            </p>
            <Button 
              onClick={() => setOpenShiftModal(true)} 
              className="w-full gap-2"
              size="lg"
            >
              <DollarSign className="h-4 w-4" />
              {t.openShift}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Open Shift Modal */}
      <Dialog open={openShiftModal} onOpenChange={setOpenShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <DollarSign className="h-5 w-5" />
              {t.openShift}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opening-amount" className="text-base">
                {t.openingBalance} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="opening-amount"
                  type="number"
                  placeholder="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="text-left text-lg pl-16"
                  dir="ltr"
                  autoFocus
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ر.ي
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.enterOpeningAmount}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening-notes" className="text-base">
                {t.openingNotes} <span className="text-muted-foreground text-xs">({t.optional})</span>
              </Label>
              <Textarea
                id="opening-notes"
                placeholder={t.notes}
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenShiftModal(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleOpenShift} disabled={openShiftMutation.isPending}>
              {openShiftMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  {t.loading}
                </>
              ) : (
                t.openShift
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal */}
      <Dialog open={closeShiftModal} onOpenChange={setCloseShiftModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-5 w-5" />
              {t.closeShift}
            </DialogTitle>
          </DialogHeader>
          
          {currentShift && (
            <div className="space-y-4 py-4">
              {/* Shift Summary */}
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t.openingBalance}:</span>
                  <span className="font-medium">{parseFloat(currentShift.opening_balance).toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600">
                  <span>+ {t.cash}:</span>
                  <span className="font-medium">+ {parseFloat(currentShift.cash_sales).toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>- {t.returns}:</span>
                  <span className="font-medium">- {parseFloat(currentShift.returns_amount).toLocaleString()} ر.ي</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>{t.expectedAmount}:</span>
                  <span className="text-primary">{expectedAmount.toLocaleString()} ر.ي</span>
                </div>
              </div>

              {/* Closing Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="closing-amount" className="text-base">
                  {t.actualAmount} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="closing-amount"
                    type="number"
                    placeholder="0"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    className="text-left text-lg pl-16"
                    dir="ltr"
                    autoFocus
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ر.ي
                  </span>
                </div>
              </div>

              {/* Variance Display */}
              {closingAmount && (
                <div className={`p-4 rounded-lg flex items-center justify-between ${
                  currentVariance === 0 
                    ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                    : currentVariance > 0 
                      ? 'bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentVariance === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : currentVariance > 0 ? (
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {currentVariance === 0 ? t.exact : currentVariance > 0 ? t.surplus : t.shortage}
                    </span>
                  </div>
                  <span className="font-bold text-lg">
                    {Math.abs(currentVariance).toLocaleString()} ر.ي
                  </span>
                </div>
              )}

              {/* Closing Notes */}
              <div className="space-y-2">
                <Label htmlFor="closing-notes" className="text-base">
                  {t.closingNotes} <span className="text-muted-foreground text-xs">({t.optional})</span>
                </Label>
                <Textarea
                  id="closing-notes"
                  placeholder={t.notes}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={printZReport} 
              disabled={!closingAmount}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
            <Button variant="outline" onClick={() => setCloseShiftModal(false)}>
              {t.cancel}
            </Button>
            <Button 
              onClick={handleCloseShift} 
              disabled={closeShiftMutation.isPending || !closingAmount}
              variant="destructive"
              className="gap-2"
            >
              {closeShiftMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t.loading}
                </>
              ) : (
                t.closeShift
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default POSShiftManagement;