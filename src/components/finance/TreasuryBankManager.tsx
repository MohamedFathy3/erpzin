import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Wallet, Building2, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TreasuryBankManagerProps {
  language: string;
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

  const [treasuryForm, setTreasuryForm] = useState({
    name: '', name_ar: '', code: '', branch_id: '', balance: '', currency: 'YER', is_main: false, notes: ''
  });

  const [bankForm, setBankForm] = useState({
    name: '', name_ar: '', account_number: '', iban: '', swift_code: '', branch_id: '', 
    balance: '', currency: 'YER', contact_person: '', phone: '', address: '', notes: ''
  });

  const [transactionForm, setTransactionForm] = useState({
    entity_id: '', transaction_type: 'deposit', amount: '', description: ''
  });

  const [transferForm, setTransferForm] = useState({
    transfer_type: 'treasury_to_treasury', // treasury_to_treasury, treasury_to_bank, bank_to_treasury
    from_id: '',
    to_id: '',
    amount: '',
    description: ''
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: treasuries = [], isLoading: loadingTreasuries } = useQuery({
    queryKey: ['treasuries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasuries')
        .select('*, branches(name, name_ar)')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: banks = [], isLoading: loadingBanks } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*, branches(name, name_ar)')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: treasuryTransactions = [] } = useQuery({
    queryKey: ['treasury-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasury_transactions')
        .select('*, treasuries(name, name_ar)')
        .order('transaction_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  const { data: bankTransactions = [] } = useQuery({
    queryKey: ['bank-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*, banks(name, name_ar)')
        .order('transaction_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Treasury mutations
  const createTreasuryMutation = useMutation({
    mutationFn: async (data: typeof treasuryForm) => {
      const { error } = await supabase.from('treasuries').insert({
        name: data.name,
        name_ar: data.name_ar || null,
        code: data.code || null,
        branch_id: data.branch_id || null,
        balance: parseFloat(data.balance) || 0,
        currency: data.currency,
        is_main: data.is_main,
        notes: data.notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      toast.success(language === 'ar' ? 'تم إضافة الخزينة بنجاح' : 'Treasury added successfully');
      handleCloseTreasuryForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const updateTreasuryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof treasuryForm }) => {
      const { error } = await supabase.from('treasuries').update({
        name: data.name,
        name_ar: data.name_ar || null,
        code: data.code || null,
        branch_id: data.branch_id || null,
        currency: data.currency,
        is_main: data.is_main,
        notes: data.notes || null
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      toast.success(language === 'ar' ? 'تم تحديث الخزينة بنجاح' : 'Treasury updated successfully');
      handleCloseTreasuryForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteTreasuryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('treasuries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      toast.success(language === 'ar' ? 'تم حذف الخزينة' : 'Treasury deleted');
    },
    onError: (error: any) => toast.error(error.message)
  });

  // Bank mutations
  const createBankMutation = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      const { error } = await supabase.from('banks').insert({
        name: data.name,
        name_ar: data.name_ar || null,
        account_number: data.account_number || null,
        iban: data.iban || null,
        swift_code: data.swift_code || null,
        branch_id: data.branch_id || null,
        balance: parseFloat(data.balance) || 0,
        currency: data.currency,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success(language === 'ar' ? 'تم إضافة البنك بنجاح' : 'Bank added successfully');
      handleCloseBankForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const updateBankMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof bankForm }) => {
      const { error } = await supabase.from('banks').update({
        name: data.name,
        name_ar: data.name_ar || null,
        account_number: data.account_number || null,
        iban: data.iban || null,
        swift_code: data.swift_code || null,
        branch_id: data.branch_id || null,
        currency: data.currency,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success(language === 'ar' ? 'تم تحديث البنك بنجاح' : 'Bank updated successfully');
      handleCloseBankForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteBankMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success(language === 'ar' ? 'تم حذف البنك' : 'Bank deleted');
    },
    onError: (error: any) => toast.error(error.message)
  });

  // Transaction mutations
  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof transactionForm & { type: 'treasury' | 'bank' }) => {
      const amount = parseFloat(data.amount);
      const isDeposit = data.transaction_type === 'deposit';

      if (data.type === 'treasury') {
        const treasury = treasuries.find(t => t.id === data.entity_id);
        if (!treasury) throw new Error('Treasury not found');
        
        const newBalance = isDeposit ? Number(treasury.balance) + amount : Number(treasury.balance) - amount;
        
        const { error: txError } = await supabase.from('treasury_transactions').insert({
          treasury_id: data.entity_id,
          transaction_type: data.transaction_type,
          amount,
          balance_before: treasury.balance,
          balance_after: newBalance,
          description: data.description || null
        });
        if (txError) throw txError;

        const { error: updateError } = await supabase
          .from('treasuries')
          .update({ balance: newBalance })
          .eq('id', data.entity_id);
        if (updateError) throw updateError;
      } else {
        const bank = banks.find(b => b.id === data.entity_id);
        if (!bank) throw new Error('Bank not found');
        
        const newBalance = isDeposit ? Number(bank.balance) + amount : Number(bank.balance) - amount;
        
        const { error: txError } = await supabase.from('bank_transactions').insert({
          bank_id: data.entity_id,
          transaction_type: data.transaction_type,
          amount,
          balance_before: bank.balance,
          balance_after: newBalance,
          description: data.description || null
        });
        if (txError) throw txError;

        const { error: updateError } = await supabase
          .from('banks')
          .update({ balance: newBalance })
          .eq('id', data.entity_id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(language === 'ar' ? 'تم تسجيل الحركة بنجاح' : 'Transaction recorded successfully');
      handleCloseTransactionForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: typeof transferForm) => {
      const amount = parseFloat(data.amount);
      
      if (data.transfer_type === 'treasury_to_treasury') {
        const fromTreasury = treasuries.find(t => t.id === data.from_id);
        const toTreasury = treasuries.find(t => t.id === data.to_id);
        if (!fromTreasury || !toTreasury) throw new Error('Treasury not found');
        if (Number(fromTreasury.balance) < amount) throw new Error(language === 'ar' ? 'الرصيد غير كافي' : 'Insufficient balance');

        const fromNewBalance = Number(fromTreasury.balance) - amount;
        const toNewBalance = Number(toTreasury.balance) + amount;

        // Record withdrawal from source
        await supabase.from('treasury_transactions').insert({
          treasury_id: data.from_id,
          transaction_type: 'transfer_out',
          amount,
          balance_before: fromTreasury.balance,
          balance_after: fromNewBalance,
          description: `${language === 'ar' ? 'تحويل إلى' : 'Transfer to'}: ${toTreasury.name}${data.description ? ' - ' + data.description : ''}`
        });

        // Record deposit to destination
        await supabase.from('treasury_transactions').insert({
          treasury_id: data.to_id,
          transaction_type: 'transfer_in',
          amount,
          balance_before: toTreasury.balance,
          balance_after: toNewBalance,
          description: `${language === 'ar' ? 'تحويل من' : 'Transfer from'}: ${fromTreasury.name}${data.description ? ' - ' + data.description : ''}`
        });

        // Update balances
        await supabase.from('treasuries').update({ balance: fromNewBalance }).eq('id', data.from_id);
        await supabase.from('treasuries').update({ balance: toNewBalance }).eq('id', data.to_id);

      } else if (data.transfer_type === 'treasury_to_bank') {
        const fromTreasury = treasuries.find(t => t.id === data.from_id);
        const toBank = banks.find(b => b.id === data.to_id);
        if (!fromTreasury || !toBank) throw new Error('Treasury or Bank not found');
        if (Number(fromTreasury.balance) < amount) throw new Error(language === 'ar' ? 'الرصيد غير كافي' : 'Insufficient balance');

        const fromNewBalance = Number(fromTreasury.balance) - amount;
        const toNewBalance = Number(toBank.balance) + amount;

        // Record withdrawal from treasury
        await supabase.from('treasury_transactions').insert({
          treasury_id: data.from_id,
          transaction_type: 'transfer_out',
          amount,
          balance_before: fromTreasury.balance,
          balance_after: fromNewBalance,
          description: `${language === 'ar' ? 'تحويل إلى بنك' : 'Transfer to bank'}: ${toBank.name}${data.description ? ' - ' + data.description : ''}`
        });

        // Record deposit to bank
        await supabase.from('bank_transactions').insert({
          bank_id: data.to_id,
          transaction_type: 'transfer_in',
          amount,
          balance_before: toBank.balance,
          balance_after: toNewBalance,
          description: `${language === 'ar' ? 'تحويل من خزينة' : 'Transfer from treasury'}: ${fromTreasury.name}${data.description ? ' - ' + data.description : ''}`
        });

        // Update balances
        await supabase.from('treasuries').update({ balance: fromNewBalance }).eq('id', data.from_id);
        await supabase.from('banks').update({ balance: toNewBalance }).eq('id', data.to_id);

      } else if (data.transfer_type === 'bank_to_treasury') {
        const fromBank = banks.find(b => b.id === data.from_id);
        const toTreasury = treasuries.find(t => t.id === data.to_id);
        if (!fromBank || !toTreasury) throw new Error('Bank or Treasury not found');
        if (Number(fromBank.balance) < amount) throw new Error(language === 'ar' ? 'الرصيد غير كافي' : 'Insufficient balance');

        const fromNewBalance = Number(fromBank.balance) - amount;
        const toNewBalance = Number(toTreasury.balance) + amount;

        // Record withdrawal from bank
        await supabase.from('bank_transactions').insert({
          bank_id: data.from_id,
          transaction_type: 'transfer_out',
          amount,
          balance_before: fromBank.balance,
          balance_after: fromNewBalance,
          description: `${language === 'ar' ? 'تحويل إلى خزينة' : 'Transfer to treasury'}: ${toTreasury.name}${data.description ? ' - ' + data.description : ''}`
        });

        // Record deposit to treasury
        await supabase.from('treasury_transactions').insert({
          treasury_id: data.to_id,
          transaction_type: 'transfer_in',
          amount,
          balance_before: toTreasury.balance,
          balance_after: toNewBalance,
          description: `${language === 'ar' ? 'تحويل من بنك' : 'Transfer from bank'}: ${fromBank.name}${data.description ? ' - ' + data.description : ''}`
        });

        // Update balances
        await supabase.from('banks').update({ balance: fromNewBalance }).eq('id', data.from_id);
        await supabase.from('treasuries').update({ balance: toNewBalance }).eq('id', data.to_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasuries'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(language === 'ar' ? 'تم التحويل بنجاح' : 'Transfer completed successfully');
      handleCloseTransferForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleCloseTreasuryForm = () => {
    setShowTreasuryForm(false);
    setEditingItem(null);
    setTreasuryForm({ name: '', name_ar: '', code: '', branch_id: '', balance: '', currency: 'YER', is_main: false, notes: '' });
  };

  const handleCloseBankForm = () => {
    setShowBankForm(false);
    setEditingItem(null);
    setBankForm({ name: '', name_ar: '', account_number: '', iban: '', swift_code: '', branch_id: '', balance: '', currency: 'YER', contact_person: '', phone: '', address: '', notes: '' });
  };

  const handleCloseTransactionForm = () => {
    setShowTransactionForm(false);
    setTransactionForm({ entity_id: '', transaction_type: 'deposit', amount: '', description: '' });
  };

  const handleCloseTransferForm = () => {
    setShowTransferForm(false);
    setTransferForm({ transfer_type: 'treasury_to_treasury', from_id: '', to_id: '', amount: '', description: '' });
  };

  const handleEditTreasury = (treasury: any) => {
    setEditingItem(treasury);
    setTreasuryForm({
      name: treasury.name,
      name_ar: treasury.name_ar || '',
      code: treasury.code || '',
      branch_id: treasury.branch_id || '',
      balance: treasury.balance?.toString() || '0',
      currency: treasury.currency || 'YER',
      is_main: treasury.is_main || false,
      notes: treasury.notes || ''
    });
    setShowTreasuryForm(true);
  };

  const handleEditBank = (bank: any) => {
    setEditingItem(bank);
    setBankForm({
      name: bank.name,
      name_ar: bank.name_ar || '',
      account_number: bank.account_number || '',
      iban: bank.iban || '',
      swift_code: bank.swift_code || '',
      branch_id: bank.branch_id || '',
      balance: bank.balance?.toString() || '0',
      currency: bank.currency || 'YER',
      contact_person: bank.contact_person || '',
      phone: bank.phone || '',
      address: bank.address || '',
      notes: bank.notes || ''
    });
    setShowBankForm(true);
  };

  const openTransactionForm = (type: 'treasury' | 'bank') => {
    setTransactionType(type);
    setShowTransactionForm(true);
  };

  const totalTreasuryBalance = treasuries.reduce((sum, t) => sum + Number(t.balance || 0), 0);
  const totalBankBalance = banks.reduce((sum, b) => sum + Number(b.balance || 0), 0);

  const getTransferFromOptions = () => {
    if (transferForm.transfer_type === 'treasury_to_treasury' || transferForm.transfer_type === 'treasury_to_bank') {
      return treasuries;
    }
    return banks;
  };

  const getTransferToOptions = () => {
    if (transferForm.transfer_type === 'treasury_to_treasury') {
      return treasuries.filter(t => t.id !== transferForm.from_id);
    } else if (transferForm.transfer_type === 'treasury_to_bank') {
      return banks;
    }
    return treasuries;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي الخزائن' : 'Total Treasuries'}</p>
                <p className="text-2xl font-bold text-amber-600">{totalTreasuryBalance.toLocaleString()} ر.ي</p>
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
                <p className="text-2xl font-bold text-blue-600">{totalBankBalance.toLocaleString()} ر.ي</p>
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
                <p className="text-2xl font-bold text-green-600">{(totalTreasuryBalance + totalBankBalance).toLocaleString()} ر.ي</p>
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
          <TabsTrigger value="treasury-transactions" className="gap-2">
            {language === 'ar' ? 'حركات الخزينة' : 'Treasury Trans.'}
          </TabsTrigger>
          <TabsTrigger value="bank-transactions" className="gap-2">
            {language === 'ar' ? 'حركات البنك' : 'Bank Trans.'}
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
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTreasuries ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
                    ) : treasuries.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد خزائن' : 'No treasuries'}</TableCell></TableRow>
                    ) : treasuries.map((treasury: any) => (
                      <TableRow key={treasury.id}>
                        <TableCell className="font-mono">{treasury.code || '-'}</TableCell>
                        <TableCell className="font-medium">
                          {language === 'ar' ? treasury.name_ar || treasury.name : treasury.name}
                          {treasury.is_main && <Badge className="ms-2" variant="secondary">{language === 'ar' ? 'رئيسية' : 'Main'}</Badge>}
                        </TableCell>
                        <TableCell>{treasury.branches ? (language === 'ar' ? treasury.branches.name_ar : treasury.branches.name) : '-'}</TableCell>
                        <TableCell className="font-bold text-amber-600">{Number(treasury.balance).toLocaleString()} {treasury.currency}</TableCell>
                        <TableCell><Badge variant={treasury.is_active ? 'default' : 'secondary'}>{treasury.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}</Badge></TableCell>
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
                      <TableHead>{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingBanks ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
                    ) : banks.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد بنوك' : 'No banks'}</TableCell></TableRow>
                    ) : banks.map((bank: any) => (
                      <TableRow key={bank.id}>
                        <TableCell className="font-medium">{language === 'ar' ? bank.name_ar || bank.name : bank.name}</TableCell>
                        <TableCell className="font-mono">{bank.account_number || '-'}</TableCell>
                        <TableCell>{bank.branches ? (language === 'ar' ? bank.branches.name_ar : bank.branches.name) : '-'}</TableCell>
                        <TableCell className="font-bold text-blue-600">{Number(bank.balance).toLocaleString()} {bank.currency}</TableCell>
                        <TableCell><Badge variant={bank.is_active ? 'default' : 'secondary'}>{bank.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}</Badge></TableCell>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setTransferForm(prev => ({ ...prev, transfer_type: 'treasury_to_treasury' })); setShowTransferForm(true); }}>
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Wallet className="h-6 w-6 text-amber-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Wallet className="h-6 w-6 text-amber-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'من خزينة لخزينة' : 'Treasury to Treasury'}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setTransferForm(prev => ({ ...prev, transfer_type: 'treasury_to_bank' })); setShowTransferForm(true); }}>
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Wallet className="h-6 w-6 text-amber-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'من خزينة لبنك' : 'Treasury to Bank'}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setTransferForm(prev => ({ ...prev, transfer_type: 'bank_to_treasury' })); setShowTransferForm(true); }}>
              <CardContent className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <Wallet className="h-6 w-6 text-amber-600" />
                </div>
                <p className="font-medium">{language === 'ar' ? 'من بنك لخزينة' : 'Bank to Treasury'}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="treasury-transactions">
          <Card>
            <CardHeader><CardTitle>{language === 'ar' ? 'حركات الخزينة' : 'Treasury Transactions'}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الخزينة' : 'Treasury'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الرصيد بعد' : 'Balance After'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treasuryTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.transaction_date), 'yyyy/MM/dd HH:mm')}</TableCell>
                        <TableCell>{tx.treasuries?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? 'default' : 'destructive'} className="gap-1">
                            {tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                            {tx.transaction_type === 'deposit' ? (language === 'ar' ? 'إيداع' : 'Deposit') : 
                             tx.transaction_type === 'withdrawal' ? (language === 'ar' ? 'سحب' : 'Withdrawal') :
                             tx.transaction_type === 'transfer_in' ? (language === 'ar' ? 'تحويل وارد' : 'Transfer In') :
                             (language === 'ar' ? 'تحويل صادر' : 'Transfer Out')}
                          </Badge>
                        </TableCell>
                        <TableCell className={tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                          {tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{Number(tx.balance_after).toLocaleString()}</TableCell>
                        <TableCell className="max-w-48 truncate">{tx.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-transactions">
          <Card>
            <CardHeader><CardTitle>{language === 'ar' ? 'حركات البنك' : 'Bank Transactions'}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'البنك' : 'Bank'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الرصيد بعد' : 'Balance After'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.transaction_date), 'yyyy/MM/dd HH:mm')}</TableCell>
                        <TableCell>{tx.banks?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? 'default' : 'destructive'} className="gap-1">
                            {tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                            {tx.transaction_type === 'deposit' ? (language === 'ar' ? 'إيداع' : 'Deposit') : 
                             tx.transaction_type === 'withdrawal' ? (language === 'ar' ? 'سحب' : 'Withdrawal') :
                             tx.transaction_type === 'transfer_in' ? (language === 'ar' ? 'تحويل وارد' : 'Transfer In') :
                             (language === 'ar' ? 'تحويل صادر' : 'Transfer Out')}
                          </Badge>
                        </TableCell>
                        <TableCell className={tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                          {tx.transaction_type.includes('in') || tx.transaction_type === 'deposit' ? '+' : '-'}{Number(tx.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{Number(tx.balance_after).toLocaleString()}</TableCell>
                        <TableCell className="max-w-48 truncate">{tx.description || '-'}</TableCell>
                      </TableRow>
                    ))}
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
                <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (EN)'} *</Label>
                <Input value={treasuryForm.name} onChange={(e) => setTreasuryForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (AR)'}</Label>
                <Input value={treasuryForm.name_ar} onChange={(e) => setTreasuryForm(prev => ({ ...prev, name_ar: e.target.value }))} dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكود' : 'Code'}</Label>
                <Input value={treasuryForm.code} onChange={(e) => setTreasuryForm(prev => ({ ...prev, code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                <Select value={treasuryForm.branch_id} onValueChange={(v) => setTreasuryForm(prev => ({ ...prev, branch_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الفرع' : 'Select branch'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{language === 'ar' ? b.name_ar || b.name : b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingItem && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</Label>
                  <Input type="number" value={treasuryForm.balance} onChange={(e) => setTreasuryForm(prev => ({ ...prev, balance: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                  <Select value={treasuryForm.currency} onValueChange={(v) => setTreasuryForm(prev => ({ ...prev, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YER">YER</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseTreasuryForm}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => editingItem ? updateTreasuryMutation.mutate({ id: editingItem.id, data: treasuryForm }) : createTreasuryMutation.mutate(treasuryForm)}>
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
                <Label>{language === 'ar' ? 'اسم البنك (إنجليزي)' : 'Bank Name (EN)'} *</Label>
                <Input value={bankForm.name} onChange={(e) => setBankForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم البنك (عربي)' : 'Bank Name (AR)'}</Label>
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
                    <SelectItem value="">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{language === 'ar' ? b.name_ar || b.name : b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                      <SelectItem value="YER">YER</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
                    <SelectItem key={item.id} value={item.id}>
                      {language === 'ar' ? item.name_ar || item.name : item.name} ({Number(item.balance).toLocaleString()})
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
              <Select value={transferForm.transfer_type} onValueChange={(v) => setTransferForm(prev => ({ ...prev, transfer_type: v, from_id: '', to_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="treasury_to_treasury">{language === 'ar' ? 'من خزينة لخزينة' : 'Treasury to Treasury'}</SelectItem>
                  <SelectItem value="treasury_to_bank">{language === 'ar' ? 'من خزينة لبنك' : 'Treasury to Bank'}</SelectItem>
                  <SelectItem value="bank_to_treasury">{language === 'ar' ? 'من بنك لخزينة' : 'Bank to Treasury'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'من' : 'From'} *</Label>
              <Select value={transferForm.from_id} onValueChange={(v) => setTransferForm(prev => ({ ...prev, from_id: v }))}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر المصدر...' : 'Select source...'} /></SelectTrigger>
                <SelectContent>
                  {getTransferFromOptions().map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {language === 'ar' ? item.name_ar || item.name : item.name} ({Number(item.balance).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'إلى' : 'To'} *</Label>
              <Select value={transferForm.to_id} onValueChange={(v) => setTransferForm(prev => ({ ...prev, to_id: v }))}>
                <SelectTrigger><SelectValue placeholder={language === 'ar' ? 'اختر الوجهة...' : 'Select destination...'} /></SelectTrigger>
                <SelectContent>
                  {getTransferToOptions().map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {language === 'ar' ? item.name_ar || item.name : item.name} ({Number(item.balance).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'} *</Label>
              <Input type="number" value={transferForm.amount} onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Input value={transferForm.description} onChange={(e) => setTransferForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseTransferForm}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => transferMutation.mutate(transferForm)} disabled={!transferForm.from_id || !transferForm.to_id || !transferForm.amount}>
              {language === 'ar' ? 'تحويل' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TreasuryBankManager;