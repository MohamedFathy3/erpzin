import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, FileText, Check, X, Eye, Trash2, Search, 
  Edit, AlertCircle, Loader2, RefreshCw, Filter, Calendar,
  ChevronLeft, ChevronRight, BarChart3, PieChart, TrendingUp,
  Wallet, Landmark, Receipt, CreditCard, Download, Printer,
  Save
} from 'lucide-react';
import { format, parse, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// ==================== Types ====================
interface Account {
  id: number;
  code: string;
  name: string;
  name_ar: string | null;
  account_type: string;
  is_header: boolean;
}

interface JournalEntry {
  id: number;
  entry_date: string;
  description_ar: string | null;
  description_en: string | null;
  notes: string | null;
  status: 'draft' | 'posted' | 'cancelled' | 'paid';
  created_at: string;
  updated_at: string;
  total_debit: string;
  total_credit: string;
  reference_type?: string;
  reference_id?: number;
  entry_number?: string;
}

interface JournalEntryLine {
  id?: number;
  journal_entry_id?: number;
  account_id: number;
  debit: number;
  credit: number;
  description: string;
  account?: Account;
}

interface JournalEntryLineInput {
  account_id: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalEntryResponse {
  data: JournalEntry[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
  result: string;
  message: string;
  status: number;
}

interface JournalEntryLineResponse {
  data: JournalEntryLine[];
  result: string;
  message: string;
  status: number;
}

interface JournalEntryDetailResponse {
  result: string;
  data: JournalEntry;
  message: string;
  status: number;
}

interface JournalEntryPostResponse {
  result: string;
  message: string;
  data: JournalEntry;
  status: number;
}

interface AccountsResponse {
  data: Account[];
  result: string;
  message: string;
  status: number;
}

interface JournalEntryReport {
  total_entries: number;
  posted: number;
  drafts: number;
  cancelled: number;
  paid?: number;
  total_debit?: number;
  total_credit?: number;
}

interface JournalEntryStats {
  totalEntries: number;
  byStatus: {
    draft: number;
    posted: number;
    cancelled: number;
    paid: number;
  };
  byMonth: {
    month: string;
    count: number;
    total: number;
  }[];
  totalAmount: number;
  averagePerEntry: number;
  highestEntry: number;
  lowestEntry: number;
}

interface FormErrors {
  date?: string;
  lines?: string;
  balance?: string;
  accounts?: string;
}

// ==================== Constants ====================
const STATUS_CONFIG = {
  draft: {
    ar: 'مسودة',
    en: 'Draft',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200',
    icon: FileText,
    color: 'amber'
  },
  posted: {
    ar: 'مرحل',
    en: 'Posted',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200',
    icon: Check,
    color: 'green'
  },
  paid: {
    ar: 'مدفوع',
    en: 'Paid',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
    icon: CreditCard,
    color: 'emerald'
  },
  cancelled: {
    ar: 'ملغي',
    en: 'Cancelled',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200',
    icon: X,
    color: 'red'
  }
} as const;

const TRANSLATIONS = {
  status: {
    all: { ar: 'الكل', en: 'All' },
    draft: { ar: 'مسودة', en: 'Draft' },
    posted: { ar: 'مرحل', en: 'Posted' },
    paid: { ar: 'مدفوع', en: 'Paid' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' }
  },
  actions: {
    save: { ar: 'حفظ', en: 'Save' },
    cancel: { ar: 'إلغاء', en: 'Cancel' },
    delete: { ar: 'حذف', en: 'Delete' },
    edit: { ar: 'تعديل', en: 'Edit' },
    view: { ar: 'عرض', en: 'View' },
    post: { ar: 'ترحيل', en: 'Post' },
    reverse: { ar: 'عكس', en: 'Reverse' },
    markAsPaid: { ar: 'تحديد كمدفوع', en: 'Mark as Paid' }
  },
  messages: {
    required: { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
    minLines: { ar: 'يجب إضافة بندين على الأقل', en: 'At least 2 lines required' },
    notBalanced: { ar: 'القيد غير متوازن', en: 'Entry is not balanced' },
    confirmDelete: { ar: 'هل أنت متأكد من الحذف؟', en: 'Are you sure you want to delete?' },
    saved: { ar: 'تم الحفظ بنجاح', en: 'Saved successfully' },
    error: { ar: 'حدث خطأ', en: 'An error occurred' }
  }
} as const;

// ==================== Custom Hooks ====================
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

const useKeyboardShortcuts = (handlers: {
  onNew?: () => void;
  onSearch?: () => void;
  onClose?: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && handlers.onNew) {
        e.preventDefault();
        handlers.onNew();
      }
      
      if (e.key === 'Escape' && handlers.onClose) {
        handlers.onClose();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && handlers.onSearch) {
        e.preventDefault();
        handlers.onSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

// ==================== Main Component ====================
const JournalEntryManager: React.FC<{ language: string }> = ({ language }) => {
  const queryClient = useQueryClient();
  const isRTL = language === 'ar';
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // ==================== State ====================
  const [activeTab, setActiveTab] = useState('entries');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [reportPeriod, setReportPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState({
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    description_en: '',
    description_ar: '',
    notes: ''
  });
  
  const [lines, setLines] = useState<JournalEntryLineInput[]>([
    { account_id: '', debit: 0, credit: 0, description: '' },
    { account_id: '', debit: 0, credit: 0, description: '' }
  ]);

  // ==================== Translation Helper ====================
  const t = useCallback((ar: string, en: string) => isRTL ? ar : en, [isRTL]);
  
  const translate = useCallback((key: keyof typeof TRANSLATIONS, subKey: string) => {
    const section = TRANSLATIONS[key];
    if (section && subKey in section) {
      return isRTL ? section[subKey as keyof typeof section].ar : section[subKey as keyof typeof section].en;
    }
    return subKey;
  }, [isRTL]);

  // ==================== Debounced Search ====================
  const debouncedSearch = useDebounce(searchQuery, 500);

  // ==================== Keyboard Shortcuts ====================
  useKeyboardShortcuts({
    onNew: () => setShowForm(true),
    onSearch: () => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder*="بحث"]');
      input?.focus();
    },
    onClose: () => {
      setShowForm(false);
      setShowDetails(false);
    }
  });

  // ==================== Auto-save Draft ====================
  useEffect(() => {
    if (!showForm) return;
    
    const savedData = localStorage.getItem('journal-entry-draft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const draftAge = Date.now() - new Date(parsed.timestamp).getTime();
        if (draftAge < 24 * 60 * 60 * 1000) {
          setFormData(parsed.formData);
          setLines(parsed.lines);
          toast.info(t('تم استعادة مسودة محفوظة', 'Restored saved draft'));
        } else {
          localStorage.removeItem('journal-entry-draft');
        }
      } catch (error) {
        console.error('Failed to restore draft:', error);
      }
    }
  }, [showForm, t]);

  useEffect(() => {
    if (!showForm) return;
    
    const timer = setTimeout(() => {
      localStorage.setItem('journal-entry-draft', JSON.stringify({
        formData,
        lines,
        timestamp: new Date().toISOString()
      }));
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [formData, lines, showForm]);

  // ==================== Queries ====================
  // Fetch accounts from chart-of-accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery<AccountsResponse>({
    queryKey: ['chart-of-accounts-for-entries'],
    queryFn: async () => {
      const response = await api.get('/chart-of-accounts');
      return response.data;
    }
  });
  const accounts = accountsData?.data || [];

  // Fetch journal entries
  const { data: entriesResponse, isLoading: entriesLoading, refetch } = useQuery<JournalEntryResponse>({
    queryKey: ['journal-entries', currentPage, perPage, statusFilter, dateFrom, dateTo, debouncedSearch],
    queryFn: async () => {
      const filters: any = {};
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      if (dateFrom) {
        filters.date_from = dateFrom;
      }
      
      if (dateTo) {
        filters.date_to = dateTo;
      }

      if (debouncedSearch) {
        filters.search = debouncedSearch;
      }

      const response = await api.post('/journal-entries/index', {
        filters,
        orderBy: 'journal_entries.id',
        orderByDirection: 'desc',
        perPage,
        paginate: true
      });
      return response.data;
    }
  });

  const entries = entriesResponse?.data || [];
  const meta = entriesResponse?.meta || {
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
    from: 0,
    to: 0,
    path: ''
  };

  // Fetch journal entries report
  const { data: reportData, isLoading: reportLoading, refetch: refetchReport } = useQuery<JournalEntryReport>({
    queryKey: ['journal-entries-report', reportPeriod, dateFrom, dateTo],
    queryFn: async () => {
      let fromDate = dateFrom;
      let toDate = dateTo;
      
      if (!fromDate || !toDate) {
        const now = new Date();
        switch (reportPeriod) {
          case 'today':
            fromDate = format(now, 'yyyy-MM-dd');
            toDate = format(now, 'yyyy-MM-dd');
            break;
          case 'week':
            fromDate = format(subMonths(now, 1), 'yyyy-MM-dd');
            toDate = format(now, 'yyyy-MM-dd');
            break;
          case 'month':
            fromDate = format(startOfMonth(now), 'yyyy-MM-dd');
            toDate = format(endOfMonth(now), 'yyyy-MM-dd');
            break;
          case 'quarter':
            fromDate = format(subMonths(now, 3), 'yyyy-MM-dd');
            toDate = format(now, 'yyyy-MM-dd');
            break;
          case 'year':
            fromDate = format(subMonths(now, 12), 'yyyy-MM-dd');
            toDate = format(now, 'yyyy-MM-dd');
            break;
        }
      }

      const response = await api.get('/journal-entries/reports', {
        params: {
          date_from: fromDate,
          date_to: toDate
        }
      });
      return response.data;
    }
  });

  // Fetch entry lines for selected entry - باستخدام API جديد
  const { data: linesResponse, isLoading: linesLoading } = useQuery<JournalEntryLineResponse>({
    queryKey: ['journal-entry-lines', selectedEntry?.id],
    enabled: !!selectedEntry?.id && showDetails,
    queryFn: async () => {
      const response = await api.get(`/journal-entries/${selectedEntry!.id}`);
      return response.data;
    }
  });
  
  // ملاحظة: API /journal-entries/{id} بيرجع تفاصيل القيد مع البنود
  // هنفترض أن البنود موجودة في response.data.lines
  const entryLines = linesResponse?.data && 'lines' in linesResponse.data 
    ? (linesResponse.data as any).lines || [] 
    : [];

  // ==================== Mutations ====================
  const createMutation = useMutation({
    mutationFn: async () => {
      const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit), 0);

      const entryResponse = await api.post('/journal-entries', {
        entry_date: formData.entry_date,
        description_en: formData.description_en || null,
        description_ar: formData.description_ar || null,
        notes: formData.notes || null,
        status: 'draft',
        lines: lines
          .filter(l => l.account_id && (l.debit > 0 || l.credit > 0))
          .map(l => ({
            account_id: parseInt(l.account_id),
            debit: l.debit,
            credit: l.credit,
            description: l.description || null
          }))
      });

      return entryResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries-report'] });
      localStorage.removeItem('journal-entry-draft');
      toast.success(translate('messages', 'saved'));
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || translate('messages', 'error'));
    }
  });

  // Post mutation - باستخدام API جديد
  const postMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch<JournalEntryPostResponse>(`/journal-entries/${id}/post`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries-report'] });
      toast.success(data.message || t('تم ترحيل القيد بنجاح', 'Entry posted successfully'));
      setShowDetails(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post('/journal-entries/mark-as-paid', { id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries-report'] });
      toast.success(t('تم تحديث حالة الدفع بنجاح', 'Payment status updated successfully'));
      setShowDetails(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Reverse mutation
  const reverseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post('/journal-entries/reverse', { id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries-report'] });
      toast.success(t('تم عكس القيد بنجاح', 'Entry reversed successfully'));
      setShowDetails(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete('/journal-entries/delete', {
        data: { items: [id] }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries-report'] });
      toast.success(t('تم حذف القيد بنجاح', 'Entry deleted successfully'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // ==================== Validation ====================
  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = {};
    
    if (!formData.entry_date) {
      errors.date = translate('messages', 'required');
    }
    
    const validLines = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      errors.lines = translate('messages', 'minLines');
    }
    
    const hasAccounts = lines.some(l => l.account_id);
    if (!hasAccounts) {
      errors.accounts = t('يجب اختيار حساب واحد على الأقل', 'At least one account required');
    }
    
    const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.balance = translate('messages', 'notBalanced');
    }
    
    return errors;
  }, [formData.entry_date, lines, t, translate]);

  // ==================== Computed Values ====================
  const totalDebit = useMemo(() => 
    lines.reduce((sum, l) => sum + Number(l.debit), 0), [lines]);
  
  const totalCredit = useMemo(() => 
    lines.reduce((sum, l) => sum + Number(l.credit), 0), [lines]);
  
  const isBalanced = useMemo(() => 
    Math.abs(totalDebit - totalCredit) < 0.01, [totalDebit, totalCredit]);

  // FilteredEntries
  const filteredEntries = useMemo(() => {
    if (!debouncedSearch) return entries;
    
    const query = debouncedSearch.toLowerCase();
    return entries.filter(e =>
      e.id.toString().includes(query) ||
      e.description_en?.toLowerCase().includes(query) ||
      e.description_ar?.toLowerCase().includes(query)
    );
  }, [entries, debouncedSearch]);

  const stats: JournalEntryStats = useMemo(() => {
    const byStatus = {
      draft: entries.filter(e => e.status === 'draft').length,
      posted: entries.filter(e => e.status === 'posted').length,
      cancelled: entries.filter(e => e.status === 'cancelled').length,
      paid: entries.filter(e => e.status === 'paid').length
    };

    const amounts = entries.map(e => parseFloat(e.total_debit || '0'));
    const totalAmount = amounts.reduce((sum, val) => sum + val, 0);

    return {
      totalEntries: entries.length,
      byStatus,
      byMonth: [],
      totalAmount,
      averagePerEntry: entries.length > 0 ? totalAmount / entries.length : 0,
      highestEntry: amounts.length > 0 ? Math.max(...amounts) : 0,
      lowestEntry: amounts.length > 0 ? Math.min(...amounts) : 0
    };
  }, [entries]);

  // ==================== Helper Functions ====================
  const getStatusBadge = useCallback((status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
    return (
      <Badge className={cn(config.badge, 'gap-1')}>
        {config?.icon && <config.icon size={12} />}
        {t(config?.ar || status, config?.en || status)}
      </Badge>
    );
  }, [t]);

  const getDescription = useCallback((entry: JournalEntry) => {
    return t(entry.description_ar || entry.description_en || '', entry.description_en || '');
  }, [t]);

  const formatAmount = useCallback((amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd');
    } catch {
      return dateString;
    }
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd HH:mm');
    } catch {
      return dateString;
    }
  }, []);

  // ==================== Handlers ====================
  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setFormErrors({});
    setFormData({
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      description_en: '',
      description_ar: '',
      notes: ''
    });
    setLines([
      { account_id: '', debit: 0, credit: 0, description: '' },
      { account_id: '', debit: 0, credit: 0, description: '' }
    ]);
  }, []);

  const handleAddLine = useCallback(() => {
    setLines(prev => [...prev, { account_id: '', debit: 0, credit: 0, description: '' }]);
  }, []);

  const handleRemoveLine = useCallback((index: number) => {
    if (lines.length > 2) {
      setLines(prev => prev.filter((_, i) => i !== index));
    }
  }, [lines.length]);

  const handleLineChange = useCallback((index: number, field: keyof JournalEntryLineInput, value: any) => {
    setLines(prev => {
      const newLines = [...prev];
      newLines[index] = { ...newLines[index], [field]: value };
      
      if (field === 'debit' && value > 0) {
        newLines[index].credit = 0;
      } else if (field === 'credit' && value > 0) {
        newLines[index].debit = 0;
      }
      
      return newLines;
    });
    
    setFormErrors({});
  }, []);

  const handleSubmit = useCallback(() => {
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.values(errors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    createMutation.mutate();
  }, [validateForm, createMutation]);

  const handleViewEntry = useCallback((entry: JournalEntry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  }, []);

  const handleClearFilters = useCallback(() => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    queryClient.invalidateQueries({ queryKey: ['journal-entries-report'] });
    toast.success(t('تم تحديث البيانات', 'Data refreshed'));
  }, [queryClient, t]);

  const handleExport = useCallback(() => {
    try {
      const headers = ['ID', 'Date', 'Description', 'Debit', 'Credit', 'Status'];
      const data = filteredEntries.map(e => [
        e.id,
        formatDate(e.entry_date || e.created_at),
        getDescription(e),
        e.total_debit || '0',
        e.total_credit || '0',
        e.status
      ]);
      
      const csv = [headers, ...data].map(row => row.join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-entries-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(t('تم تصدير البيانات بنجاح', 'Data exported successfully'));
    } catch (error) {
      toast.error(t('حدث خطأ أثناء التصدير', 'Export failed'));
    }
  }, [filteredEntries, formatDate, getDescription, t]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ==================== Render ====================
  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="entries" className="gap-2">
                <FileText size={16} />
                {t('القيود', 'Entries')}
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <BarChart3 size={16} />
                {t('التقارير', 'Reports')}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <PieChart size={16} />
                {t('التحليلات', 'Analytics')}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleRefresh} title={t('تحديث', 'Refresh')}>
                <RefreshCw size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport} title={t('تصدير', 'Export')}>
                <Download size={18} />
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrint} title={t('طباعة', 'Print')}>
                <Printer size={18} />
              </Button>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus size={18} />
                {t('قيد جديد', 'New Entry')}
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-70">
                  <span className="text-xs">⌘</span>N
                </kbd>
              </Button>
            </div>
          </div>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className={cn(
                  "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
                  isRTL ? "right-3" : "left-3"
                )} size={18} />
                <Input
                  placeholder={t('بحث عن قيد...', 'Search entries...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(isRTL ? "pr-10" : "pl-10", "w-64")}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={t('الحالة', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{translate('status', 'all')}</SelectItem>
                  <SelectItem value="draft">{translate('status', 'draft')}</SelectItem>
                  <SelectItem value="posted">{translate('status', 'posted')}</SelectItem>
                  <SelectItem value="paid">{translate('status', 'paid')}</SelectItem>
                  <SelectItem value="cancelled">{translate('status', 'cancelled')}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36"
                  placeholder={t('من', 'From')}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36"
                  placeholder={t('إلى', 'To')}
                />
              </div>

              {(statusFilter !== 'all' || dateFrom || dateTo || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X size={16} className="me-1" />
                  {t('مسح', 'Clear')}
                </Button>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('إجمالي القيود', 'Total Entries')}</p>
                      <p className="text-2xl font-bold">{meta.total}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('المرحلة', 'Posted')}</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.byStatus.posted}
                      </p>
                    </div>
                    <Check className="h-8 w-8 text-green-600/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('المدفوعة', 'Paid')}</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {stats.byStatus.paid}
                      </p>
                    </div>
                    <CreditCard className="h-8 w-8 text-emerald-600/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('المسودات', 'Drafts')}</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {stats.byStatus.draft}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-amber-600/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('الملغية', 'Cancelled')}</p>
                      <p className="text-2xl font-bold text-red-600">
                        {stats.byStatus.cancelled}
                      </p>
                    </div>
                    <X className="h-8 w-8 text-red-600/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Entries Table */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText size={20} />
                  {t('القيود المحاسبية', 'Journal Entries')}
                  {entriesLoading && <Loader2 size={16} className="animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className={isMobile ? "h-[300px]" : "h-[500px]"}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">{t('#', '#')}</TableHead>
                        <TableHead className="w-28">{t('التاريخ', 'Date')}</TableHead>
                        <TableHead>{t('الوصف', 'Description')}</TableHead>
                        <TableHead className="text-right w-32">{t('مدين', 'Debit')}</TableHead>
                        <TableHead className="text-right w-32">{t('دائن', 'Credit')}</TableHead>
                        <TableHead className="text-center w-28">{t('الحالة', 'Status')}</TableHead>
                        <TableHead className="text-center w-24">{t('إجراءات', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entriesLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <Loader2 size={32} className="animate-spin mx-auto text-primary" />
                            <p className="mt-2 text-muted-foreground">{t('جاري التحميل...', 'Loading...')}</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <FileText size={32} className="mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">
                              {t('لا توجد قيود', 'No entries found')}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntries.map((entry) => (
                          <TableRow key={entry.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono font-medium">
                              {String(entry.id).padStart(4, '0')}
                            </TableCell>
                            <TableCell>{formatDate(entry.entry_date || entry.created_at)}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {getDescription(entry)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmount(entry.total_debit || '0')}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmount(entry.total_credit || '0')}
                            </TableCell>
                            <TableCell className="text-center">{getStatusBadge(entry.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewEntry(entry)}
                                  title={t('عرض', 'View')}
                                >
                                  <Eye size={16} />
                                </Button>
                                {entry.status === 'draft' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      if (confirm(translate('messages', 'confirmDelete'))) {
                                        deleteMutation.mutate(entry.id);
                                      }
                                    }}
                                    title={t('حذف', 'Delete')}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>

              {/* Pagination */}
              {meta.last_page > 1 && (
                <CardContent className="border-t py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(parseInt(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        {t('عرض', 'Showing')} {meta.from || 0} {t('إلى', 'to')} {meta.to || 0} {t('من', 'of')} {meta.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        {t('السابق', 'Previous')}
                      </Button>
                      <span className="text-sm">
                        {currentPage} / {meta.last_page}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(meta.last_page, prev + 1))}
                        disabled={currentPage === meta.last_page}
                      >
                        {t('التالي', 'Next')}
                        {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={reportPeriod} onValueChange={(v: any) => setReportPeriod(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t('اليوم', 'Today')}</SelectItem>
                  <SelectItem value="week">{t('آخر أسبوع', 'Last Week')}</SelectItem>
                  <SelectItem value="month">{t('هذا الشهر', 'This Month')}</SelectItem>
                  <SelectItem value="quarter">{t('آخر 3 أشهر', 'Last Quarter')}</SelectItem>
                  <SelectItem value="year">{t('آخر سنة', 'Last Year')}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36"
                />
                <span>-</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36"
                />
              </div>

              <Button onClick={() => refetchReport()} variant="outline">
                <RefreshCw size={16} className="me-2" />
                {t('تحديث', 'Refresh')}
              </Button>
            </div>

            {reportLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <FileText className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('إجمالي القيود', 'Total Entries')}</p>
                        <p className="text-3xl font-bold">{reportData?.total_entries || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('المرحلة', 'Posted')}</p>
                        <p className="text-3xl font-bold">{reportData?.posted || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50">
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <CreditCard className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('المدفوعة', 'Paid')}</p>
                        <p className="text-3xl font-bold">{reportData?.paid || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/10 rounded-lg">
                        <FileText className="h-8 w-8 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('المسودات', 'Drafts')}</p>
                        <p className="text-3xl font-bold">{reportData?.drafts || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 size={20} />
                  {t('تقرير تفصيلي', 'Detailed Report')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('التاريخ', 'Date')}</TableHead>
                        <TableHead>{t('رقم القيد', 'Entry #')}</TableHead>
                        <TableHead>{t('الوصف', 'Description')}</TableHead>
                        <TableHead className="text-right">{t('المدين', 'Debit')}</TableHead>
                        <TableHead className="text-right">{t('الدائن', 'Credit')}</TableHead>
                        <TableHead className="text-center">{t('الحالة', 'Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.slice(0, 10).map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDate(entry.entry_date || entry.created_at)}</TableCell>
                          <TableCell className="font-mono">{String(entry.id).padStart(4, '0')}</TableCell>
                          <TableCell className="max-w-xs truncate">{getDescription(entry)}</TableCell>
                          <TableCell className="text-right">{formatAmount(entry.total_debit || '0')}</TableCell>
                          <TableCell className="text-right">{formatAmount(entry.total_credit || '0')}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(entry.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart size={20} />
                    {t('توزيع الحالات', 'Status Distribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.byStatus).map(([status, count]) => {
                      const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                      const percentage = stats.totalEntries > 0 
                        ? ((count / stats.totalEntries) * 100).toFixed(1) 
                        : '0';
                      
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              {config?.icon && <config.icon size={16} className={`text-${config.color}-600`} />}
                              <span>{t(config?.ar || status, config?.en || status)}</span>
                            </div>
                            <span className="font-bold">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-${config?.color}-600`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp size={20} />
                    {t('إحصائيات عامة', 'General Statistics')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span>{t('إجمالي المبالغ', 'Total Amount')}</span>
                      <span className="font-bold text-lg">{formatAmount(stats.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span>{t('متوسط القيد', 'Average per Entry')}</span>
                      <span className="font-bold text-lg">{formatAmount(stats.averagePerEntry)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span>{t('أعلى قيد', 'Highest Entry')}</span>
                      <span className="font-bold text-lg">{formatAmount(stats.highestEntry)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span>{t('أدنى قيد', 'Lowest Entry')}</span>
                      <span className="font-bold text-lg">{formatAmount(stats.lowestEntry)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Entry Dialog */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              {t('قيد محاسبي جديد', 'New Journal Entry')}
              {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 px-1">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar size={14} />
                    {t('التاريخ', 'Date')}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                    className={formErrors.date ? 'border-red-500' : ''}
                  />
                  {formErrors.date && (
                    <p className="text-xs text-red-500">{formErrors.date}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('الوصف (إنجليزي)', 'Description (EN)')}</Label>
                  <Input
                    value={formData.description_en}
                    onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                    placeholder={t('وصف القيد بالإنجليزية', 'Entry description in English')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('الوصف (عربي)', 'Description (AR)')}</Label>
                  <Input
                    value={formData.description_ar}
                    onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
                    dir="rtl"
                    placeholder={t('وصف القيد بالعربية', 'Entry description in Arabic')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    {t('بنود القيد', 'Entry Lines')}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                    <Plus size={16} className="me-1" />
                    {t('إضافة بند', 'Add Line')}
                  </Button>
                </div>
                
                {formErrors.lines && (
                  <p className="text-xs text-red-500">{formErrors.lines}</p>
                )}
                
                {formErrors.accounts && (
                  <p className="text-xs text-red-500">{formErrors.accounts}</p>
                )}
                
                {formErrors.balance && (
                  <p className="text-xs text-red-500">{formErrors.balance}</p>
                )}
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[35%]">{t('الحساب', 'Account')}</TableHead>
                          <TableHead className="w-[15%] text-center">{t('مدين', 'Debit')}</TableHead>
                          <TableHead className="w-[15%] text-center">{t('دائن', 'Credit')}</TableHead>
                          <TableHead className="w-[30%]">{t('البيان', 'Description')}</TableHead>
                          <TableHead className="w-[5%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Select
                                value={line.account_id}
                                onValueChange={(v) => handleLineChange(index, 'account_id', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('اختر حساب', 'Select account')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {accountsLoading ? (
                                    <div className="p-2 text-center">
                                      <Loader2 size={16} className="animate-spin mx-auto" />
                                    </div>
                                  ) : (
                                    accounts.map(acc => (
                                      <SelectItem key={acc.id} value={acc.id.toString()}>
                                        <span className="font-mono text-muted-foreground me-2">{acc.code}</span>
                                        {t(acc.name_ar || acc.name, acc.name)}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.debit || ''}
                                onChange={(e) => handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)}
                                className="text-center"
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.credit || ''}
                                onChange={(e) => handleLineChange(index, 'credit', parseFloat(e.target.value) || 0)}
                                className="text-center"
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={line.description}
                                onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                placeholder={t('وصف البند', 'Line description')}
                              />
                            </TableCell>
                            <TableCell>
                              {lines.length > 2 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleRemoveLine(index)}
                                >
                                  <X size={16} />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className={cn(
                    "p-3 border-t bg-muted/30 flex flex-wrap items-center gap-4",
                    isRTL ? "flex-row-reverse" : ""
                  )}>
                    <span className="font-bold">{t('الإجمالي:', 'Total:')}</span>
                    <span className="font-bold text-green-600">
                      {t('مدين:', 'Debit:')} {totalDebit.toLocaleString()}
                    </span>
                    <span className="font-bold text-red-600">
                      {t('دائن:', 'Credit:')} {totalCredit.toLocaleString()}
                    </span>
                    {isBalanced ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Check size={12} className="me-1" />
                        {t('متوازن', 'Balanced')}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertCircle size={12} className="me-1" />
                        {t('غير متوازن', 'Not Balanced')} ({Math.abs(totalDebit - totalCredit).toLocaleString()})
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('ملاحظات', 'Notes')}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder={t('أضف ملاحظات إضافية...', 'Add additional notes...')}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 gap-2">
            <Button variant="outline" onClick={handleCloseForm}>
              {translate('actions', 'cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || accountsLoading}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {translate('actions', 'save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Details Dialog */}
      <Dialog open={showDetails} onOpenChange={() => setShowDetails(false)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              {t('تفاصيل القيد', 'Entry Details')} - {selectedEntry && String(selectedEntry.id).padStart(4, '0')}
              {linesLoading && <Loader2 size={16} className="animate-spin" />}
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="flex-1 overflow-y-auto min-h-0 px-1">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('رقم القيد', 'Entry #')}</p>
                    <p className="font-mono font-medium">{String(selectedEntry.id).padStart(4, '0')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('التاريخ', 'Date')}</p>
                    <p className="font-medium">{formatDate(selectedEntry.entry_date || selectedEntry.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('الحالة', 'Status')}</p>
                    <div className="mt-1">{getStatusBadge(selectedEntry.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('تاريخ الإنشاء', 'Created')}</p>
                    <p className="text-sm">{formatDateTime(selectedEntry.created_at)}</p>
                  </div>
                </div>

                {(selectedEntry.description_en || selectedEntry.description_ar) && (
                  <div className="p-4 bg-muted/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">{t('الوصف', 'Description')}</p>
                    <p className="font-medium">
                      {t(selectedEntry.description_ar || selectedEntry.description_en || '', selectedEntry.description_en || '')}
                    </p>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>{t('الحساب', 'Account')}</TableHead>
                        <TableHead className="text-right w-32">{t('مدين', 'Debit')}</TableHead>
                        <TableHead className="text-right w-32">{t('دائن', 'Credit')}</TableHead>
                        <TableHead>{t('البيان', 'Description')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linesLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <Loader2 size={24} className="animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : entryLines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t('لا توجد بنود', 'No lines found')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        entryLines.map((line: any, index: number) => (
                          <TableRow key={line.id || index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-muted-foreground">
                                  {line.account?.code}
                                </span>
                                <span>
                                  {t(line.account?.name_ar || line.account?.name, line.account?.name)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {Number(line.debit) > 0 ? formatAmount(line.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {Number(line.credit) > 0 ? formatAmount(line.credit) : '-'}
                            </TableCell>
                            <TableCell>{line.description || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell>{t('الإجمالي', 'Total')}</TableCell>
                        <TableCell className="text-right">
                          {formatAmount(selectedEntry.total_debit || '0')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(selectedEntry.total_credit || '0')}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {selectedEntry.notes && (
                  <div className="p-4 bg-muted/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">{t('ملاحظات', 'Notes')}</p>
                    <p>{selectedEntry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 border-t pt-4 gap-2">
            {selectedEntry?.status === 'draft' && (
              <>
                <Button
                  onClick={() => postMutation.mutate(selectedEntry.id)}
                  disabled={postMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {postMutation.isPending && <Loader2 size={16} className="animate-spin me-2" />}
                  <Check size={16} className="me-2" />
                  {translate('actions', 'post')}
                </Button>
              </>
            )}
            {selectedEntry?.status === 'posted' && (
              <>
                <Button
                  onClick={() => markAsPaidMutation.mutate(selectedEntry.id)}
                  disabled={markAsPaidMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {markAsPaidMutation.isPending && <Loader2 size={16} className="animate-spin me-2" />}
                  <CreditCard size={16} className="me-2" />
                  {translate('actions', 'markAsPaid')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => reverseMutation.mutate(selectedEntry.id)}
                  disabled={reverseMutation.isPending}
                >
                  {reverseMutation.isPending && <Loader2 size={16} className="animate-spin me-2" />}
                  <X size={16} className="me-2" />
                  {translate('actions', 'reverse')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JournalEntryManager;