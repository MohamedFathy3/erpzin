import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Wallet,
  TrendingUp,
  TrendingDown,
  Eye,
  Printer,
  Loader2,
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Search
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  // فلترة الورديات
  const filteredShifts = shifts.filter((shift: Shift) => {
    // فلتر البحث
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesEmployee = shift.employee?.toLowerCase().includes(searchLower);
      const matchesNotes = shift.notes?.toLowerCase().includes(searchLower);
      if (!matchesEmployee && !matchesNotes) return false;
    }

    // فلتر الحالة
    if (statusFilter !== 'all' && shift.status !== statusFilter) return false;

    return true;
  });

  // حساب الإحصائيات
  const stats = {
    totalShifts: shifts.length,
    openShifts: shifts.filter((s: Shift) => s.status === 'open').length,
    closedShifts: shifts.filter((s: Shift) => s.status === 'closed').length,
    totalCashSales: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.cash_sales || '0'), 0),
    totalCardSales: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.card_sales || '0'), 0),
    totalReturns: shifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.returns_amount || '0'), 0),
  };

  // تنسيق الأرقام
  const formatNumber = (value: string | number | null) => {
    if (value === null || value === undefined) return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // تنسيق التاريخ
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm', {
      locale: language === 'ar' ? ar : undefined
    });
  };

  // حساب المدة
  const getShiftDuration = (shift: Shift) => {
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
  };

  // Badge الحالة
  const getStatusBadge = (status: string) => {
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
  };

  // Badge الفرق
  const getDifferenceBadge = (diff: string | null) => {
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
  };

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
    search: language === 'ar' ? 'بحث...' : 'Search...',
    noData: language === 'ar' ? 'لا توجد ورديات' : 'No shifts found',
    viewDetails: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
    refresh: language === 'ar' ? 'تحديث' : 'Refresh',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    shiftDetails: language === 'ar' ? 'تفاصيل الوردية' : 'Shift Details',
    clearFilters: language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters',
    showFilters: language === 'ar' ? 'إظهار الفلاتر' : 'Show Filters',
    hideFilters: language === 'ar' ? 'إخفاء الفلاتر' : 'Hide Filters',
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all';

  return (
    <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground">{t.totalShifts}</p>
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

      {/* Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <Filter size={16} />
          {showFilters ? t.hideFilters : t.showFilters}
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {[searchTerm, statusFilter !== 'all' ? statusFilter : null].filter(Boolean).length}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={() => {
            setSearchTerm('');
            setStatusFilter('all');
          }} className="gap-2">
            <X size={14} />
            {t.clearFilters}
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchTerm('')}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t.all} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="open">{language === 'ar' ? 'مفتوحة' : 'Open'}</SelectItem>
                  <SelectItem value="closed">{language === 'ar' ? 'مغلقة' : 'Closed'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shifts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="min-w-[150px]">{t.employee}</TableHead>
                  <TableHead className="min-w-[120px]">{t.openedAt}</TableHead>
                  <TableHead className="min-w-[120px]">{t.closedAt}</TableHead>
                  <TableHead className="min-w-[100px]">{t.duration}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.openingBalance}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.cashSales}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.cardSales}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.expected}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.actual}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{t.difference}</TableHead>
                  <TableHead className="min-w-[100px]">{t.status}</TableHead>
                  <TableHead className="min-w-[80px] text-center">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">{t.loading}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      <Clock className="mx-auto h-12 w-12 mb-4 opacity-20" />
                      <p>{t.noData}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShifts.map((shift: Shift) => (
                    <TableRow key={shift.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => {
                      setSelectedShift(shift);
                      setShowDetails(true);
                    }}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground" />
                          <span className="font-medium">{shift.employee}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(shift.opened_at)}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(shift.closed_at)}</TableCell>
                      <TableCell className="text-sm">{getShiftDuration(shift)}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(shift.opening_balance)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">{formatNumber(shift.cash_sales)}</TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">{formatNumber(shift.card_sales)}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(shift.expected_amount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(shift.actual_amount)}</TableCell>
                      <TableCell className="text-right">{getDifferenceBadge(shift.difference)}</TableCell>
                      <TableCell>{getStatusBadge(shift.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
          {filteredShifts.length > 0 && (
            <div className="p-4 border-t bg-muted/20">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'إجمالي الورديات:' : 'Total Shifts:'}
                  </span>
                  <span className="font-bold">{filteredShifts.length}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{t.openingBalance}:</span>
                    <span className="font-medium">
                      {formatNumber(filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.opening_balance || '0'), 0))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-emerald-600" />
                    <span className="text-muted-foreground">{t.cashSales}:</span>
                    <span className="font-medium text-emerald-600">
                      {formatNumber(filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.cash_sales || '0'), 0))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-blue-600" />
                    <span className="text-muted-foreground">{t.cardSales}:</span>
                    <span className="font-medium text-blue-600">
                      {formatNumber(filteredShifts.reduce((sum: number, s: Shift) => sum + parseFloat(s.card_sales || '0'), 0))}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {t.shiftDetails}
            </DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedShift.status)}
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'رقم الوردية:' : 'Shift #:'} {selectedShift.id}
                </span>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User size={12} />
                    {t.employee}
                  </p>
                  <p className="font-medium">{selectedShift.employee}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={12} />
                    {t.duration}
                  </p>
                  <p className="font-medium">{getShiftDuration(selectedShift)}</p>
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{t.openedAt}</p>
                  <p className="font-medium">{formatDateTime(selectedShift.opened_at)}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{t.closedAt}</p>
                  <p className="font-medium">{formatDateTime(selectedShift.closed_at)}</p>
                </div>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.openingBalance}</p>
                  <p className="text-lg font-bold text-primary">{formatNumber(selectedShift.opening_balance)}</p>
                </div>
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.cashSales}</p>
                  <p className="text-lg font-bold text-emerald-600">{formatNumber(selectedShift.cash_sales)}</p>
                </div>
                <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.cardSales}</p>
                  <p className="text-lg font-bold text-blue-600">{formatNumber(selectedShift.card_sales)}</p>
                </div>
              </div>

              {/* Expected vs Actual */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.expected}</p>
                  <p className="text-lg font-bold text-amber-600">{formatNumber(selectedShift.expected_amount)}</p>
                </div>
                <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.actual}</p>
                  <p className="text-lg font-bold text-purple-600">{formatNumber(selectedShift.actual_amount)}</p>
                </div>
                <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                  <p className="text-xs text-muted-foreground mb-1">{t.difference}</p>
                  <p className={cn(
                    "text-lg font-bold",
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
                  <p className="text-sm">{selectedShift.notes}</p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
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