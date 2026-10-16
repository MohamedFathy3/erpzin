/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Info,
  Wallet,
  Gift
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

// ========== أنواع البيانات ==========
export interface POSShift {
  id: number;
  employee_id: number | null;
  admin_id: number | null;
  opening_balance: string;
  closing_balance: string | null;
  cash_sales: string;
  card_sales: string;
  wallet_sales: string;
  returns_amount: string;
  expenses_amount?: string | number;
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

// ✅ تم تحديث الـ Props لتقبل currentShift و onRefresh
interface POSShiftManagementProps {
  currentShift?: POSShift | null;
  onShiftChange?: (shift: POSShift | null) => void;
  onRefresh?: () => Promise<void>;
  autoRefresh?: boolean;
}

const POSShiftManagement: React.FC<POSShiftManagementProps> = ({
  currentShift: externalShift,
  onShiftChange,
  onRefresh,
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
    data: fetchedShift,
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
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          console.error('Error fetching current shift:', error);
        }
        return null;
      }
    },
    refetchInterval: autoRefresh ? 15000 : false, // ✅ قللنا الوقت لـ 15 ثانية
    staleTime: 0,
  });

  // ✅ استخدام externalShift إذا تم تمريره، وإلا use fetchedShift
  const currentShift = externalShift !== undefined ? externalShift : fetchedShift;

  const {
    data: closeShiftReport,
    isLoading: isLoadingCloseShiftReport,
    isError: isCloseShiftReportError,
    error: closeShiftReportError,
    refetch: refetchCloseShiftReport
  } = useQuery({
    queryKey: ['shift-report', 'close-summary', currentShift?.id],
    enabled: closeShiftModal && currentShift !== null && currentShift !== undefined,
    queryFn: async () => {
      if (!currentShift) {
        throw new Error('No shift selected');
      }

      const response = await api.get(`/shifts/${currentShift.id}/report`);
      if (response.data?.status !== true || !response.data?.data) {
        throw new Error(response.data?.message || 'Failed to load shift report');
      }
      return response.data.data;
    },
    staleTime: 30_000
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

        // ✅ إشعار المكون الأب
        if (onShiftChange && data.data) {
          onShiftChange(data.data);
        }
        // ✅ إعادة جلب البيانات
        if (onRefresh) {
          onRefresh();
        } else {
          refetch();
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

        // ✅ إشعار المكون الأب
        if (onShiftChange) {
          onShiftChange(null);
        }
        // ✅ إعادة جلب البيانات
        if (onRefresh) {
          onRefresh();
        }

        // ✅ طباعة التقرير بعد الإغلاق
        if (data.data) {
          setTimeout(() => printShift(data.data), 500);
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

  // ========== حساب المبلغ المتوقع ==========
  // ✅ نفس المعادلة الموجودة في الباك إند بالضبط
  const expectedAmount = useMemo(() => {
    if (!currentShift) return 0;

    const opening = parseFloat(currentShift.opening_balance || '0') || 0;
    const cash = parseFloat(currentShift.cash_sales || '0') || 0;
    const card = parseFloat(currentShift.card_sales || '0') || 0;
    const wallet = parseFloat(currentShift.wallet_sales || '0') || 0;
    const returns = parseFloat(currentShift.returns_amount || '0') || 0;
    const expenses = parseFloat(String(currentShift.expenses_amount || '0')) || 0;

    // ✅ المتوقع النقدي = البداية + مبيعات النقدي - المرتجعات - مصروفات اليوم
    return Math.round((opening + cash - returns - expenses) * 100) / 100;
  }, [currentShift]);

  // ✅ إذا الباك إند رجّع expected_amount، استخدمه (لأنه محسوب live)
  const displayExpectedAmount = useMemo(() => {
    if (currentShift?.expected_amount !== null && currentShift?.expected_amount !== undefined) {
      return parseFloat(currentShift.expected_amount) || expectedAmount;
    }
    return expectedAmount;
  }, [currentShift, expectedAmount]);

  // ========== حساب الفرق ==========
  const currentVariance = useMemo(() => {
    if (!currentShift || !closingAmount) return 0;
    const actual = parseFloat(closingAmount) || 0;
    return Math.round((actual - displayExpectedAmount) * 100) / 100;
  }, [currentShift, closingAmount, displayExpectedAmount]);

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  };

  const getShiftDuration = (shift: POSShift) => {
    if (!shift.opened_at) return '-';
    const start = new Date(shift.opened_at);
    const end = shift.closed_at ? new Date(shift.closed_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (language === 'ar') {
      return `${diffHours} ساعة و ${diffMinutes} دقيقة`;
    }
    return `${diffHours}h ${diffMinutes}m`;
  };

  const formatNumber = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  // ========== طباعة تقرير الوردية ==========
  const printShift = async (shift: POSShift) => {
    const printWindow = window.open('', '_blank', 'width=450,height=650,scrollbars=yes');
    if (!printWindow) {
      toast.error(language === 'ar' ? 'تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.' : 'Could not open the print window. Allow pop-ups and try again.');
      return;
    }

    try {
      const report = closeShiftReport?.shift?.id === shift.id
        ? closeShiftReport
        : await queryClient.fetchQuery({
            queryKey: ['shift-report', 'close-summary', shift.id],
            queryFn: async () => {
              const response = await api.get(`/shifts/${shift.id}/report`);
              if (response.data?.status !== true || !response.data?.data) {
                throw new Error(response.data?.message || 'Failed to load shift report');
              }
              return response.data.data;
            },
            staleTime: 30_000
          });
      const complimentary = report?.summary?.complimentary;
      const shiftExpected = shift.expected_amount !== null && shift.expected_amount !== undefined
        ? parseFloat(String(shift.expected_amount)) || 0
        : Math.round((
            (parseFloat(shift.opening_balance || '0') || 0) +
            (parseFloat(shift.cash_sales || '0') || 0) -
            (parseFloat(shift.returns_amount || '0') || 0) -
            (parseFloat(String(shift.expenses_amount || '0')) || 0)
          ) * 100) / 100;
      const shiftActual = shift.actual_amount !== null && shift.actual_amount !== undefined
        ? parseFloat(String(shift.actual_amount)) || 0
        : shift.closing_balance !== null && shift.closing_balance !== undefined
          ? parseFloat(String(shift.closing_balance)) || 0
          : null;
      const diffNum = shiftActual !== null
        ? Math.round((shiftActual - shiftExpected) * 100) / 100
        : parseFloat(shift.difference || '0') || 0;
      const now = new Date();

      printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <title>${language === 'ar' ? 'فاتورة الوردية #' + shift.id : 'Shift Invoice #' + shift.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: 80mm auto; margin: 2mm; }
          body {
            font-family: Tahoma, Arial, sans-serif;
            font-size: 13px;
            font-weight: 600;
            line-height: 1.45;
            width: 100%;
            max-width: 76mm;
            margin: 0 auto;
            padding: 1mm;
            background: #fff;
            color: #172033;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            html, body { width: 100%; height: auto; }
            body { margin: 0; padding: 0; color: #172033 !important; }
            .no-print { display: none; }
            .print-section, .print-header { break-inside: avoid; page-break-inside: avoid; }
          }
          .print-header { text-align: center; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 2px solid #2563eb; color: #1d4ed8; }
          .print-section { margin-bottom: 8px; padding: 4px 0; border-bottom: 1px dashed #94a3b8; }
          .print-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px; break-inside: avoid; }
          .print-label { font-weight: 700; }
          .print-value { font-family: monospace; }
          hr { margin: 5px 0; border: none; border-top: 1px dashed #94a3b8; }
          .text-center { text-align: center; }
          .section-title { font-weight: 700; margin-bottom: 5px; padding: 3px; border-bottom: 1px solid #93c5fd; background: #eff6ff; color: #1d4ed8; }
          .sales-amount { color: #047857; font-weight: 700; }
          .return-amount { color: #dc2626; font-weight: 700; }
          .expense-amount { color: #b45309; font-weight: 700; }
          .complimentary-amount { color: #7e22ce; font-weight: 700; }
          .settlement-amount { color: #1d4ed8; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div style="font-size: 16px; font-weight: bold;">${language === 'ar' ? 'تقرير إغلاق وردية' : 'Shift Closing Report'}</div>
          <div style="font-size: 10px; margin-top: 3px;">${language === 'ar' ? 'نقاط البيع' : 'POS System'}</div>
          <div style="font-size: 9px; margin-top: 2px;">${formatDateTime(now.toISOString())}</div>
        </div>

        <div class="print-section">
          <div class="print-row"><span class="print-label">${language === 'ar' ? 'رقم الوردية:' : 'Shift #:'}</span><span>${shift.id}</span></div>
          <div class="print-row"><span class="print-label">${language === 'ar' ? 'الحالة:' : 'Status:'}</span><span>${shift.status === 'open' ? (language === 'ar' ? 'مفتوحة' : 'Open') : (language === 'ar' ? 'مغلقة' : 'Closed')}</span></div>
        </div>

        <div class="print-section">
          <div class="print-row"><span class="print-label">${language === 'ar' ? 'وقت الفتح:' : 'Opened:'}</span><span>${formatDateTime(shift.opened_at)}</span></div>
          <div class="print-row"><span class="print-label">${language === 'ar' ? 'وقت الإغلاق:' : 'Closed:'}</span><span>${shift.closed_at ? formatDateTime(shift.closed_at) : (language === 'ar' ? 'لم يغلق بعد' : 'Not closed')}</span></div>
          <div class="print-row"><span class="print-label">${language === 'ar' ? 'المدة:' : 'Duration:'}</span><span>${getShiftDuration(shift)}</span></div>
        </div>

        <div class="print-section">
          <div class="text-center section-title">${language === 'ar' ? 'المبيعات' : 'Sales'}</div>
          <div class="print-row"><span>${language === 'ar' ? 'رصيد البداية:' : 'Opening Balance:'}</span><span>${formatNumber(shift.opening_balance)}</span></div>
          <hr/>
          <div class="print-row"><span>${language === 'ar' ? 'مبيعات نقدي:' : 'Cash Sales:'}</span><span class="sales-amount">${formatNumber(shift.cash_sales)}</span></div>
          <div class="print-row"><span>${language === 'ar' ? 'مبيعات محفظة:' : 'Wallet Sales:'}</span><span class="sales-amount">${formatNumber(shift.wallet_sales)}</span></div>
          <div class="print-row"><span>${language === 'ar' ? 'مبيعات بطاقة:' : 'Card Sales:'}</span><span class="sales-amount">${formatNumber(shift.card_sales)}</span></div>
          <div class="print-row"><span>${language === 'ar' ? 'المرتجعات:' : 'Returns:'}</span><span class="return-amount">-${formatNumber(shift.returns_amount)}</span></div>
          <div class="print-row"><span>${language === 'ar' ? 'مصروفات اليوم:' : 'Daily Expenses:'}</span><span class="expense-amount">-${formatNumber(shift.expenses_amount || 0)}</span></div>
          <hr/>
          <div class="print-row"><span>${language === 'ar' ? 'صافي التحصيلات بعد المرتجعات:' : 'Net Collections After Returns:'}</span><span>${formatNumber(parseFloat(shift.cash_sales || '0') + parseFloat(shift.wallet_sales || '0') + parseFloat(shift.card_sales || '0') - parseFloat(shift.returns_amount || '0'))}</span></div>
          <div class="print-row"><span>${language === 'ar' ? 'بند الزيادات بالفواتير:' : 'Invoice Increases:'}</span><span>${formatNumber(report?.summary?.sales?.extra_charge_total ?? 0)}</span></div>
          <div class="print-row"><span style="font-weight: bold;">${language === 'ar' ? 'إجمالي المبيعات شامل الزيادات:' : 'Total Sales Including Increases:'}</span><span style="font-weight: bold;">${formatNumber(report?.summary?.sales?.sales_including_extra_charge ?? ((Number(report?.summary?.sales?.gross_sales) || 0) + (Number(report?.summary?.sales?.extra_charge_total) || 0)))}</span></div>
        </div>

        <div class="print-section">
          <div class="text-center section-title">${language === 'ar' ? 'المجاملات' : 'Complimentary'}</div>
          <div class="print-row"><span>${language === 'ar' ? 'عدد فواتير المجاملات:' : 'Complimentary invoices:'}</span><span class="complimentary-amount">${Number(complimentary?.count ?? 0)}</span></div>
          <div class="print-row"><span>${language === 'ar' ? 'القيمة السوقية:' : 'Market value:'}</span><span class="complimentary-amount">${formatNumber(Number(complimentary?.market_value ?? 0))}</span></div>
        </div>

          <div class="print-section">
          <div class="text-center section-title">${language === 'ar' ? 'التسوية' : 'Settlement'}</div>
          <div class="print-row"><span>${language === 'ar' ? 'النقدي المتوقع:' : 'Expected Cash:'}</span><span class="settlement-amount">${formatNumber(shiftExpected)}</span></div>
          <div class="print-row"><span>${language === 'ar' ? 'النقدي الموجود فعليًا:' : 'Cash Counted:'}</span><span>${formatNumber(shiftActual)}</span></div>
          <hr/>
          <div class="print-row"><span style="font-weight: bold;">${diffNum > 0 ? (language === 'ar' ? 'الزيادة:' : 'Surplus:') : diffNum < 0 ? (language === 'ar' ? 'النقص:' : 'Shortage:') : (language === 'ar' ? 'الفرق:' : 'Difference:')}</span><span style="font-weight: bold; color: ${diffNum > 0 ? '#2d6a4f' : diffNum < 0 ? '#d62828' : '#333'};">${formatNumber(Math.abs(diffNum))}</span></div>
        </div>

        ${shift.notes ? `
        <div style="margin-bottom: 8px; padding: 4px 0;">
          <div style="font-weight: bold; margin-bottom: 3px;">📝 ${language === 'ar' ? 'ملاحظات:' : 'Notes:'}</div>
          <div style="font-size: 10px; padding: 3px; background: #f9f9f9;">${shift.notes}</div>
        </div>
        ` : ''}

        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="font-size: 10px;">${language === 'ar' ? 'توقيع الموظف:' : 'Employee Signature:'}</div>
            <div style="font-size: 10px;">${language === 'ar' ? 'توقيع المدير:' : 'Manager Signature:'}</div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div style="border-bottom: 1px dotted #000; width: 70px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            <div style="border-bottom: 1px dotted #000; width: 70px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 10px; padding-top: 5px; border-top: 1px dashed #000; font-size: 10px;">
          ${language === 'ar' ? 'شكراً لاستخدامكم نظام نقاط البيع' : 'Thank you for using POS System'}
          <div>${formatDateTime(now.toISOString())}</div>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px; position: fixed; bottom: 10px; left: 0; right: 0; background: white; padding: 10px;">
          <button onclick="window.print();return false;" style="padding: 8px 16px; margin: 3px; cursor: pointer;">🖨️ ${language === 'ar' ? 'طباعة' : 'Print'}</button>
          <button onclick="window.close();return false;" style="padding: 8px 16px; margin: 3px; cursor: pointer;">❌ ${language === 'ar' ? 'إغلاق' : 'Close'}</button>
        </div>
        <script>window.addEventListener('load', async function() { if (document.fonts && document.fonts.ready) await document.fonts.ready; setTimeout(() => window.print(), 800); }, { once: true });</script>
      </body>
      </html>
    `);
      printWindow.document.close();
    } catch (error) {
    console.error('Error preparing shift print report:', error);
    printWindow.close();
    toast.error(error instanceof Error ? error.message : (language === 'ar' ? 'تعذر تجهيز تقرير الطباعة' : 'Could not prepare the print report'));
    }
  };

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
      wallet: 'Wallet',
      returns: 'Returns',
      expectedAmount: 'Expected Cash',
      actualAmount: 'Cash Counted in Drawer',
      expenses: 'Shift Expenses',
      complimentary: 'Complimentary',
      complimentaryInvoices: 'Complimentary invoices',
      complimentaryValue: 'Complimentary market value',
      nonCashSalesNote: 'Card and wallet sales are not included in the cash drawer total.',
      variance: 'Difference',
      surplus: 'Surplus',
      shortage: 'Shortage',
      exact: 'Exact',
      notes: 'Notes',
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
      walletsales: 'Wallet Sales',
      cash_sales: 'Cash Sales',
      card_sales: 'Card Sales',
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
      wallet: 'محفظة',
      returns: 'مرتجعات',
      expectedAmount: 'النقدي المتوقع',
      actualAmount: 'النقدي الموجود فعليًا في الدرج',
      expenses: 'مصروفات الوردية',
      complimentary: 'المجاملات',
      complimentaryInvoices: 'عدد فواتير المجاملات',
      complimentaryValue: 'القيمة السوقية للمجاملات',
      nonCashSalesNote: 'مبيعات البطاقة والمحفظة لا تدخل ضمن النقدي الموجود في الدرج.',
      variance: 'الفرق',
      surplus: 'زيادة',
      shortage: 'عجز',
      exact: 'مطابق',
      notes: 'ملاحظات',
      print: 'طباعة التقرير',
      printZ: 'طباعة تقرير Z',
      cancel: 'إلغاء',
      save: 'حفظ',
      walletsales: 'مبيعات المحفظة',
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
    if (isNaN(amount) || amount < 0) {
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
    if (isNaN(amount) || amount < 0) {
      toast.error(t.validAmount);
      return;
    }

    if (!window.confirm(t.confirmClose)) return;

    closeShiftMutation.mutate({
      actual_amount: amount,
      notes: closingNotes || undefined
    });
  };

  const getVarianceBadge = () => {
    if (!currentShift || !currentShift.difference) return null;

    const diff = parseFloat(currentShift.difference);
    if (diff === 0) {
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="h-3 w-3" />{t.exact}</Badge>;
    } else if (diff > 0) {
      return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><TrendingUp className="h-3 w-3" />{t.surplus} {formatCurrency(diff)}</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 gap-1"><TrendingDown className="h-3 w-3" />{t.shortage} {formatCurrency(Math.abs(diff))}</Badge>;
    }
  };

  const formatAmount = (value: string | number) => {
    return formatCurrency(typeof value === 'string' ? parseFloat(value) : value);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">{t.loading}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">{t.error}</h3>
          <Button onClick={() => refetch()} variant="outline" className="gap-2 mt-4"><RefreshCw className="h-4 w-4" />{t.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Current Shift Status */}
      {currentShift ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                {t.currentShift}
                <Badge variant="outline" className="text-xs font-mono">#{currentShift.id}</Badge>
              </CardTitle>
              <Badge variant="default" className="bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" />{language === 'ar' ? 'مفتوحة' : 'Open'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-1 text-xs"><Calendar size={12} />{t.openTime}:</span>
                <div className="font-medium">{format(new Date(currentShift.opened_at), 'yyyy-MM-dd HH:mm', { locale: ar })}</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-1 text-xs"><DollarSign size={12} />{t.openingBalance}:</span>
                <div className="font-bold text-primary">{formatAmount(currentShift.opening_balance)}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 text-center hover:scale-105 transition-all cursor-default">
                <Banknote className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                <div className="text-xs text-muted-foreground mb-1">{t.cash}</div>
                <div className="font-bold text-emerald-700">{formatAmount(currentShift.cash_sales)}</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 text-center hover:scale-105 transition-all cursor-default">
                <CreditCard className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <div className="text-xs text-muted-foreground mb-1">{t.card}</div>
                <div className="font-bold text-blue-700">{formatAmount(currentShift.card_sales)}</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-100/50 dark:bg-purple-900/20 text-center hover:scale-105 transition-all cursor-default">
                <Wallet className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <div className="text-xs text-muted-foreground mb-1">{t.wallet}</div>
                <div className="font-bold text-purple-700">{formatAmount(currentShift.wallet_sales)}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 text-center hover:scale-105 transition-all cursor-default">
                <Receipt className="h-5 w-5 mx-auto mb-1 text-red-600" />
                <div className="text-xs text-muted-foreground mb-1">{t.returns}</div>
                <div className="font-bold text-red-700">{formatAmount(currentShift.returns_amount)}</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 text-center hover:scale-105 transition-all cursor-default">
                <Wallet className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                <div className="text-xs text-muted-foreground mb-1">{t.expenses}</div>
                <div className="font-bold text-amber-700">{formatAmount(currentShift.expenses_amount || 0)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <span className="text-sm font-medium flex items-center gap-2"><Info className="h-4 w-4 text-primary" />{t.expectedAmount}:</span>
              <span className="text-xl font-bold text-primary">{formatAmount(displayExpectedAmount)}</span>
            </div>

            {currentShift.difference && <div className="flex justify-center">{getVarianceBadge()}</div>}
            {currentShift.notes && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Info size={12} />{t.notes}</p>
                <p className="text-sm">{currentShift.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1 gap-2" variant="destructive" onClick={() => setCloseShiftModal(true)}>
                <X className="h-4 w-4" />{t.closeShift}
              </Button>
            </div>

            {showSummary && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2 animate-in slide-in-from-top-2">
                <h4 className="font-medium text-sm mb-3">{t.shiftDetails}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">{t.cashSales}:</span><div className="font-mono">{formatAmount(currentShift.cash_sales)}</div></div>
                  <div><span className="text-muted-foreground">{t.cardSales}:</span><div className="font-mono">{formatAmount(currentShift.card_sales)}</div></div>
                  <div><span className="text-muted-foreground">{t.walletsales}:</span><div className="font-mono">{formatAmount(currentShift.wallet_sales)}</div></div>
                  <div><span className="text-muted-foreground">{t.totalReturns}:</span><div className="font-mono text-destructive">{formatAmount(currentShift.returns_amount)}</div></div>
                  <div className="col-span-2"><Separator /></div>
                  <div className="col-span-2"><span className="text-muted-foreground">{t.netSales}:</span><div className="font-mono text-primary text-lg">{formatAmount(parseFloat(currentShift.cash_sales) + parseFloat(currentShift.card_sales) + parseFloat(currentShift.wallet_sales) - parseFloat(currentShift.returns_amount))}</div></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-75"></div>
              <div className="absolute inset-0 flex items-center justify-center"><AlertTriangle className="h-10 w-10 text-amber-600" /></div>
            </div>
            <h3 className="font-bold text-xl mb-2">{t.noActiveShift}</h3>
            <Button onClick={() => setOpenShiftModal(true)} className="mt-4 gap-3 h-12 text-lg" size="lg">
              <DollarSign className="h-5 w-5" />{t.openShift}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Open Shift Modal */}
      <Dialog open={openShiftModal} onOpenChange={setOpenShiftModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><div className="p-2 bg-primary/10 rounded-lg"><DollarSign className="h-5 w-5 text-primary" /></div>{t.openShift}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opening-amount">{t.openingBalance} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input id="opening-amount" type="number" placeholder="0" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} className="text-left text-lg pl-16 h-12" dir="ltr" autoFocus />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">ر.ي</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opening-notes">{t.openingNotes} <span className="text-muted-foreground text-xs">({t.optional})</span></Label>
              <Textarea id="opening-notes" placeholder={t.notes} value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenShiftModal(false)}>{t.cancel}</Button>
            <Button onClick={handleOpenShift} disabled={openShiftMutation.isPending}>{openShiftMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" />{t.loading}</> : t.openShift}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal */}
      <Dialog open={closeShiftModal} onOpenChange={setCloseShiftModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><div className="p-2 bg-destructive/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-destructive" /></div>{t.closeShift}</DialogTitle></DialogHeader>
          {currentShift && (
            <div className="space-y-4 py-4">
              <div className="p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2"><Receipt className="h-4 w-4" />{t.summary}</h4>
                <div className="flex justify-between"><span>{t.openingBalance}:</span><span>{formatAmount(currentShift.opening_balance)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>+ {t.cashSales}:</span><span>+ {formatAmount(currentShift.cash_sales)}</span></div>
                <div className="flex justify-between text-blue-600"><span>{t.cardSales}:</span><span>{formatAmount(currentShift.card_sales)}</span></div>
                <div className="flex justify-between text-purple-600"><span>{t.walletsales}:</span><span>{formatAmount(currentShift.wallet_sales)}</span></div>
                <div className="flex justify-between text-red-600"><span>- {t.returns}:</span><span>- {formatAmount(currentShift.returns_amount)}</span></div>
                <div className="flex justify-between text-amber-700"><span>- {t.expenses}:</span><span>- {formatAmount(currentShift.expenses_amount || 0)}</span></div>
                <div className="flex justify-between text-indigo-600"><span>{language === 'ar' ? 'بند الزيادات بالفواتير:' : 'Invoice Increases:'}</span><span>{formatCurrency(Number(closeShiftReport?.summary?.sales?.extra_charge_total ?? 0))}</span></div>
                <div className="flex justify-between font-semibold text-indigo-700"><span>{language === 'ar' ? 'إجمالي المبيعات شامل الزيادات:' : 'Total Sales Including Increases:'}</span><span>{formatCurrency(Number(closeShiftReport?.summary?.sales?.sales_including_extra_charge ?? 0))}</span></div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الزيادات معروضة ضمن إجمالي المبيعات ولا تدخل في حساب النقدي المتوقع.' : 'Increases are included in reported sales, not in expected cash.'}</p>
                <Separator />
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                  <div className="mb-2 flex items-center gap-2 font-medium text-purple-700">
                    <Gift className="h-4 w-4" />
                    <span>{t.complimentary}</span>
                  </div>
                  {isLoadingCloseShiftReport ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {language === 'ar' ? 'جاري تحميل بيانات المجاملات...' : 'Loading complimentary details...'}
                    </div>
                  ) : isCloseShiftReportError ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-destructive">
                      <span>
                        {closeShiftReportError instanceof Error
                          ? closeShiftReportError.message
                          : (language === 'ar' ? 'تعذر تحميل المجاملات' : 'Could not load complimentary details')}
                      </span>
                      <Button type="button" variant="outline" size="sm" onClick={() => refetchCloseShiftReport()}>
                        {t.retry}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>{t.complimentaryInvoices}:</span>
                        <span className="font-semibold">
                          {Number(closeShiftReport?.summary?.complimentary?.count ?? 0)}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-sm">
                        <span>{t.complimentaryValue}:</span>
                        <span className="font-semibold">
                          {formatCurrency(Number(closeShiftReport?.summary?.complimentary?.market_value ?? 0))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>{t.expectedAmount}:</span><span className="text-primary">{formatAmount(displayExpectedAmount)}</span></div>
                <p className="text-xs text-muted-foreground">{t.nonCashSalesNote}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closing-amount">{t.actualAmount} <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input id="closing-amount" type="number" min="0" step="0.01" placeholder="0" value={closingAmount} onChange={(e) => setClosingAmount(e.target.value)} className="text-left text-lg pl-16 h-12" dir="ltr" autoFocus />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">ر.ي</span>
                </div>
              </div>

              {closingAmount && (
                <div className={cn("p-4 rounded-xl flex items-center justify-between border-2 transition-all", currentVariance === 0 ? "bg-emerald-100/50 border-emerald-200" : currentVariance > 0 ? "bg-blue-100/50 border-blue-200" : "bg-red-100/50 border-red-200")}>
                  <div className="flex items-center gap-3">
                    {currentVariance === 0 ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : currentVariance > 0 ? <TrendingUp className="h-6 w-6 text-blue-600" /> : <TrendingDown className="h-6 w-6 text-red-600" />}
                    <div><div className="font-medium">{currentVariance === 0 ? t.exact : currentVariance > 0 ? t.surplus : t.shortage}</div><div className="text-xs text-muted-foreground">{t.variance}</div></div>
                  </div>
                  <span className="font-bold text-xl">{formatCurrency(Math.abs(currentVariance))}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="closing-notes">{t.closingNotes} <span className="text-muted-foreground text-xs">({t.optional})</span></Label>
                <Textarea id="closing-notes" placeholder={t.notes} value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => currentShift && printShift(currentShift)} disabled={!closingAmount} className="gap-2">
              <Printer className="h-4 w-4" />
              {t.printZ}
            </Button>
            <Button variant="outline" onClick={() => setCloseShiftModal(false)}>{t.cancel}</Button>
            <Button onClick={handleCloseShift} disabled={closeShiftMutation.isPending || !closingAmount} variant="destructive">{closeShiftMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" />{t.loading}</> : t.closeShift}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default POSShiftManagement;
