import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface POSExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId?: number | null;
  onSaved?: () => Promise<void> | void;
}

const POSExpenseDialog: React.FC<POSExpenseDialogProps> = ({ open, onOpenChange, shiftId, onSaved }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!shiftId) {
      toast.error('افتح وردية أولاً قبل تسجيل مصروف.');
      return;
    }
    if (!numericAmount || numericAmount <= 0 || !description.trim()) {
      toast.error('اكتب قيمة المصروف وبيانه.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/pos/expenses', {
        amount: numericAmount,
        description: description.trim(),
        cashier_shift_id: shiftId,
      });
      toast.success('تم تسجيل المصروف وخصمه من الخزنة والوردية.');
      setAmount('');
      setDescription('');
      onOpenChange(false);
      await onSaved?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'تعذر تسجيل المصروف.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />مصروف من الخزنة</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            سيتم تسجيل المصروف في شاشة المصروفات وربطه بالوردية الحالية، وخصمه من النقدي المتوقع عند الإغلاق.
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-expense-amount">القيمة</Label>
            <Input id="pos-expense-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-expense-description">بيان المصروف</Label>
            <Textarea id="pos-expense-description" placeholder="مثال: مواصلات / ضيافة / أدوات مكتبية" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={saving || !shiftId}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}تسجيل المصروف</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default POSExpenseDialog;
