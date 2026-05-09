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
  Receipt
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
            <div class="print-row"><span style="font-weight: bold;">📦 ${language === 'ar' ? 'إجمالي المبيعات:' : 'Total Sales:'}</span><span style="font-weight: bold;">${formatNumber(parseFloat(shift.cash_sales || '0') + parseFloat(shift.wallet_sales || '0') + parseFloat(shift.card_sales || '0'))}</span></div>
          </div>

          <div class="print-section">
            <div class="text-center" style="font-weight: bold; margin-bottom: 5px; background: #f0f0f0; padding: 2px;">${language === 'ar' ? 'التسوية' : 'Settlement'}</div>
            <div class="print-row"><span>${language === 'ar' ? 'المبلغ المتوقع:' : 'Expected Amount:'}</span><span>${formatNumber(shift.expected_amount)}</span></div>
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
    expected: language === 'ar' ? 'المتوقع' : 'Expected',
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
                  <TableHead className="text-right">{t.expected}</TableHead>
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
                      <TableCell className="text-right">{formatNumber(shift.expected_amount)}</TableCell>
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
      <Dialog open={showDetails} onOpenChange={() => setShowDetails(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />{t.shiftDetails}</DialogTitle></DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                {getStatusBadge(selectedShift.status)}
                <Button size="sm" onClick={() => printShift(selectedShift)} className="gap-2"><Printer size={14} />{t.printInvoice}</Button>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div><p className="text-xs text-muted-foreground flex gap-1 mb-1"><User size={12} />{t.employee}</p><p className="font-medium text-lg">{selectedShift.employee}</p></div>
                <div><p className="text-xs text-muted-foreground flex gap-1 mb-1"><Clock size={12} />{t.duration}</p><p className="font-medium text-lg">{getShiftDuration(selectedShift)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.openedAt}</p><p className="font-medium">{formatDateTime(selectedShift.opened_at)}</p></div>
                <div className="p-3 border rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.closedAt}</p><p className="font-medium">{formatDateTime(selectedShift.closed_at)}</p></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-primary/5 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.openingBalance}</p><p className="text-xl font-bold">{formatNumber(selectedShift.opening_balance)}</p></div>
                <div className="p-3 bg-emerald-500/5 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.cashSales}</p><p className="text-xl font-bold text-emerald-600">{formatNumber(selectedShift.cash_sales)}</p></div>
                <div className="p-3 bg-purple-500/5 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.walletSales}</p><p className="text-xl font-bold text-purple-600">{formatNumber(selectedShift.wallet_sales)}</p></div>
                <div className="p-3 bg-blue-500/5 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.cardSales}</p><p className="text-xl font-bold text-blue-600">{formatNumber(selectedShift.card_sales)}</p></div>
                <div className="p-3 bg-red-500/5 rounded-lg"><p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Receipt size={12} className="text-red-600" />{t.returns}</p><p className="text-xl font-bold text-red-600">-{formatNumber(selectedShift.returns_amount)}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-amber-500/5 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.expected}</p><p className="text-xl font-bold text-amber-600">{formatNumber(selectedShift.expected_amount)}</p></div>
                <div className="p-3 bg-purple-500/5 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.actual}</p><p className="text-xl font-bold text-purple-600">{formatNumber(selectedShift.actual_amount)}</p></div>
                <div className="p-3 bg-red-500/5 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.difference}</p><p className={cn("text-xl font-bold", parseFloat(selectedShift.difference || '0') > 0 ? "text-amber-600" : parseFloat(selectedShift.difference || '0') < 0 ? "text-red-600" : "")}>{formatNumber(selectedShift.difference)}</p></div>
              </div>
              {selectedShift.notes && <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground mb-1">{t.notes}</p><p className="text-sm">{selectedShift.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftsList;