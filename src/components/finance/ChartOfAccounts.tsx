import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, ChevronRight, ChevronDown, FolderOpen, FileText, Edit, Trash2, Search } from 'lucide-react';

interface ChartOfAccountsProps {
  language: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  account_type: string;
  parent_id: string | null;
  is_active: boolean;
  is_header: boolean;
  balance: number;
  notes: string | null;
  children?: Account[];
}

const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    account_type: 'asset',
    parent_id: '',
    is_header: false,
    notes: ''
  });

  const accountTypes = [
    { value: 'asset', label: language === 'ar' ? 'أصول' : 'Assets', color: 'bg-blue-500' },
    { value: 'liability', label: language === 'ar' ? 'التزامات' : 'Liabilities', color: 'bg-red-500' },
    { value: 'equity', label: language === 'ar' ? 'حقوق ملكية' : 'Equity', color: 'bg-purple-500' },
    { value: 'revenue', label: language === 'ar' ? 'إيرادات' : 'Revenue', color: 'bg-green-500' },
    { value: 'expense', label: language === 'ar' ? 'مصروفات' : 'Expenses', color: 'bg-orange-500' }
  ];

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as Account[];
    }
  });

  const buildTree = (accounts: Account[]): Account[] => {
    const map = new Map<string, Account>();
    const roots: Account[] = [];

    accounts.forEach(acc => map.set(acc.id, { ...acc, children: [] }));

    accounts.forEach(acc => {
      const node = map.get(acc.id)!;
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const accountTree = buildTree(accounts);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('chart_of_accounts').insert({
        code: data.code,
        name: data.name,
        name_ar: data.name_ar || null,
        account_type: data.account_type,
        parent_id: data.parent_id === 'none' ? null : data.parent_id || null,
        is_header: data.is_header,
        notes: data.notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success(language === 'ar' ? 'تم إضافة الحساب بنجاح' : 'Account added successfully');
      handleCloseForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({
          code: data.code,
          name: data.name,
          name_ar: data.name_ar || null,
          account_type: data.account_type,
          parent_id: data.parent_id === 'none' ? null : data.parent_id || null,
          is_header: data.is_header,
          notes: data.notes || null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success(language === 'ar' ? 'تم تحديث الحساب بنجاح' : 'Account updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success(language === 'ar' ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      account_type: 'asset',
      parent_id: '',
      is_header: false,
      notes: ''
    });
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      name_ar: account.name_ar || '',
      account_type: account.account_type,
      parent_id: account.parent_id || '',
      is_header: account.is_header,
      notes: account.notes || ''
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name || !formData.account_type) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const getAccountTypeBadge = (type: string) => {
    const t = accountTypes.find(at => at.value === type);
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <span className={`w-2 h-2 rounded-full ${t?.color || 'bg-gray-500'}`} />
        {t?.label || type}
      </Badge>
    );
  };

  const renderAccountNode = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const matchesSearch = searchQuery === '' || 
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.code.includes(searchQuery);

    if (!matchesSearch && !hasChildren) return null;

    return (
      <div key={account.id}>
        <div
          className={`flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors`}
          style={{ paddingInlineStart: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleNode(account.id)}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </Button>
            ) : (
              <span className="w-6" />
            )}
            {account.is_header ? (
              <FolderOpen size={16} className="text-amber-500" />
            ) : (
              <FileText size={16} className="text-muted-foreground" />
            )}
            <span className="font-mono text-sm text-muted-foreground">{account.code}</span>
            <span className="font-medium">
              {language === 'ar' ? account.name_ar || account.name : account.name}
            </span>
            {getAccountTypeBadge(account.account_type)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {Number(account.balance).toLocaleString()} ر.ي
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(account)}>
              <Edit size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(account.id)}
            >
              <Trash2 size={14} />
            </Button>
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

  const headerAccounts = accounts.filter(a => a.is_header);

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-5 gap-3">
        {accountTypes.map(type => {
          const typeAccounts = accounts.filter(a => a.account_type === type.value);
          const total = typeAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
          return (
            <Card key={type.value} className="text-center">
              <CardContent className="py-3">
                <div className={`w-3 h-3 rounded-full ${type.color} mx-auto mb-2`} />
                <p className="text-xs text-muted-foreground">{type.label}</p>
                <p className="font-bold">{typeAccounts.length}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'نوع الحساب' : 'Account Type'} *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, account_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم الحساب (إنجليزي)' : 'Account Name (EN)'} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم الحساب (عربي)' : 'Account Name (AR)'}</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الحساب الأب' : 'Parent Account'}</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, parent_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الحساب الأب' : 'Select parent'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                  {headerAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {language === 'ar' ? acc.name_ar || acc.name : acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_header"
                checked={formData.is_header}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_header: !!checked }))}
              />
              <Label htmlFor="is_header" className="cursor-pointer">
                {language === 'ar' ? 'حساب رئيسي (مجموعة)' : 'Header Account (Group)'}
              </Label>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
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
