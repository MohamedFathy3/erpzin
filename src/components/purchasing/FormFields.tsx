// components/purchase/FormFields.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from '@/components/ui/date-picker';
import { Building2, Warehouse, CreditCard, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Supplier, Branch, Warehouse as WarehouseType, Currency, Tax } from '@/types/purchaseform';

interface FormFieldsProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  errors: Record<string, string>;
  suppliers: Supplier[];
  branches: Branch[];
  warehouses: WarehouseType[];
  currencies: Currency[];
  taxes: Tax[];
  loadingStates: {
    suppliers: boolean;
    branches: boolean;
    warehouses: boolean;
    currencies: boolean;
    taxes: boolean;
  };
  disabled: boolean;
}

const FormFields: React.FC<FormFieldsProps> = ({
  formData,
  setFormData,
  errors,
  suppliers,
  branches,
  warehouses,
  currencies,
  taxes,
  loadingStates,
  disabled
}) => {
  const { language } = useLanguage();
  
  const paymentMethods = [
    { code: 'cash', name: 'Cash', name_ar: 'نقداً' },
    { code: 'credit', name: 'Credit', name_ar: 'آجل' },
    { code: 'card', name: 'Card', name_ar: 'بطاقة' },
    { code: 'bank_transfer', name: 'Bank Transfer', name_ar: 'تحويل بنكي' }
  ];
  
  const getSupplierName = (supplier: Supplier) => {
    return language === 'ar' ? supplier.name_ar || supplier.name : supplier.name;
  };
  
  const getBranchName = (branch: Branch) => {
    return language === 'ar' ? branch.name_ar || branch.name : branch.name;
  };
  
  const getWarehouseName = (warehouse: WarehouseType) => {
    return language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name;
  };
  
  const getTaxName = (tax: Tax) => {
    return language === 'ar' ? tax.name_ar || tax.name : tax.name;
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Supplier */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <Building2 size={12} />
          {language === 'ar' ? 'المورد' : 'Supplier'} *
        </Label>
        <Select
          value={formData.supplier_id}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, supplier_id: v }))}
          disabled={disabled || loadingStates.suppliers}
        >
          <SelectTrigger className={cn("h-8 text-sm", errors.supplier_id && "border-destructive")}>
            <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {getSupplierName(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.supplier_id && (
          <p className="text-[10px] text-destructive">{errors.supplier_id}</p>
        )}
      </div>
      
      {/* Branch */}
      <div className="space-y-1">
        <Label className="text-xs">{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
        <Select
          value={formData.branch_id}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, branch_id: v, warehouse_id: '' }))}
          disabled={disabled || loadingStates.branches}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id.toString()}>
                {getBranchName(b)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Warehouse */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <Warehouse size={12} />
          {language === 'ar' ? 'المستودع' : 'Warehouse'} *
        </Label>
        <Select
          value={formData.warehouse_id}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, warehouse_id: v }))}
          disabled={disabled || !formData.branch_id || warehouses.length === 0}
        >
          <SelectTrigger className={cn("h-8 text-sm", errors.warehouse_id && "border-destructive")}>
            <SelectValue placeholder={
              !formData.branch_id 
                ? (language === 'ar' ? 'اختر فرعاً أولاً' : 'Select branch first')
                : warehouses.length === 0
                  ? (language === 'ar' ? 'لا يوجد مستودعات' : 'No warehouses')
                  : (language === 'ar' ? 'اختر' : 'Select')
            } />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id.toString()}>
                {getWarehouseName(w)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.warehouse_id && (
          <p className="text-[10px] text-destructive">{errors.warehouse_id}</p>
        )}
      </div>
      
      {/* Payment Method */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <CreditCard size={12} />
          {language === 'ar' ? 'طريقة الدفع' : 'Payment'}
        </Label>
        <Select
          value={formData.payment_method}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, payment_method: v }))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((method) => (
              <SelectItem key={method.code} value={method.code}>
                {language === 'ar' ? method.name_ar : method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Invoice Date */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <Calendar size={12} />
          {language === 'ar' ? 'التاريخ' : 'Date'}
        </Label>
        <DatePicker
          value={formData.invoice_date}
          onChange={(value) => setFormData((prev: any) => ({ ...prev, invoice_date: value }))}
          placeholder={language === 'ar' ? 'اختر التاريخ' : 'Select Date'}
          className="h-8 text-sm"
          disabled={disabled}
        />
      </div>
      
      {/* Due Date */}
      <div className="space-y-1">
        <Label className="text-xs">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
        <DatePicker
          value={formData.due_date}
          onChange={(value) => setFormData((prev: any) => ({ ...prev, due_date: value }))}
          placeholder={language === 'ar' ? 'اختر التاريخ' : 'Select Date'}
          className="h-8 text-sm"
          disabled={disabled}
        />
      </div>
      
      {/* Currency */}
      <div className="space-y-1">
        <Label className="text-xs">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
        <Select
          value={formData.currency_id}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, currency_id: v }))}
          disabled={disabled || loadingStates.currencies}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((currency) => (
              <SelectItem key={currency.id} value={currency.id.toString()}>
                {currency.symbol} - {currency.name}
                {currency.default && (
                  <span className="ml-2 text-xs text-primary">(Default)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Tax */}
      <div className="space-y-1">
        <Label className="text-xs">{language === 'ar' ? 'الضريبة' : 'Tax'}</Label>
        <Select
          value={formData.tax_id}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, tax_id: v }))}
          disabled={disabled || loadingStates.taxes}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={language === 'ar' ? 'اختر' : 'Select'} />
          </SelectTrigger>
          <SelectContent>
            {taxes.map((tax) => (
              <SelectItem key={tax.id} value={tax.id.toString()}>
                {getTaxName(tax)} ({tax.rate}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FormFields;