import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Plus, 
  Wallet, 
  Building2, 
  Edit, 
  Trash2, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Coins,
  Star,
  History,
  X,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface TreasuryBankManagerProps {
  language: string;
}

// ========== الأنواع المحدثة ==========
interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  exchange_rate: string;
  active: boolean;
  default: boolean;
}

interface Branch {
  id: number;
  name: string;
  code: string;
  phone: string;
  address: string;
  manager: string;
  active: boolean;
  main_branch: boolean;
}

interface TreasuryBalance {
  currency_id: number;
  balance: number;
  is_main: boolean;
  balance_formatted?: string;
  currency?: Currency;
}

interface Treasury {
  id: number;
  name: string;
  code: string;
  branch_id: number;
  branch: Branch;
  currencies: TreasuryBalance[];
  is_main: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  // للتوافق مع القديم
  currency?: number;
  balance?: number;
  total_balance: number;
}

interface Bank {
  id: number;
  name: string;
  name_ar?: string;
  account_number?: string;
  iban?: string;
  swift_code?: string;
  branch_id?: number;
  branch?: Branch;
  balance: number;
  currency: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  notes?: string;
}

interface Movement {
  id: number;
  type: string;
  from: {
    treasury: string | null;
    bank: string | null;
  };
  to: {
    treasury: string | null;
    bank: string | null;
  };
  amount: string;
  currency: string;
  notes: string;
  date: string;
}

