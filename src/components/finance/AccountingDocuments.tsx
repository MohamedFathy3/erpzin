import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useDefaultCurrencyFormatter } from '@/hooks/useCurrencyTax';

type Props = { language: string };
const AccountingDocuments = ({ language }: Props) => {
  const ar = language === 'ar';
  const client = useQueryClient();
  const { toast } = useToast();
  const { defaultCurrency, formatDefaultCurrency } = useDefaultCurrencyFormatter();
  const [type, setType] = useState<'receipt' | 'payment' | 'transfer'>('receipt');
  const [form, setForm] = useState({
    document_date: new Date().toISOString().slice(0, 10),
    amount: '',
    source_account_id: '',
    destination_account_id: '',
    treasury_id: '',
    reason: '',
    notes: '',
  });

  const accounts = useQuery({
    queryKey: ['accounting-accounts'],
    queryFn: async () => {
      const response = await api.get('/accounts');
      return response.data?.data || [];
    },
  });
  const treasuries = useQuery({
    queryKey: ['accounting-treasuries'],
    queryFn: async () => {
      const response = await api.post('/treasury/index', { filters: {}, perPage: 100, paginate: false });
      return response.data?.data || [];
    },
  });
  const docs = useQuery({
    queryKey: ['accounting-documents', type],
    queryFn: async () => {
      const response = await api.get('/accounting/documents', { params: { type, per_page: 50 } });
      return response.data?.data || [];
    },
  });
  const save = useMutation({
    mutationFn: async () => api.post('/accounting/documents', {
      ...form,
      document_type: type,
      amount: Number(form.amount),
      source_account_id: Number(form.source_account_id),
      destination_account_id: Number(form.destination_account_id),
      treasury_id: form.treasury_id ? Number(form.treasury_id) : null,
    }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['accounting-documents'] });
      setForm({ ...form, amount: '', reason: '', notes: '' });
      toast({ title: ar ? 'تم حفظ المستند وترحيل القيد' : 'Document saved and journal posted' });
    },
    onError: (error: any) => toast({
      variant: 'destructive',
      title: error?.message || (ar ? 'تعذر الحفظ' : 'Save failed'),
    }),
  });

  const accountOptions = accounts.data || [];
  const currencyLabel = defaultCurrency?.symbol || defaultCurrency?.code || '';

  return (
    <Card dir={ar ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle>{ar ? 'سندات القبض والصرف والتحويلات' : 'Receipts, payments and transfers'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={type} onValueChange={value => setType(value as typeof type)}>
          <TabsList>
            <TabsTrigger value="receipt">{ar ? 'سند قبض' : 'Receipt'}</TabsTrigger>
            <TabsTrigger value="payment">{ar ? 'سند صرف' : 'Payment'}</TabsTrigger>
            <TabsTrigger value="transfer">{ar ? 'تحويل' : 'Transfer'}</TabsTrigger>
          </TabsList>
          <TabsContent value={type}>
            <div className="grid gap-3 md:grid-cols-3 mt-4">
              <div>
                <Label>{ar ? 'التاريخ' : 'Date'}</Label>
                <Input
                  type="date"
                  value={form.document_date}
                  onChange={event => setForm({ ...form, document_date: event.target.value })}
                />
              </div>
              <div>
                <Label>{ar ? `المبلغ${currencyLabel ? ` (${currencyLabel})` : ''}` : `Amount${currencyLabel ? ` (${currencyLabel})` : ''}`}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={event => setForm({ ...form, amount: event.target.value })}
                />
              </div>
              <div>
                <Label>{ar ? 'الخزينة/البنك' : 'Treasury/bank'}</Label>
                <Select value={form.treasury_id} onValueChange={value => setForm({ ...form, treasury_id: value })}>
                  <SelectTrigger><SelectValue placeholder={ar ? 'اختر الخزينة' : 'Select treasury'} /></SelectTrigger>
                  <SelectContent>
                    {(treasuries.data || []).map((treasury: any) => (
                      <SelectItem key={treasury.id} value={String(treasury.id)}>{treasury.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ar ? 'الحساب الدائن' : 'Credit account'}</Label>
                <Select value={form.source_account_id} onValueChange={value => setForm({ ...form, source_account_id: value })}>
                  <SelectTrigger><SelectValue placeholder={ar ? 'اختر الحساب' : 'Select account'} /></SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((account: any) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.code} - {ar ? account.name_ar || account.name : account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ar ? 'الحساب المدين' : 'Debit account'}</Label>
                <Select value={form.destination_account_id} onValueChange={value => setForm({ ...form, destination_account_id: value })}>
                  <SelectTrigger><SelectValue placeholder={ar ? 'اختر الحساب' : 'Select account'} /></SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((account: any) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.code} - {ar ? account.name_ar || account.name : account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ar ? 'البيان' : 'Reason'}</Label>
                <Input value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} />
              </div>
            </div>
            <Button
              className="mt-4"
              disabled={save.isPending || !form.amount || !form.source_account_id || !form.destination_account_id || !form.reason}
              onClick={() => save.mutate()}
            >
              {ar ? 'حفظ وترحيل القيد' : 'Save and post journal'}
            </Button>
          </TabsContent>
        </Tabs>
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'الرقم' : 'No.'}</TableHead>
                <TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{ar ? 'البيان' : 'Reason'}</TableHead>
                <TableHead>{ar ? `المبلغ${currencyLabel ? ` (${currencyLabel})` : ''}` : `Amount${currencyLabel ? ` (${currencyLabel})` : ''}`}</TableHead>
                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(docs.data || []).map((document: any) => (
                <TableRow key={document.id}>
                  <TableCell>{document.document_number}</TableCell>
                  <TableCell>{document.document_date}</TableCell>
                  <TableCell>{document.reason}</TableCell>
                  <TableCell>{formatDefaultCurrency(Number(document.amount))}</TableCell>
                  <TableCell>{document.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountingDocuments;
