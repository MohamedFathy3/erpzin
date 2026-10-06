// components/CRM/CustomerDialog.tsx
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomerFormData, Customer } from '@/types/loyalty';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSubmit: (data: CustomerFormData) => void;
  isLoading: boolean;
  translations: any;
}

export const CustomerDialog: React.FC<CustomerDialogProps> = ({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isLoading,
  translations
}) => {
  const [formData, setFormData] = React.useState<CustomerFormData>({
    name: '',
    name_ar: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        name_ar: customer.name_ar || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      });
    } else {
      setFormData({
        name: '',
        name_ar: '',
        phone: '',
        email: '',
        address: ''
      });
    }
  }, [customer, open]);

  const handleSubmit = () => {
    if (!formData.name) return;
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {customer ? translations.editCustomer : translations.newCustomer}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{translations.name} *</Label>
            <Input
              placeholder={translations.name}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{translations.nameAr}</Label>
            <Input
              placeholder={translations.nameAr}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{translations.phone}</Label>
            <Input
              placeholder={translations.phone}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>{translations.email}</Label>
            <Input
              placeholder={translations.email}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>{translations.address}</Label>
            <Input
              placeholder={translations.address}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={!formData.name || isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin me-2" />
                {translations.saving}
              </>
            ) : (
              translations.save
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};