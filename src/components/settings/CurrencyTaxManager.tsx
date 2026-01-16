import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { DollarSign, Percent, Plus, Edit, Trash2, Save, Star } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Currency {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  symbol: string;
  country_code: string | null;
  exchange_rate: number;
  is_active: boolean;
  is_default: boolean;
  decimal_places: number;
  sort_order: number;
}

interface TaxRate {
  id: string;
  name: string;
  name_ar: string | null;
  rate: number;
  is_active: boolean;
  is_default: boolean;
}

const CurrencyTaxManager = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  
  // Currency state
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [currencyForm, setCurrencyForm] = useState({
    code: '',
    name: '',
    name_ar: '',
    symbol: '',
    country_code: '',
    exchange_rate: 1,
    decimal_places: 2,
    sort_order: 0
  });

  // Tax state
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRate | null>(null);
  const [taxForm, setTaxForm] = useState({
    name: '',
    name_ar: '',
    rate: 0
  });

  // Fetch currencies
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Currency[];
    }
  });

  // Fetch tax rates
  const { data: taxRates = [], isLoading: taxLoading } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .order('rate', { ascending: true });
      if (error) throw error;
      return data as TaxRate[];
    }
  });

  // Currency mutations
  const saveCurrencyMutation = useMutation({
    mutationFn: async (data: typeof currencyForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('currencies')
          .update({
            code: data.code,
            name: data.name,
            name_ar: data.name_ar,
            symbol: data.symbol,
            country_code: data.country_code || null,
            exchange_rate: data.exchange_rate,
            decimal_places: data.decimal_places,
            sort_order: data.sort_order
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('currencies').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast({ title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
      resetCurrencyForm();
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'An error occurred', variant: 'destructive' });
    }
  });

  const toggleCurrencyActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('currencies').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currencies'] })
  });

  const setDefaultCurrencyMutation = useMutation({
    mutationFn: async (id: string) => {
      // Remove default from all
      await supabase.from('currencies').update({ is_default: false }).neq('id', '');
      // Set new default
      const { error } = await supabase.from('currencies').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast({ title: language === 'ar' ? 'تم تعيين العملة الافتراضية' : 'Default currency set' });
    }
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('currencies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast({ title: language === 'ar' ? 'تم الحذف' : 'Deleted' });
    }
  });

  // Tax mutations
  const saveTaxMutation = useMutation({
    mutationFn: async (data: typeof taxForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('tax_rates')
          .update({ name: data.name, name_ar: data.name_ar, rate: data.rate })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tax_rates').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast({ title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
      resetTaxForm();
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'An error occurred', variant: 'destructive' });
    }
  });

  const toggleTaxActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('tax_rates').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
  });

  const setDefaultTaxMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('tax_rates').update({ is_default: false }).neq('id', '');
      const { error } = await supabase.from('tax_rates').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast({ title: language === 'ar' ? 'تم تعيين الضريبة الافتراضية' : 'Default tax set' });
    }
  });

  const deleteTaxMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tax_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast({ title: language === 'ar' ? 'تم الحذف' : 'Deleted' });
    }
  });

  const resetCurrencyForm = () => {
    setCurrencyDialogOpen(false);
    setEditingCurrency(null);
    setCurrencyForm({ code: '', name: '', name_ar: '', symbol: '', country_code: '', exchange_rate: 1, decimal_places: 2, sort_order: 0 });
  };

  const resetTaxForm = () => {
    setTaxDialogOpen(false);
    setEditingTax(null);
    setTaxForm({ name: '', name_ar: '', rate: 0 });
  };

  const openEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    setCurrencyForm({
      code: currency.code,
      name: currency.name,
      name_ar: currency.name_ar,
      symbol: currency.symbol,
      country_code: currency.country_code || '',
      exchange_rate: currency.exchange_rate,
      decimal_places: currency.decimal_places,
      sort_order: currency.sort_order
    });
    setCurrencyDialogOpen(true);
  };

  const openEditTax = (tax: TaxRate) => {
    setEditingTax(tax);
    setTaxForm({ name: tax.name, name_ar: tax.name_ar || '', rate: tax.rate });
    setTaxDialogOpen(true);
  };

  const t = {
    currencies: language === 'ar' ? 'العملات' : 'Currencies',
    taxRates: language === 'ar' ? 'معدلات الضريبة' : 'Tax Rates',
    addCurrency: language === 'ar' ? 'إضافة عملة' : 'Add Currency',
    editCurrency: language === 'ar' ? 'تعديل العملة' : 'Edit Currency',
    addTax: language === 'ar' ? 'إضافة ضريبة' : 'Add Tax',
    editTax: language === 'ar' ? 'تعديل الضريبة' : 'Edit Tax',
    code: language === 'ar' ? 'الكود' : 'Code',
    name: language === 'ar' ? 'الاسم' : 'Name',
    nameAr: language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name',
    symbol: language === 'ar' ? 'الرمز' : 'Symbol',
    exchangeRate: language === 'ar' ? 'سعر الصرف' : 'Exchange Rate',
    rate: language === 'ar' ? 'النسبة' : 'Rate',
    active: language === 'ar' ? 'نشط' : 'Active',
    default: language === 'ar' ? 'افتراضي' : 'Default',
    actions: language === 'ar' ? 'الإجراءات' : 'Actions',
    save: language === 'ar' ? 'حفظ' : 'Save',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    confirmDelete: language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?',
    setDefault: language === 'ar' ? 'تعيين كافتراضي' : 'Set as default',
    noData: language === 'ar' ? 'لا توجد بيانات' : 'No data',
  };

  return (
    <div className="space-y-6">
      {/* Currencies Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              {t.currencies}
            </CardTitle>
            <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" onClick={() => { setEditingCurrency(null); setCurrencyForm({ code: '', name: '', name_ar: '', symbol: '', country_code: '', exchange_rate: 1, decimal_places: 2, sort_order: currencies.length }); }}>
                  <Plus size={16} />
                  {t.addCurrency}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCurrency ? t.editCurrency : t.addCurrency}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.code}</Label>
                      <Input value={currencyForm.code} onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })} placeholder="USD" maxLength={5} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.symbol}</Label>
                      <Input value={currencyForm.symbol} onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })} placeholder="$" maxLength={5} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.name}</Label>
                      <Input value={currencyForm.name} onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })} placeholder="US Dollar" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.nameAr}</Label>
                      <Input value={currencyForm.name_ar} onChange={(e) => setCurrencyForm({ ...currencyForm, name_ar: e.target.value })} placeholder="دولار أمريكي" dir="rtl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.exchangeRate}</Label>
                    <Input type="number" step="0.0001" value={currencyForm.exchange_rate} onChange={(e) => setCurrencyForm({ ...currencyForm, exchange_rate: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetCurrencyForm}>{t.cancel}</Button>
                  <Button onClick={() => saveCurrencyMutation.mutate({ ...currencyForm, id: editingCurrency?.id })} disabled={saveCurrencyMutation.isPending}>
                    <Save size={16} className="mr-2" />
                    {t.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.code}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.symbol}</TableHead>
                <TableHead>{t.exchangeRate}</TableHead>
                <TableHead>{t.default}</TableHead>
                <TableHead>{t.active}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currenciesLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : currencies.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t.noData}</TableCell></TableRow>
              ) : (
                currencies.map((currency) => (
                  <TableRow key={currency.id}>
                    <TableCell className="font-mono font-bold">{currency.code}</TableCell>
                    <TableCell>{language === 'ar' ? currency.name_ar : currency.name}</TableCell>
                    <TableCell className="text-xl">{currency.symbol}</TableCell>
                    <TableCell>{currency.exchange_rate}</TableCell>
                    <TableCell>
                      {currency.is_default ? (
                        <Badge className="bg-primary"><Star size={12} className="mr-1" />{t.default}</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setDefaultCurrencyMutation.mutate(currency.id)}>
                          {t.setDefault}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={currency.is_active} onCheckedChange={(checked) => toggleCurrencyActiveMutation.mutate({ id: currency.id, is_active: checked })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditCurrency(currency)}><Edit size={16} /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 size={16} /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCurrencyMutation.mutate(currency.id)}>{t.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tax Rates Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Percent size={20} />
              {t.taxRates}
            </CardTitle>
            <Dialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" onClick={() => { setEditingTax(null); setTaxForm({ name: '', name_ar: '', rate: 0 }); }}>
                  <Plus size={16} />
                  {t.addTax}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTax ? t.editTax : t.addTax}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.name}</Label>
                      <Input value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })} placeholder="VAT 15%" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.nameAr}</Label>
                      <Input value={taxForm.name_ar} onChange={(e) => setTaxForm({ ...taxForm, name_ar: e.target.value })} placeholder="ضريبة القيمة المضافة 15%" dir="rtl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.rate} (%)</Label>
                    <Input type="number" min="0" max="100" step="0.01" value={taxForm.rate} onChange={(e) => setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetTaxForm}>{t.cancel}</Button>
                  <Button onClick={() => saveTaxMutation.mutate({ ...taxForm, id: editingTax?.id })} disabled={saveTaxMutation.isPending}>
                    <Save size={16} className="mr-2" />
                    {t.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.rate}</TableHead>
                <TableHead>{t.default}</TableHead>
                <TableHead>{t.active}</TableHead>
                <TableHead>{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : taxRates.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t.noData}</TableCell></TableRow>
              ) : (
                taxRates.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{language === 'ar' ? tax.name_ar || tax.name : tax.name}</TableCell>
                    <TableCell><Badge variant="outline">{tax.rate}%</Badge></TableCell>
                    <TableCell>
                      {tax.is_default ? (
                        <Badge className="bg-primary"><Star size={12} className="mr-1" />{t.default}</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setDefaultTaxMutation.mutate(tax.id)}>
                          {t.setDefault}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={tax.is_active} onCheckedChange={(checked) => toggleTaxActiveMutation.mutate({ id: tax.id, is_active: checked })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditTax(tax)}><Edit size={16} /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 size={16} /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTaxMutation.mutate(tax.id)}>{t.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencyTaxManager;