interface MovementResponse {
  data: Movement[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface TreasuryResponse {
  data: Treasury[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

const TreasuryBankManager: React.FC<TreasuryBankManagerProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('treasuries');
  const [showTreasuryForm, setShowTreasuryForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<'treasury' | 'bank'>('treasury');
  const [updatingMainId, setUpdatingMainId] = useState<number | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Treasury Form State
  const [treasuryForm, setTreasuryForm] = useState({
    name: '',
    code: '',
    branch_id: '',
    currencies: [] as { currency_id: number; balance: number; is_main: boolean }[],
    notes: ''
  });

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    name: '',
    name_ar: '',
    account_number: '',
    iban: '',
    swift_code: '',
    branch_id: '',
    balance: '',
    currency: '',
    contact_person: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Transaction Form State
  const [transactionForm, setTransactionForm] = useState({
    entity_id: '',
    transaction_type: 'deposit',
    amount: '',
    currency: '',
    description: ''
  });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    type: 'treasury_to_treasury',
    from_treasury_id: '',
    to_treasury_id: '',
    from_bank_id: '',
    to_bank_id: '',
    amount: '',
    currency: '',
    notes: ''
  });

  // Currency selector modal
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [tempCurrency, setTempCurrency] = useState<{ currency_id: number; balance: number }>({
    currency_id: 0,
    balance: 0
  });

  // ========== Fetch Data ==========
  const { data: currenciesData } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await api.post('/currency/index', {
        filters: { active: true },
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: true
      });
      return response.data.data || [];
    }
  });
  const currencies = currenciesData || [];

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.post('/branch/index', {
        filters: { active: true },
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: true
      });
      return response.data.data || [];
    }
  });
  const branches = branchesData || [];

  // Fetch treasuries
  const { data: treasuriesResponse, isLoading: loadingTreasuries } = useQuery({
    queryKey: ['treasuries'],
    queryFn: async () => {
      const response = await api.post('/treasury/index', {
        filters: {},
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: true
      });
      return response.data as TreasuryResponse;
    }
  });
  const treasuries = treasuriesResponse?.data || [];

  // Fetch banks
  const { data: banksData, isLoading: loadingBanks } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const response = await api.post('/bank/index', {
        filters: {},
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: true
      });
      return response.data.data || [];
    }
  });
  const banks = banksData || [];

  // Fetch movements
  const { data: treasuryMovementsData, isLoading: loadingTreasuryMovements } = useQuery({
    queryKey: ['treasury-movements', currentPage, perPage],
    queryFn: async () => {
      const response = await api.post('/treasury-movement/index', {
        filters: {},
        orderBy: 'date',
        orderByDirection: 'desc',
        perPage: perPage,
        paginate: true
      });
      return response.data as MovementResponse;
    }
  });
  const treasuryMovements = treasuryMovementsData?.data || [];
  const treasuryMovementsMeta = treasuryMovementsData?.meta || {};

  const { data: bankMovementsData, isLoading: loadingBankMovements } = useQuery({
    queryKey: ['bank-movements', currentPage, perPage],
    queryFn: async () => {
      const response = await api.post('/bank-movement/index', {
        filters: {},
        orderBy: 'date',
        orderByDirection: 'desc',
        perPage: perPage,
        paginate: true
      });
      return response.data as MovementResponse;
    }
  });
  const bankMovements = bankMovementsData?.data || [];
  const bankMovementsMeta = bankMovementsData?.meta || {};

  // ========== Mutations ==========
  const updateTreasuryColumnMutation = useMutation({
    mutationFn: async ({ id, column, value }: { id: number; column: string; value: any }) => {
      const response = await api.put(`/treasury/${id}`, {
        [column]: value
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  const updateBankColumnMutation = useMutation({
    mutationFn: async ({ id, column, value }: { id: number; column: string; value: any }) => {
      const response = await api.put(`/bank/${id}/${column}`, {
        [column]: value
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Treasury mutations
  const createTreasuryMutation = useMutation({
    mutationFn: async (data: typeof treasuryForm) => {
      // تجهيز البيانات للـ API
      const payload: any = {
        name: data.name,
        code: data.code || null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null,
        notes: data.notes || null
      };

      // إضافة العملات
      if (data.currencies.length > 0) {
        payload.currencies = data.currencies;
        
        // تحديد is_main من أول عملة
        payload.is_main = data.currencies[0].is_main;
      }

      const response = await api.post('/treasury', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      toast.success(language === 'ar' ? 'تم إضافة الخزينة بنجاح' : 'Treasury added successfully');
      handleCloseTreasuryForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  const updateTreasuryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof treasuryForm }) => {
      const payload: any = {
        name: data.name,
        code: data.code || null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null,
        notes: data.notes || null
      };

      if (data.currencies.length > 0) {
        payload.currencies = data.currencies;
        payload.is_main = data.currencies[0].is_main;
      }

      const response = await api.put(`/treasury/update/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      toast.success(language === 'ar' ? 'تم تحديث الخزينة بنجاح' : 'Treasury updated successfully');
      handleCloseTreasuryForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  const deleteTreasuryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete('/treasury/delete', {
        data: { items: [id] }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      toast.success(language === 'ar' ? 'تم حذف الخزينة' : 'Treasury deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Bank mutations (زي ما هما)
  const createBankMutation = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      const response = await api.post('/bank', {
        name: data.name,
        name_ar: data.name_ar || null,
        account_number: data.account_number || null,
        iban: data.iban || null,
        swift_code: data.swift_code || null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null,
        balance: parseFloat(data.balance) || 0,
        currency: data.currency,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success(language === 'ar' ? 'تم إضافة البنك بنجاح' : 'Bank added successfully');
      handleCloseBankForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  const updateBankMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof bankForm }) => {
      const response = await api.put(`/bank/update/${id}`, {
        name: data.name,
        name_ar: data.name_ar || null,
        account_number: data.account_number || null,
        iban: data.iban || null,
        swift_code: data.swift_code || null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null,
        currency: data.currency,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success(language === 'ar' ? 'تم تحديث البنك بنجاح' : 'Bank updated successfully');
      handleCloseBankForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  const deleteBankMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete('/bank/delete', {
        data: { items: [id] }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success(language === 'ar' ? 'تم حذف البنك' : 'Bank deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof transactionForm & { type: 'treasury' | 'bank' }) => {
      const amount = parseFloat(data.amount);

      if (data.type === 'treasury') {
        const response = await api.post('/transfer', {
          type: data.transaction_type === 'deposit' ? 'treasury_deposit' : 'treasury_withdraw',
          to_treasury_id: data.transaction_type === 'deposit' ? parseInt(data.entity_id) : undefined,
          from_treasury_id: data.transaction_type === 'withdrawal' ? parseInt(data.entity_id) : undefined,
          amount: amount,
          currency: data.currency,
          notes: data.description || null
        });
        return response.data;
      } else {
        const response = await api.post('/transfer', {
          type: data.transaction_type === 'deposit' ? 'bank_deposit' : 'bank_withdraw',
          to_bank_id: data.transaction_type === 'deposit' ? parseInt(data.entity_id) : undefined,
          from_bank_id: data.transaction_type === 'withdrawal' ? parseInt(data.entity_id) : undefined,
          amount: amount,
          currency: data.currency,
          notes: data.description || null
        });
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-movements'] });
      queryClient.invalidateQueries({ queryKey: ['bank-movements'] });
      toast.success(language === 'ar' ? 'تم تسجيل الحركة بنجاح' : 'Transaction recorded successfully');
      handleCloseTransactionForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: typeof transferForm) => {
      const payload: any = {
        type: data.type,
        amount: parseFloat(data.amount),
        currency: data.currency,
        notes: data.notes || null
      };

      if (data.type === 'treasury_to_treasury') {
        payload.from_treasury_id = parseInt(data.from_treasury_id);
        payload.to_treasury_id = parseInt(data.to_treasury_id);
      } else if (data.type === 'treasury_to_bank') {
        payload.from_treasury_id = parseInt(data.from_treasury_id);
        payload.to_bank_id = parseInt(data.to_bank_id);
      } else if (data.type === 'bank_to_treasury') {
        payload.from_bank_id = parseInt(data.from_bank_id);
        payload.to_treasury_id = parseInt(data.to_treasury_id);
      } else if (data.type === 'bank_to_bank') {
        payload.from_bank_id = parseInt(data.from_bank_id);
        payload.to_bank_id = parseInt(data.to_bank_id);
      }

      const response = await api.post('/transfer', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-movements'] });
      queryClient.invalidateQueries({ queryKey: ['bank-movements'] });
      toast.success(language === 'ar' ? 'تم التحويل بنجاح' : 'Transfer completed successfully');
      handleCloseTransferForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // ========== Helper Functions ==========
  const handleMainTreasuryToggle = async (treasury: Treasury) => {
    try {
      setUpdatingMainId(treasury.id);
      
      const newMainStatus = !treasury.is_main;
      
      // لو بنغير main من treasury
      if (treasury.currencies && treasury.currencies.length > 0) {
        // نحدث أول عملة عشان تبقى main أو لا
        const updatedCurrencies = treasury.currencies.map((curr, index) => ({
          ...curr,
          is_main: index === 0 ? newMainStatus : false
        }));

        await updateTreasuryMutation.mutateAsync({
          id: treasury.id,
          data: {
            name: treasury.name,
            code: treasury.code,
            branch_id: treasury.branch_id.toString(),
            currencies: updatedCurrencies.map(c => ({
              currency_id: c.currency_id,
              balance: c.balance,
              is_main: c.is_main
            })),
            notes: treasury.notes
          }
        });
      } else {
        await updateTreasuryColumnMutation.mutateAsync({
          id: treasury.id,
          column: 'is_main',
          value: newMainStatus
        });
      }
      
      toast.success(
        language === 'ar' 
          ? newMainStatus ? 'تم تعيين الخزينة كرئيسية' : 'تم إلغاء تعيين الخزينة كرئيسية'
          : newMainStatus ? 'Treasury set as main' : 'Treasury unset as main'
      );
      
    } catch (error) {
      console.error('Error updating main treasury:', error);
    } finally {
      setUpdatingMainId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '-';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return format(date, 'yyyy/MM/dd HH:mm');
    } catch {
      return dateString || '-';
    }
  };

  const formatAmount = (amount: string | number) => {
    try {
      return Number(amount).toLocaleString();
    } catch {
      return String(amount);
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, { ar: string, en: string }> = {
      'treasury_to_treasury': { ar: 'خزينة → خزينة', en: 'Treasury → Treasury' },
      'treasury_to_bank': { ar: 'خزينة → بنك', en: 'Treasury → Bank' },
      'bank_to_treasury': { ar: 'بنك → خزينة', en: 'Bank → Treasury' },
      'bank_to_bank': { ar: 'بنك → بنك', en: 'Bank → Bank' },
      'treasury_deposit': { ar: 'إيداع خزينة', en: 'Treasury Deposit' },
      'treasury_withdraw': { ar: 'سحب خزينة', en: 'Treasury Withdrawal' },
      'bank_deposit': { ar: 'إيداع بنك', en: 'Bank Deposit' },
      'bank_withdraw': { ar: 'سحب بنك', en: 'Bank Withdrawal' }
    };
    return types[type]?.[language === 'ar' ? 'ar' : 'en'] || type;
  };

  const getMovementSource = (movement: Movement) => {
    if (movement.from.treasury) return movement.from.treasury;
    if (movement.from.bank) return movement.from.bank;
    return '-';
  };

  const getMovementDestination = (movement: Movement) => {
    if (movement.to.treasury) return movement.to.treasury;
    if (movement.to.bank) return movement.to.bank;
    return '-';
  };

  const getCurrencySymbol = (currencyCode: string | number) => {
    if (typeof currencyCode === 'number') {
      const currency = currencies.find((c: Currency) => c.id === currencyCode);
      return currency?.symbol || currencyCode.toString();
    }
    const currency = currencies.find((c: Currency) => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const getCurrencyName = (currencyId: number) => {
    const currency = currencies.find((c: Currency) => c.id === currencyId);
    return currency ? `${currency.code} - ${currency.name}` : `ID: ${currencyId}`;
  };

  const getTotalTreasuryBalance = () => {
    return treasuries.reduce((sum: number, t: Treasury) => sum + (t.total_balance || 0), 0);
  };

  const getTotalBankBalance = () => {
    return banks.reduce((sum: number, b: Bank) => sum + Number(b.balance || 0), 0);
  };

  const totalTreasuryBalance = getTotalTreasuryBalance();
  const totalBankBalance = getTotalBankBalance();

  // ========== Form Handlers ==========
  const handleCloseTreasuryForm = () => {
    setShowTreasuryForm(false);
    setEditingItem(null);
    setTreasuryForm({ 
      name: '', 
      code: '', 
      branch_id: '', 
      currencies: [],
      notes: '' 
    });
  };

  const handleCloseBankForm = () => {
    setShowBankForm(false);
    setEditingItem(null);
    setBankForm({ 
      name: '', 
      name_ar: '', 
      account_number: '', 
      iban: '', 
      swift_code: '', 
      branch_id: '', 
      balance: '', 
      currency: currencies.find((c: Currency) => c.default)?.code || 'YER', 
      contact_person: '', 
      phone: '', 
      address: '', 
      notes: '' 
    });
  };

  const handleCloseTransactionForm = () => {
    setShowTransactionForm(false);
    setTransactionForm({ 
      entity_id: '', 
      transaction_type: 'deposit', 
      amount: '', 
      currency: currencies.find((c: Currency) => c.default)?.code || 'YER', 
      description: '' 
    });
  };

  const handleCloseTransferForm = () => {
    setShowTransferForm(false);
    setTransferForm({ 
      type: 'treasury_to_treasury', 
      from_treasury_id: '', 
      to_treasury_id: '', 
      from_bank_id: '', 
      to_bank_id: '', 
      amount: '', 
      currency: currencies.find((c: Currency) => c.default)?.code || 'YER', 
      notes: '' 
    });
  };

  const handleEditTreasury = (treasury: Treasury) => {
    setEditingItem(treasury);
    
    // تحويل العملات من شكل API لشكل الفورم
    const currencies = treasury.currencies?.map(c => ({
      currency_id: c.currency_id,
      balance: c.balance,
      is_main: c.is_main
    })) || [];
    
    setTreasuryForm({
      name: treasury.name,
      code: treasury.code || '',
      branch_id: treasury.branch_id?.toString() || '',
      currencies: currencies,
      notes: treasury.notes || ''
    });
    setShowTreasuryForm(true);
  };

  const handleEditBank = (bank: Bank) => {
    setEditingItem(bank);
    setBankForm({
      name: bank.name,
      name_ar: bank.name_ar || '',
      account_number: bank.account_number || '',
      iban: bank.iban || '',
      swift_code: bank.swift_code || '',
      branch_id: bank.branch_id?.toString() || '',
      balance: bank.balance?.toString() || '0',
      currency: bank.currency || currencies.find((c: Currency) => c.default)?.code || 'YER',
      contact_person: bank.contact_person || '',
      phone: bank.phone || '',
      address: bank.address || '',
      notes: bank.notes || ''
    });
    setShowBankForm(true);
  };

  const handleAddCurrency = () => {
    if (!tempCurrency.currency_id) {
      toast.error(language === 'ar' ? 'يرجى اختيار العملة' : 'Please select currency');
      return;
    }

    // التأكد من عدم تكرار العملة
    const exists = treasuryForm.currencies.some(c => c.currency_id === tempCurrency.currency_id);
    if (exists) {
      toast.error(language === 'ar' ? 'العملة موجودة بالفعل' : 'Currency already exists');
      return;
    }

    const newCurrencies = [
      ...treasuryForm.currencies,
      {
        currency_id: tempCurrency.currency_id,
        balance: tempCurrency.balance,
        is_main: treasuryForm.currencies.length === 0 // أول عملة تكون main
      }
    ];

    setTreasuryForm(prev => ({ ...prev, currencies: newCurrencies }));
    setTempCurrency({ currency_id: 0, balance: 0 });
    setShowCurrencySelector(false);
  };

  const handleRemoveCurrency = (currencyId: number) => {
    const newCurrencies = treasuryForm.currencies.filter(c => c.currency_id !== currencyId);
    
    // لو شلنا العملة الرئيسية، نخلي أول وحدة main
    if (newCurrencies.length > 0 && !newCurrencies.some(c => c.is_main)) {
      newCurrencies[0].is_main = true;
    }
    
    setTreasuryForm(prev => ({ ...prev, currencies: newCurrencies }));
  };

  const handleCurrencyBalanceChange = (currencyId: number, balance: number) => {
    const newCurrencies = treasuryForm.currencies.map(c => 
      c.currency_id === currencyId ? { ...c, balance } : c
    );
    setTreasuryForm(prev => ({ ...prev, currencies: newCurrencies }));
  };

  const handleTreasurySubmit = () => {
    if (!treasuryForm.name || !treasuryForm.branch_id) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    if (treasuryForm.currencies.length === 0) {
      toast.error(language === 'ar' ? 'يرجى إضافة عملة واحدة على الأقل' : 'Please add at least one currency');
      return;
    }

    if (editingItem) {
      updateTreasuryMutation.mutate({ id: editingItem.id, data: treasuryForm });
    } else {
      createTreasuryMutation.mutate(treasuryForm);
    }
  };

  const openTransactionForm = (type: 'treasury' | 'bank') => {
    setTransactionType(type);
    setShowTransactionForm(true);
  };

  const updateTransferFormByType = (type: string) => {
    setTransferForm({
      type,
      from_treasury_id: '',
      to_treasury_id: '',
      from_bank_id: '',
      to_bank_id: '',
      amount: '',
      currency: currencies.find((c: Currency) => c.default)?.code || 'YER',
      notes: ''
    });
  };

  const getTransferFromOptions = () => {
    if (transferForm.type === 'treasury_to_treasury' || transferForm.type === 'treasury_to_bank') {
      return treasuries;
    }
    return banks;
  };

  const getTransferToOptions = () => {
    if (transferForm.type === 'treasury_to_treasury') {
      return treasuries.filter((t: Treasury) => 
        t.id.toString() !== transferForm.from_treasury_id
      );
    } else if (transferForm.type === 'treasury_to_bank') {
      return banks;
    } else if (transferForm.type === 'bank_to_treasury') {
      return treasuries;
    } else if (transferForm.type === 'bank_to_bank') {
      return banks.filter((b: Bank) => 
        b.id.toString() !== transferForm.from_bank_id
      );
    }
    return [];
  };

  // Reset from fields when type changes
  useEffect(() => {
    setTransferForm(prev => ({
      ...prev,
      from_treasury_id: '',
      to_treasury_id: '',
      from_bank_id: '',
      to_bank_id: ''
    }));
  }, [transferForm.type]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الخزائن' : 'Total Treasuries'}</p>
                <p className="text-2xl font-bold text-amber-600">
                  {totalTreasuryBalance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {treasuries.length} {language === 'ar' ? 'خزينة' : 'treasuries'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي البنوك' : 'Total Banks'}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalBankBalance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {banks.length} {language === 'ar' ? 'بنك' : 'banks'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي السيولة' : 'Total Liquidity'}</p>
                <p className="text-2xl font-bold text-green-600">
                  {(totalTreasuryBalance + totalBankBalance).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => setShowTransferForm(true)}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تحويل أموال' : 'Transfer Funds'}</p>
                <p className="text-lg font-medium text-purple-600">
                  {language === 'ar' ? 'انقر للتحويل' : 'Click to transfer'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border-indigo-200 dark:border-indigo-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <History className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الحركات' : 'Total Movements'}</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {(treasuryMovementsMeta.total || 0) + (bankMovementsMeta.total || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="treasuries" className="gap-2">
            <Wallet size={16} />
            {language === 'ar' ? 'الخزائن' : 'Treasuries'}
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-2">
            <Building2 size={16} />
            {language === 'ar' ? 'البنوك' : 'Banks'}
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-2">
            <ArrowRightLeft size={16} />
            {language === 'ar' ? 'التحويلات' : 'Transfers'}
          </TabsTrigger>
          <TabsTrigger value="treasury-movements" className="gap-2">
            <History size={16} />
            {language === 'ar' ? 'حركات الخزينة' : 'Treasury Mov.'}
          </TabsTrigger>
          <TabsTrigger value="bank-movements" className="gap-2">
            <History size={16} />
            {language === 'ar' ? 'حركات البنك' : 'Bank Mov.'}
          </TabsTrigger>
        </TabsList>

        {/* Treasuries Tab */}
        <TabsContent value="treasuries" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{language === 'ar' ? 'إدارة الخزائن' : 'Treasury Management'}</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openTransactionForm('treasury')}>
                <ArrowUpCircle size={16} className="me-2" />
                {language === 'ar' ? 'حركة مالية' : 'Transaction'}
              </Button>
              <Button onClick={() => setShowTreasuryForm(true)}>
                <Plus size={16} className="me-2" />
                {language === 'ar' ? 'خزينة جديدة' : 'New Treasury'}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الفرع' : 'Branch'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العملات' : 'Currencies'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead>{language === 'ar' ? 'رئيسية' : 'Main'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTreasuries ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                        </TableCell>
                      </TableRow>
                    ) : treasuries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد خزائن' : 'No treasuries'}
                        </TableCell>
                      </TableRow>
                    ) : treasuries.map((treasury: Treasury) => (
                      <TableRow key={treasury.id}>
                        <TableCell className="font-mono">{treasury.code || '-'}</TableCell>
                        <TableCell className="font-medium">
                          {treasury.name}
                          {treasury.is_main && (
                            <Badge className="ms-2 bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                              <Star size={12} className="me-1" />
                              {language === 'ar' ? 'رئيسية' : 'Main'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{treasury.branch?.name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {treasury.currencies?.map((curr) => (
                              <div key={curr.currency_id} className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className="gap-1">
                                  <Coins size={10} />
                                  {getCurrencyName(curr.currency_id)}
                                </Badge>
                                <span className="font-bold text-amber-600">
                                  {curr.balance.toLocaleString()}
                                </span>
                                {curr.is_main && (
                                  <Star size={10} className="text-amber-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {treasury.total_balance?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleMainTreasuryToggle(treasury)}
                            disabled={updatingMainId === treasury.id}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                              treasury.is_main ? "bg-green-600" : "bg-gray-200",
                              updatingMainId === treasury.id && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                                treasury.is_main ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTreasury(treasury)}>
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive" 
                              onClick={() => deleteTreasuryMutation.mutate(treasury.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banks Tab (زي ما هو) */}
        <TabsContent value="banks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{language === 'ar' ? 'إدارة البنوك' : 'Bank Management'}</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openTransactionForm('bank')}>
                <ArrowUpCircle size={16} className="me-2" />
                {language === 'ar' ? 'حركة مالية' : 'Transaction'}
              </Button>
              <Button onClick={() => setShowBankForm(true)}>
                <Plus size={16} className="me-2" />
                {language === 'ar' ? 'بنك جديد' : 'New Bank'}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'البنك' : 'Bank'}</TableHead>
                      <TableHead>{language === 'ar' ? 'رقم الحساب' : 'Account #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الفرع' : 'Branch'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الاجراءات' : 'Action'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBanks ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                        </TableCell>
                      </TableRow>
                    ) : banks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد بنوك' : 'No banks'}
                        </TableCell>
                      </TableRow>
                    ) : banks.map((bank: Bank) => (
                      <TableRow key={bank.id}>
                        <TableCell className="font-medium">{bank.name}</TableCell>
                        <TableCell className="font-mono">{bank.account_number || '-'}</TableCell>
                        <TableCell>{bank.branch?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Coins size={12} />
                            {bank.currency} {getCurrencySymbol(bank.currency)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-blue-600">
                          {Number(bank.balance).toLocaleString()} {bank.currency}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditBank(bank)}>
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive" 
                              onClick={() => deleteBankMutation.mutate(bank.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab (زي ما هو) */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{language === 'ar' ? 'التحويلات المالية' : 'Money Transfers'}</h3>
            <Button onClick={() => setShowTransferForm(true)}>
              <ArrowRightLeft size={16} className="me-2" />
              {language === 'ar' ? 'تحويل جديد' : 'New Transfer'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => { updateTransferFormByType('treasury_to_treasury'); setShowTransferForm(true); }}
            >
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Wallet className="h-6 w-6 text-amber-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Wallet className="h-6 w-6 text-amber-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'خزينة → خزينة' : 'Treasury → Treasury'}</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => { updateTransferFormByType('treasury_to_bank'); setShowTransferForm(true); }}
            >
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Wallet className="h-6 w-6 text-amber-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'خزينة → بنك' : 'Treasury → Bank'}</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => { updateTransferFormByType('bank_to_treasury'); setShowTransferForm(true); }}
            >
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Wallet className="h-6 w-6 text-amber-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'بنك → خزينة' : 'Bank → Treasury'}</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => { updateTransferFormByType('bank_to_bank'); setShowTransferForm(true); }}
            >
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'بنك → بنك' : 'Bank → Bank'}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Treasury Movements Tab (زي ما هو) */}
        <TabsContent value="treasury-movements">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{language === 'ar' ? 'حركات الخزينة' : 'Treasury Movements'}</CardTitle>
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'من' : 'From'}</TableHead>
                      <TableHead>{language === 'ar' ? 'إلى' : 'To'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                      <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTreasuryMovements ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                        </TableCell>
                      </TableRow>
                    ) : treasuryMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد حركات' : 'No movements'}
                        </TableCell>
                      </TableRow>
                    ) : treasuryMovements.map((movement: Movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>{formatDate(movement.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getMovementTypeLabel(movement.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getMovementSource(movement)}</TableCell>
                        <TableCell>{getMovementDestination(movement)}</TableCell>
                        <TableCell className="font-bold">{formatAmount(movement.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{movement.currency}</Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate">{movement.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
            {treasuryMovementsMeta.last_page > 1 && (
              <CardContent className="border-t py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? `عرض ${treasuryMovementsMeta.from || 0} إلى ${treasuryMovementsMeta.to || 0} من ${treasuryMovementsMeta.total || 0}`
                      : `Showing ${treasuryMovementsMeta.from || 0} to ${treasuryMovementsMeta.to || 0} of ${treasuryMovementsMeta.total || 0}`
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight size={16} />
                      {language === 'ar' ? 'السابق' : 'Previous'}
                    </Button>
                    <span className="text-sm">
                      {currentPage} / {treasuryMovementsMeta.last_page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(treasuryMovementsMeta.last_page, prev + 1))}
                      disabled={currentPage === treasuryMovementsMeta.last_page}
                    >
                      {language === 'ar' ? 'التالي' : 'Next'}
                      <ChevronLeft size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Bank Movements Tab (زي ما هو) */}
        <TabsContent value="bank-movements">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{language === 'ar' ? 'حركات البنك' : 'Bank Movements'}</CardTitle>
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'من' : 'From'}</TableHead>
                      <TableHead>{language === 'ar' ? 'إلى' : 'To'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                      <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBankMovements ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                        </TableCell>
                      </TableRow>
                    ) : bankMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {language === 'ar' ? 'لا توجد حركات' : 'No movements'}
                        </TableCell>
                      </TableRow>
                    ) : bankMovements.map((movement: Movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>{formatDate(movement.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getMovementTypeLabel(movement.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getMovementSource(movement)}</TableCell>
                        <TableCell>{getMovementDestination(movement)}</TableCell>
                        <TableCell className="font-bold">{formatAmount(movement.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{movement.currency}</Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate">{movement.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
            {bankMovementsMeta.last_page > 1 && (
              <CardContent className="border-t py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? `عرض ${bankMovementsMeta.from || 0} إلى ${bankMovementsMeta.to || 0} من ${bankMovementsMeta.total || 0}`
                      : `Showing ${bankMovementsMeta.from || 0} to ${bankMovementsMeta.to || 0} of ${bankMovementsMeta.total || 0}`
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight size={16} />
                      {language === 'ar' ? 'السابق' : 'Previous'}
                    </Button>
                    <span className="text-sm">
                      {currentPage} / {bankMovementsMeta.last_page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(bankMovementsMeta.last_page, prev + 1))}
                      disabled={currentPage === bankMovementsMeta.last_page}
                    >
                      {language === 'ar' ? 'التالي' : 'Next'}
                      <ChevronLeft size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Treasury Form Dialog - المعدل للعملات المتعددة */}
      <Dialog open={showTreasuryForm} onOpenChange={handleCloseTreasuryForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem 
                ? (language === 'ar' ? 'تعديل الخزينة' : 'Edit Treasury')
                : (language === 'ar' ? 'خزينة جديدة' : 'New Treasury')
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/*基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم' : 'Name'} *</Label>
                <Input 
                  value={treasuryForm.name} 
                  onChange={(e) => setTreasuryForm(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder={language === 'ar' ? 'أدخل اسم الخزينة' : 'Enter treasury name'}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكود' : 'Code'}</Label>
                <Input 
                  value={treasuryForm.code} 
                  onChange={(e) => setTreasuryForm(prev => ({ ...prev, code: e.target.value }))} 
                  placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الفرع' : 'Branch'} *</Label>
              <Select 
                value={treasuryForm.branch_id} 
                onValueChange={(v) => setTreasuryForm(prev => ({ ...prev, branch_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select branch'} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: Branch) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* العملات المتعددة */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {language === 'ar' ? 'العملات' : 'Currencies'} *
                </Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCurrencySelector(true)}
                >
                  <Plus size={14} className="me-1" />
                  {language === 'ar' ? 'إضافة عملة' : 'Add Currency'}
                </Button>
              </div>

              {treasuryForm.currencies.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                  <Coins className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'لم تضف أي عملة بعد' : 'No currencies added yet'}
                  </p>
                  <Button 
                    variant="link" 
                    onClick={() => setShowCurrencySelector(true)}
                    className="mt-2"
                  >
                    {language === 'ar' ? 'أضف عملة الآن' : 'Add currency now'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {treasuryForm.currencies.map((curr, index) => (
                    <div key={curr.currency_id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-primary/5">
                            {getCurrencyName(curr.currency_id)}
                          </Badge>
                          {curr.is_main && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                              <Star size={10} className="me-1" />
                              {language === 'ar' ? 'رئيسية' : 'Main'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={curr.balance}
                            onChange={(e) => handleCurrencyBalanceChange(curr.currency_id, parseFloat(e.target.value) || 0)}
                            className="w-40 h-8 text-left"
                            min="0"
                            step="0.01"
                          />
                          <span className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'رصيد' : 'Balance'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCurrency(curr.currency_id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Input 
                value={treasuryForm.notes} 
                onChange={(e) => setTreasuryForm(prev => ({ ...prev, notes: e.target.value }))} 
                placeholder={language === 'ar' ? 'أضف ملاحظات...' : 'Add notes...'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseTreasuryForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleTreasurySubmit}>
              {editingItem 
                ? (language === 'ar' ? 'تحديث' : 'Update')
                : (language === 'ar' ? 'إضافة' : 'Add')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Currency Selector Modal */}
      <Dialog open={showCurrencySelector} onOpenChange={setShowCurrencySelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'إضافة عملة' : 'Add Currency'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العملة' : 'Currency'} *</Label>
              <Select 
                value={tempCurrency.currency_id.toString()} 
                onValueChange={(v) => setTempCurrency(prev => ({ ...prev, currency_id: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر العملة' : 'Select currency'} />
                </SelectTrigger>
                <SelectContent>
                  {currencies
                    .filter((c: Currency) => !treasuryForm.currencies.some(tc => tc.currency_id === c.id))
                    .map((c: Currency) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.code} - {c.name} ({c.symbol})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</Label>
              <Input
                type="number"
                value={tempCurrency.balance}
                onChange={(e) => setTempCurrency(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCurrencySelector(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAddCurrency}>
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Form Dialog (زي ما هو) */}
      <Dialog open={showBankForm} onOpenChange={handleCloseBankForm}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem 
                ? (language === 'ar' ? 'تعديل البنك' : 'Edit Bank')
                : (language === 'ar' ? 'بنك جديد' : 'New Bank')
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم البنك' : 'Bank Name'} *</Label>
              <Input 
                value={bankForm.name} 
                onChange={(e) => setBankForm(prev => ({ ...prev, name: e.target.value }))} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رقم الحساب' : 'Account Number'}</Label>
                <Input value={bankForm.account_number} onChange={(e) => setBankForm(prev => ({ ...prev, account_number: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input value={bankForm.iban} onChange={(e) => setBankForm(prev => ({ ...prev, iban: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SWIFT Code</Label>
                <Input value={bankForm.swift_code} onChange={(e) => setBankForm(prev => ({ ...prev, swift_code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                <Select value={bankForm.branch_id} onValueChange={(v) => setBankForm(prev => ({ ...prev, branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select branch'} /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: Branch) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</Label>
                <Input value={bankForm.contact_person} onChange={(e) => setBankForm(prev => ({ ...prev, contact_person: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label>
                <Input value={bankForm.phone} onChange={(e) => setBankForm(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العنوان' : 'Address'}</Label>
              <Input value={bankForm.address} onChange={(e) => setBankForm(prev => ({ ...prev, address: e.target.value }))} />
            </div>

            {!editingItem && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</Label>
                  <Input 
                    type="number" 
                    value={bankForm.balance} 
                    onChange={(e) => setBankForm(prev => ({ ...prev, balance: e.target.value }))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العملة' : 'Currency'} *</Label>
                  <Select value={bankForm.currency} onValueChange={(v) => setBankForm(prev => ({ ...prev, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c: Currency) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Input value={bankForm.notes} onChange={(e) => setBankForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseBankForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => editingItem ? updateBankMutation.mutate({ id: editingItem.id, data: bankForm }) : createBankMutation.mutate(bankForm)}>
              {editingItem ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Form Dialog (زي ما هو) */}
      <Dialog open={showTransactionForm} onOpenChange={handleCloseTransactionForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'treasury' 
                ? (language === 'ar' ? 'حركة خزينة' : 'Treasury Transaction')
                : (language === 'ar' ? 'حركة بنكية' : 'Bank Transaction')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{transactionType === 'treasury' ? (language === 'ar' ? 'الخزينة' : 'Treasury') : (language === 'ar' ? 'البنك' : 'Bank')} *</Label>
              <Select value={transactionForm.entity_id} onValueChange={(v) => setTransactionForm(prev => ({ ...prev, entity_id: v }))}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select...'} /></SelectTrigger>
                <SelectContent>
                  {(transactionType === 'treasury' ? treasuries : banks).map((item: any) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name} ({Number(item.balance || item.total_balance).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع الحركة' : 'Transaction Type'} *</Label>
              <Select value={transactionForm.transaction_type} onValueChange={(v) => setTransactionForm(prev => ({ ...prev, transaction_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">{language === 'ar' ? 'إيداع' : 'Deposit'}</SelectItem>
                  <SelectItem value="withdrawal">{language === 'ar' ? 'سحب' : 'Withdrawal'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'} *</Label>
              <Input 
                type="number" 
                value={transactionForm.amount} 
                onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))} 
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العملة' : 'Currency'} *</Label>
              <Select value={transactionForm.currency} onValueChange={(v) => setTransactionForm(prev => ({ ...prev, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c: Currency) => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Input 
                value={transactionForm.description} 
                onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseTransactionForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => createTransactionMutation.mutate({ ...transactionForm, type: transactionType })}>
              {language === 'ar' ? 'تسجيل' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Form Dialog (زي ما هو) */}
      <Dialog open={showTransferForm} onOpenChange={handleCloseTransferForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تحويل أموال' : 'Transfer Funds'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع التحويل' : 'Transfer Type'} *</Label>
              <Select 
                value={transferForm.type} 
                onValueChange={(v) => updateTransferFormByType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treasury_to_treasury">
                    {language === 'ar' ? 'خزينة ← خزينة' : 'Treasury → Treasury'}
                  </SelectItem>
                  <SelectItem value="treasury_to_bank">
                    {language === 'ar' ? 'خزينة ← بنك' : 'Treasury → Bank'}
                  </SelectItem>
                  <SelectItem value="bank_to_treasury">
                    {language === 'ar' ? 'بنك ← خزينة' : 'Bank → Treasury'}
                  </SelectItem>
                  <SelectItem value="bank_to_bank">
                    {language === 'ar' ? 'بنك ← بنك' : 'Bank → Bank'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Field */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'من' : 'From'} *</Label>
              
              {(transferForm.type === 'treasury_to_treasury' || transferForm.type === 'treasury_to_bank') && (
                <Select 
                  value={transferForm.from_treasury_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, from_treasury_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الخزينة' : 'Select treasury'} />
                  </SelectTrigger>
                  <SelectContent>
                    {treasuries.map((t: Treasury) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} ({t.total_balance?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(transferForm.type === 'bank_to_treasury' || transferForm.type === 'bank_to_bank') && (
                <Select 
                  value={transferForm.from_bank_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, from_bank_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select bank'} />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((b: Bank) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name} ({Number(b.balance).toLocaleString()} {b.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* To Field */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'إلى' : 'To'} *</Label>
              
              {transferForm.type === 'treasury_to_treasury' && (
                <Select 
                  value={transferForm.to_treasury_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_treasury_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الخزينة' : 'Select treasury'} />
                  </SelectTrigger>
                  <SelectContent>
                    {getTransferToOptions().map((item: Treasury) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({item.total_balance?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {transferForm.type === 'treasury_to_bank' && (
                <Select 
                  value={transferForm.to_bank_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_bank_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select bank'} />
                  </SelectTrigger>
                  <SelectContent>
                    {getTransferToOptions().map((item: Bank) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({Number(item.balance).toLocaleString()} {item.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {transferForm.type === 'bank_to_treasury' && (
                <Select 
                  value={transferForm.to_treasury_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_treasury_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الخزينة' : 'Select treasury'} />
                  </SelectTrigger>
                  <SelectContent>
                    {getTransferToOptions().map((item: Treasury) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({item.total_balance?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {transferForm.type === 'bank_to_bank' && (
                <Select 
                  value={transferForm.to_bank_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_bank_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select bank'} />
                  </SelectTrigger>
                  <SelectContent>
                    {getTransferToOptions().map((item: Bank) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({Number(item.balance).toLocaleString()} {item.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'} *</Label>
              <Input 
                type="number" 
                value={transferForm.amount} 
                onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder={language === 'ar' ? 'أدخل المبلغ' : 'Enter amount'}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العملة' : 'Currency'} *</Label>
              <Select 
                value={transferForm.currency} 
                onValueChange={(v) => setTransferForm(prev => ({ ...prev, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر العملة' : 'Select currency'} />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c: Currency) => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.code} - {c.name} {c.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Input 
                value={transferForm.notes} 
                onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={language === 'ar' ? 'أضف ملاحظات...' : 'Add notes...'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseTransferForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={() => transferMutation.mutate(transferForm)}
              disabled={
                !transferForm.amount ||
                !transferForm.currency ||
                (transferForm.type.includes('treasury') && !transferForm.from_treasury_id) ||
                (transferForm.type.includes('bank') && !transferForm.from_bank_id) ||
                (transferForm.type === 'treasury_to_treasury' && !transferForm.to_treasury_id) ||
                (transferForm.type === 'treasury_to_bank' && !transferForm.to_bank_id) ||
                (transferForm.type === 'bank_to_treasury' && !transferForm.to_treasury_id) ||
                (transferForm.type === 'bank_to_bank' && !transferForm.to_bank_id)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {language === 'ar' ? 'تحويل' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreasuryBankManager;