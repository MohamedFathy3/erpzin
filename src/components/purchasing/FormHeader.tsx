// components/purchase/FormHeader.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText } from 'lucide-react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiPurchaseInvoice } from '@/types/purchaseform';

interface FormHeaderProps {
  isEditMode: boolean;
  invoiceToEdit?: ApiPurchaseInvoice | null;
}

const FormHeader: React.FC<FormHeaderProps> = ({ isEditMode, invoiceToEdit }) => {
  const { language } = useLanguage();
  
  return (
    <DialogHeader className="p-4 pb-3 border-b">
      <DialogTitle className="flex items-center gap-2 text-lg">
        <FileText className="text-primary" size={20} />
        {isEditMode 
          ? (language === 'ar' ? 'تعديل فاتورة شراء' : 'Edit Purchase Invoice')
          : (language === 'ar' ? 'فاتورة شراء جديدة' : 'New Purchase Invoice')
        }
        {isEditMode && invoiceToEdit && (
          <span className="font-mono text-sm text-muted-foreground">
            #{invoiceToEdit.invoice_number}
          </span>
        )}
      </DialogTitle>
    </DialogHeader>
  );
};

export default FormHeader;