// components/ui/form-modal.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Field {
  name: string;
  label: string;
  labelAr?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'date';
  placeholder?: string;
  placeholderAr?: string;
  required?: boolean;
  options?: { value: string; label: string; labelAr?: string }[];
  colSpan?: 1 | 2;
  disabled?: boolean;
  hidden?: boolean;
}

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleAr?: string;
  fields: Field[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: () => void;
  isPending?: boolean;
  submitText?: string;
  submitTextAr?: string;
  cancelText?: string;
  cancelTextAr?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function FormModal({
  isOpen,
  onClose,
  title,
  titleAr,
  fields,
  values,
  onChange,
  onSubmit,
  isPending = false,
  submitText,
  submitTextAr,
  cancelText,
  cancelTextAr,
  size = 'md',
  className,
}: FormModalProps) {
  const { language } = useLanguage();

  // أحجام المودال
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  const t = {
    submit: submitText || (language === 'ar' ? (submitTextAr || 'حفظ') : 'Save'),
    cancel: cancelText || (language === 'ar' ? (cancelTextAr || 'إلغاء') : 'Cancel'),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? titleAr || title : title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-2 gap-4">
            {fields
              .filter(f => !f.hidden)
              .map((field) => {
                const fieldValue = values[field.name] || '';

                return (
                  <div
                    key={field.name}
                    className={cn(
                      "space-y-2",
                      field.colSpan === 2 ? "col-span-2" : "col-span-1"
                    )}
                  >
                    <Label htmlFor={field.name}>
                      {language === 'ar' ? field.labelAr || field.label : field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>

                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.name}
                        className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px]"
                        value={fieldValue}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        placeholder={language === 'ar' ? field.placeholderAr || field.placeholder : field.placeholder}
                        disabled={field.disabled}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        id={field.name}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                        value={fieldValue}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        disabled={field.disabled}
                      >
                        <option value="">
                          {language === 'ar' ? 'اختر...' : 'Select...'}
                        </option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {language === 'ar' ? opt.labelAr || opt.label : opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id={field.name}
                          checked={!!fieldValue}
                          onChange={(e) => onChange(field.name, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          disabled={field.disabled}
                        />
                        <Label htmlFor={field.name} className="cursor-pointer">
                          {fieldValue ? 'نشط' : 'غير نشط'}
                        </Label>
                      </div>
                    ) : (
                      <Input
                        id={field.name}
                        type={field.type || 'text'}
                        value={fieldValue}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        placeholder={language === 'ar' ? field.placeholderAr || field.placeholder : field.placeholder}
                        disabled={field.disabled}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            {t.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}