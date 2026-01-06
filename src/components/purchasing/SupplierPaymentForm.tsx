import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Wallet, Building2, CreditCard, Calendar, Loader2, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SupplierPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  preselectedSupplier?: any;
}

const SupplierPaymentForm: React.FC<SupplierPaymentFormProps> = ({
  isOpen,
  onClose,
  onSave,
  preselectedSupplier
}) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    amount: 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-with-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (preselectedSupplier) {
      setFormData(prev => ({ ...prev, supplier_id: preselectedSupplier.id }));
    }
  }, [preselectedSupplier]);

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
  const currentBalance = Number(selectedSupplier?.balance) || 0;

  const handleSubmit = async () => {
    if (!formData.supplier_id) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار المورد' : 'Please select a supplier',
        variant: 'destructive'
      });
      return;
    }

    if (formData.amount <= 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount',
        variant: 'destructive'
      });
      return;
    }

    if (formData.amount > currentBalance) {
      toast({
        title: language === 'ar' ? 'تحذير' : 'Warning',
        description: language === 'ar' 
          ? 'المبلغ المدخل أكبر من رصيد المورد'
          : 'Amount is greater than supplier balance',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Generate payment number
      const { data: paymentNumber } = await supabase.rpc('generate_payment_number');

      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from('supplier_payments')
        .insert({
          payment_number: paymentNumber,
          supplier_id: formData.supplier_id,
          amount: formData.amount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          reference_number: formData.reference_number || null,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update supplier balance
      const newBalance = currentBalance - formData.amount;
      await supabase
        .from('suppliers')
        .update({ balance: newBalance })
        .eq('id', formData.supplier_id);

      // Create supplier transaction
      await supabase
        .from('supplier_transactions')
        .insert({
          supplier_id: formData.supplier_id,
          transaction_type: 'payment',
          reference_type: 'supplier_payment',
          reference_id: payment.id,
          amount: formData.amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: `دفعة للمورد رقم ${paymentNumber}`
        });

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' 
          ? `تم تسجيل الدفعة رقم ${paymentNumber}`
          : `Payment ${paymentNumber} recorded`
      });

      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="text-primary" size={22} />
            {language === 'ar' ? 'تسجيل دفعة للمورد' : 'Record Supplier Payment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Supplier */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 size={14} />
              {language === 'ar' ? 'المورد' : 'Supplier'} *
            </Label>
            <Select 
              value={formData.supplier_id} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, supplier_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر المورد' : 'Select supplier'} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.filter((s: any) => Number(s.balance) > 0).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{language === 'ar' ? s.name_ar || s.name : s.name}</span>
                      <span className="text-xs text-destructive ms-2">
                        ({Number(s.balance).toLocaleString()})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Balance */}
          {selectedSupplier && (
            <div className="p-4 bg-destructive/10 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">{language === 'ar' ? 'الرصيد المستحق' : 'Balance Due'}</span>
                <span className="text-lg font-bold text-destructive">
                  {currentBalance.toLocaleString()} YER
                </span>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المبلغ' : 'Amount'} *</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard size={14} />
              {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
            </Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                <SelectItem value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                <SelectItem value="check">{language === 'ar' ? 'شيك' : 'Check'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar size={14} />
              {language === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}
            </Label>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText size={14} />
              {language === 'ar' ? 'رقم المرجع' : 'Reference Number'}
            </Label>
            <Input
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              placeholder={language === 'ar' ? 'رقم الشيك/الحوالة' : 'Check/Transfer number'}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={language === 'ar' ? 'ملاحظات...' : 'Notes...'}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="me-2 animate-spin" />
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              language === 'ar' ? 'تسجيل الدفعة' : 'Record Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierPaymentForm;
