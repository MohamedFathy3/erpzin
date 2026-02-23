import React, { useState, useMemo, useCallback } from 'react';
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
  Timer
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
  
  // فلتر الساعات الجديد
  const [startHour, setStartHour] = useState<string>('');
  const [endHour, setEndHour] = useState<string>('');

  // جلب الورديات
  const { data: shifts = [], isLoading, refetch } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      try {
        const response = await api.get('/shifts');
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

  // تنسيق الأرقام
  const formatNumber = useCallback((value: string | number | null): string => {
    if (value === null || value === undefined) return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  // تنسيق التاريخ
  const formatDateTime = useCallback((dateStr: string | null): string => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm', {
      locale: language === 'ar' ? ar : undefined
    });
  }, [language]);

  // تنسيق الوقت فقط
  const formatTime = useCallback((dateStr: string | null): string => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'HH:mm', {
      locale: language === 'ar' ? ar : undefined
    });
  }, [language]);

  // حساب المدة
  const getShiftDuration = useCallback((shift: Shift): string => {
    if (!shift.opened_at) return '-';
    const start = new Date(shift.opened_at);
    const end = shift.closed_at ? new Date(shift.closed_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (language === 'ar') {
      return `${diffHrs} ساعة ${diffMins} دقيقة`;
    }
    return `${diffHrs}h ${diffMins}m`;
  }, [language]);

  // استخراج الساعة من التاريخ
  const getHourFromDateTime = useCallback((dateStr: string | null): number | null => {
    if (!dateStr) return null;
    return new Date(dateStr).getHours();
  }, []);

  // ============ دوال الفلترة ============

  // دالة البحث الشامل
  const globalSearchFilter = useCallback((shift: Shift, searchTerm: string): boolean => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    const searchableFields = [
      shift.id?.toString(),
      shift.employee,
      shift.notes,
      shift.status,
      formatNumber(shift.opening_balance),
      formatNumber(shift.cash_sales),
      formatNumber(shift.card_sales),
      formatNumber(shift.returns_amount),
      formatNumber(shift.expected_amount),
      formatNumber(shift.actual_amount),
      formatNumber(shift.difference),
      formatDateTime(shift.opened_at),
      formatDateTime(shift.closed_at),
      getShiftDuration(shift),
      formatTime(shift.opened_at),
      formatTime(shift.closed_at),
      shift.status === 'open' ? (language === 'ar' ? 'مفتوحة' : 'open') : '',
      shift.status === 'closed' ? (language === 'ar' ? 'مغلقة' : 'closed') : ''
    ];
    
    return searchableFields.some(field => 
      field && field.toLowerCase().includes(searchLower)
    );
  }, [language, formatNumber, formatDateTime, formatTime, getShiftDuration]);

  // فلتر التاريخ
  const dateRangeFilter = useCallback((shift: Shift): boolean => {
    if (dateFilter === 'all') return true;
    
    const now = new Date();
    const openedDate = new Date(shift.opened_at);
    
    switch (dateFilter) {
      case 'today':
        return openedDate.toDateString() === now.toDateString();
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
      case 'thisMonth':
        return openedDate.getMonth() === now.getMonth() && 
               openedDate.getFullYear() === now.getFullYear();
      case 'lastMonth': {
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return openedDate.getMonth() === lastMonth.getMonth() && 
               openedDate.getFullYear() === lastMonth.getFullYear();
      }
      default:
        return true;
    }
  }, [dateFilter]);

  // فلتر الساعات الجديد
  const hourRangeFilter = useCallback((shift: Shift): boolean => {
    if (!startHour && !endHour) return true;
    
    const hour = getHourFromDateTime(shift.opened_at);
    if (hour === null) return false;
    
    const start = startHour ? parseInt(startHour) : 0;
    const end = endHour ? parseInt(endHour) : 23;
    
    return hour >= start && hour <= end;
  }, [startHour, endHour, getHourFromDateTime]);

  // فلتر المبالغ
  const amountRangeFilter = useCallback((shift: Shift): boolean => {
    if (!minAmount && !maxAmount) return true;
    
    const totalSales = parseFloat(shift.cash_sales) + parseFloat(shift.card_sales);
    
    if (minAmount && totalSales < parseFloat(minAmount)) return false;
    if (maxAmount && totalSales > parseFloat(maxAmount)) return false;
    
    return true;
  }, [minAmount, maxAmount]);

  // فلتر الموظف
  const employeeNameFilter = useCallback((shift: Shift): boolean => {
    if (!employeeFilter) return true;
    return shift.employee?.toLowerCase().includes(employeeFilter.toLowerCase());
  }, [employeeFilter]);

  // ============ الفلترة النهائية والترتيب ============

  // الفلترة النهائية
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift: Shift) => {
      const matchesGlobal = globalSearchFilter(shift, globalSearch);
      const matchesStatus = statusFilter === 'all' || shift.status === statusFilter;
      const matchesDate = dateRangeFilter(shift);
      const matchesHour = hourRangeFilter(shift);
      const matchesAmount = amountRangeFilter(shift);
      const matchesEmployee = employeeNameFilter(shift);
      
      return matchesGlobal && matchesStatus && matchesDate && matchesHour && matchesAmount && matchesEmployee;
    });
  }, [shifts, globalSearch, statusFilter, dateFilter, startHour, endHour, minAmount, maxAmount, employeeFilter, globalSearchFilter, dateRangeFilter, hourRangeFilter, amountRangeFilter, employeeNameFilter]);

  // ترتيب النتائج
  const sortedAndFilteredShifts = useMemo(() => {
    const sorted = [...filteredShifts].sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (['opening_balance', 'cash_sales', 'card_sales', 'returns_amount', 
            'expected_amount', 'actual_amount', 'difference'].includes(sortField)) {
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

  // حساب الإحصائيات
  const stats = useMemo(() => ({
    totalShifts: shifts.length,
    openShifts: shifts.filter((s: Shift) => s.status === 'open').length,
    closedShifts: shifts.filter((s: Shift) => s.status === 'closed').length,
    totalCashSales: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.cash_sales || '0'), 0),
    totalCardSales: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.card_sales || '0'), 0),
    totalReturns: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.returns_amount || '0'), 0),
    filteredTotalCashSales: filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.cash_sales || '0'), 0),
    filteredTotalCardSales: filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.card_sales || '0'), 0),
  }), [shifts, filteredShifts]);

  // Badge الحالة
  const getStatusBadge = useCallback((status: string) => {
    if (status === 'open') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1">
          <Clock size={12} />
          {language === 'ar' ? 'مفتوحة' : 'Open'}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 gap-1">
        <CheckCircle2 size={12} />
        {language === 'ar' ? 'مغلقة' : 'Closed'}
      </Badge>
    );
  }, [language]);

  // Badge الفرق
  const getDifferenceBadge = useCallback((diff: string | null) => {
    if (diff === null) return null;
    const diffNum = parseFloat(diff);
    if (diffNum === 0) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
          {language === 'ar' ? 'متطابق' : 'Matched'}
        </Badge>
      );
    }
    if (diffNum > 0) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
          <TrendingUp size={12} />
          +{formatNumber(diffNum)}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 gap-1">
        <TrendingDown size={12} />
        {formatNumber(diffNum)}
      </Badge>
    );
  }, [language, formatNumber]);

  // ============ الترجمات ============

  const t = {
    title: language === 'ar' ? 'الورديات' : 'Shifts',
    openShifts: language === 'ar' ? 'الورديات المفتوحة' : 'Open Shifts',
    closedShifts: language === 'ar' ? 'الورديات المغلقة' : 'Closed Shifts',
    totalCash: language === 'ar' ? 'إجمالي النقدي' : 'Total Cash',
    totalCard: language === 'ar' ? 'إجمالي البطاقة' : 'Total Card',
    totalReturns: language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns',
    employee: language === 'ar' ? 'الموظف' : 'Employee',
    openedAt: language === 'ar' ? 'وقت الفتح' : 'Opened At',
    closedAt: language === 'ar' ? 'وقت الإغلاق' : 'Closed At',
    duration: language === 'ar' ? 'المدة' : 'Duration',
    openingBalance: language === 'ar' ? 'رصيد البداية' : 'Opening',
    closingBalance: language === 'ar' ? 'رصيد النهاية' : 'Closing',
    cashSales: language === 'ar' ? 'مبيعات نقدي' : 'Cash Sales',
    cardSales: language === 'ar' ? 'مبيعات بطاقة' : 'Card Sales',
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
    ascending: language === 'ar' ? 'تصاعدي' : 'Ascending',
    descending: language === 'ar' ? 'تنازلي' : 'Descending',
    searchResults: language === 'ar' ? 'نتائج البحث' : 'Search Results',
    showing: language === 'ar' ? 'عرض' : 'Showing',
    of: language === 'ar' ? 'من' : 'of',
    items: language === 'ar' ? 'عناصر' : 'items',
    actions: language === 'ar' ? 'الإجراءات' : 'Actions',
    startHour: language === 'ar' ? 'من الساعة' : 'From Hour',
    endHour: language === 'ar' ? 'إلى الساعة' : 'To Hour',
    hourFilter: language === 'ar' ? 'فلتر الساعات' : 'Hour Filter',
    hourPlaceholder: language === 'ar' ? 'مثال: 9' : 'e.g: 9'
  };

  const hasActiveFilters = globalSearch || statusFilter !== 'all' || dateFilter !== 'all' || startHour || endHour || minAmount || maxAmount || employeeFilter;

  // خيارات الترتيب
  const sortOptions = [
    { value: 'opened_at', label: language === 'ar' ? 'تاريخ الفتح' : 'Opened Date' },
    { value: 'closed_at', label: language === 'ar' ? 'تاريخ الإغلاق' : 'Closed Date' },
    { value: 'employee', label: language === 'ar' ? 'الموظف' : 'Employee' },
    { value: 'cash_sales', label: language === 'ar' ? 'المبيعات النقدية' : 'Cash Sales' },
    { value: 'card_sales', label: language === 'ar' ? 'مبيعات البطاقة' : 'Card Sales' },
    { value: 'difference', label: language === 'ar' ? 'الفرق' : 'Difference' },
  ];

  // خيارات الساعات للاختيار السريع
  const quickHourOptions = [
    { label: language === 'ar' ? 'الفجر (٣-٦)' : 'Dawn (3-6)', start: 3, end: 6 },
    { label: language === 'ar' ? 'الصباح (٦-١٢)' : 'Morning (6-12)', start: 6, end: 12 },
    { label: language === 'ar' ? 'الظهر (١٢-٣)' : 'Noon (12-15)', start: 12, end: 15 },
    { label: language === 'ar' ? 'العصر (٣-٦)' : 'Afternoon (15-18)', start: 15, end: 18 },
    { label: language === 'ar' ? 'المساء (٦-١٢)' : 'Evening (18-24)', start: 18, end: 24 },
  ];

  // ============ التصيير (JSX) ============

  return (
    <div className="space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{t.title}</h2>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-2">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            {t.refresh}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.title}</p>
                <p className="text-xl font-bold">{stats.totalShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.openShifts}</p>
                <p className="text-xl font-bold">{stats.openShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/20">
                <XCircle className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.closedShifts}</p>
                <p className="text-xl font-bold">{stats.closedShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.totalCash}</p>
                <p className="text-xl font-bold">{formatNumber(stats.totalCashSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.totalCard}</p>
                <p className="text-xl font-bold">{formatNumber(stats.totalCardSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Search Bar */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-10 py-6 text-lg border-primary/20 focus-visible:ring-primary"
              autoFocus
            />
            {globalSearch && (
              <>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {filteredShifts.length} {t.items}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-16 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setGlobalSearch('')}
                >
                  <X size={18} />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <SlidersHorizontal size={16} />
          {showFilters ? t.hideFilters : t.showFilters}
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {
                [globalSearch, statusFilter !== 'all' ? statusFilter : null, 
                 dateFilter !== 'all' ? dateFilter : null, startHour, endHour, 
                 minAmount, maxAmount, employeeFilter]
                .filter(Boolean).length
              }
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => {
            setGlobalSearch('');
            setStatusFilter('all');
            setDateFilter('all');
            setStartHour('');
            setEndHour('');
            setMinAmount('');
            setMaxAmount('');
            setEmployeeFilter('');
          }} className="gap-2 text-destructive hover:text-destructive">
            <X size={14} />
            {t.clearFilters}
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* فلتر الحالة */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.status}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="open">{language === 'ar' ? 'مفتوحة' : 'Open'}</SelectItem>
                    <SelectItem value="closed">{language === 'ar' ? 'مغلقة' : 'Closed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر التاريخ */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.openedAt}</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="today">{t.today}</SelectItem>
                    <SelectItem value="yesterday">{t.yesterday}</SelectItem>
                    <SelectItem value="thisWeek">{t.thisWeek}</SelectItem>
                    <SelectItem value="thisMonth">{t.thisMonth}</SelectItem>
                    <SelectItem value="lastMonth">{t.lastMonth}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر الساعات الجديد */}
              <div className="space-y-2 col-span-full lg:col-span-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Timer size={14} className="text-primary" />
                  {t.hourFilter}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder={t.startHour}
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder={t.endHour}
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="text-center"
                    />
                  </div>
                </div>
                {/* خيارات سريعة للساعات */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {quickHourOptions.map((option, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 text-xs"
                      onClick={() => {
                        setStartHour(option.start.toString());
                        setEndHour(option.end.toString());
                      }}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* فلتر الموظف */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.filterByEmployee}</label>
                <Input
                  placeholder={t.employee}
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                />
              </div>

              {/* فلتر المبالغ - من */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.minAmount}</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>

              {/* فلتر المبالغ - إلى */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.maxAmount}</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>

              {/* الترتيب */}
              <div className="space-y-2 col-span-full lg:col-span-1">
                <label className="text-sm font-medium">{t.sortBy}</label>
                <div className="flex gap-2">
                  <Select value={sortField} onValueChange={setSortField}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {t.showing} {sortedAndFilteredShifts.length} {t.of} {shifts.length} {t.items}
          {globalSearch && ` "${globalSearch}"`}
        </div>
        {sortedAndFilteredShifts.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <DollarSign size={14} className="text-emerald-600" />
              {formatNumber(stats.filteredTotalCashSales)}
            </span>
            <span className="flex items-center gap-1">
              <CreditCard size={14} className="text-blue-600" />
              {formatNumber(stats.filteredTotalCardSales)}
            </span>
          </div>
        )}
      </div>

      {/* Shifts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead 
                    className="min-w-[150px] cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      if (sortField === 'employee') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('employee');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {t.employee}
                      {sortField === 'employee' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="min-w-[120px] cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      if (sortField === 'opened_at') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('opened_at');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {t.openedAt}
                      {sortField === 'opened_at' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[120px]">{t.closedAt}</TableHead>
                  <TableHead className="min-w-[100px]">{t.duration}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.openingBalance}</TableHead>
                  <TableHead 
                    className="min-w-[100px] text-right cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      if (sortField === 'cash_sales') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('cash_sales');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.cashSales}
                      {sortField === 'cash_sales' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="min-w-[100px] text-right cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      if (sortField === 'card_sales') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('card_sales');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.cardSales}
                      {sortField === 'card_sales' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.expected}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.actual}</TableHead>
                  <TableHead 
                    className="min-w-[100px] text-right cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      if (sortField === 'difference') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('difference');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t.difference}
                      {sortField === 'difference' && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px]">{t.status}</TableHead>
                  <TableHead className="min-w-[80px] text-center">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-muted-foreground">{t.loading}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedAndFilteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-12 w-12 text-muted-foreground/20" />
                        <p className="text-muted-foreground">{t.noData}</p>
                        {hasActiveFilters && (
                          <Button variant="link" onClick={() => {
                            setGlobalSearch('');
                            setStatusFilter('all');
                            setDateFilter('all');
                            setStartHour('');
                            setEndHour('');
                            setMinAmount('');
                            setMaxAmount('');
                            setEmployeeFilter('');
                          }}>
                            {t.clearFilters}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAndFilteredShifts.map((shift: Shift) => (
                    <TableRow 
                      key={shift.id} 
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedShift(shift);
                        setShowDetails(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{shift.employee}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{formatDateTime(shift.opened_at)}</span>
                          <span className="text-xs text-muted-foreground">
                            <Timer size={10} className="inline mr-1" />
                            {formatTime(shift.opened_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDateTime(shift.closed_at)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {getShiftDuration(shift)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatNumber(shift.opening_balance)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium whitespace-nowrap">
                        {formatNumber(shift.cash_sales)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium whitespace-nowrap">
                        {formatNumber(shift.card_sales)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatNumber(shift.expected_amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatNumber(shift.actual_amount)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {getDifferenceBadge(shift.difference)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getStatusBadge(shift.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShift(shift);
                            setShowDetails(true);
                          }}
                        >
                          <Eye size={16} />
                        </Button>
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
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'إجمالي النتائج:' : 'Total Results:'}
                  </span>
                  <span className="font-bold text-lg">{sortedAndFilteredShifts.length}</span>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{t.openingBalance}:</span>
                    <span className="font-medium">
                      {formatNumber(sortedAndFilteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.opening_balance || '0'), 0))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-emerald-600" />
                    <span className="text-muted-foreground">{t.cashSales}:</span>
                    <span className="font-medium text-emerald-600">
                      {formatNumber(stats.filteredTotalCashSales)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-blue-600" />
                    <span className="text-muted-foreground">{t.cardSales}:</span>
                    <span className="font-medium text-blue-600">
                      {formatNumber(stats.filteredTotalCardSales)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-amber-600" />
                    <span className="text-muted-foreground">{t.difference}:</span>
                    <span className="font-medium">
                      {formatNumber(sortedAndFilteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.difference || '0'), 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Details Modal */}
      <Dialog open={showDetails} onOpenChange={() => setShowDetails(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-primary" />
              {t.shiftDetails}
            </DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              {/* Status Badge and ID */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedShift.status)}
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'رقم الوردية:' : 'Shift #:'} {selectedShift.id}
                </span>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <User size={12} />
                    {t.employee}
                  </p>
                  <p className="font-medium text-lg">{selectedShift.employee}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Clock size={12} />
                    {t.duration}
                  </p>
                  <p className="font-medium text-lg">{getShiftDuration(selectedShift)}</p>
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar size={12} />
                    {t.openedAt}
                  </p>
                  <p className="font-medium">{formatDateTime(selectedShift.opened_at)}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Timer size={10} />
                    {formatTime(selectedShift.opened_at)}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar size={12} />
                    {t.closedAt}
                  </p>
                  <p className="font-medium">{formatDateTime(selectedShift.closed_at)}</p>
                  {selectedShift.closed_at && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Timer size={10} />
                      {formatTime(selectedShift.closed_at)}
                    </p>
                  )}
                </div>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.openingBalance}</p>
                  <p className="text-xl font-bold text-primary">{formatNumber(selectedShift.opening_balance)}</p>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.cashSales}</p>
                  <p className="text-xl font-bold text-emerald-600">{formatNumber(selectedShift.cash_sales)}</p>
                </div>
                <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.cardSales}</p>
                  <p className="text-xl font-bold text-blue-600">{formatNumber(selectedShift.card_sales)}</p>
                </div>
              </div>

              {/* Expected vs Actual */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.expected}</p>
                  <p className="text-xl font-bold text-amber-600">{formatNumber(selectedShift.expected_amount)}</p>
                </div>
                <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.actual}</p>
                  <p className="text-xl font-bold text-purple-600">{formatNumber(selectedShift.actual_amount)}</p>
                </div>
                <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.difference}</p>
                  <p className={cn(
                    "text-xl font-bold",
                    parseFloat(selectedShift.difference || '0') > 0 ? "text-amber-600" :
                    parseFloat(selectedShift.difference || '0') < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {formatNumber(selectedShift.difference)}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {selectedShift.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {t.notes}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{selectedShift.notes}</p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setShowDetails(false)} className="min-w-[100px]">
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftsList;