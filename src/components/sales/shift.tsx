/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Clock,
  User,
  DollarSign,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Wallet,
  TrendingUp,
  TrendingDown,
  Eye,
  Loader2,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  Timer,
  Building2,
  Printer,
  Receipt,
  Package,
  FileText,
  RotateCcw,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Shift {
  id: number;
  employee: string;
  opening_balance: string;
  closing_balance: string | null;
  cash_sales: string;
  card_sales: string;
  wallet_sales: string;
  returns_amount: string;
  expected_amount: string | null;
  actual_amount: string | null;
  difference: string | null;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ShiftsListProps {
  onClose?: () => void;
}

const ShiftsList: React.FC<ShiftsListProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('opened_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [startHour, setStartHour] = useState<string>('');
  const [endHour, setEndHour] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  // جلب الفروع
  const { data: branchesData, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', { paginate: "false" });
        if (response.data.status === 200 && response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        return [];
      }
    }
  });

  const { data: shifts = [], isLoading, refetch } = useQuery({
    queryKey: ['shifts', selectedBranchId],
    queryFn: async () => {
      try {
        const params: any = {};
        if (selectedBranchId && selectedBranchId !== 'all') {
          params.branch_id = selectedBranchId;
        }
        const response = await api.get('/shifts', { params });
        if (response.data.status) {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching shifts:', error);
        return [];
      }
    }
  });

  // ============ دوال التنسيق المساعدة ============

  const formatNumber = useCallback((value: string | number | null): string => {
    if (value === null || value === undefined) return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const formatDateTime = useCallback((dateStr: string | null): string => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm', {
      locale: language === 'ar' ? ar : undefined
    });
  }, [language]);

  const formatTime = useCallback((dateStr: string | null): string => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'HH:mm', {
      locale: language === 'ar' ? ar : undefined
    });
  }, [language]);

  const formatDateOnly = useCallback((dateStr: string | null): string => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy-MM-dd', {
      locale: language === 'ar' ? ar : undefined
    });
  }, [language]);

  const getShiftDuration = useCallback((shift: Shift): string => {
    if (!shift.opened_at) return '-';
    const start = new Date(shift.opened_at);
    const end = shift.closed_at ? new Date(shift.closed_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m`;
  }, []);

  const getHourFromDateTime = useCallback((dateStr: string | null): number | null => {
    if (!dateStr) return null;
    return new Date(dateStr).getHours();
  }, []);

  // ============ دوال الفلترة ============

  const globalSearchFilter = useCallback((shift: Shift, searchTerm: string): boolean => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    const searchableFields = [
      shift.id?.toString(), shift.employee, shift.notes, shift.status,
      formatNumber(shift.opening_balance), formatNumber(shift.cash_sales),
      formatNumber(shift.card_sales), formatNumber(shift.wallet_sales),
      formatNumber(shift.returns_amount), formatNumber(shift.expected_amount),
      formatNumber(shift.actual_amount), formatNumber(shift.difference),
      formatDateTime(shift.opened_at), formatDateTime(shift.closed_at),
      getShiftDuration(shift), formatTime(shift.opened_at), formatTime(shift.closed_at)
    ];
    return searchableFields.some(field => field && field.toLowerCase().includes(searchLower));
  }, [language, formatNumber, formatDateTime, formatTime, getShiftDuration]);

  const dateRangeFilter = useCallback((shift: Shift): boolean => {
    if (dateFilter === 'all') return true;
    const now = new Date();
    const openedDate = new Date(shift.opened_at);
    switch (dateFilter) {
      case 'today': return openedDate.toDateString() === now.toDateString();
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return openedDate.toDateString() === yesterday.toDateString();
      }
      case 'thisWeek': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return openedDate >= weekAgo;
      }
      case 'thisMonth': return openedDate.getMonth() === now.getMonth() && openedDate.getFullYear() === now.getFullYear();
      case 'lastMonth': {
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return openedDate.getMonth() === lastMonth.getMonth() && openedDate.getFullYear() === lastMonth.getFullYear();
      }
      default: return true;
    }
  }, [dateFilter]);

  const hourRangeFilter = useCallback((shift: Shift): boolean => {
    if (!startHour && !endHour) return true;
    const hour = getHourFromDateTime(shift.opened_at);
    if (hour === null) return false;
    const start = startHour ? parseInt(startHour) : 0;
    const end = endHour ? parseInt(endHour) : 23;
    return hour >= start && hour <= end;
  }, [startHour, endHour, getHourFromDateTime]);

  const amountRangeFilter = useCallback((shift: Shift): boolean => {
    if (!minAmount && !maxAmount) return true;
    const totalSales = parseFloat(shift.cash_sales) + parseFloat(shift.card_sales) + parseFloat(shift.wallet_sales);
    if (minAmount && totalSales < parseFloat(minAmount)) return false;
    if (maxAmount && totalSales > parseFloat(maxAmount)) return false;
    return true;
  }, [minAmount, maxAmount]);

  const employeeNameFilter = useCallback((shift: Shift): boolean => {
    if (!employeeFilter) return true;
    return shift.employee?.toLowerCase().includes(employeeFilter.toLowerCase());
  }, [employeeFilter]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((shift: Shift) => {
      return globalSearchFilter(shift, globalSearch) &&
        (statusFilter === 'all' || shift.status === statusFilter) &&
        dateRangeFilter(shift) && hourRangeFilter(shift) &&
        amountRangeFilter(shift) && employeeNameFilter(shift);
    });
  }, [shifts, globalSearch, statusFilter, dateFilter, startHour, endHour, minAmount, maxAmount, employeeFilter, globalSearchFilter, dateRangeFilter, hourRangeFilter, amountRangeFilter, employeeNameFilter]);

  const sortedAndFilteredShifts = useMemo(() => {
    const sorted = [...filteredShifts].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      if (['opening_balance', 'cash_sales', 'card_sales', 'wallet_sales', 'returns_amount', 'expected_amount', 'actual_amount', 'difference'].includes(sortField)) {
        aValue = parseFloat(aValue || '0');
        bValue = parseFloat(bValue || '0');
      }
      if (sortField === 'opened_at' || sortField === 'closed_at' || sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredShifts, sortField, sortDirection]);

  const stats = useMemo(() => ({
    totalShifts: shifts.length,
    openShifts: shifts.filter((s: Shift) => s.status === 'open').length,
    closedShifts: shifts.filter((s: Shift) => s.status === 'closed').length,
    totalCashSales: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.cash_sales || '0'), 0),
    totalCardSales: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.card_sales || '0'), 0),
    totalWalletSales: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.wallet_sales || '0'), 0),
    totalReturns: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.returns_amount || '0'), 0),
    filteredTotalCashSales: filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.cash_sales || '0'), 0),
    filteredTotalCardSales: filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.card_sales || '0'), 0),
    filteredTotalWalletSales: filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.wallet_sales || '0'), 0),
    filteredTotalReturns: filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.returns_amount || '0'), 0),
  }), [shifts, filteredShifts]);

  useEffect(() => {
    refetch();
  }, [selectedBranchId, refetch]);

  const getStatusBadge = useCallback((status: string) => {
    if (status === 'open') {
      return <Badge className="bg-emerald-500/10 text-emerald-600 gap-1"><Clock size={12} />{language === 'ar' ? 'مفتوحة' : 'Open'}</Badge>;
    }
    return <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 gap-1"><CheckCircle2 size={12} />{language === 'ar' ? 'مغلقة' : 'Closed'}</Badge>;
  }, [language]);

  const getDifferenceBadge = useCallback((diff: string | null) => {
    if (diff === null) return null;
    const diffNum = parseFloat(diff);
    if (diffNum === 0) return <Badge variant="outline" className="bg-green-500/10 text-green-600">{language === 'ar' ? 'متطابق' : 'Matched'}</Badge>;
    if (diffNum > 0) return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 gap-1"><TrendingUp size={12} />+{formatNumber(diffNum)}</Badge>;
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 gap-1"><TrendingDown size={12} />{formatNumber(diffNum)}</Badge>;
  }, [language, formatNumber]);




  const {
    data: shiftReport,
    isLoading: isLoadingShiftReport,
    isError: isShiftReportError,
    error: shiftReportError,
    refetch: refetchShiftReport,
  } = useQuery({
    queryKey: ['shift-report', selectedShift?.id],
    enabled: showDetails && selectedShift !== null,
    queryFn: async () => {
      if (!selectedShift) {
        throw new Error('No shift selected');
      }

      const response = await api.get(
        `/shifts/${selectedShift.id}/report`
      );

      if (response.data?.status !== true || !response.data?.data) {
        throw new Error(
          response.data?.message || 'Failed to load shift report'
        );
      }

      return response.data.data;
    },
    staleTime: 0,
  });




  // ============ دالة طباعة وردية واحدة ============
  const printShift = (shift: Shift) => {
    const printWindow = window.open('', '_blank', 'width=450,height=650,scrollbars=yes');
    if (printWindow) {
      const diffNum = parseFloat(shift.difference || '0');
      const now = new Date();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <title>${language === 'ar' ? 'فاتورة الوردية #' + shift.id : 'Shift Invoice #' + shift.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', 'Traditional Arabic', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0 auto;
              padding: 3mm;
              background: white;
              color: black;
            }
            @media print {
              body { margin: 0; padding: 2mm; }
              .no-print { display: none; }
            }
            .print-header { text-align: center; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px dashed #000; }
            .print-section { margin-bottom: 8px; padding: 4px 0; border-bottom: 1px dotted #ccc; }
            .print-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .print-label { font-weight: bold; }
            .print-value { font-family: monospace; }
            hr { margin: 4px 0; border: none; border-top: 1px dotted #ccc; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div style="font-size: 16px; font-weight: bold;">${language === 'ar' ? 'تقرير إغلاق وردية' : 'Shift Closing Report'}</div>
            <div style="font-size: 10px; margin-top: 3px;">${language === 'ar' ? 'نقاط البيع' : 'POS System'}</div>
            <div style="font-size: 9px; margin-top: 2px;">${formatDateTime(now)}</div>
          </div>

          <div class="print-section">
            <div class="print-row"><span class="print-label">${language === 'ar' ? 'رقم الوردية:' : 'Shift #:'}</span><span>${shift.id}</span></div>
            <div class="print-row"><span class="print-label">${language === 'ar' ? 'الموظف:' : 'Employee:'}</span><span>${shift.employee}</span></div>
            <div class="print-row"><span class="print-label">${language === 'ar' ? 'الحالة:' : 'Status:'}</span><span>${shift.status === 'open' ? (language === 'ar' ? 'مفتوحة' : 'Open') : (language === 'ar' ? 'مغلقة' : 'Closed')}</span></div>
          </div>

          <div class="print-section">
            <div class="print-row"><span class="print-label">${language === 'ar' ? 'وقت الفتح:' : 'Opened:'}</span><span>${formatDateTime(shift.opened_at)}</span></div>
            <div class="print-row"><span class="print-label">${language === 'ar' ? 'وقت الإغلاق:' : 'Closed:'}</span><span>${shift.closed_at ? formatDateTime(shift.closed_at) : (language === 'ar' ? 'لم يغلق بعد' : 'Not closed')}</span></div>
            <div class="print-row"><span class="print-label">${language === 'ar' ? 'المدة:' : 'Duration:'}</span><span>${getShiftDuration(shift)}</span></div>
          </div>

          <div class="print-section">
            <div class="text-center" style="font-weight: bold; margin-bottom: 5px; background: #f0f0f0; padding: 2px;">${language === 'ar' ? 'المبيعات' : 'Sales'}</div>
            <div class="print-row"><span>${language === 'ar' ? 'رصيد البداية:' : 'Opening Balance:'}</span><span>${formatNumber(shift.opening_balance)}</span></div>
            <hr/>
            <div class="print-row"><span>💰 ${language === 'ar' ? 'مبيعات نقدي:' : 'Cash Sales:'}</span><span style="font-weight: bold;">${formatNumber(shift.cash_sales)}</span></div>
            <div class="print-row"><span>📱 ${language === 'ar' ? 'مبيعات محفظة:' : 'Wallet Sales:'}</span><span style="font-weight: bold;">${formatNumber(shift.wallet_sales)}</span></div>
            <div class="print-row"><span>💳 ${language === 'ar' ? 'مبيعات بطاقة:' : 'Card Sales:'}</span><span style="font-weight: bold;">${formatNumber(shift.card_sales)}</span></div>
            <div class="print-row"><span>↩️ ${language === 'ar' ? 'المرتجعات:' : 'Returns:'}</span><span style="font-weight: bold; color: #dc2626;">-${formatNumber(shift.returns_amount)}</span></div>
            <hr/>
            <div class="print-row"><span style="font-weight: bold;">📦 ${language === 'ar' ? 'إجمالي المبيعات:' : 'Total Sales:'}</span><span style="font-weight: bold;">${formatNumber(parseFloat(shift.cash_sales || '0') + parseFloat(shift.wallet_sales || '0') + parseFloat(shift.card_sales || '0') - parseFloat(shift.returns_amount || '0'))}</span></div>
          </div>

          <div class="print-section">
            <div class="text-center" style="font-weight: bold; margin-bottom: 5px; background: #f0f0f0; padding: 2px;">${language === 'ar' ? 'التسوية' : 'Settlement'}</div>
            <div class="print-row"><span>${language === 'ar' ? 'المبلغ الفعلي:' : 'Actual Amount:'}</span><span>${formatNumber(shift.actual_amount)}</span></div>
            <hr/>
            <div class="print-row"><span style="font-weight: bold;">${language === 'ar' ? 'الفرق:' : 'Difference:'}</span><span style="font-weight: bold; color: ${diffNum > 0 ? '#2d6a4f' : diffNum < 0 ? '#d62828' : '#333'};">${formatNumber(shift.difference)}</span></div>
          </div>

          ${shift.notes ? `
          <div style="margin-bottom: 8px; padding: 4px 0;">
            <div style="font-weight: bold; margin-bottom: 3px;">📝 ${language === 'ar' ? 'ملاحظات:' : 'Notes:'}</div>
            <div style="font-size: 10px; padding: 3px; background: #f9f9f9;">${shift.notes}</div>
          </div>
          ` : ''}

          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <div style="font-size: 9px;">${language === 'ar' ? 'توقيع الموظف:' : 'Employee Signature:'}</div>
              <div style="font-size: 9px;">${language === 'ar' ? 'توقيع المدير:' : 'Manager Signature:'}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div style="border-bottom: 1px dotted #000; width: 70px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
              <div style="border-bottom: 1px dotted #000; width: 70px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 10px; padding-top: 5px; border-top: 1px dashed #000; font-size: 8px;">
            ${language === 'ar' ? 'شكراً لاستخدامكم نظام نقاط البيع' : 'Thank you for using POS System'}
            <div>${formatDateTime(now)}</div>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px; position: fixed; bottom: 10px; left: 0; right: 0; background: white; padding: 10px;">
            <button onclick="window.print();return false;" style="padding: 8px 16px; margin: 3px; cursor: pointer;">🖨️ ${language === 'ar' ? 'طباعة' : 'Print'}</button>
            <button onclick="window.close();return false;" style="padding: 8px 16px; margin: 3px; cursor: pointer;">❌ ${language === 'ar' ? 'إغلاق' : 'Close'}</button>
          </div>
          <script>window.onload = function() { setTimeout(() => window.print(), 500); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // ============ الترجمات ============

  const t = {
    title: language === 'ar' ? 'الورديات' : 'Shifts',
    openShifts: language === 'ar' ? 'الورديات المفتوحة' : 'Open Shifts',
    closedShifts: language === 'ar' ? 'الورديات المغلقة' : 'Closed Shifts',
    totalCash: language === 'ar' ? 'إجمالي النقدي' : 'Total Cash',
    totalCard: language === 'ar' ? 'إجمالي البطاقة' : 'Total Card',
    totalWallet: language === 'ar' ? 'إجمالي المحفظة' : 'Total Wallet',
    totalReturns: language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns',
    employee: language === 'ar' ? 'الموظف' : 'Employee',
    openedAt: language === 'ar' ? 'وقت الفتح' : 'Opened At',
    closedAt: language === 'ar' ? 'وقت الإغلاق' : 'Closed At',
    duration: language === 'ar' ? 'المدة' : 'Duration',
    openingBalance: language === 'ar' ? 'رصيد البداية' : 'Opening',
    cashSales: language === 'ar' ? 'مبيعات نقدي' : 'Cash Sales',
    cardSales: language === 'ar' ? 'مبيعات بطاقة' : 'Card Sales',
    walletSales: language === 'ar' ? 'مبيعات المحفظة' : 'Wallet Sales',
    returns: language === 'ar' ? 'مرتجعات' : 'Returns',
    actual: language === 'ar' ? 'الفعلي' : 'Actual',
    difference: language === 'ar' ? 'الفرق' : 'Difference',
    notes: language === 'ar' ? 'ملاحظات' : 'Notes',
    status: language === 'ar' ? 'الحالة' : 'Status',
    all: language === 'ar' ? 'الكل' : 'All',
    search: language === 'ar' ? 'بحث شامل...' : 'Global search...',
    noData: language === 'ar' ? 'لا توجد ورديات' : 'No shifts found',
    viewDetails: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
    refresh: language === 'ar' ? 'تحديث' : 'Refresh',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    shiftDetails: language === 'ar' ? 'تفاصيل الوردية' : 'Shift Details',
    clearFilters: language === 'ar' ? 'مسح الكل' : 'Clear All',
    showFilters: language === 'ar' ? 'خيارات متقدمة' : 'Advanced Filters',
    hideFilters: language === 'ar' ? 'إخفاء الخيارات' : 'Hide Filters',
    today: language === 'ar' ? 'اليوم' : 'Today',
    yesterday: language === 'ar' ? 'أمس' : 'Yesterday',
    thisWeek: language === 'ar' ? 'هذا الأسبوع' : 'This Week',
    thisMonth: language === 'ar' ? 'هذا الشهر' : 'This Month',
    lastMonth: language === 'ar' ? 'الشهر الماضي' : 'Last Month',
    minAmount: language === 'ar' ? 'أقل مبلغ' : 'Min Amount',
    maxAmount: language === 'ar' ? 'أكبر مبلغ' : 'Max Amount',
    filterByEmployee: language === 'ar' ? 'فلتر بالموظف' : 'Filter by Employee',
    sortBy: language === 'ar' ? 'ترتيب حسب' : 'Sort By',
    actions: language === 'ar' ? 'الإجراءات' : 'Actions',
    startHour: language === 'ar' ? 'من الساعة' : 'From Hour',
    endHour: language === 'ar' ? 'إلى الساعة' : 'To Hour',
    hourFilter: language === 'ar' ? 'فلتر الساعات' : 'Hour Filter',
    print: language === 'ar' ? 'طباعة' : 'Print',
    printInvoice: language === 'ar' ? 'طباعة فاتورة' : 'Print Invoice',
    showing: language === 'ar' ? 'عرض' : 'Showing',
    of: language === 'ar' ? 'من' : 'of',
    items: language === 'ar' ? 'وردية' : 'shifts',
  };

  const hasActiveFilters = globalSearch || statusFilter !== 'all' || dateFilter !== 'all' || startHour || endHour || minAmount || maxAmount || employeeFilter;

  const sortOptions = [
    { value: 'opened_at', label: language === 'ar' ? 'تاريخ الفتح' : 'Opened Date' },
    { value: 'employee', label: language === 'ar' ? 'الموظف' : 'Employee' },
    { value: 'cash_sales', label: language === 'ar' ? 'المبيعات النقدية' : 'Cash Sales' },
    { value: 'wallet_sales', label: language === 'ar' ? 'مبيعات المحفظة' : 'Wallet Sales' },
    { value: 'card_sales', label: language === 'ar' ? 'مبيعات البطاقة' : 'Card Sales' },
    { value: 'returns_amount', label: language === 'ar' ? 'المرتجعات' : 'Returns' },
    { value: 'difference', label: language === 'ar' ? 'الفرق' : 'Difference' },
  ];

  const quickHourOptions = [
    { label: language === 'ar' ? 'الفجر (٣-٦)' : 'Dawn (3-6)', start: 3, end: 6 },
    { label: language === 'ar' ? 'الصباح (٦-١٢)' : 'Morning (6-12)', start: 6, end: 12 },
    { label: language === 'ar' ? 'الظهر (١٢-٣)' : 'Noon (12-15)', start: 12, end: 15 },
    { label: language === 'ar' ? 'العصر (٣-٦)' : 'Afternoon (15-18)', start: 15, end: 18 },
    { label: language === 'ar' ? 'المساء (٦-١٢)' : 'Evening (18-24)', start: 18, end: 24 },
  ];

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{t.title}</h2>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-2">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            {t.refresh}
          </Button>
          {onClose && <Button variant="ghost" size="icon" onClick={onClose}><X size={20} /></Button>}
        </div>
      </div>

      {/* Stats Cards - 7 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/20"><Clock className="h-5 w-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">{t.title}</p><p className="text-xl font-bold">{stats.totalShifts}</p></div></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/20"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div><p className="text-xs text-muted-foreground">{t.openShifts}</p><p className="text-xl font-bold">{stats.openShifts}</p></div></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/5">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-slate-500/20"><XCircle className="h-5 w-5 text-slate-600" /></div><div><p className="text-xs text-muted-foreground">{t.closedShifts}</p><p className="text-xl font-bold">{stats.closedShifts}</p></div></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/20"><DollarSign className="h-5 w-5 text-amber-600" /></div><div><p className="text-xs text-muted-foreground">{t.totalCash}</p><p className="text-xl font-bold">{formatNumber(stats.totalCashSales)}</p></div></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-500/20"><Wallet className="h-5 w-5 text-purple-600" /></div><div><p className="text-xs text-muted-foreground">{t.totalWallet}</p><p className="text-xl font-bold">{formatNumber(stats.totalWalletSales)}</p></div></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/20"><CreditCard className="h-5 w-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">{t.totalCard}</p><p className="text-xl font-bold">{formatNumber(stats.totalCardSales)}</p></div></div></CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/20"><Receipt className="h-5 w-5 text-red-600" /></div><div><p className="text-xs text-muted-foreground">{t.totalReturns}</p><p className="text-xl font-bold text-red-600">{formatNumber(stats.totalReturns)}</p></div></div></CardContent>
        </Card>
      </div>

      {/* Global Search Bar */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder={t.search} value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="pl-10 py-6 text-lg" autoFocus />
            {globalSearch && (
              <>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{filteredShifts.length} {t.items}</div>
                <Button variant="ghost" size="icon" className="absolute right-16 top-1/2 -translate-y-1/2" onClick={() => setGlobalSearch('')}><X size={18} /></Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <SlidersHorizontal size={16} />{showFilters ? t.hideFilters : t.showFilters}
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {hasActiveFilters && <Badge variant="secondary" className="ml-1 text-xs">{[
            globalSearch, statusFilter !== 'all' ? statusFilter : null,
            dateFilter !== 'all' ? dateFilter : null, startHour, endHour,
            minAmount, maxAmount, employeeFilter
          ].filter(Boolean).length}</Badge>}
        </Button>
        {hasActiveFilters && <Button variant="ghost" size="sm" onClick={() => { setGlobalSearch(''); setStatusFilter('all'); setDateFilter('all'); setStartHour(''); setEndHour(''); setMinAmount(''); setMaxAmount(''); setEmployeeFilter(''); setSelectedBranchId('all'); }} className="gap-2 text-destructive"><X size={14} />{t.clearFilters}</Button>}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">{t.status}</label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t.all}</SelectItem><SelectItem value="open">{language === 'ar' ? 'مفتوحة' : 'Open'}</SelectItem><SelectItem value="closed">{language === 'ar' ? 'مغلقة' : 'Closed'}</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">{t.openedAt}</label><Select value={dateFilter} onValueChange={setDateFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t.all}</SelectItem><SelectItem value="today">{t.today}</SelectItem><SelectItem value="yesterday">{t.yesterday}</SelectItem><SelectItem value="thisWeek">{t.thisWeek}</SelectItem><SelectItem value="thisMonth">{t.thisMonth}</SelectItem><SelectItem value="lastMonth">{t.lastMonth}</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm font-medium flex items-center gap-1"><Timer size={14} />{t.hourFilter}</label><div className="grid grid-cols-2 gap-2"><Input type="number" min="0" max="23" placeholder={t.startHour} value={startHour} onChange={(e) => setStartHour(e.target.value)} className="text-center" /><Input type="number" min="0" max="23" placeholder={t.endHour} value={endHour} onChange={(e) => setEndHour(e.target.value)} className="text-center" /></div><div className="flex flex-wrap gap-1 mt-1">{quickHourOptions.map((option, idx) => (<Badge key={idx} variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs" onClick={() => { setStartHour(option.start.toString()); setEndHour(option.end.toString()); }}>{option.label}</Badge>))}</div></div>
              <div className="space-y-2"><label className="text-sm font-medium flex items-center gap-1"><Building2 size={14} />{language === 'ar' ? 'الفرع' : 'Branch'}</label><Select value={selectedBranchId} onValueChange={setSelectedBranchId}><SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select Branch'} /></SelectTrigger><SelectContent><SelectItem value="all">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</SelectItem>{branchesData?.map((branch: any) => (<SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">{t.filterByEmployee}</label><Input placeholder={t.employee} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">{t.minAmount}</label><Input type="number" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">{t.maxAmount}</label><Input type="number" placeholder="10000" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">{t.sortBy}</label><div className="flex gap-2"><Select value={sortField} onValueChange={setSortField}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent>{sortOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select><Button variant="outline" size="icon" onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Button></div></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>{t.showing} {sortedAndFilteredShifts.length} {t.of} {shifts.length} {t.items}</div>
        {sortedAndFilteredShifts.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><DollarSign size={14} className="text-emerald-600" />{formatNumber(stats.filteredTotalCashSales)}</span>
            <span className="flex items-center gap-1"><Wallet size={14} className="text-purple-600" />{formatNumber(stats.filteredTotalWalletSales)}</span>
            <span className="flex items-center gap-1"><CreditCard size={14} className="text-blue-600" />{formatNumber(stats.filteredTotalCardSales)}</span>
            <span className="flex items-center gap-1"><Receipt size={14} className="text-red-600" />{formatNumber(stats.filteredTotalReturns)}</span>
          </div>
        )}
      </div>

      {/* Shifts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => { if (sortField === 'employee') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField('employee'); setSortDirection('asc'); } }}>
                    <div className="flex items-center gap-1">{t.employee}{sortField === 'employee' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => { if (sortField === 'opened_at') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField('opened_at'); setSortDirection('desc'); } }}>
                    <div className="flex items-center gap-1">{t.openedAt}{sortField === 'opened_at' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </TableHead>
                  <TableHead>{t.closedAt}</TableHead>
                  <TableHead>{t.duration}</TableHead>
                  <TableHead className="text-right">{t.openingBalance}</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => { if (sortField === 'cash_sales') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField('cash_sales'); setSortDirection('desc'); } }}>
                    <div className="flex items-center justify-end gap-1">{t.cashSales}{sortField === 'cash_sales' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => { if (sortField === 'wallet_sales') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField('wallet_sales'); setSortDirection('desc'); } }}>
                    <div className="flex items-center justify-end gap-1">{t.walletSales}{sortField === 'wallet_sales' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => { if (sortField === 'card_sales') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField('card_sales'); setSortDirection('desc'); } }}>
                    <div className="flex items-center justify-end gap-1">{t.cardSales}{sortField === 'card_sales' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => { if (sortField === 'returns_amount') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField('returns_amount'); setSortDirection('desc'); } }}>
                    <div className="flex items-center justify-end gap-1 text-red-600">
                      <Receipt size={14} />{t.returns}{sortField === 'returns_amount' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">{t.actual}</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => { if (sortField === 'difference') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField('difference'); setSortDirection('desc'); } }}>
                    <div className="flex items-center justify-end gap-1">{t.difference}{sortField === 'difference' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</div>
                  </TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead className="text-center">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : sortedAndFilteredShifts.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-12">{t.noData}</TableCell></TableRow>
                ) : (
                  sortedAndFilteredShifts.map((shift) => (
                    <TableRow key={shift.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => { setSelectedShift(shift); setShowDetails(true); }}>
                      <TableCell><div className="flex items-center gap-2"><User size={14} /><span>{shift.employee}</span></div></TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(shift.opened_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(shift.closed_at)}</TableCell>
                      <TableCell>{getShiftDuration(shift)}</TableCell>
                      <TableCell className="text-right">{formatNumber(shift.opening_balance)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatNumber(shift.cash_sales)}</TableCell>
                      <TableCell className="text-right text-purple-600">{formatNumber(shift.wallet_sales)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatNumber(shift.card_sales)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatNumber(shift.returns_amount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(shift.actual_amount)}</TableCell>
                      <TableCell className="text-right">{getDifferenceBadge(shift.difference)}</TableCell>
                      <TableCell>{getStatusBadge(shift.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedShift(shift); setShowDetails(true); }}><Eye size={16} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); printShift(shift); }}><Printer size={16} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Row */}
          {sortedAndFilteredShifts.length > 0 && (
            <div className="p-4 border-t bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-4"><span className="text-muted-foreground">{language === 'ar' ? 'إجمالي النتائج:' : 'Total Results:'}</span><span className="font-bold text-lg">{sortedAndFilteredShifts.length}</span></div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2"><Wallet size={14} /><span className="text-muted-foreground">{t.openingBalance}:</span><span className="font-medium">{formatNumber(sortedAndFilteredShifts.reduce((sum, s) => sum + parseFloat(s.opening_balance || '0'), 0))}</span></div>
                  <div className="flex items-center gap-2"><DollarSign size={14} className="text-emerald-600" /><span className="text-muted-foreground">{t.cashSales}:</span><span className="font-medium text-emerald-600">{formatNumber(stats.filteredTotalCashSales)}</span></div>
                  <div className="flex items-center gap-2"><Wallet size={14} className="text-purple-600" /><span className="text-muted-foreground">{t.walletSales}:</span><span className="font-medium text-purple-600">{formatNumber(stats.filteredTotalWalletSales)}</span></div>
                  <div className="flex items-center gap-2"><CreditCard size={14} className="text-blue-600" /><span className="text-muted-foreground">{t.cardSales}:</span><span className="font-medium text-blue-600">{formatNumber(stats.filteredTotalCardSales)}</span></div>
                  <div className="flex items-center gap-2"><Receipt size={14} className="text-red-600" /><span className="text-muted-foreground">{t.returns}:</span><span className="font-medium text-red-600">{formatNumber(stats.filteredTotalReturns)}</span></div>
                  <div className="flex items-center gap-2"><TrendingUp size={14} className="text-amber-600" /><span className="text-muted-foreground">{t.difference}:</span><span className="font-medium">{formatNumber(sortedAndFilteredShifts.reduce((sum, s) => sum + parseFloat(s.difference || '0'), 0))}</span></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Details Modal */}
      {/* Shift Details Modal - Updated for new Backend Response Structure */}
      {/* Shift Details Modal - متوافق مع الـ Backend الجديد */}
      <Dialog
        open={showDetails}
        onOpenChange={(open) => {
          setShowDetails(open);
          if (!open) setSelectedShift(null);
        }}
      >
        <DialogContent
          dir={language === "ar" ? "rtl" : "ltr"}
          className="flex max-h-[94vh] w-[calc(100%-1rem)] max-w-7xl flex-col gap-0 overflow-hidden rounded-2xl p-0"
        >
          {/* ============================ HEADER ============================ */}
          <DialogHeader className="border-b bg-muted/20 px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <DialogTitle className="text-xl font-bold">
                    {language === "ar" ? "تقرير الوردية" : "Shift Report"} #
                    {shiftReport?.shift?.id ?? selectedShift?.id}
                  </DialogTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {language === "ar"
                      ? "ملخص مالي وتفاصيل المبيعات والمرتجعات"
                      : "Financial summary, sales and returns details"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {shiftReport?.shift && (
                  <>
                    {getStatusBadge(shiftReport.shift.status || "")}
                    {Math.abs(Number(shiftReport.shift.duration_minutes ?? 0)) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {Math.floor(Math.abs(Number(shiftReport.shift.duration_minutes)) / 60)}h{" "}
                        {Math.abs(Number(shiftReport.shift.duration_minutes)) % 60}m
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* ======================= SCROLLABLE CONTENT ======================= */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">
            {isLoadingShiftReport ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {language === "ar"
                    ? "جاري تحميل تفاصيل الوردية..."
                    : "Loading shift details..."}
                </p>
              </div>
            ) : isShiftReportError ? (
              <div className="rounded-xl border border-destructive/20 p-8 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />

                <p className="font-semibold text-destructive">
                  {language === "ar" ? "تعذر تحميل التقرير" : "Failed to load report"}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {shiftReportError instanceof Error ? shiftReportError.message : ""}
                </p>

                <Button className="mt-4" onClick={() => refetchShiftReport()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {language === "ar" ? "إعادة المحاولة" : "Retry"}
                </Button>
              </div>
            ) : shiftReport ? (
              <Tabs defaultValue="summary" className="space-y-5">
                {/* ========================= TABS NAV ========================= */}
                <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-5">
                  <TabsTrigger value="summary" className="gap-1.5">
                    <Receipt className="h-4 w-4" />
                    {language === "ar" ? "الملخص" : "Summary"}
                  </TabsTrigger>

                  <TabsTrigger value="products" className="gap-1.5">
                    <Package className="h-4 w-4" />
                    {language === "ar" ? "المنتجات" : "Products"}
                  </TabsTrigger>

                  <TabsTrigger value="invoices" className="gap-1.5">
                    <FileText className="h-4 w-4" />
                    {language === "ar" ? "الفواتير" : "Invoices"}
                    {Number(shiftReport.summary?.sales?.invoices_count ?? 0) > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {shiftReport.summary.sales.invoices_count}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger value="returns" className="gap-1.5">
                    <RotateCcw className="h-4 w-4" />
                    {language === "ar" ? "المرتجعات" : "Returns"}
                    {Number(shiftReport.summary?.returns?.count ?? 0) > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {shiftReport.summary.returns.count}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger value="reconciliation" className="gap-1.5">
                    <Calculator className="h-4 w-4" />
                    {language === "ar" ? "التسوية" : "Reconciliation"}
                  </TabsTrigger>
                </TabsList>

                {/* ========================= TAB 1: SUMMARY ========================= */}
                <TabsContent value="summary" className="space-y-5">
                  {/* تنبيه: أصناف بدون تكلفة (بتأثر على دقة الربح) */}
                  {Number(shiftReport.checks?.items_without_cost_count ?? 0) > 0 && (
                    <Card className="rounded-xl border-amber-500/40 bg-amber-500/10 shadow-none">
                      <CardContent className="flex items-start gap-3 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                          <p className="font-semibold text-amber-700">
                            {language === "ar"
                              ? `تنبيه: ${shiftReport.checks.items_without_cost_count} بند بدون تكلفة مسجلة`
                              : `Warning: ${shiftReport.checks.items_without_cost_count} item(s) have no cost`}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {language === "ar"
                              ? "الربح لهذه البنود محسوب بتكلفة صفر، راجع تكلفة الأصناف التالية:"
                              : "Profit for these items is computed with zero cost. Please review:"}{" "}
                            {(shiftReport.checks.items_without_cost_names || []).join("، ")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* QUICK STATS */}
                  <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="rounded-xl border-emerald-500/30 bg-emerald-500/5 shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {language === "ar" ? "إجمالي المبيعات" : "Gross Sales"}
                        </div>
                        <p className="mt-2 text-xl font-bold text-emerald-600">
                          {formatNumber(shiftReport.summary?.sales?.gross_sales)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-red-500/30 bg-red-500/5 shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <RotateCcw className="h-3.5 w-3.5" />
                          {language === "ar" ? "إجمالي المرتجعات" : "Returns"}
                        </div>
                        <p className="mt-2 text-xl font-bold text-red-600">
                          {formatNumber(shiftReport.summary?.returns?.total_amount)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-blue-500/30 bg-blue-500/5 shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Wallet className="h-3.5 w-3.5" />
                          {language === "ar" ? "صافي المبيعات" : "Net Sales"}
                        </div>
                        <p className="mt-2 text-xl font-bold text-blue-600">
                          {formatNumber(shiftReport.summary?.net?.sales)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border-amber-500/30 bg-amber-500/5 shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          {language === "ar" ? "صافي الربح" : "Net Profit"}
                        </div>
                        <p
                          className={`mt-2 text-xl font-bold ${Number(shiftReport.summary?.net?.profit ?? 0) >= 0
                              ? "text-amber-600"
                              : "text-red-600"
                            }`}
                        >
                          {formatNumber(shiftReport.summary?.net?.profit)}
                        </p>
                      </CardContent>
                    </Card>
                  </section>

                  {/* SECTION 1: SALES */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </div>
                      <h3 className="text-base font-bold">
                        {language === "ar" ? "المبيعات" : "Sales"}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {formatNumber(shiftReport.summary?.sales?.invoices_count)}{" "}
                        {language === "ar" ? "فاتورة" : "invoices"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Card className="rounded-xl shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            {language === "ar" ? "عدد الفواتير" : "Invoices"}
                          </div>
                          <p className="mt-2 text-xl font-bold">
                            {formatNumber(shiftReport.summary?.sales?.invoices_count)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl border-emerald-500/30 bg-emerald-500/5 shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {language === "ar" ? "إجمالي المبيعات" : "Gross Sales"}
                          </div>
                          <p className="mt-2 text-xl font-bold text-emerald-600">
                            {formatNumber(shiftReport.summary?.sales?.gross_sales)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calculator className="h-3.5 w-3.5" />
                            {language === "ar" ? "تكلفة المبيعات" : "Sales Cost"}
                          </div>
                          <p className="mt-2 text-xl font-bold text-slate-600">
                            {formatNumber(shiftReport.summary?.sales?.total_cost)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl border-emerald-500/30 bg-emerald-500/5 shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            {language === "ar" ? "إجمالي الربح" : "Gross Profit"}
                          </div>
                          <p
                            className={`mt-2 text-xl font-bold ${Number(shiftReport.summary?.sales?.gross_profit ?? 0) >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                              }`}
                          >
                            {formatNumber(shiftReport.summary?.sales?.gross_profit)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {shiftReport.summary?.sales?.profit_margin ?? 0}%{" "}
                            {language === "ar" ? "هامش" : "margin"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </section>

                  {/* SECTION 2: RETURNS */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
                        <RotateCcw className="h-4 w-4 text-red-600" />
                      </div>
                      <h3 className="text-base font-bold">
                        {language === "ar" ? "المرتجعات" : "Returns"}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {formatNumber(shiftReport.summary?.returns?.count)}{" "}
                        {language === "ar" ? "مرتجع" : "returns"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <Card className="rounded-xl shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <RotateCcw className="h-3.5 w-3.5" />
                            {language === "ar" ? "عدد المرتجعات" : "Returns Count"}
                          </div>
                          <p className="mt-2 text-xl font-bold">
                            {formatNumber(shiftReport.summary?.returns?.count)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl border-red-500/30 bg-red-500/5 shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Receipt className="h-3.5 w-3.5" />
                            {language === "ar" ? "قيمة المرتجعات" : "Returns Amount"}
                          </div>
                          <p className="mt-2 text-xl font-bold text-red-600">
                            {formatNumber(shiftReport.summary?.returns?.total_amount)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {language === "ar" ? "مجموع بنود المرتجع" : "Sum of return lines"}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calculator className="h-3.5 w-3.5" />
                            {language === "ar" ? "تكلفة المرتجعات" : "Returns Cost"}
                          </div>
                          <p className="mt-2 text-xl font-bold text-slate-600">
                            {formatNumber(shiftReport.summary?.returns?.total_cost)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl border-red-500/30 bg-red-500/5 shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            {language === "ar" ? "المبلغ المُسترد" : "Refunded Amount"}
                          </div>
                          <p className="mt-2 text-xl font-bold text-red-600">
                            {formatNumber(shiftReport.summary?.returns?.total_refunded)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {language === "ar" ? "المدفوع فعلياً للعميل" : "Actually paid back"}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="rounded-xl border-red-500/30 bg-red-500/5 shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {language === "ar" ? "الربح المعكوس" : "Profit Reversed"}
                          </div>
                          <p className="mt-2 text-xl font-bold text-red-600">
                            {formatNumber(shiftReport.summary?.returns?.profit_reversed)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {shiftReport.summary?.returns?.profit_margin ?? 0}%{" "}
                            {language === "ar" ? "هامش" : "margin"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </section>

                  {/* SECTION 3: NET */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                        <Calculator className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="text-base font-bold">
                        {language === "ar" ? "الصافي" : "Net"}
                      </h3>
                    </div>

                    <Card className="rounded-xl border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent shadow-none">
                      <CardContent className="space-y-4 p-5">
                        {/* صافي المبيعات */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-muted-foreground">
                            {language === "ar" ? "صافي المبيعات" : "Net Sales"}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-emerald-600">
                              {formatNumber(shiftReport.summary?.sales?.gross_sales)}
                            </span>
                            <span className="text-muted-foreground">−</span>
                            <span className="text-red-600">
                              {formatNumber(shiftReport.summary?.returns?.total_amount)}
                            </span>
                            <span className="text-muted-foreground">=</span>
                            <span className="text-lg font-bold text-blue-600">
                              {formatNumber(shiftReport.summary?.net?.sales)}
                            </span>
                          </div>
                        </div>

                        {/* صافي التكلفة */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-muted-foreground">
                            {language === "ar" ? "صافي التكلفة" : "Net Cost"}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-600">
                              {formatNumber(shiftReport.summary?.sales?.total_cost)}
                            </span>
                            <span className="text-muted-foreground">−</span>
                            <span className="text-red-600">
                              {formatNumber(shiftReport.summary?.returns?.total_cost)}
                            </span>
                            <span className="text-muted-foreground">=</span>
                            <span className="text-lg font-bold text-slate-700">
                              {formatNumber(shiftReport.summary?.net?.cost)}
                            </span>
                          </div>
                        </div>

                        <div className="border-t-2 border-dashed border-blue-500/30" />

                        {/* صافي الربح */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-bold">
                              {language === "ar" ? "صافي الربح" : "Net Profit"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {language === "ar"
                                ? "= صافي المبيعات − صافي التكلفة (= إجمالي الربح − الربح المعكوس)"
                                : "= Net Sales − Net Cost (= Gross Profit − Profit Reversed)"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-2xl font-bold ${Number(shiftReport.summary?.net?.profit ?? 0) >= 0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                                }`}
                            >
                              {formatNumber(shiftReport.summary?.net?.profit)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {shiftReport.summary?.net?.profit_margin ?? 0}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  {/* SECTION 4: SHIFT INFO */}
                  <section className="space-y-3">
                    <h3 className="flex items-center gap-2 text-base font-bold">
                      <Receipt className="h-5 w-5 text-primary" />
                      {language === "ar" ? "بيانات الوردية" : "Shift Information"}
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        {
                          label: language === "ar" ? "رقم الوردية" : "Shift Number",
                          value: `#${shiftReport.shift?.id ?? selectedShift?.id ?? "-"}`,
                        },
                        {
                          label: language === "ar" ? "الكاشير" : "Cashier",
                          value: shiftReport.shift?.cashier || selectedShift?.employee || "-",
                        },
                        {
                          label: language === "ar" ? "وقت الفتح" : "Opened At",
                          value: formatDateTime(shiftReport.shift?.opened_at),
                        },
                        {
                          label: language === "ar" ? "وقت الإغلاق" : "Closed At",
                          value: formatDateTime(shiftReport.shift?.closed_at),
                        },
                        {
                          label: language === "ar" ? "الأدمن (فتح الوردية)" : "Admin",
                          value: shiftReport.shift?.opened_by_admin?.name || "-",
                        },
                        {
                          label: language === "ar" ? "الفرع" : "Branch",
                          value: shiftReport.shift?.branch_name || (shiftReport.shift?.branch_id ? `#${shiftReport.shift.branch_id}` : "-"),
                        },
                        {
                          label: language === "ar" ? "مدة الوردية" : "Duration",
                          value: `${Math.floor(Math.abs(Number(shiftReport.shift?.duration_minutes ?? 0)) / 60)}h ${Math.abs(Number(shiftReport.shift?.duration_minutes ?? 0)) % 60}m`,
                        },
                        {
                          label: language === "ar" ? "عدد العملاء" : "Customers",
                          value: formatNumber((shiftReport.customers || []).length),
                        },
                        {
                          label: language === "ar" ? "عدد المناديب" : "Representatives",
                          value: formatNumber(
                            (shiftReport.sales_representatives || []).filter((r: any) => r.id || r.name).length,
                          ),
                        },
                      ].map((item) => (
                        <Card key={item.label} className="rounded-xl shadow-none">
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="mt-2 break-words text-sm font-semibold">{item.value}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>

                  {/* SECTION 4.5: العملاء + مناديب المبيعات */}
                  {[
                    {
                      key: "customers",
                      title: language === "ar" ? "العملاء" : "Customers",
                      nameLabel: language === "ar" ? "العميل" : "Customer",
                      empty: language === "ar" ? "عميل نقدي" : "Walk-in Customer",
                      rows: shiftReport.customers,
                    },
                    {
                      key: "reps",
                      title: language === "ar" ? "مناديب المبيعات" : "Sales Representatives",
                      nameLabel: language === "ar" ? "المندوب" : "Representative",
                      empty: language === "ar" ? "بدون مندوب" : "No representative",
                      rows: shiftReport.sales_representatives,
                    },
                  ].map((g) =>
                    (g.rows || []).length > 0 ? (
                      <section key={g.key} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold">{g.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {g.rows.length}
                          </Badge>
                        </div>

                        <div className="overflow-x-auto rounded-xl border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead>{g.nameLabel}</TableHead>
                                <TableHead>{language === "ar" ? "الفواتير" : "Invoices"}</TableHead>
                                <TableHead>{language === "ar" ? "المبيعات" : "Sales"}</TableHead>
                                <TableHead>{language === "ar" ? "التكلفة" : "Cost"}</TableHead>
                                <TableHead>{language === "ar" ? "الربح" : "Profit"}</TableHead>
                                <TableHead>{language === "ar" ? "المرتجعات" : "Returns"}</TableHead>
                                <TableHead>{language === "ar" ? "صافي المبيعات" : "Net Sales"}</TableHead>
                                <TableHead>{language === "ar" ? "صافي الربح" : "Net Profit"}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {g.rows.map((r: any, idx: number) => (
                                <TableRow key={`${g.key}-${r.id ?? "none"}-${idx}`}>
                                  <TableCell className="min-w-[140px] font-medium">
                                    {r.name || (r.id ? `#${r.id}` : g.empty)}
                                  </TableCell>
                                  <TableCell>{formatNumber(r.invoices_count)}</TableCell>
                                  <TableCell>{formatNumber(r.sales)}</TableCell>
                                  <TableCell>{formatNumber(r.cost)}</TableCell>
                                  <TableCell
                                    className={`font-semibold ${Number(r.profit) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                                  >
                                    {formatNumber(r.profit)}
                                  </TableCell>
                                  <TableCell className={Number(r.returns_amount) > 0 ? "text-red-600" : ""}>
                                    {formatNumber(r.returns_amount)}
                                    {Number(r.returns_count) > 0 && (
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        ({r.returns_count})
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>{formatNumber(r.net_sales)}</TableCell>
                                  <TableCell
                                    className={`font-semibold ${Number(r.net_profit) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                                  >
                                    {formatNumber(r.net_profit)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </section>
                    ) : null,
                  )}

                  {/* SECTION 5: COLLECTIONS */}
                  <section className="space-y-3">
                    <h3 className="text-base font-bold">
                      {language === "ar"
                        ? "التحصيل حسب طريقة الدفع"
                        : "Collections by Payment Method"}
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        {
                          label: language === "ar" ? "نقدي" : "Cash",
                          value: shiftReport.collections?.cash,
                          Icon: DollarSign,
                          color: "text-emerald-600 bg-emerald-500/10",
                        },
                        {
                          label: language === "ar" ? "بطاقة" : "Card",
                          value: shiftReport.collections?.card,
                          Icon: CreditCard,
                          color: "text-blue-600 bg-blue-500/10",
                        },
                        {
                          label: language === "ar" ? "محفظة إلكترونية" : "Wallet",
                          value: shiftReport.collections?.wallet,
                          Icon: Wallet,
                          color: "text-purple-600 bg-purple-500/10",
                        },
                        {
                          label: language === "ar" ? "طرق أخرى" : "Other",
                          value: shiftReport.collections?.other,
                          Icon: Receipt,
                          color: "text-slate-600 bg-slate-500/10",
                        },
                      ].map(({ label, value, Icon, color }) => (
                        <Card key={label} className="rounded-xl shadow-none">
                          <CardContent className="flex items-center gap-3 p-4">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm text-muted-foreground">{label}</p>
                              <p className="mt-1 break-words text-xl font-bold">
                                {formatNumber(value)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
                      <span className="font-semibold">
                        {language === "ar" ? "إجمالي التحصيل" : "Total Collections"}
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {formatNumber(shiftReport.collections?.total)}
                      </span>
                    </div>

                    {Math.abs(Number(shiftReport.checks?.collections_minus_sales ?? 0)) >= 0.01 && (
                      <p className="text-xs text-muted-foreground">
                        {language === "ar"
                          ? `ملاحظة: الفرق بين إجمالي التحصيل وإجمالي المبيعات = ${formatNumber(
                            shiftReport.checks.collections_minus_sales,
                          )} (قد يكون بسبب مبيعات آجلة أو ضريبة أو خصم على مستوى الفاتورة).`
                          : `Note: collections − gross sales = ${formatNumber(
                            shiftReport.checks.collections_minus_sales,
                          )} (may be due to credit sales, tax, or invoice-level discounts).`}
                      </p>
                    )}
                  </section>

                  {/* SECTION 6: TOP 5 PRODUCTS */}
                  {(shiftReport.top_products || []).length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-base font-bold">
                        {language === "ar" ? "أفضل 5 منتجات" : "Top 5 Products"}
                      </h3>

                      <div className="overflow-x-auto rounded-xl border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead>{language === "ar" ? "الصنف" : "Product"}</TableHead>
                              <TableHead>{language === "ar" ? "الكمية" : "Qty"}</TableHead>
                              <TableHead>{language === "ar" ? "إجمالي البيع" : "Sales"}</TableHead>
                              <TableHead>{language === "ar" ? "التكلفة" : "Cost"}</TableHead>
                              <TableHead>{language === "ar" ? "الربح" : "Profit"}</TableHead>
                              <TableHead>{language === "ar" ? "هامش الربح" : "Margin"}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {shiftReport.top_products.slice(0, 5).map((p: any, idx: number) => (
                              <TableRow key={`top-${p.product_id ?? "x"}-${idx}`}>
                                <TableCell className="font-medium">{p.product_name}</TableCell>
                                <TableCell>{formatNumber(p.quantity)}</TableCell>
                                <TableCell>{formatNumber(p.selling_total)}</TableCell>
                                <TableCell>{formatNumber(p.total_cost)}</TableCell>
                                <TableCell
                                  className={`font-semibold ${Number(p.profit) >= 0 ? "text-emerald-600" : "text-red-600"
                                    }`}
                                >
                                  {formatNumber(p.profit)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      Number(p.profit_margin) >= 30
                                        ? "default"
                                        : Number(p.profit_margin) >= 0
                                          ? "secondary"
                                          : "destructive"
                                    }
                                    className="text-xs"
                                  >
                                    {p.profit_margin ?? 0}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </section>
                  )}
                </TabsContent>

                {/* ========================= TAB 2: PRODUCTS ========================= */}
                <TabsContent value="products" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold">
                      {language === "ar" ? "المنتجات والخدمات المباعة" : "Sold Products & Services"}
                    </h3>

                    <Badge variant="secondary">
                      {formatNumber(shiftReport.products?.totals?.products_count)}{" "}
                      {language === "ar" ? "منتج" : "products"}
                    </Badge>
                  </div>

                  <div className="overflow-x-auto rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>{language === "ar" ? "الصنف" : "Item"}</TableHead>
                          <TableHead>{language === "ar" ? "الكمية المباعة" : "Sold Qty"}</TableHead>
                          <TableHead>{language === "ar" ? "الكمية المرتجعة" : "Returned Qty"}</TableHead>
                          <TableHead>{language === "ar" ? "إجمالي البيع" : "Sales Total"}</TableHead>
                          <TableHead>{language === "ar" ? "إجمالي التكلفة" : "Total Cost"}</TableHead>
                          <TableHead>{language === "ar" ? "الربح" : "Profit"}</TableHead>
                          <TableHead>{language === "ar" ? "هامش الربح" : "Margin"}</TableHead>
                          <TableHead>{language === "ar" ? "صافي الربح" : "Net Profit"}</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {(shiftReport.products?.items || []).length > 0 ? (
                          shiftReport.products.items.map((product: any, index: number) => (
                            <TableRow key={`${product.product_id ?? "item"}-${index}`}>
                              <TableCell className="min-w-[150px] font-medium">
                                {product.product_name || (language === "ar" ? "غير محدد" : "Unnamed")}
                              </TableCell>
                              <TableCell>{formatNumber(product.quantity)}</TableCell>
                              <TableCell
                                className={Number(product.returned_quantity) > 0 ? "text-red-600" : ""}
                              >
                                {formatNumber(product.returned_quantity)}
                              </TableCell>
                              <TableCell>{formatNumber(product.selling_total)}</TableCell>
                              <TableCell>{formatNumber(product.total_cost)}</TableCell>
                              <TableCell
                                className={`font-semibold ${Number(product.profit) >= 0 ? "text-emerald-600" : "text-red-600"
                                  }`}
                              >
                                {formatNumber(product.profit)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    Number(product.profit_margin) >= 30
                                      ? "default"
                                      : Number(product.profit_margin) >= 0
                                        ? "secondary"
                                        : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {product.profit_margin ?? 0}%
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={`font-semibold ${Number(product.net_profit) >= 0 ? "text-emerald-600" : "text-red-600"
                                  }`}
                              >
                                {formatNumber(product.net_profit)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="py-8 text-center text-muted-foreground"
                            >
                              {language === "ar" ? "لا توجد بنود مبيعات" : "No sales items"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Products Totals */}
                  {shiftReport.products?.totals && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {[
                        {
                          label: language === "ar" ? "عدد المنتجات" : "Products",
                          value: formatNumber(shiftReport.products.totals.products_count),
                        },
                        {
                          label: language === "ar" ? "إجمالي الكميات" : "Total Qty",
                          value: formatNumber(shiftReport.products.totals.total_quantity),
                        },
                        {
                          label: language === "ar" ? "إجمالي البيع" : "Sales",
                          value: formatNumber(shiftReport.products.totals.total_sales),
                        },
                        {
                          label: language === "ar" ? "إجمالي التكلفة" : "Cost",
                          value: formatNumber(shiftReport.products.totals.total_cost),
                        },
                        {
                          label: language === "ar" ? "إجمالي الربح" : "Profit",
                          value: formatNumber(shiftReport.products.totals.total_profit),
                          highlight: true,
                        },
                        {
                          label: language === "ar" ? "صافي الربح بعد المرتجع" : "Net Profit",
                          value: formatNumber(shiftReport.products.totals.net_profit),
                          highlight: true,
                        },
                      ].map((item) => (
                        <Card
                          key={item.label}
                          className={`rounded-xl shadow-none ${item.highlight ? "border-emerald-500/30 bg-emerald-500/5" : ""
                            }`}
                        >
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className={`mt-1 font-bold ${item.highlight ? "text-emerald-600" : ""}`}>
                              {item.value}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ========================= TAB 3: INVOICES ========================= */}
                <TabsContent value="invoices" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold">
                      {language === "ar" ? "الفواتير وتفاصيلها" : "Invoices & Details"}
                    </h3>

                    <Badge variant="secondary">
                      {formatNumber(shiftReport.summary?.sales?.invoices_count)}{" "}
                      {language === "ar" ? "فاتورة" : "invoices"}
                    </Badge>
                  </div>

                  {(shiftReport.sales_invoices || []).length > 0 ? (
                    <div className="space-y-3">
                      {shiftReport.sales_invoices.map((invoice: any) => (
                        <details key={invoice.id} className="group overflow-hidden rounded-xl border">
                          <summary className="cursor-pointer list-none p-4 transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold">
                                  {language === "ar" ? "فاتورة" : "Invoice"} #
                                  {invoice.invoice_number || invoice.id}
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                  {invoice.customer ||
                                    (language === "ar" ? "عميل نقدي" : "Walk-in Customer")}
                                  {" · "}
                                  {invoice.date || "-"}
                                  {invoice.sales_rep
                                    ? ` · ${language === "ar" ? "المندوب" : "Rep"}: ${invoice.sales_rep}`
                                    : ""}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-end">
                                  <p className="text-xs text-muted-foreground">
                                    {language === "ar" ? "الإجمالي" : "Total"}
                                  </p>
                                  <p className="font-bold">{formatNumber(invoice.total_sales)}</p>
                                </div>

                                <Badge variant="outline">{invoice.status || "-"}</Badge>

                                <span className="text-muted-foreground transition-transform group-open:rotate-180">
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="m6 9 6 6 6-6" />
                                  </svg>
                                </span>
                              </div>
                            </div>
                          </summary>

                          <div className="space-y-4 border-t bg-muted/10 p-4">
                            {/* Invoice summary */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                              {[
                                {
                                  label: language === "ar" ? "عدد البنود" : "Items",
                                  value: invoice.items_count ?? invoice.items?.length ?? 0,
                                },
                                {
                                  label: language === "ar" ? "إجمالي الكمية" : "Quantity",
                                  value: formatNumber(invoice.total_quantity),
                                },
                                {
                                  label: language === "ar" ? "إجمالي الفاتورة" : "Invoice Total",
                                  value: formatNumber(invoice.total_sales),
                                },
                                {
                                  label: language === "ar" ? "إجمالي التكلفة" : "Total Cost",
                                  value: formatNumber(invoice.total_cost),
                                },
                                {
                                  label: language === "ar" ? "الربح" : "Profit",
                                  value: formatNumber(invoice.profit),
                                },
                              ].map((item) => (
                                <div key={item.label} className="rounded-lg border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">{item.label}</p>
                                  <p className="mt-1 break-words font-semibold">{item.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Invoice items table */}
                            <div className="overflow-x-auto rounded-lg border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead>{language === "ar" ? "الصنف" : "Product"}</TableHead>
                                    <TableHead>{language === "ar" ? "الكمية" : "Quantity"}</TableHead>
                                    <TableHead>{language === "ar" ? "سعر الوحدة" : "Unit Price"}</TableHead>
                                    <TableHead>{language === "ar" ? "إجمالي البيع" : "Sales Total"}</TableHead>
                                    <TableHead>{language === "ar" ? "تكلفة الوحدة" : "Unit Cost"}</TableHead>
                                    <TableHead>{language === "ar" ? "إجمالي التكلفة" : "Total Cost"}</TableHead>
                                    <TableHead>{language === "ar" ? "الربح" : "Profit"}</TableHead>
                                  </TableRow>
                                </TableHeader>

                                <TableBody>
                                  {(invoice.items || []).length > 0 ? (
                                    invoice.items.map((item: any, index: number) => {
                                      const quantity = Number(item.quantity ?? 0);
                                      const unitPrice = Number(
                                        item.selling_price ?? item.unit_price ?? item.price ?? 0,
                                      );
                                      const salesTotal = Number(
                                        item.selling_total ?? item.total ?? unitPrice * quantity,
                                      );
                                      const unitCost = Number(item.unit_cost ?? item.cost_price ?? 0);
                                      const totalCost = Number(item.total_cost ?? unitCost * quantity);
                                      const profit = Number(item.profit ?? salesTotal - totalCost);

                                      return (
                                        <TableRow key={`${invoice.id}-${item.id ?? index}`}>
                                          <TableCell className="min-w-[150px] font-medium">
                                            {item.product_name ||
                                              item.name ||
                                              (language === "ar" ? "غير محدد" : "Unnamed")}
                                          </TableCell>
                                          <TableCell>{formatNumber(quantity)}</TableCell>
                                          <TableCell>{formatNumber(unitPrice)}</TableCell>
                                          <TableCell>{formatNumber(salesTotal)}</TableCell>
                                          <TableCell
                                            className={item.cost_missing ? "font-semibold text-amber-600" : ""}
                                          >
                                            {formatNumber(unitCost)}
                                          </TableCell>
                                          <TableCell>{formatNumber(totalCost)}</TableCell>
                                          <TableCell
                                            className={`font-semibold ${profit >= 0 ? "text-emerald-600" : "text-red-600"
                                              }`}
                                          >
                                            {formatNumber(profit)}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })
                                  ) : (
                                    <TableRow>
                                      <TableCell
                                        colSpan={7}
                                        className="py-6 text-center text-muted-foreground"
                                      >
                                        {language === "ar"
                                          ? "لا توجد تفاصيل بنود لهذه الفاتورة"
                                          : "No invoice line items available"}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>

                            {/* Payment methods */}
                            <div className="rounded-lg border bg-background p-3">
                              <p className="mb-3 font-semibold">
                                {language === "ar" ? "طرق الدفع" : "Payment Methods"}
                              </p>

                              {(invoice.payments || []).length > 0 ? (
                                <div className="space-y-2">
                                  {invoice.payments.map((payment: any, index: number) => (
                                    <div
                                      key={`${invoice.id}-payment-${index}`}
                                      className="flex flex-wrap justify-between gap-2 text-sm"
                                    >
                                      <span className="text-muted-foreground">
                                        {payment.method || "-"}
                                      </span>
                                      <span className="font-semibold">
                                        {formatNumber(payment.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {language === "ar" ? "لا توجد تفاصيل دفع" : "No payment details"}
                                </p>
                              )}

                              <div className="mt-3 flex justify-between gap-3 border-t pt-3 text-sm font-bold">
                                <span>{language === "ar" ? "إجمالي المدفوع" : "Payment Total"}</span>
                                <span>{formatNumber(invoice.payment_total)}</span>
                              </div>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border py-8 text-center text-sm text-muted-foreground">
                      {language === "ar"
                        ? "لا توجد فواتير مرتبطة بهذه الوردية"
                        : "No invoices found for this shift"}
                    </div>
                  )}
                </TabsContent>

                {/* ========================= TAB 4: RETURNS ========================= */}
                <TabsContent value="returns" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold">
                      {language === "ar" ? "المرتجعات" : "Returns"}
                    </h3>

                    <Badge variant="secondary">
                      {formatNumber(shiftReport.summary?.returns?.count)}{" "}
                      {language === "ar" ? "مرتجع" : "returns"}
                    </Badge>
                  </div>

                  {/* Returns summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        label: language === "ar" ? "عدد المرتجعات" : "Returns Count",
                        value: formatNumber(shiftReport.summary?.returns?.count),
                      },
                      {
                        label: language === "ar" ? "قيمة المرتجعات" : "Returns Amount",
                        value: formatNumber(shiftReport.summary?.returns?.total_amount),
                        highlight: true,
                      },
                      {
                        label: language === "ar" ? "تكلفة المرتجعات" : "Returns Cost",
                        value: formatNumber(shiftReport.summary?.returns?.total_cost),
                      },
                      {
                        label: language === "ar" ? "الربح المعكوس" : "Profit Reversed",
                        value: formatNumber(shiftReport.summary?.returns?.profit_reversed),
                      },
                    ].map((item) => (
                      <Card key={item.label} className="rounded-xl shadow-none">
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p
                            className={`mt-2 text-xl font-bold ${item.highlight ? "text-red-600" : ""
                              }`}
                          >
                            {item.value}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Returns by source + refund method */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {[
                      {
                        label: language === "ar" ? "مرتجعات POS" : "POS Returns",
                        value: shiftReport.returns_breakdown?.by_source?.pos ?? 0,
                        color: "text-blue-600",
                      },
                      {
                        label: language === "ar" ? "مرتجعات الفواتير" : "Sales Returns",
                        value: shiftReport.returns_breakdown?.by_source?.sales ?? 0,
                        color: "text-purple-600",
                      },
                      {
                        label: language === "ar" ? "مسترد نقدي" : "Cash Refunds",
                        value: formatNumber(shiftReport.returns_breakdown?.cash),
                      },
                      {
                        label: language === "ar" ? "مسترد بطاقة" : "Card Refunds",
                        value: formatNumber(shiftReport.returns_breakdown?.card),
                      },
                      {
                        label: language === "ar" ? "مسترد محفظة/رصيد" : "Wallet Refunds",
                        value: formatNumber(shiftReport.returns_breakdown?.wallet),
                      },
                      {
                        label: language === "ar" ? "مسترد أخرى" : "Other Refunds",
                        value: formatNumber(shiftReport.returns_breakdown?.other),
                      },
                      {
                        label: language === "ar" ? "إجمالي المسترد" : "Total Refunded",
                        value: formatNumber(shiftReport.returns_breakdown?.total),
                        color: "text-red-600",
                      },
                    ].map((item) => (
                      <Card key={item.label} className="rounded-xl shadow-none">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className={`mt-2 break-words font-bold ${item.color ?? ""}`}>
                            {item.value}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Return details */}
                  {(shiftReport.returns_details || []).length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">
                        {language === "ar" ? "تفاصيل المرتجعات" : "Return Details"}
                      </p>

                      {shiftReport.returns_details.map((ret: any) => (
                        <details
                          key={`${ret.source}-${ret.id}`}
                          className="group overflow-hidden rounded-xl border"
                        >
                          <summary className="cursor-pointer list-none p-4 hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold">
                                    {language === "ar" ? "مرتجع" : "Return"} #
                                    {ret.return_number || ret.id}
                                  </p>

                                  <Badge
                                    variant={ret.source === "pos" ? "default" : "outline"}
                                    className={`text-xs ${ret.source === "pos"
                                        ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                        : "bg-purple-100 text-purple-700 hover:bg-purple-100"
                                      }`}
                                  >
                                    {ret.source === "pos" ? "POS" : "Sales"}
                                  </Badge>
                                </div>

                                <p className="mt-1 text-sm text-muted-foreground">
                                  {ret.date || "-"}
                                  {ret.invoice_number
                                    ? ` · ${language === "ar" ? "الفاتورة الأصلية" : "Original Invoice"
                                    } #${ret.invoice_number}`
                                    : ""}
                                </p>

                                <p className="mt-1 text-sm">
                                  {ret.customer ||
                                    (language === "ar" ? "غير محدد" : "Unknown customer")}
                                  {ret.sales_rep
                                    ? ` · ${language === "ar" ? "المندوب" : "Rep"}: ${ret.sales_rep}`
                                    : ""}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-end">
                                  <p className="text-xs text-muted-foreground">
                                    {language === "ar" ? "قيمة المرتجع" : "Return Amount"}
                                  </p>
                                  <p className="font-bold text-red-600">
                                    {formatNumber(ret.total_amount)}
                                  </p>
                                </div>

                                {Number(ret.refunded_amount ?? 0) !== Number(ret.total_amount ?? 0) && (
                                  <div className="text-end">
                                    <p className="text-xs text-muted-foreground">
                                      {language === "ar" ? "المسترد فعلاً" : "Refunded"}
                                    </p>
                                    <p className="font-bold">{formatNumber(ret.refunded_amount)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </summary>

                          <div className="space-y-3 border-t bg-muted/10 p-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                              {[
                                {
                                  label: language === "ar" ? "عدد البنود" : "Items",
                                  value: ret.items_count ?? ret.items?.length ?? 0,
                                },
                                {
                                  label: language === "ar" ? "إجمالي الكمية" : "Quantity",
                                  value: formatNumber(ret.total_quantity),
                                },
                                {
                                  label: language === "ar" ? "التكلفة" : "Cost",
                                  value: formatNumber(ret.total_cost),
                                },
                                {
                                  label: language === "ar" ? "الربح المعكوس" : "Profit Reversed",
                                  value: formatNumber(ret.profit_reversed),
                                },
                                {
                                  label: language === "ar" ? "طريقة الرد" : "Refund Method",
                                  value: ret.return_method || "-",
                                },
                              ].map((item) => (
                                <div key={item.label} className="rounded-lg border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">{item.label}</p>
                                  <p className="mt-1 break-words text-sm font-semibold">{item.value}</p>
                                </div>
                              ))}
                            </div>

                            {ret.treasury_name && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  {language === "ar" ? "الخزينة:" : "Treasury:"}
                                </span>{" "}
                                {ret.treasury_name}
                              </p>
                            )}

                            {ret.status && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  {language === "ar" ? "الحالة:" : "Status:"}
                                </span>{" "}
                                <Badge variant="outline" className="text-xs">
                                  {ret.status}
                                </Badge>
                              </p>
                            )}

                            {ret.note && (
                              <div className="rounded-lg border bg-background p-3 text-sm">
                                <p className="mb-1 font-semibold">
                                  {language === "ar" ? "ملاحظات" : "Notes"}
                                </p>
                                <p className="text-muted-foreground">{ret.note}</p>
                              </div>
                            )}

                            {/* Return line items */}
                            <div className="overflow-x-auto rounded-lg border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead>{language === "ar" ? "الصنف" : "Item"}</TableHead>
                                    <TableHead>{language === "ar" ? "الكمية" : "Qty"}</TableHead>
                                    <TableHead>{language === "ar" ? "سعر البيع" : "Unit Price"}</TableHead>
                                    <TableHead>{language === "ar" ? "إجمالي البيع" : "Sales Total"}</TableHead>
                                    <TableHead>{language === "ar" ? "تكلفة الوحدة" : "Unit Cost"}</TableHead>
                                    <TableHead>{language === "ar" ? "إجمالي التكلفة" : "Total Cost"}</TableHead>
                                    <TableHead>{language === "ar" ? "الربح المعكوس" : "Profit Reversed"}</TableHead>
                                  </TableRow>
                                </TableHeader>

                                <TableBody>
                                  {(ret.items || []).length > 0 ? (
                                    ret.items.map((item: any, index: number) => {
                                      const quantity = Number(item.quantity ?? 0);
                                      const unitPrice = Number(
                                        item.selling_price ?? item.unit_price ?? item.price ?? 0,
                                      );
                                      const salesTotal = Number(
                                        item.selling_total ?? item.total ?? unitPrice * quantity,
                                      );
                                      const unitCost = Number(item.unit_cost ?? item.cost_price ?? 0);
                                      const totalCost = Number(item.total_cost ?? unitCost * quantity);
                                      const profitReversed = Number(
                                        item.profit_reversed ?? salesTotal - totalCost,
                                      );

                                      return (
                                        <TableRow key={`${ret.source}-${ret.id}-${item.id ?? index}`}>
                                          <TableCell className="min-w-[130px] font-medium">
                                            <div>
                                              {item.product_name ||
                                                item.name ||
                                                (language === "ar" ? "غير محدد" : "Unnamed")}
                                            </div>

                                            {item.reason && (
                                              <p className="mt-1 text-xs text-muted-foreground">
                                                {language === "ar" ? "السبب: " : "Reason: "}
                                                {item.reason}
                                              </p>
                                            )}
                                          </TableCell>

                                          <TableCell>{formatNumber(quantity)}</TableCell>
                                          <TableCell>{formatNumber(unitPrice)}</TableCell>
                                          <TableCell>{formatNumber(salesTotal)}</TableCell>
                                          <TableCell
                                            className={item.cost_missing ? "font-semibold text-amber-600" : ""}
                                          >
                                            {formatNumber(unitCost)}
                                          </TableCell>
                                          <TableCell>{formatNumber(totalCost)}</TableCell>
                                          <TableCell
                                            className={`font-semibold ${profitReversed >= 0 ? "text-red-600" : "text-emerald-600"
                                              }`}
                                          >
                                            {formatNumber(profitReversed)}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })
                                  ) : (
                                    <TableRow>
                                      <TableCell
                                        colSpan={7}
                                        className="py-5 text-center text-muted-foreground"
                                      >
                                        {language === "ar"
                                          ? "لا توجد تفاصيل بنود لهذا المرتجع"
                                          : "No return line items available"}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
                      {language === "ar"
                        ? "لا توجد تفاصيل مرتجعات متاحة لهذه الوردية"
                        : "No return details available for this shift"}
                    </div>
                  )}
                </TabsContent>

                {/* ===================== TAB 5: RECONCILIATION ===================== */}
                <TabsContent value="reconciliation" className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold">
                      {language === "ar" ? "التسوية النقدية" : "Cash Reconciliation"}
                    </h3>

                    {shiftReport.reconciliation?.status && (
                      <Badge
                        variant={
                          shiftReport.reconciliation.status === "balanced"
                            ? "default"
                            : shiftReport.reconciliation.status === "over"
                              ? "secondary"
                              : shiftReport.reconciliation.status === "short"
                                ? "destructive"
                                : "outline"
                        }
                        className={
                          shiftReport.reconciliation.status === "balanced"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : ""
                        }
                      >
                        {shiftReport.reconciliation.status === "balanced" &&
                          (language === "ar" ? "متوازن" : "Balanced")}
                        {shiftReport.reconciliation.status === "over" &&
                          (language === "ar" ? "زيادة" : "Over")}
                        {shiftReport.reconciliation.status === "short" &&
                          (language === "ar" ? "نقص" : "Short")}
                        {shiftReport.reconciliation.status === "pending" &&
                          (language === "ar" ? "معلق" : "Pending")}
                      </Badge>
                    )}
                  </div>

                  <Card className="overflow-hidden rounded-xl shadow-none">
                    <CardContent className="space-y-0 p-0">
                      {[
                        {
                          label: language === "ar" ? "رصيد البداية" : "Opening Balance",
                          value: shiftReport.reconciliation?.opening_balance,
                        },
                        {
                          label: language === "ar" ? "المبيعات النقدية" : "Cash Sales",
                          value: shiftReport.reconciliation?.cash_sales,
                        },
                        {
                          label: language === "ar" ? "المرتجعات النقدية" : "Cash Returns",
                          value: shiftReport.reconciliation?.cash_returns,
                          negative: true,
                        },
                        {
                          label: language === "ar" ? "المبلغ الفعلي" : "Actual Amount",
                          value: shiftReport.reconciliation?.actual_amount,
                          strong: true,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 ${item.strong ? "bg-muted/20" : ""
                            }`}
                        >
                          <span
                            className={item.strong ? "font-semibold" : "text-sm text-muted-foreground"}
                          >
                            {item.label}
                            {item.negative && <span className="ml-1 text-red-600">( - )</span>}
                          </span>

                          <span className={item.strong ? "font-bold" : "text-sm font-medium"}>
                            {item.value === null || item.value === undefined ? (
                              "-"
                            ) : (
                              <>
                                {item.negative && "-"}
                                {formatNumber(item.value)}
                              </>
                            )}
                          </span>
                        </div>
                      ))}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 bg-muted/20 px-4 py-4">
                        <span className="font-bold">
                          {language === "ar" ? "فرق التسوية" : "Difference"}
                        </span>

                        <span
                          className={`text-xl font-bold ${Number(shiftReport.reconciliation?.difference || 0) < 0
                              ? "text-red-600"
                              : Number(shiftReport.reconciliation?.difference || 0) > 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                        >
                          {shiftReport.reconciliation?.difference === null ||
                            shiftReport.reconciliation?.difference === undefined
                            ? "-"
                            : formatNumber(shiftReport.reconciliation.difference)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reconciliation Summary */}
                  {shiftReport.reconciliation?.actual_amount !== null &&
                    shiftReport.reconciliation?.actual_amount !== undefined && (
                      <Card
                        className={`rounded-xl shadow-none ${shiftReport.reconciliation?.status === "balanced"
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : shiftReport.reconciliation?.status === "over"
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-red-500/30 bg-red-500/5"
                          }`}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          {shiftReport.reconciliation?.status === "balanced" ? (
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                          ) : shiftReport.reconciliation?.status === "over" ? (
                            <AlertCircle className="h-8 w-8 text-amber-600" />
                          ) : (
                            <XCircle className="h-8 w-8 text-red-600" />
                          )}

                          <div>
                            <p className="font-semibold">
                              {shiftReport.reconciliation?.status === "balanced" &&
                                (language === "ar" ? "التسوية متوازنة" : "Reconciliation Balanced")}
                              {shiftReport.reconciliation?.status === "over" &&
                                (language === "ar" ? "يوجد زيادة في النقدية" : "Cash Over")}
                              {shiftReport.reconciliation?.status === "short" &&
                                (language === "ar" ? "يوجد نقص في النقدية" : "Cash Short")}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {language === "ar" ? "الفرق: " : "Difference: "}
                              {formatNumber(shiftReport.reconciliation?.difference)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                {language === "ar" ? "لا توجد بيانات للعرض" : "No report data available"}
              </div>
            )}
          </div>

          {/* ============================ FOOTER ============================ */}
          <div className="flex flex-wrap justify-between gap-2 border-t bg-background px-4 py-3 sm:px-7">
            <Button
              variant="outline"
              onClick={() => refetchShiftReport()}
              disabled={isLoadingShiftReport}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {language === "ar" ? "تحديث التقرير" : "Refresh"}
            </Button>

            <Button
              onClick={() => selectedShift && printShift(selectedShift)}
              disabled={!shiftReport}
            >
              <Printer className="mr-2 h-4 w-4" />
              {language === "ar" ? "طباعة ملخص الوردية" : "Print Shift Summary"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ShiftsList;