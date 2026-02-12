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
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Printer,
  X,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ========== أنواع البيانات ==========
interface POSShift {
  id: string;
  shift_number: string;
  cashier_id: string;
  cashier_name?: string;
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
  status: 'open' | 'closed';
  notes: string | null;
}

interface POSShiftManagementProps {
  currentShift: POSShift | null;
  onShiftChange: (shift: POSShift | null) => void;
}

// ========== Local Storage Keys ==========
const STORAGE_KEYS = {
  ACTIVE_SHIFT: 'pos_active_shift',
  SHIFT_HISTORY: 'pos_shift_history',
  LAST_CLEANUP: 'pos_last_cleanup'
};

// ========== Local Storage Service ==========
class LocalStorageService {
  // ✅ حفظ الوردية النشطة
  static saveActiveShift(shift: POSShift | null) {
    if (shift) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFT, JSON.stringify(shift));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT);
    }
  }

  // ✅ جلب الوردية النشطة
  static getActiveShift(): POSShift | null {
    const shift = localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFT);
    return shift ? JSON.parse(shift) : null;
  }

  // ✅ حفظ سجل الورديات
  static saveShiftToHistory(shift: POSShift) {
    const history = this.getShiftHistory();
    const existingIndex = history.findIndex(s => s.id === shift.id);
    
    if (existingIndex >= 0) {
      history[existingIndex] = shift;
    } else {
      history.push(shift);
    }
    
    localStorage.setItem(STORAGE_KEYS.SHIFT_HISTORY, JSON.stringify(history));
  }

  // ✅ جلب سجل الورديات
  static getShiftHistory(): POSShift[] {
    const history = localStorage.getItem(STORAGE_KEYS.SHIFT_HISTORY);
    return history ? JSON.parse(history) : [];
  }

  // ✅ حذف الورديات الأقدم من 24 ساعة
  static cleanupOldShifts() {
    const lastCleanup = localStorage.getItem(STORAGE_KEYS.LAST_CLEANUP);
    const now = Date.now();
    
    // نعمل cleanup مرة كل 24 ساعة بس
    if (lastCleanup && now - parseInt(lastCleanup) < 24 * 60 * 60 * 1000) {
      return;
    }

    const history = this.getShiftHistory();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // نشيل الورديات اللي اتعملت من أكتر من 24 ساعة
    const filteredHistory = history.filter(shift => {
      const shiftDate = new Date(shift.opened_at).getTime();
      return shiftDate > oneDayAgo;
    });
    
    localStorage.setItem(STORAGE_KEYS.SHIFT_HISTORY, JSON.stringify(filteredHistory));
    localStorage.setItem(STORAGE_KEYS.LAST_CLEANUP, now.toString());
  }

  // ✅ توليد رقم وردية جديد
  static generateShiftNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9000 + 1000);
    
    return `SH-${year}${month}${day}-${random}`;
  }

  // ✅ توليد ID جديد
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

