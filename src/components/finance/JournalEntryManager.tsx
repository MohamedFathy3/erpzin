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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, FileText, Check, X, Eye, Trash2, Search, Calendar, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface JournalEntryManagerProps {
  language: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  account_type: string;
  is_header: boolean;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string | null;
  description_ar: string | null;
  reference_type: string | null;
  total_debit: number;
  total_credit: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface JournalEntryLine {
  id?: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
  account?: Account;
}

const JournalEntryManager: React.FC<JournalEntryManagerProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    description_ar: '',
    notes: ''
  });
  
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
    { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }
  ]);

  // Fetch accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts-for-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('is_header', false)
        .order('code');
      if (error) throw error;
      return data as Account[];
    }
  });

  // Fetch journal entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-entries', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as JournalEntry[];
    }
  });

  // Fetch entry lines for selected entry
  const { data: entryLines = [] } = useQuery({
    queryKey: ['journal-entry-lines', selectedEntry?.id],
    enabled: !!selectedEntry?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          account:chart_of_accounts(id, code, name, name_ar, account_type)
        `)
        .eq('journal_entry_id', selectedEntry!.id);
      if (error) throw error;
      return data;
    }
  });

  // Generate entry number
  const generateEntryNumber = async () => {
    const { data, error } = await supabase.rpc('generate_journal_entry_number');
    if (error) throw error;
    return data;
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const entryNumber = await generateEntryNumber();
      const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit_amount), 0);
      const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit_amount), 0);

      // Insert entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          entry_number: entryNumber,
          entry_date: formData.entry_date,
          description: formData.description || null,
          description_ar: formData.description_ar || null,
          reference_type: 'manual',
          total_debit: totalDebit,
          total_credit: totalCredit,
          notes: formData.notes || null,
          status: 'draft'
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Insert lines
      const linesToInsert = lines
        .filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0))
        .map(l => ({
          journal_entry_id: entry.id,
          account_id: l.account_id,
          debit_amount: l.debit_amount,
          credit_amount: l.credit_amount,
          description: l.description || null
        }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesToInsert);

      if (linesError) throw linesError;
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(language === 'ar' ? 'تم إنشاء القيد بنجاح' : 'Journal entry created successfully');
      handleCloseForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  // Post entry mutation
  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('journal_entries')
        .update({ status: 'posted', approved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success(language === 'ar' ? 'تم ترحيل القيد بنجاح' : 'Entry posted successfully');
      setShowDetails(false);
    },
    onError: (error: any) => toast.error(error.message)
  });

  // Cancel entry mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('journal_entries')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success(language === 'ar' ? 'تم إلغاء القيد بنجاح' : 'Entry cancelled successfully');
      setShowDetails(false);
    },
    onError: (error: any) => toast.error(error.message)
  });

  // Delete entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(language === 'ar' ? 'تم حذف القيد بنجاح' : 'Entry deleted successfully');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      description_ar: '',
      notes: ''
    });
    setLines([
      { account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
      { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }
    ]);
  };

  const handleAddLine = () => {
    setLines([...lines, { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = () => {
    const validLines = lines.filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0));
    
    if (validLines.length < 2) {
      toast.error(language === 'ar' ? 'يجب إضافة بندين على الأقل' : 'At least 2 lines required');
      return;
    }

    const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit_amount), 0);
    const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit_amount), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error(language === 'ar' ? 'القيد غير متوازن' : 'Entry is not balanced');
      return;
    }

    createMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      posted: { ar: 'مرحل', en: 'Posted' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' }
    };
    return (
      <Badge className={styles[status] || ''}>
        {language === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </Badge>
    );
  };

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit_amount), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit_amount), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const filteredEntries = entries.filter(e =>
    e.entry_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description_ar?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder={language === 'ar' ? 'بحث عن قيد...' : 'Search entries...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
              <SelectItem value="posted">{language === 'ar' ? 'مرحل' : 'Posted'}</SelectItem>
              <SelectItem value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={18} />
          {language === 'ar' ? 'قيد جديد' : 'New Entry'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي القيود' : 'Total Entries'}</p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المرحلة' : 'Posted'}</p>
            <p className="text-2xl font-bold text-green-600">{entries.filter(e => e.status === 'posted').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المسودات' : 'Drafts'}</p>
            <p className="text-2xl font-bold text-amber-600">{entries.filter(e => e.status === 'draft').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={20} />
            {language === 'ar' ? 'القيود المحاسبية' : 'Journal Entries'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'رقم القيد' : 'Entry #'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المدين' : 'Debit'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الدائن' : 'Credit'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد قيود' : 'No entries found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.entry_number}</TableCell>
                      <TableCell>{format(new Date(entry.entry_date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {language === 'ar' ? entry.description_ar || entry.description : entry.description}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {Number(entry.total_debit).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {Number(entry.total_credit).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowDetails(true);
                            }}
                          >
                            <Eye size={16} />
                          </Button>
                          {entry.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteMutation.mutate(entry.id)}
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
      </Card>

      {/* New Entry Dialog */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'قيد محاسبي جديد' : 'New Journal Entry'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                <Input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (EN)'}</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الوصف (عربي)' : 'Description (AR)'}</Label>
                <Input
                  value={formData.description_ar}
                  onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Entry Lines */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{language === 'ar' ? 'بنود القيد' : 'Entry Lines'}</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                  <Plus size={16} className="me-1" />
                  {language === 'ar' ? 'إضافة بند' : 'Add Line'}
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[300px]">{language === 'ar' ? 'الحساب' : 'Account'}</TableHead>
                      <TableHead className="w-[150px]">{language === 'ar' ? 'مدين' : 'Debit'}</TableHead>
                      <TableHead className="w-[150px]">{language === 'ar' ? 'دائن' : 'Credit'}</TableHead>
                      <TableHead>{language === 'ar' ? 'البيان' : 'Description'}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
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
                              <SelectValue placeholder={language === 'ar' ? 'اختر حساب' : 'Select account'} />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.code} - {language === 'ar' ? acc.name_ar || acc.name : acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.debit_amount || ''}
                            onChange={(e) => handleLineChange(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.credit_amount || ''}
                            onChange={(e) => handleLineChange(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) => handleLineChange(index, 'description', e.target.value)}
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
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                      <TableCell className="text-center">{totalDebit.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{totalCredit.toLocaleString()}</TableCell>
                      <TableCell colSpan={2}>
                        {isBalanced ? (
                          <Badge className="bg-green-100 text-green-800">
                            {language === 'ar' ? 'متوازن' : 'Balanced'}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            {language === 'ar' ? 'غير متوازن' : 'Not Balanced'} ({Math.abs(totalDebit - totalCredit).toLocaleString()})
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={!isBalanced || createMutation.isPending}>
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Details Dialog */}
      <Dialog open={showDetails} onOpenChange={() => setShowDetails(false)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              {language === 'ar' ? 'تفاصيل القيد' : 'Entry Details'} - {selectedEntry?.entry_number}
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                  <p className="font-medium">{format(new Date(selectedEntry.entry_date), 'yyyy-MM-dd')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                  {getStatusBadge(selectedEntry.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الوصف' : 'Description'}</p>
                  <p className="font-medium">
                    {language === 'ar' ? selectedEntry.description_ar || selectedEntry.description : selectedEntry.description}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{language === 'ar' ? 'الحساب' : 'Account'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'مدين' : 'Debit'}</TableHead>
                      <TableHead className="text-center">{language === 'ar' ? 'دائن' : 'Credit'}</TableHead>
                      <TableHead>{language === 'ar' ? 'البيان' : 'Description'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entryLines.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground me-2">
                            {line.account?.code}
                          </span>
                          {language === 'ar' ? line.account?.name_ar || line.account?.name : line.account?.name}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(line.debit_amount) > 0 ? Number(line.debit_amount).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(line.credit_amount) > 0 ? Number(line.credit_amount).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>{line.description}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableCell>
                      <TableCell className="text-center">{Number(selectedEntry.total_debit).toLocaleString()}</TableCell>
                      <TableCell className="text-center">{Number(selectedEntry.total_credit).toLocaleString()}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {selectedEntry.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                  <p>{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedEntry?.status === 'draft' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => cancelMutation.mutate(selectedEntry.id)}
                  disabled={cancelMutation.isPending}
                >
                  <X size={16} className="me-2" />
                  {language === 'ar' ? 'إلغاء' : 'Cancel Entry'}
                </Button>
                <Button
                  onClick={() => postMutation.mutate(selectedEntry.id)}
                  disabled={postMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check size={16} className="me-2" />
                  {language === 'ar' ? 'ترحيل' : 'Post Entry'}
                </Button>
              </>
            )}
            {selectedEntry?.status === 'posted' && (
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate(selectedEntry.id)}
                disabled={cancelMutation.isPending}
              >
                <X size={16} className="me-2" />
                {language === 'ar' ? 'عكس القيد' : 'Reverse Entry'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JournalEntryManager;
