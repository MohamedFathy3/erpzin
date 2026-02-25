import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, ChevronRight, ChevronDown, FolderOpen, FileText, Edit, Trash2, Search, Layers } from 'lucide-react';
import api from '@/lib/api';

interface ChartOfAccountsProps {
  language: string;
}

interface Account {
  id: number;
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
  level: number;
  has_children: boolean;
  children?: Account[];
  parent_code?: string | null;
  parent_name?: string | null;
  full_path?: string;
}

interface AccountFlat {
  id: number;
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
  level: number;
  parent_code: string | null;
  parent_name: string | null;
  full_path: string;
}

interface AccountsResponse {
  data: Account[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface AccountDetailResponse {
  data: Account;
  result: string;
  message: string;
  status: number;
}

interface AccountsFlatTreeResponse {
  data: AccountFlat[];
  total: number;
  result: string;
  message: string;
  status: number;
}

interface AccountsStats {
  total_accounts: number;
  main_accounts: number;
  sub_accounts: number;
  max_depth: number;
  tree_levels: number;
}

const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    parent_code: '',
    level: 0
  });

  // حساب أنواع الحسابات بناءً على الكود
  const getAccountTypeFromCode = (code: string) => {
    if (code.startsWith('1')) return { value: 'asset', label: language === 'ar' ? 'أصول' : 'Assets', color: 'bg-blue-500' };
    if (code.startsWith('2')) return { value: 'liability', label: language === 'ar' ? 'التزامات' : 'Liabilities', color: 'bg-red-500' };
    if (code.startsWith('3')) return { value: 'expense', label: language === 'ar' ? 'مصروفات' : 'Expenses', color: 'bg-orange-500' };
    if (code.startsWith('4')) return { value: 'revenue', label: language === 'ar' ? 'إيرادات' : 'Revenue', color: 'bg-green-500' };
    return { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other', color: 'bg-gray-500' };
  };

  const accountTypes = [
    { value: 'asset', label: language === 'ar' ? 'أصول' : 'Assets', color: 'bg-blue-500' },
    { value: 'liability', label: language === 'ar' ? 'التزامات' : 'Liabilities', color: 'bg-red-500' },
    { value: 'expense', label: language === 'ar' ? 'مصروفات' : 'Expenses', color: 'bg-orange-500' },
    { value: 'revenue', label: language === 'ar' ? 'إيرادات' : 'Revenue', color: 'bg-green-500' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other', color: 'bg-gray-500' }
  ];

  // Fetch accounts tree
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const response = await api.get('/chart-of-accounts', {
      
      });
      return response.data as AccountsResponse;
    }
  });

  const accounts = accountsData?.data || [];

  // Fetch flat tree for dropdown
  const { data: flatTreeData } = useQuery({
    queryKey: ['chart-of-accounts-flat'],
    queryFn: async () => {
      const response = await api.get('/accounts/flat/tree');
      return response.data as AccountsFlatTreeResponse;
    }
  });

  const flatAccounts = flatTreeData?.data || [];

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['chart-of-accounts-stats'],
    queryFn: async () => {
      const response = await api.get('/accounts/stats');
      return response.data as AccountsStats;
    }
  });

  const stats = statsData || {
    total_accounts: 0,
    main_accounts: 0,
    sub_accounts: 0,
    max_depth: 0,
    tree_levels: 0
  };

  // Fetch single account details when selected
  const { data: accountDetail } = useQuery({
    queryKey: ['account', selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return null;
      const response = await api.get(`/accounts/${selectedAccountId}`);
      return response.data as AccountDetailResponse;
    },
    enabled: !!selectedAccountId
  });

  // Build tree function
  const buildTree = (accounts: Account[]): Account[] => {
    const map = new Map<number, Account>();
    const roots: Account[] = [];

    accounts.forEach(acc => map.set(acc.id, { ...acc, children: [] }));

    accounts.forEach(acc => {
      const node = map.get(acc.id)!;
      // Find parent by checking if any account has this account as child in hierarchy
      const parent = accounts.find(a => 
        a.children?.some(child => child.id === acc.id)
      );
      
      if (parent && map.has(parent.id)) {
        map.get(parent.id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const accountTree = buildTree(accounts);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/chart-of-accounts', {
        code: data.code,
        name: data.name,
        parent_code: data.parent_code || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-flat'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-stats'] });
      toast.success(language === 'ar' ? 'تم إضافة الحساب بنجاح' : 'Account added successfully');
      handleCloseForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await api.put(`/chart-of-accounts/${id}`, {
        code: data.code,
        name: data.name,
        parent_code: data.parent_code || null
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-flat'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-stats'] });
      toast.success(language === 'ar' ? 'تم تحديث الحساب بنجاح' : 'Account updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete('/chart-of-accounts/delete', {
        data: { items: [id] }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-flat'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-stats'] });
      toast.success(language === 'ar' ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || error.message)
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setSelectedAccountId(null);
    setFormData({
      code: '',
      name: '',
      parent_code: '',
      level: 0
    });
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setSelectedAccountId(account.id);
    setFormData({
      code: account.code,
      name: account.name,
      parent_code: account.parent_code || '',
      level: account.level
    });
    setShowForm(true);
  };

  const handleViewDetails = (id: number) => {
    setSelectedAccountId(id);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleNode = (id: number) => {
    const newExpanded = new Set(expandedNodes);
    const idStr = id.toString();
    if (newExpanded.has(idStr)) {
      newExpanded.delete(idStr);
    } else {
      newExpanded.add(idStr);
    }
    setExpandedNodes(newExpanded);
  };

  const getAccountTypeBadge = (code: string) => {
    const type = getAccountTypeFromCode(code);
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <span className={`w-2 h-2 rounded-full ${type.color}`} />
        {type.label}
      </Badge>
    );
  };

  const renderAccountNode = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id.toString());
    const accountType = getAccountTypeFromCode(account.code);
    
    const matchesSearch = searchQuery === '' || 
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.code.includes(searchQuery);

    if (!matchesSearch && !hasChildren) return null;

    return (
      <div key={account.id}>
        <div
          className={`flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer`}
          style={{ paddingInlineStart: `${level * 24 + 12}px` }}
          onClick={() => handleViewDetails(account.id)}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(account.id);
                }}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </Button>
            ) : (
              <span className="w-6" />
            )}
            {hasChildren ? (
              <FolderOpen size={16} className="text-amber-500" />
            ) : (
              <FileText size={16} className="text-muted-foreground" />
            )}
            <span className="font-mono text-sm text-muted-foreground">{account.code}</span>
            <span className="font-medium">
              {account.name}
            </span>
            {getAccountTypeBadge(account.code)}
            {account.level === 0 && (
              <Badge variant="secondary" className="text-xs">
                {language === 'ar' ? 'رئيسي' : 'Main'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {Number(account.balance || 0).toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(account);
                }}
              >
                <Edit size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الحساب؟' : 'Are you sure you want to delete this account?')) {
                    deleteMutation.mutate(account.id);
                  }
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {account.children!.map(child => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get all possible parent accounts (excluding the current account and its children)
  const getParentOptions = () => {
    if (!editingAccount) return flatAccounts;
    
    // Filter out the current account and its potential children
    const currentCode = editingAccount.code;
    return flatAccounts.filter(acc => 
      !acc.code.startsWith(currentCode) && acc.code !== currentCode
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder={language === 'ar' ? 'بحث عن حساب...' : 'Search accounts...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10 w-72"
          />
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={18} />
          {language === 'ar' ? 'حساب جديد' : 'New Account'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'إجمالي الحسابات' : 'Total Accounts'}</p>
                <p className="text-lg font-bold text-blue-600">{stats.total_accounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'حسابات رئيسية' : 'Main Accounts'}</p>
                <p className="text-lg font-bold text-amber-600">{stats.main_accounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'حسابات فرعية' : 'Sub Accounts'}</p>
                <p className="text-lg font-bold text-green-600">{stats.sub_accounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'أقصى عمق' : 'Max Depth'}</p>
                <p className="text-lg font-bold text-purple-600">{stats.max_depth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-cyan-500/10 to-sky-500/10 border-cyan-200 dark:border-cyan-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-600" />
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مستويات الشجرة' : 'Tree Levels'}</p>
                <p className="text-lg font-bold text-cyan-600">{stats.tree_levels}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Types Summary */}
      <div className="grid grid-cols-5 gap-3">
        {accountTypes.map(type => {
          const typeAccounts = accounts.filter(a => getAccountTypeFromCode(a.code).value === type.value);
          const total = typeAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
          return (
            <Card key={type.value} className="text-center">
              <CardContent className="py-3">
                <div className={`w-3 h-3 rounded-full ${type.color} mx-auto mb-2`} />
                <p className="text-xs text-muted-foreground">{type.label}</p>
                <p className="font-bold">{typeAccounts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{total.toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Account Details if selected */}
      {selectedAccountId && accountDetail && (
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'كود الحساب' : 'Account Code'}</p>
                  <p className="font-mono font-bold">{accountDetail.data.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'اسم الحساب' : 'Account Name'}</p>
                  <p className="font-medium">{accountDetail.data.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المستوى' : 'Level'}</p>
                  <p className="font-medium">{accountDetail.data.level}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الرصيد' : 'Balance'}</p>
                  <p className="font-bold">{Number(accountDetail.data.balance || 0).toLocaleString()}</p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <span className={`w-2 h-2 rounded-full ${getAccountTypeFromCode(accountDetail.data.code).color}`} />
                {getAccountTypeFromCode(accountDetail.data.code).label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts Tree */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen size={20} />
            {language === 'ar' ? 'شجرة الحسابات' : 'Chart of Accounts'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : accountTree.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد حسابات' : 'No accounts found'}
              </div>
            ) : (
              <div className="p-2">
                {accountTree.map(account => renderAccountNode(account))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Account Form Dialog */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAccount
                ? (language === 'ar' ? 'تعديل الحساب' : 'Edit Account')
                : (language === 'ar' ? 'حساب جديد' : 'New Account')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'كود الحساب' : 'Account Code'} *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="1101"
                />
                {formData.code && (
                  <p className="text-xs text-muted-foreground">
                    {getAccountTypeFromCode(formData.code).label}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم الحساب' : 'Account Name'} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الحساب الأب' : 'Parent Account'}</Label>
              <Select
                value={formData.parent_code}
                onValueChange={(v) => setFormData(prev => ({ ...prev, parent_code: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الحساب الأب' : 'Select parent'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                  {getParentOptions().map(acc => (
                    <SelectItem key={acc.id} value={acc.code}>
                      {acc.full_path || `${acc.code} - ${acc.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.parent_code && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                {language === 'ar' ? 'المستوى المتوقع' : 'Expected Level'}: {formData.level + 1}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingAccount
                ? (language === 'ar' ? 'تحديث' : 'Update')
                : (language === 'ar' ? 'إضافة' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChartOfAccounts;