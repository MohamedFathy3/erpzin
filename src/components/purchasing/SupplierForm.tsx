import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Building2, User, Phone, Mail, MapPin, CreditCard, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Supplier {
  id: number | string;
  name: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  is_active?: boolean;
  active?: number;
  note?: string;
}

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editSupplier?: Supplier;
}

const SupplierForm: React.FC<SupplierFormProps> = ({
  isOpen,
  onClose,
  onSave,
  editSupplier
}) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    credit_limit: 0,
    payment_terms: 30,
    is_active: true
  });

  useEffect(() => {
    if (editSupplier) {
      setFormData({
        name: editSupplier.name || '',
        name_ar: editSupplier.name_ar || '',
        contact_person: editSupplier.contact_person || '',
        phone: editSupplier.phone || '',
        email: editSupplier.email || '',
        address: editSupplier.address || '',
        tax_number: editSupplier.tax_number || '',
        credit_limit: editSupplier.credit_limit || 0,
        payment_terms: editSupplier.payment_terms || 30,
        is_active: editSupplier.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        name_ar: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        tax_number: '',
        credit_limit: 0,
        payment_terms: 30,
        is_active: true
      });
    }
  }, [editSupplier, isOpen]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'اسم المورد مطلوب' : 'Supplier name is required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const body = {
        name: formData.name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        address: formData.address,
        tax_number: formData.tax_number,
        //note: formData.note || '', 
        credit_limit: formData.credit_limit,
        payment_terms: formData.payment_terms,
        active: formData.is_active ? 1 : 0
      };

      if (editSupplier) {
        // Update existing supplier
        await api.put(`/suppliers/${editSupplier.id}`, body);
      } else {
        // Create new supplier
        await api.post('/suppliers', body);
      }

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ بيانات المورد بنجاح' : 'Supplier saved successfully'
      });

      onSave();
      onClose();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong';
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="text-primary" size={22} />
            {editSupplier
              ? (language === 'ar' ? 'تعديل المورد' : 'Edit Supplier')
              : (language === 'ar' ? 'إضافة مورد جديد' : 'Add New Supplier')
            }
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 size={14} />
                {language === 'ar' ? 'اسم المورد (إنجليزي)' : 'Supplier Name (English)'}
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={language === 'ar' ? 'اسم المورد' : 'Supplier name'}
              />
            </div>
            {/* <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 size={14} />
                {language === 'ar' ? 'اسم المورد (عربي)' : 'Supplier Name (Arabic)'}
              </Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                placeholder={language === 'ar' ? 'اسم المورد بالعربي' : 'Arabic name'}
                dir="rtl"
              />
            </div> */}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User size={14} />
                {language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}
              </Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder={language === 'ar' ? 'اسم جهة الاتصال' : 'Contact name'}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone size={14} />
                {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+967..."
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail size={14} />
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText size={14} />
                {language === 'ar' ? 'الرقم الضريبي' : 'Tax Number'}
              </Label>
              <Input
                value={formData.tax_number}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_number: e.target.value }))}
                placeholder={language === 'ar' ? 'الرقم الضريبي' : 'Tax number'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin size={14} />
              {language === 'ar' ? 'العنوان' : 'Address'}
            </Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder={language === 'ar' ? 'عنوان المورد' : 'Supplier address'}
              rows={2}
            />
          </div>

          {/* Financial Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard size={14} />
                {language === 'ar' ? 'حد الائتمان' : 'Credit Limit'}
              </Label>
              <Input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'شروط الدفع (أيام)' : 'Payment Terms (days)'}</Label>
              <Input
                type="number"
                value={formData.payment_terms}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: Number(e.target.value) }))}
                placeholder="30"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label>{language === 'ar' ? 'المورد نشط' : 'Supplier Active'}</Label>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'تفعيل أو تعطيل المورد' : 'Enable or disable supplier'}
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (language === 'ar' ? 'حفظ' : 'Save')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierForm;