const POSShiftManagement: React.FC<POSShiftManagementProps> = ({ currentShift, onShiftChange }) => {
  const { language } = useLanguage();
  
  // ========== State ==========
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [varianceNotes, setVarianceNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [cashierName, setCashierName] = useState('');

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
      transactions: 'Transactions',
      cash: 'Cash',
      card: 'Card',
      returns: 'Returns',
      expectedAmount: 'Expected Amount',
      actualAmount: 'Actual Amount',
      variance: 'Variance',
      surplus: 'Surplus',
      shortage: 'Shortage',
      exact: 'Exact',
      notes: 'Notes',
      varianceNotes: 'Variance Notes',
      print: 'Print',
      cancel: 'Cancel',
      save: 'Save',
      openShiftSuccess: 'Shift opened successfully',
      closeShiftSuccess: 'Shift closed successfully',
      enterOpeningAmount: 'Enter opening balance',
      enterClosingAmount: 'Enter closing balance',
      loading: 'Loading...'
    },
    ar: {
      currentShift: 'الوردية الحالية',
      noActiveShift: 'لا توجد وردية مفتوحة',
      openShift: 'فتح وردية جديدة',
      closeShift: 'إغلاق الوردية',
      shiftNumber: 'رقم الوردية',
      openTime: 'وقت الفتح',
      openingBalance: 'رصيد الافتتاح',
      transactions: 'المعاملات',
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
      varianceNotes: 'ملاحظات الفرق',
      print: 'طباعة',
      cancel: 'إلغاء',
      save: 'حفظ',
      openShiftSuccess: 'تم فتح الوردية بنجاح',
      closeShiftSuccess: 'تم إغلاق الوردية بنجاح',
      enterOpeningAmount: 'أدخل رصيد الافتتاح',
      enterClosingAmount: 'أدخل الرصيد الفعلي',
      loading: 'جاري التحميل...'
    }
  }[language === 'ar' ? 'ar' : 'en'];

  // ========== Load Active Shift on Mount ==========
  useEffect(() => {
    // تنظيف الورديات القديمة
    LocalStorageService.cleanupOldShifts();
    
    // جلب الوردية النشطة
    const activeShift = LocalStorageService.getActiveShift();
    
    // لو الوردية النشطة قديمة (أكتر من 24 ساعة)، نقفلها
    if (activeShift) {
      const shiftDate = new Date(activeShift.opened_at).getTime();
      const now = Date.now();
      
      if (now - shiftDate > 24 * 60 * 60 * 1000) {
        // نقفل الوردية تلقائياً
        const closedShift = {
          ...activeShift,
          closed_at: new Date().toISOString(),
          status: 'closed' as const
        };
        
        LocalStorageService.saveShiftToHistory(closedShift);
        LocalStorageService.saveActiveShift(null);
        onShiftChange(null);
        
        toast.warning(t.shiftNumber + ' ' + activeShift.shift_number + ' ' + 
          (language === 'ar' ? 'تم إغلاقها تلقائياً بعد 24 ساعة' : 'automatically closed after 24 hours'));
      } else {
        onShiftChange(activeShift);
      }
    }
    
    // جلب اسم الكاشير من localStorage
    const savedName = localStorage.getItem('pos_cashier_name');
    if (savedName) {
      setCashierName(savedName);
    } else {
      const name = prompt(language === 'ar' ? 'أدخل اسم الكاشير' : 'Enter cashier name');
      if (name) {
        setCashierName(name);
        localStorage.setItem('pos_cashier_name', name);
      }
    }
    
    setIsLoading(false);
  }, []);

  // ========== Open Shift ==========
  const openShiftMutation = {
    isPending: false,
    mutate: (amount: number) => {
      try {
        if (!cashierName) {
          toast.error(language === 'ar' ? 'الرجاء إدخال اسم الكاشير' : 'Please enter cashier name');
          return;
        }

        const now = new Date().toISOString();
        const newShift: POSShift = {
          id: LocalStorageService.generateId(),
          shift_number: LocalStorageService.generateShiftNumber(),
          cashier_id: 'local-' + Date.now(),
          cashier_name: cashierName,
          opened_at: now,
          closed_at: null,
          opening_amount: amount,
          closing_amount: null,
          expected_amount: null,
          cash_sales: 0,
          card_sales: 0,
          other_sales: 0,
          total_sales: 0,
          total_returns: 0,
          transactions_count: 0,
          variance: null,
          variance_notes: null,
          status: 'open',
          notes: null
        };

        LocalStorageService.saveActiveShift(newShift);
        LocalStorageService.saveShiftToHistory(newShift);
        
        onShiftChange(newShift);
        setOpenShiftModal(false);
        setOpeningAmount('');
        
        toast.success(t.openShiftSuccess);
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  // ========== Close Shift ==========
  const closeShiftMutation = {
    isPending: false,
    mutate: ({ amount, notes }: { amount: number; notes: string }) => {
      try {
        if (!currentShift) {
          throw new Error(language === 'ar' ? 'لا توجد وردية مفتوحة' : 'No open shift');
        }

        const expectedAmount = currentShift.opening_amount + currentShift.cash_sales - currentShift.total_returns;
        const variance = amount - expectedAmount;

        const closedShift: POSShift = {
          ...currentShift,
          closed_at: new Date().toISOString(),
          closing_amount: amount,
          expected_amount: expectedAmount,
          variance: variance,
          variance_notes: notes || null,
          status: 'closed'
        };

        LocalStorageService.saveActiveShift(null);
        LocalStorageService.saveShiftToHistory(closedShift);
        
        onShiftChange(null);
        setCloseShiftModal(false);
        setClosingAmount('');
        setVarianceNotes('');
        
        toast.success(t.closeShiftSuccess);
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  // ========== Handlers ==========
  const handleOpenShift = () => {
    const amount = parseFloat(openingAmount) || 0;
    if (amount <= 0) {
      toast.error(language === 'ar' ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }
    openShiftMutation.mutate(amount);
  };

  const handleCloseShift = () => {
    const amount = parseFloat(closingAmount) || 0;
    if (amount <= 0) {
      toast.error(language === 'ar' ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }
    closeShiftMutation.mutate({ amount, notes: varianceNotes });
  };

  const expectedAmount = currentShift 
    ? currentShift.opening_amount + currentShift.cash_sales - currentShift.total_returns 
    : 0;

  const currentVariance = currentShift && closingAmount 
    ? parseFloat(closingAmount) - expectedAmount 
    : 0;

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
        <title>${t.closeShift} - ${currentShift.shift_number}</title>
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
          <h1 class="shop-name">${localStorage.getItem('pos_shop_name') || t.currentShift}</h1>
          <p>${currentShift.shift_number}</p>
          <span class="badge badge-closed">${t.closeShift}</span>
        </div>
        
        <div class="shift-info">
          <div class="row">
            <span>${t.cashier}:</span>
            <span class="font-bold">${currentShift.cashier_name || cashierName}</span>
          </div>
          <div class="row">
            <span>${t.openTime}:</span>
            <span>${format(new Date(currentShift.opened_at), 'yyyy/MM/dd HH:mm:ss', { locale: ar })}</span>
          </div>
          <div class="row">
            <span>${t.closeTime || 'وقت الإغلاق'}:</span>
            <span>${format(new Date(), 'yyyy/MM/dd HH:mm:ss', { locale: ar })}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">📊 ${t.salesSummary || 'ملخص المبيعات'}</div>
          <div class="row">
            <span>${t.transactions}:</span>
            <span class="amount">${currentShift.transactions_count}</span>
          </div>
          <div class="row">
            <span>💰 ${t.cash}:</span>
            <span class="amount">${currentShift.cash_sales.toLocaleString()} ر.ي</span>
          </div>
          <div class="row">
            <span>💳 ${t.card}:</span>
            <span class="amount">${currentShift.card_sales.toLocaleString()} ر.ي</span>
          </div>
          <div class="row">
            <span>↩️ ${t.returns}:</span>
            <span class="amount">${currentShift.total_returns.toLocaleString()} ر.ي</span>
          </div>
          <div class="row total">
            <span>${t.total}:</span>
            <span class="amount">${currentShift.total_sales.toLocaleString()} ر.ي</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">💰 ${t.cashSummary || 'ملخص النقدية'}</div>
          <div class="row">
            <span>${t.openingBalance}:</span>
            <span class="amount">${currentShift.opening_amount.toLocaleString()} ر.ي</span>
          </div>
          <div class="row">
            <span>+ ${t.cashSales || 'مبيعات نقدية'}:</span>
            <span class="amount">+ ${currentShift.cash_sales.toLocaleString()} ر.ي</span>
          </div>
          <div class="row">
            <span>- ${t.returns}:</span>
            <span class="amount">- ${currentShift.total_returns.toLocaleString()} ر.ي</span>
          </div>
          <div class="row total">
            <span>${t.expectedAmount}:</span>
            <span class="amount">${expectedAmount.toLocaleString()} ر.ي</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">⚖️ ${t.variance}</div>
          <div class="row">
            <span>${t.actualAmount}:</span>
            <span class="amount">${parseFloat(closingAmount || '0').toLocaleString()} ر.ي</span>
          </div>
          <div class="row ${varianceClass}">
            <span>${varianceIcon} ${varianceText}:</span>
            <span class="amount">${Math.abs(currentVariance).toLocaleString()} ر.ي</span>
          </div>
          ${varianceNotes ? `
          <div class="row">
            <span>${t.notes}:</span>
            <span>${varianceNotes}</span>
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

  const getVarianceBadge = () => {
    if (!currentShift || !currentShift.variance) return null;
    
    if (currentShift.variance === 0) {
      return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">✓ {t.exact}</Badge>;
    } else if (currentShift.variance > 0) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">↑ {t.surplus} {currentShift.variance.toLocaleString()} ر.ي</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">↓ {t.shortage} {Math.abs(currentShift.variance).toLocaleString()} ر.ي</Badge>;
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
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 ml-1" />
                {t.openShift}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">{t.shiftNumber}:</span>
                <div className="font-medium font-mono">{currentShift.shift_number}</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">{t.cashier || 'الكاشير'}:</span>
                <div className="font-medium">{currentShift.cashier_name || cashierName}</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">{t.openTime}:</span>
                <div className="font-medium">
                  {format(new Date(currentShift.opened_at), 'HH:mm:ss', { locale: ar })}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">{t.openingBalance}:</span>
                <div className="font-medium">{currentShift.opening_amount.toLocaleString()} ر.ي</div>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-green-100/50 dark:bg-green-900/20 text-center">
                <div className="text-xs text-muted-foreground mb-1">{t.cash}</div>
                <div className="font-bold text-green-700 dark:text-green-400">
                  {currentShift.cash_sales.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 text-center">
                <div className="text-xs text-muted-foreground mb-1">{t.card}</div>
                <div className="font-bold text-blue-700 dark:text-blue-400">
                  {currentShift.card_sales.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 text-center">
                <div className="text-xs text-muted-foreground mb-1">{t.returns}</div>
                <div className="font-bold text-red-700 dark:text-red-400">
                  {currentShift.total_returns.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">{t.expectedAmount}:</span>
              <span className="text-lg font-bold">{expectedAmount.toLocaleString()} ر.ي</span>
            </div>

            {currentShift.variance !== null && getVarianceBadge()}

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
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
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
                  <span className="text-muted-foreground">{t.shiftNumber}:</span>
                  <span className="font-mono font-medium">{currentShift.shift_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t.openingBalance}:</span>
                  <span className="font-medium">{currentShift.opening_amount.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span>+ {t.cash}:</span>
                  <span className="font-medium">+ {currentShift.cash_sales.toLocaleString()} ر.ي</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>- {t.returns}:</span>
                  <span className="font-medium">- {currentShift.total_returns.toLocaleString()} ر.ي</span>
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
                    ? 'bg-green-100/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : currentVariance > 0 
                      ? 'bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
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
                      {currentVariance === 0 ? t.exact : currentVariance > 0 ? t.surplus : t.shortage}
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
                  <Label htmlFor="variance-notes">{t.varianceNotes}</Label>
                  <Textarea
                    id="variance-notes"
                    placeholder={t.notes}
                    value={varianceNotes}
                    onChange={(e) => setVarianceNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
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