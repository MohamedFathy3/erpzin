import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Banknote,
  CreditCard,
  Receipt,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

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
  autoRefresh?: boolean;
}

const POSShiftManagement: React.FC<POSShiftManagementProps> = ({ 
  onShiftChange, 
  autoRefresh = true 
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const queryClient = useQueryClient();
  
  // ========== State ==========
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  
  // ========== جلب الوردية الحالية ==========
  const { 
    data: currentShift, 
    isLoading, 
    refetch,
    error
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
    },
    refetchInterval: autoRefresh ? 30000 : false, // تحديث كل 30 ثانية
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
        toast.success(language === 'ar' ? 'تم فتح الوردية بنجاح' : 'Shift opened successfully', {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        
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
        toast.success(language === 'ar' ? 'تم إغلاق الوردية بنجاح' : 'Shift closed successfully', {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        
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

  // ========== حساب المبلغ المتوقع ==========
  const expectedAmount = useMemo(() => {
    if (!currentShift) return 0;
    return parseFloat(currentShift.opening_balance) + 
           parseFloat(currentShift.cash_sales) - 
           parseFloat(currentShift.returns_amount);
  }, [currentShift]);

  // ========== حساب الفرق ==========
  const currentVariance = useMemo(() => {
    if (!currentShift || !closingAmount) return 0;
    return parseFloat(closingAmount) - expectedAmount;
  }, [currentShift, closingAmount, expectedAmount]);

  // ========== Translations ==========
  const t = {
    en: {
      currentShift: 'Current Shift',
      noActiveShift: 'No Active Shift',
      openShift: 'Open New Shift',
      closeShift: 'Close Shift',
      shiftNumber: 'Shift #',
      openTime: 'Open Time',
      closeTime: 'Close Time',
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
      print: 'Print Report',
      printZ: 'Print Z-Report',
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
      thankYou: 'Thank you',
      shiftDetails: 'Shift Details',
      openingNotes: 'Opening Notes',
      closingNotes: 'Closing Notes',
      optional: 'Optional',
      summary: 'Shift Summary',
      refresh: 'Refresh',
      error: 'Error loading shift data',
      retry: 'Retry',
      confirmClose: 'Are you sure you want to close this shift?',
      confirmOpen: 'Are you sure you want to open a new shift?',
      validAmount: 'Please enter a valid amount',
      cashSales: 'Cash Sales',
      cardSales: 'Card Sales',
      totalReturns: 'Total Returns',
      netSales: 'Net Sales'
    },
    ar: {
      currentShift: 'الوردية الحالية',
      noActiveShift: 'لا توجد وردية مفتوحة',
      openShift: 'فتح وردية جديدة',
      closeShift: 'إغلاق الوردية',
      shiftNumber: 'رقم الوردية',
      openTime: 'وقت الفتح',
      closeTime: 'وقت الإغلاق',
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
      print: 'طباعة التقرير',
      printZ: 'طباعة تقرير Z',
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
      thankYou: 'شكراً لك',
      time: 'الوقت',
      shiftDetails: 'تفاصيل الوردية',
      openingNotes: 'ملاحظات الافتتاح',
      closingNotes: 'ملاحظات الإغلاق',
      optional: 'اختياري',
      summary: 'ملخص الوردية',
      refresh: 'تحديث',
      error: 'خطأ في تحميل بيانات الوردية',
      retry: 'إعادة المحاولة',
      confirmClose: 'هل أنت متأكد من إغلاق هذه الوردية؟',
      confirmOpen: 'هل أنت متأكد من فتح وردية جديدة؟',
      validAmount: 'الرجاء إدخال مبلغ صحيح',
      cashSales: 'مبيعات نقدية',
      cardSales: 'مبيعات بطاقة',
      totalReturns: 'إجمالي المرتجعات',
      netSales: 'صافي المبيعات'
    }
  }[language === 'ar' ? 'ar' : 'en'];

  // ========== Handlers ==========
  const handleOpenShift = () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t.validAmount);
      return;
    }

    if (!window.confirm(t.confirmOpen)) return;

    openShiftMutation.mutate({
      opening_balance: amount,
      notes: openingNotes || undefined
    });
  };

  const handleCloseShift = () => {
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t.validAmount);
      return;
    }

    if (!window.confirm(t.confirmClose)) return;

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
    const varianceClass = currentVariance === 0 ? 'exact' : currentVariance > 0 ? 'surplus' : 'shortage';
    const varianceIcon = currentVariance === 0 ? '✓' : currentVariance > 0 ? '↑' : '↓';

    const content = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${t.closeShift} - #${currentShift.id}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: 'Arial', sans-serif; 
            padding: 30px; 
            direction: rtl; 
            background: #fff;
            color: #333;
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px; 
            border-bottom: 2px solid #000; 
          }
          .shop-name { 
            font-size: 28px; 
            font-weight: bold; 
            margin: 0 0 10px;
            color: #2563eb;
          }
          .shift-info { 
            text-align: center; 
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
          }
          .section { 
            margin: 25px 0; 
            padding: 20px; 
            border: 1px solid #e2e8f0; 
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            padding-bottom: 10px; 
            border-bottom: 2px solid #e2e8f0; 
            color: #2563eb;
          }
          .row { 
            display: flex; 
            justify-content: space-between; 
            margin: 12px 0;
            padding: 8px 0;
          }
          .total { 
            font-weight: bold; 
            font-size: 1.2em; 
            border-top: 2px solid #000; 
            padding-top: 15px; 
            margin-top: 15px; 
          }
          .variance { 
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
          }
          .variance.exact { background: #dcfce7; color: #166534; }
          .variance.surplus { background: #dbeafe; color: #1e40af; }
          .variance.shortage { background: #fee2e2; color: #991b1b; }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 2px dashed #cbd5e1; 
            text-align: center; 
            color: #64748b; 
          }
          .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 500;
          }
          .badge-open { background: #dcfce7; color: #166534; }
          .badge-closed { background: #f1f5f9; color: #334155; }
          .amount { font-family: 'Courier New', monospace; font-size: 1.1em; font-weight: 600; }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
          }
          .stat-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .stat-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 18px;
            font-weight: bold;
          }
          @media print {
            body { padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">${localStorage.getItem('shop_name') || t.currentShift}</h1>
          <p style="color: #64748b; margin-top: 5px;">تقرير إغلاق الوردية</p>
          <span class="badge badge-closed" style="margin-top: 10px;">${t.closeShift}</span>
        </div>
        
        <div class="shift-info">
          <div class="grid-2">
            <div class="stat-card">
              <div class="stat-label">${t.shiftNumber}</div>
              <div class="stat-value">#${currentShift.id}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${t.cashier}</div>
              <div class="stat-value">${localStorage.getItem('cashier_name') || '-'}</div>
            </div>
          </div>
          
          <div class="row" style="margin-top: 15px;">
            <span style="color: #64748b;">${t.openTime}:</span>
            <span class="amount">${format(new Date(currentShift.opened_at), 'yyyy/MM/dd HH:mm:ss', { locale: ar })}</span>
          </div>
          <div class="row">
            <span style="color: #64748b;">${t.closeTime}:</span>
            <span class="amount">${format(new Date(), 'yyyy/MM/dd HH:mm:ss', { locale: ar })}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">💰 ${t.openingBalance}</div>
          <div class="row">
            <span>${t.openingBalance}:</span>
            <span class="amount">${formatCurrency(parseFloat(currentShift.opening_balance))}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">📊 ${t.totalSales}</div>
          <div class="grid-2">
            <div class="stat-card">
              <div class="stat-label">💰 ${t.cash}</div>
              <div class="stat-value" style="color: #059669;">${formatCurrency(parseFloat(currentShift.cash_sales))}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">💳 ${t.card}</div>
              <div class="stat-value" style="color: #2563eb;">${formatCurrency(parseFloat(currentShift.card_sales))}</div>
            </div>
          </div>
          <div class="row" style="margin-top: 10px;">
            <span>↩️ ${t.returns}:</span>
            <span class="amount" style="color: #dc2626;">-${formatCurrency(parseFloat(currentShift.returns_amount))}</span>
          </div>
          <div class="row total">
            <span>${t.netSales}:</span>
            <span class="amount">${formatCurrency(parseFloat(currentShift.cash_sales) + parseFloat(currentShift.card_sales))}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">⚖️ ${t.variance}</div>
          <div class="row">
            <span>${t.expectedAmount}:</span>
            <span class="amount">${formatCurrency(expectedAmount)}</span>
          </div>
          <div class="row">
            <span>${t.actualAmount}:</span>
            <span class="amount">${formatCurrency(parseFloat(closingAmount || '0'))}</span>
          </div>
          <div class="variance ${varianceClass}">
            <div class="row" style="margin: 0;">
              <span style="font-weight: bold;">${varianceIcon} ${varianceText}</span>
              <span class="amount">${formatCurrency(Math.abs(currentVariance))}</span>
            </div>
          </div>
          ${closingNotes ? `
          <div class="row" style="margin-top: 15px;">
            <span style="color: #64748b;">${t.notes}:</span>
            <span>${closingNotes}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>${t.thankYou}</p>
          <p style="font-size: 12px; margin-top: 10px; color: #94a3b8;">${format(new Date(), 'yyyy/MM/dd HH:mm:ss', { locale: ar })}</p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            🖨️ طباعة
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  // ========== Badge الفرق ==========
  const getVarianceBadge = () => {
    if (!currentShift || !currentShift.difference) return null;
    
    const diff = parseFloat(currentShift.difference);
    if (diff === 0) {
      return (
        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t.exact}
        </Badge>
      );
    } else if (diff > 0) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
          <TrendingUp className="h-3 w-3" />
          {t.surplus} {formatCurrency(diff)}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 gap-1">
          <TrendingDown className="h-3 w-3" />
          {t.shortage} {formatCurrency(Math.abs(diff))}
        </Badge>
      );
    }
  };

  // ========== Format Currency Helper ==========
  const formatAmount = (value: string | number) => {
    return formatCurrency(typeof value === 'string' ? parseFloat(value) : value);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-8 text-center">
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">{t.loading}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">{t.error}</h3>
          <p className="text-muted-foreground text-sm mb-6">{error?.toString()}</p>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Current Shift Status */}
      {currentShift ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                {t.currentShift}
                <Badge variant="outline" className="text-xs font-mono">
                  #{currentShift.id}
                </Badge>
              </CardTitle>
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {language === 'ar' ? 'مفتوحة' : 'Open'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Calendar size={12} />
                  {t.openTime}:
                </span>
                <div className="font-medium">
                  {format(new Date(currentShift.opened_at), 'yyyy-MM-dd HH:mm', { locale: ar })}
                </div>
              </div>
              <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <DollarSign size={12} />
                  {t.openingBalance}:
                </span>
                <div className="font-bold text-primary">{formatAmount(currentShift.opening_balance)}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 text-center transition-all hover:scale-105 cursor-default">
                <Banknote className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <div className="text-xs text-muted-foreground mb-1">{t.cash}</div>
                <div className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formatAmount(currentShift.cash_sales)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 text-center transition-all hover:scale-105 cursor-default">
                <CreditCard className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                <div className="text-xs text-muted-foreground mb-1">{t.card}</div>
                <div className="font-bold text-blue-700 dark:text-blue-400">
                  {formatAmount(currentShift.card_sales)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 text-center transition-all hover:scale-105 cursor-default">
                <Receipt className="h-4 w-4 mx-auto mb-1 text-red-600" />
                <div className="text-xs text-muted-foreground mb-1">{t.returns}</div>
                <div className="font-bold text-red-700 dark:text-red-400">
                  {formatAmount(currentShift.returns_amount)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <span className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                {t.expectedAmount}:
              </span>
              <span className="text-xl font-bold text-primary">{formatAmount(expectedAmount)}</span>
            </div>

            {currentShift.difference && (
              <div className="flex justify-center">
                {getVarianceBadge()}
              </div>
            )}

            {currentShift.notes && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Info size={12} />
                  {t.notes}
                </p>
                <p className="text-sm">{currentShift.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2" 
                variant="outline"
                onClick={() => setShowSummary(!showSummary)}
              >
                <Receipt className="h-4 w-4" />
                {t.summary}
              </Button>
              <Button 
                className="flex-1 gap-2" 
                variant="destructive"
                onClick={() => setCloseShiftModal(true)}
              >
                <X className="h-4 w-4" />
                {t.closeShift}
              </Button>
            </div>

            {/* تفاصيل إضافية (اختياري) */}
            {showSummary && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2 animate-in slide-in-from-top-2">
                <h4 className="font-medium text-sm mb-3">{t.shiftDetails}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{t.cashSales}:</span>
                    <span className="font-mono block">{formatAmount(currentShift.cash_sales)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.cardSales}:</span>
                    <span className="font-mono block">{formatAmount(currentShift.card_sales)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.totalReturns}:</span>
                    <span className="font-mono block text-destructive">-{formatAmount(currentShift.returns_amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.netSales}:</span>
                    <span className="font-mono block text-primary">
                      {formatAmount(parseFloat(currentShift.cash_sales) + parseFloat(currentShift.card_sales))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-8 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 bg-amber-200 dark:bg-amber-800/30 rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </div>
            <h3 className="font-bold text-xl mb-2">{t.noActiveShift}</h3>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
              {language === 'ar' ? 'يجب فتح وردية جديدة لبدء البيع' : 'Open a new shift to start selling'}
            </p>
            <Button 
              onClick={() => setOpenShiftModal(true)} 
              className="w-full max-w-sm mx-auto gap-3 h-12 text-lg"
              size="lg"
            >
              <DollarSign className="h-5 w-5" />
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
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              {t.openShift}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opening-amount" className="text-base font-medium">
                {t.openingBalance} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="opening-amount"
                  type="number"
                  placeholder="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="text-left text-lg pl-16 h-12"
                  dir="ltr"
                  autoFocus
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  ر.ي
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info size={12} />
                {t.enterOpeningAmount}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening-notes" className="text-base font-medium">
                {t.openingNotes} <span className="text-muted-foreground text-xs">({t.optional})</span>
              </Label>
              <Textarea
                id="opening-notes"
                placeholder={t.notes}
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenShiftModal(false)} className="flex-1">
              {t.cancel}
            </Button>
            <Button 
              onClick={handleOpenShift} 
              disabled={openShiftMutation.isPending} 
              className="flex-1 gap-2"
            >
              {openShiftMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
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
              <div className="p-2 bg-destructive/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-destructive" />
              </div>
              {t.closeShift}
            </DialogTitle>
          </DialogHeader>
          
          {currentShift && (
            <div className="space-y-4 py-4">
              {/* Shift Summary */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  {t.summary}
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t.openingBalance}:</span>
                  <span className="font-medium">{formatAmount(currentShift.opening_balance)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600">
                  <span>+ {t.cashSales}:</span>
                  <span className="font-medium">+ {formatAmount(currentShift.cash_sales)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>- {t.returns}:</span>
                  <span className="font-medium">- {formatAmount(currentShift.returns_amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>{t.expectedAmount}:</span>
                  <span className="text-primary">{formatAmount(expectedAmount)}</span>
                </div>
              </div>

              {/* Closing Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="closing-amount" className="text-base font-medium">
                  {t.actualAmount} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="closing-amount"
                    type="number"
                    placeholder="0"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    className="text-left text-lg pl-16 h-12"
                    dir="ltr"
                    autoFocus
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    ر.ي
                  </span>
                </div>
              </div>

              {/* Variance Display */}
              {closingAmount && (
                <div className={cn(
                  "p-4 rounded-xl flex items-center justify-between border-2 transition-all",
                  currentVariance === 0 
                    ? 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                    : currentVariance > 0 
                      ? 'bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-red-100/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                )}>
                  <div className="flex items-center gap-3">
                    {currentVariance === 0 ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    ) : currentVariance > 0 ? (
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">
                        {currentVariance === 0 ? t.exact : currentVariance > 0 ? t.surplus : t.shortage}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.variance}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-xl">
                    {formatCurrency(Math.abs(currentVariance))}
                  </span>
                </div>
              )}

              {/* Closing Notes */}
              <div className="space-y-2">
                <Label htmlFor="closing-notes" className="text-base font-medium">
                  {t.closingNotes} <span className="text-muted-foreground text-xs">({t.optional})</span>
                </Label>
                <Textarea
                  id="closing-notes"
                  placeholder={t.notes}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={printZReport} 
              disabled={!closingAmount}
              className="flex-1 gap-2"
            >
              <Printer className="h-4 w-4" />
              {t.printZ}
            </Button>
            <Button variant="outline" onClick={() => setCloseShiftModal(false)} className="flex-1">
              {t.cancel}
            </Button>
            <Button 
              onClick={handleCloseShift} 
              disabled={closeShiftMutation.isPending || !closingAmount}
              variant="destructive"
              className="flex-1 gap-2"
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