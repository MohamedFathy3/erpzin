import React, { useState } from 'react';
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
  History
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface TreasuryBankManagerProps {
  language: string;
}

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
  image: string;
  created_at: string;
  updated_at: string;
}

interface Treasury {
  id: number;
  name: string;
  code: string;
  branch_id: number;
  branch: Branch;
  balance: number;
  currency: string;
  is_main: boolean;
  notes: string;
  created_at: string;
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
  const [showMainWarning, setShowMainWarning] = useState(false);
  const [pendingMainChange, setPendingMainChange] = useState<{value: boolean, callback: () => void} | null>(null);
  const [updatingMainId, setUpdatingMainId] = useState<number | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [treasuryForm, setTreasuryForm] = useState({
    name: '',
    code: '',
    branch_id: '',
    balance: '',
    currency: '',
    is_main: false,
    notes: ''
  });

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

  const [transactionForm, setTransactionForm] = useState({
    entity_id: '',
    transaction_type: 'deposit',
    amount: '',
    currency: '',
    description: ''
  });

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

  // Fetch currencies
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
  const defaultCurrency = currencies.find((c: Currency) => c.default);

  // Fetch branches
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

  // Fetch treasury movements
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

  // Fetch bank movements
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

  // Update column mutation for treasury
  const updateTreasuryColumnMutation = useMutation({
    mutationFn: async ({ id, column, value }: { id: number; column: string; value: any }) => {
      const response = await api.put(`/treasury/${id}/${column}`, {
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

  // Update column mutation for bank
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

  // Handle main treasury toggle
  const handleMainTreasuryToggle = async (treasury: Treasury) => {
    try {
      setUpdatingMainId(treasury.id);
      
      // If we're unchecking is_main, just update this one
      if (treasury.is_main) {
        await updateTreasuryColumnMutation.mutateAsync({
          id: treasury.id,
          column: 'is_main',
          value: false
        });
        
        toast.success(
          language === 'ar' 
            ? 'تم إلغاء تعيين الخزينة كرئيسية' 
            : 'Treasury unset as main successfully'
        );
        return;
      }

      // Check if there's another main treasury for the same branch
      const otherMainTreasury = treasuries.find((t: Treasury) => 
        t.branch_id === treasury.branch_id && 
        t.is_main && 
        t.id !== treasury.id
      );

      // If there's another main treasury, update it first then set this one
      if (otherMainTreasury) {
        // First set the other treasury to false
        await updateTreasuryColumnMutation.mutateAsync({
          id: otherMainTreasury.id,
          column: 'is_main',
          value: false
        });
      }
      
      // Then set this treasury to true
      await updateTreasuryColumnMutation.mutateAsync({
        id: treasury.id,
        column: 'is_main',
        value: true
      });

      toast.success(
        language === 'ar' 
          ? 'تم تغيير الخزينة الرئيسية بنجاح' 
          : 'Main treasury updated successfully'
      );
      
    } catch (error) {
      console.error('Error updating main treasury:', error);
    } finally {
      setUpdatingMainId(null);
    }
  };

  // Format date safely
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '-';
      
      // Try different date formats
      let date: Date | null = null;
      
      // Format: "2026-02-25 10:12"
      if (dateString.includes(' ')) {
        const [datePart, timePart] = dateString.split(' ');
        date = new Date(`${datePart}T${timePart}:00`);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid
      }
      
      return format(date, 'yyyy/MM/dd HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '-';
    }
  };

  // Format amount
  const formatAmount = (amount: string) => {
    try {
      return Number(amount).toLocaleString();
    } catch {
      return amount;
    }
  };

  // Get movement type label
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

  // Get movement source
  const getMovementSource = (movement: Movement) => {
    if (movement.from.treasury) return movement.from.treasury;
    if (movement.from.bank) return movement.from.bank;
    return '-';
  };

  // Get movement destination
  const getMovementDestination = (movement: Movement) => {
    if (movement.to.treasury) return movement.to.treasury;
    if (movement.to.bank) return movement.to.bank;
    return '-';
  };

  // Treasury mutations
  const createTreasuryMutation = useMutation({
    mutationFn: async (data: typeof treasuryForm) => {
      // Check if there's another main treasury for the same branch
      if (data.is_main && data.branch_id) {
        const otherMainTreasury = treasuries.find((t: Treasury) => 
          t.branch_id === parseInt(data.branch_id) && 
          t.is_main
        );

        if (otherMainTreasury) {
          // First update the other treasury to false
          await updateTreasuryColumnMutation.mutateAsync({
            id: otherMainTreasury.id,
            column: 'is_main',
            value: false
          });
        }
      }

      const response = await api.post('/treasury', {
        name: data.name,
        code: data.code || null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null,
        balance: parseFloat(data.balance) || 0,
        currency: data.currency,
        is_main: data.is_main,
        notes: data.notes || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      toast.success(language === 'ar' ? 'تم إضافة الخزينة بنجاح' : 'Treasury added successfully');
      handleCloseTreasuryForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
  });

  const updateTreasuryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof treasuryForm }) => {
      // Check if we're changing is_main to true and there's another main
      if (data.is_main && data.branch_id) {
        const otherMainTreasury = treasuries.find((t: Treasury) => 
          t.branch_id === parseInt(data.branch_id) && 
          t.is_main &&
          t.id !== id
        );

        if (otherMainTreasury) {
          // First update the other treasury to false
          await updateTreasuryColumnMutation.mutateAsync({
            id: otherMainTreasury.id,
            column: 'is_main',
            value: false
          });
        }
      }

      const response = await api.put(`/treasury/${id}`, {
        name: data.name,
        code: data.code || null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null,
        currency: data.currency,
        is_main: data.is_main,
        notes: data.notes || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      toast.success(language === 'ar' ? 'تم تحديث الخزينة بنجاح' : 'Treasury updated successfully');
      handleCloseTreasuryForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
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
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
  });

  // Bank mutations
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
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
  });

  const updateBankMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof bankForm }) => {
      const response = await api.put(`/bank/${id}`, {
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
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
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
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
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
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: typeof transferForm) => {
      const response = await api.post('/transfer', {
        type: data.type,
        from_treasury_id: data.from_treasury_id ? parseInt(data.from_treasury_id) : undefined,
        to_treasury_id: data.to_treasury_id ? parseInt(data.to_treasury_id) : undefined,
        from_bank_id: data.from_bank_id ? parseInt(data.from_bank_id) : undefined,
        to_bank_id: data.to_bank_id ? parseInt(data.to_bank_id) : undefined,
        amount: parseFloat(data.amount),
        currency: data.currency,
        notes: data.notes || null
      });
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
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
  });

  const handleCloseTreasuryForm = () => {
    setShowTreasuryForm(false);
    setEditingItem(null);
    setTreasuryForm({ 
      name: '', 
      code: '', 
      branch_id: '', 
      balance: '', 
      currency: defaultCurrency?.code || 'YER', 
      is_main: false, 
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
      currency: defaultCurrency?.code || 'YER', 
      contact_person: '', 
      phone: '', 
      address: '', 
      notes: '' 
    });
  };

  const handleCloseTransactionForm = () => {
    setShowTransactionForm(false);
    setTransactionForm({ entity_id: '', transaction_type: 'deposit', amount: '', currency: defaultCurrency?.code || 'YER', description: '' });
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
      currency: defaultCurrency?.code || 'YER', 
      notes: '' 
    });
  };

  const handleEditTreasury = (treasury: Treasury) => {
    setEditingItem(treasury);
    setTreasuryForm({
      name: treasury.name,
      code: treasury.code || '',
      branch_id: treasury.branch_id?.toString() || '',
      balance: treasury.balance?.toString() || '0',
      currency: treasury.currency || defaultCurrency?.code || 'YER',
      is_main: treasury.is_main || false,
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
      currency: bank.currency || defaultCurrency?.code || 'YER',
      contact_person: bank.contact_person || '',
      phone: bank.phone || '',
      address: bank.address || '',
      notes: bank.notes || ''
    });
    setShowBankForm(true);
  };

  const handleTreasurySubmit = () => {
    if (!treasuryForm.name || !treasuryForm.currency || !treasuryForm.branch_id) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
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

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find((c: Currency) => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const totalTreasuryBalance = treasuries.reduce((sum: number, t: Treasury) => sum + Number(t.balance || 0), 0);
  const totalBankBalance = banks.reduce((sum: number, b: Bank) => sum + Number(b.balance || 0), 0);

  const getTransferFromOptions = () => {
    if (transferForm.type === 'treasury_to_treasury' || transferForm.type === 'treasury_to_bank') {
      return treasuries;
    }
    return banks;
  };

  const getTransferToOptions = () => {
    if (transferForm.type === 'treasury_to_treasury') {
      return treasuries.filter((t: Treasury) => t.id !== parseInt(transferForm.from_treasury_id));
    } else if (transferForm.type === 'treasury_to_bank') {
      return banks;
    } else if (transferForm.type === 'bank_to_treasury') {
      return treasuries;
    } else if (transferForm.type === 'bank_to_bank') {
      return banks.filter((b: Bank) => b.id !== parseInt(transferForm.from_bank_id));
    }
    return [];
  };

  // Update form based on transfer type
  const updateTransferFormByType = (type: string) => {
    setTransferForm({
      type,
      from_treasury_id: '',
      to_treasury_id: '',
      from_bank_id: '',
      to_bank_id: '',
      amount: '',
      currency: defaultCurrency?.code || 'YER',
      notes: ''
    });
  };

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
                  {totalTreasuryBalance.toLocaleString()} {getCurrencySymbol(defaultCurrency?.code || 'YER')}
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
                  {totalBankBalance.toLocaleString()} {getCurrencySymbol(defaultCurrency?.code || 'YER')}
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
                  {(totalTreasuryBalance + totalBankBalance).toLocaleString()} {getCurrencySymbol(defaultCurrency?.code || 'YER')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowTransferForm(true)}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تحويل أموال' : 'Transfer Funds'}</p>
                <p className="text-lg font-medium text-purple-600">{language === 'ar' ? 'انقر للتحويل' : 'Click to transfer'}</p>
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
        <TabsList className="grid w-full grid-cols-7">
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
          <TabsTrigger value="treasury-transactions" className="gap-2">
            {language === 'ar' ? 'معاملات الخزينة' : 'Treasury Trans.'}
          </TabsTrigger>
          <TabsTrigger value="bank-transactions" className="gap-2">
            {language === 'ar' ? 'معاملات البنك' : 'Bank Trans.'}
          </TabsTrigger>
        </TabsList>

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
                      <TableHead>{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                      <TableHead>{language === 'ar' ? 'رئيسية' : 'Main'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTreasuries ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
                    ) : treasuries.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد خزائن' : 'No treasuries'}</TableCell></TableRow>
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
                        <TableCell className="font-bold text-amber-600">{Number(treasury.balance).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Coins size={12} />
                            {treasury.currency}
                          </Badge>
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
                            <Button variant="ghost" size="icon" onClick={() => handleEditTreasury(treasury)}><Edit size={16} /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteTreasuryMutation.mutate(treasury.id)}><Trash2 size={16} /></Button>
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
                      <TableHead>{language === 'ar' ? 'الاجراءات' : 'Action'}</TableHead>
            
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBanks ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
                    ) : banks.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد بنوك' : 'No banks'}</TableCell></TableRow>
                    ) : banks.map((bank: Bank) => (
                      <TableRow key={bank.id}>
                        <TableCell className="font-medium">{bank.name}</TableCell>
                        <TableCell className="font-mono">{bank.account_number || '-'}</TableCell>
                        <TableCell>{bank.branch?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Coins size={12} />
                            {bank.currency}
                          </Badge>
                        </TableCell>
                      
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditBank(bank)}><Edit size={16} /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteBankMutation.mutate(bank.id)}><Trash2 size={16} /></Button>
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

        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{language === 'ar' ? 'التحويلات المالية' : 'Money Transfers'}</h3>
            <Button onClick={() => setShowTransferForm(true)}>
              <ArrowRightLeft size={16} className="me-2" />
              {language === 'ar' ? 'تحويل جديد' : 'New Transfer'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { updateTransferFormByType('treasury_to_treasury'); setShowTransferForm(true); }}>
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Wallet className="h-6 w-6 text-amber-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Wallet className="h-6 w-6 text-amber-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'خزينة → خزينة' : 'Treasury → Treasury'}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { updateTransferFormByType('treasury_to_bank'); setShowTransferForm(true); }}>
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Wallet className="h-6 w-6 text-amber-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'خزينة → بنك' : 'Treasury → Bank'}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { updateTransferFormByType('bank_to_treasury'); setShowTransferForm(true); }}>
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Wallet className="h-6 w-6 text-amber-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'بنك → خزينة' : 'Bank → Treasury'}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { updateTransferFormByType('bank_to_bank'); setShowTransferForm(true); }}>
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
                      <TableRow><TableCell colSpan={7} className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
                    ) : treasuryMovements.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد حركات' : 'No movements'}</TableCell></TableRow>
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
                      <TableRow><TableCell colSpan={7} className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
                    ) : bankMovements.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد حركات' : 'No movements'}</TableCell></TableRow>
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

        <TabsContent value="treasury-transactions">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معاملات الخزينة' : 'Treasury Transactions'}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الخزينة' : 'Treasury'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الرصيد بعد' : 'Balance After'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* We'll need to add treasury transactions data */}
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد معاملات' : 'No transactions'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-transactions">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'معاملات البنك' : 'Bank Transactions'}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'البنك' : 'Bank'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العملة' : 'Currency'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الرصيد بعد' : 'Balance After'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* We'll need to add bank transactions data */}
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد معاملات' : 'No transactions'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Treasury Form Dialog */}
      <Dialog open={showTreasuryForm} onOpenChange={handleCloseTreasuryForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? (language === 'ar' ? 'تعديل الخزينة' : 'Edit Treasury') : (language === 'ar' ? 'خزينة جديدة' : 'New Treasury')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم' : 'Name'} *</Label>
                <Input value={treasuryForm.name} onChange={(e) => setTreasuryForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكود' : 'Code'}</Label>
                <Input value={treasuryForm.code} onChange={(e) => setTreasuryForm(prev => ({ ...prev, code: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الفرع' : 'Branch'} *</Label>
                <Select value={treasuryForm.branch_id} onValueChange={(v) => setTreasuryForm(prev => ({ ...prev, branch_id: v }))}>
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

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العملة' : 'Currency'} *</Label>
                <Select value={treasuryForm.currency} onValueChange={(v) => setTreasuryForm(prev => ({ ...prev, currency: v }))}>
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

            {!editingItem && (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</Label>
                <Input type="number" value={treasuryForm.balance} onChange={(e) => setTreasuryForm(prev => ({ ...prev, balance: e.target.value }))} />
              </div>
            )}

            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <input
                type="checkbox"
                id="is_main"
                checked={treasuryForm.is_main}
                onChange={(e) => setTreasuryForm(prev => ({ ...prev, is_main: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_main" className="cursor-pointer">
                {language === 'ar' ? 'خزينة رئيسية' : 'Main Treasury'}
              </Label>
              {treasuryForm.is_main && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Star size={12} className="me-1" />
                  {language === 'ar' ? 'سيتم جعلها الرئيسية' : 'Will be set as main'}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Input value={treasuryForm.notes} onChange={(e) => setTreasuryForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseTreasuryForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleTreasurySubmit}>
              {editingItem ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Form Dialog */}
      <Dialog open={showBankForm} onOpenChange={handleCloseBankForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? (language === 'ar' ? 'تعديل البنك' : 'Edit Bank') : (language === 'ar' ? 'بنك جديد' : 'New Bank')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم البنك' : 'Bank Name'} *</Label>
                <Input value={bankForm.name} onChange={(e) => setBankForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</Label>
                <Input value={bankForm.name_ar} onChange={(e) => setBankForm(prev => ({ ...prev, name_ar: e.target.value }))} dir="rtl" />
              </div>
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
                  <Input type="number" value={bankForm.balance} onChange={(e) => setBankForm(prev => ({ ...prev, balance: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
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
            <Button variant="outline" onClick={handleCloseBankForm}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => editingItem ? updateBankMutation.mutate({ id: editingItem.id, data: bankForm }) : createBankMutation.mutate(bankForm)}>
              {editingItem ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'إضافة' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Form Dialog */}
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
                      {item.name} ({Number(item.balance).toLocaleString()})
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
              <Input type="number" value={transactionForm.amount} onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))} />
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
              <Input value={transactionForm.description} onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseTransactionForm}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => createTransactionMutation.mutate({ ...transactionForm, type: transactionType })}>
              {language === 'ar' ? 'تسجيل' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Form Dialog */}
      <Dialog open={showTransferForm} onOpenChange={handleCloseTransferForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تحويل أموال' : 'Transfer Funds'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع التحويل' : 'Transfer Type'} *</Label>
              <Select value={transferForm.type} onValueChange={(v) => updateTransferFormByType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="treasury_to_treasury">{language === 'ar' ? 'خزينة إلى خزينة' : 'Treasury to Treasury'}</SelectItem>
                  <SelectItem value="treasury_to_bank">{language === 'ar' ? 'خزينة إلى بنك' : 'Treasury to Bank'}</SelectItem>
                  <SelectItem value="bank_to_treasury">{language === 'ar' ? 'بنك إلى خزينة' : 'Bank to Treasury'}</SelectItem>
                  <SelectItem value="bank_to_bank">{language === 'ar' ? 'بنك إلى بنك' : 'Bank to Bank'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Field */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'من' : 'From'} *</Label>
              {transferForm.type.includes('treasury') ? (
                <Select 
                  value={transferForm.from_treasury_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, from_treasury_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الخزينة' : 'Select treasury'} /></SelectTrigger>
                  <SelectContent>
                    {treasuries.map((t: Treasury) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} ({Number(t.balance).toLocaleString()} {t.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select 
                  value={transferForm.from_bank_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, from_bank_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select bank'} /></SelectTrigger>
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
              {transferForm.type === 'treasury_to_treasury' ? (
                <Select 
                  value={transferForm.to_treasury_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_treasury_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الخزينة' : 'Select treasury'} /></SelectTrigger>
                  <SelectContent>
                    {treasuries
                      .filter((t: Treasury) => t.id.toString() !== transferForm.from_treasury_id)
                      .map((t: Treasury) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name} ({Number(t.balance).toLocaleString()} {t.currency})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : transferForm.type === 'treasury_to_bank' ? (
                <Select 
                  value={transferForm.to_bank_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_bank_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select bank'} /></SelectTrigger>
                  <SelectContent>
                    {banks.map((b: Bank) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name} ({Number(b.balance).toLocaleString()} {b.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : transferForm.type === 'bank_to_treasury' ? (
                <Select 
                  value={transferForm.to_treasury_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_treasury_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الخزينة' : 'Select treasury'} /></SelectTrigger>
                  <SelectContent>
                    {treasuries.map((t: Treasury) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} ({Number(t.balance).toLocaleString()} {t.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select 
                  value={transferForm.to_bank_id} 
                  onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_bank_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select bank'} /></SelectTrigger>
                  <SelectContent>
                    {banks
                      .filter((b: Bank) => b.id.toString() !== transferForm.from_bank_id)
                      .map((b: Bank) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.name} ({Number(b.balance).toLocaleString()} {b.currency})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'} *</Label>
              <Input type="number" value={transferForm.amount} onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العملة' : 'Currency'} *</Label>
              <Select value={transferForm.currency} onValueChange={(v) => setTransferForm(prev => ({ ...prev, currency: v }))}>
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
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Input value={transferForm.notes} onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseTransferForm}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button 
              onClick={() => transferMutation.mutate(transferForm)} 
              
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