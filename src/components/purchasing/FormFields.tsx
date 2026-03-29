// components/purchase/FormFields.tsx
import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from '@/components/ui/date-picker';
import { Building2, Warehouse, CreditCard, Calendar, Loader2 } from 'lucide-react';
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
  isEditMode?: boolean;
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
  isEditMode = false,
  loadingStates,
  disabled
}) => {
  const { language } = useLanguage();
  const [isSettingInitialValues, setIsSettingInitialValues] = useState(false);
  
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
  
  const getCurrencyName = (currency: Currency) => {
    return `${currency.symbol || ''} ${currency.name}`.trim();
  };
  
  const getTaxName = (tax: Tax) => {
    return language === 'ar' ? tax.name_ar || tax.name : tax.name;
  };
  
  const getPaymentMethodLabel = (code: string) => {
    const method = paymentMethods.find(m => m.code === code);
    return method ? (language === 'ar' ? method.name_ar : method.name) : code;
  };

  // لل debugging - نتأكد من القيم في وضع التعديل
  useEffect(() => {
    if (isEditMode && formData.supplier_id && !isSettingInitialValues) {
      console.log('FormFields - Edit Mode Values:', {
        supplier_id: formData.supplier_id,
        branch_id: formData.branch_id,
        warehouse_id: formData.warehouse_id,
        currency_id: formData.currency_id,
        tax_id: formData.tax_id,
        payment_method: formData.payment_method,
        suppliersCount: suppliers.length,
        branchesCount: branches.length,
        currenciesCount: currencies.length
      });
    }
  }, [isEditMode, formData, suppliers.length, branches.length, currencies.length]);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Supplier */}
      <div className="space-y-1">
        <Label className="text-xs flex items-center gap-1">
          <Building2 size={12} />
          {language === 'ar' ? 'المورد' : 'Supplier'} *
        </Label>
        <Select
          value={formData.supplier_id || undefined}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, supplier_id: v }))}
          disabled={disabled || loadingStates.suppliers}
        >
          <SelectTrigger className={cn("h-8 text-sm", errors.supplier_id && "border-destructive")}>
            <SelectValue>
              {loadingStates.suppliers ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                </div>
              ) : (
                formData.supplier_id ? (
                  getSupplierName(suppliers.find(s => s.id === Number(formData.supplier_id)) as Supplier)
                ) : (
                  <span className="text-muted-foreground">{language === 'ar' ? 'اختر المورد' : 'Select supplier'}</span>
                )
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {loadingStates.suppliers ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'جاري تحميل الموردين...' : 'Loading suppliers...'}
              </div>
            ) : suppliers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'لا يوجد موردين' : 'No suppliers found'}
              </div>
            ) : (
              suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {getSupplierName(s)}
                </SelectItem>
              ))
            )}
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
          value={formData.branch_id || undefined}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, branch_id: v, warehouse_id: '', treasury_id: '' }))}
          disabled={disabled || loadingStates.branches}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>
              {loadingStates.branches ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                </div>
              ) : (
                formData.branch_id ? (
                  getBranchName(branches.find(b => b.id === Number(formData.branch_id)) as Branch)
                ) : (
                  <span className="text-muted-foreground">{language === 'ar' ? 'اختر الفرع' : 'Select branch'}</span>
                )
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {loadingStates.branches ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'جاري تحميل الفروع...' : 'Loading branches...'}
              </div>
            ) : branches.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'لا يوجد فروع' : 'No branches found'}
              </div>
            ) : (
              branches.map((b) => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  {getBranchName(b)}
                </SelectItem>
              ))
            )}
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
          value={formData.warehouse_id || undefined}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, warehouse_id: v }))}
          disabled={disabled || !formData.branch_id}  // ✅ modified
        >
          <SelectTrigger className={cn("h-8 text-sm", errors.warehouse_id && "border-destructive")}>
            <SelectValue>
              {!formData.branch_id ? (
                <span className="text-muted-foreground text-xs">
                  {language === 'ar' ? 'اختر فرعاً أولاً' : 'Select branch first'}
                </span>
              ) : loadingStates.warehouses ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                </div>
              ) : formData.warehouse_id ? (
                getWarehouseName(warehouses.find(w => w.id === Number(formData.warehouse_id)) as WarehouseType)
              ) : (
                <span className="text-muted-foreground text-xs">
                  {language === 'ar' ? 'اختر المستودع' : 'Select warehouse'}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {loadingStates.warehouses ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'جاري تحميل المستودعات...' : 'Loading warehouses...'}
              </div>
            ) : warehouses.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'لا يوجد مستودعات لهذا الفرع' : 'No warehouses for this branch'}
              </div>
            ) : (
              warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {getWarehouseName(w)}
                </SelectItem>
              ))
            )}
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
          value={formData.payment_method || 'cash'}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, payment_method: v }))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>
              {getPaymentMethodLabel(formData.payment_method || 'cash')}
            </SelectValue>
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
          value={formData.currency_id || undefined}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, currency_id: v }))}
          disabled={disabled || loadingStates.currencies}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>
              {loadingStates.currencies ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                </div>
              ) : formData.currency_id ? (
                getCurrencyName(currencies.find(c => c.id === Number(formData.currency_id)) as Currency)
              ) : (
                <span className="text-muted-foreground text-xs">
                  {language === 'ar' ? 'اختر العملة' : 'Select currency'}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {loadingStates.currencies ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'جاري تحميل العملات...' : 'Loading currencies...'}
              </div>
            ) : currencies.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'لا يوجد عملات' : 'No currencies found'}
              </div>
            ) : (
              currencies.map((currency) => (
                <SelectItem key={currency.id} value={currency.id.toString()}>
                  {getCurrencyName(currency)}
                  {currency.default && (
                    <span className="ml-2 text-xs text-primary">(Default)</span>
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      
      {/* Tax */}
      <div className="space-y-1">
        <Label className="text-xs">{language === 'ar' ? 'الضريبة' : 'Tax'}</Label>
        <Select
          value={formData.tax_id || undefined}
          onValueChange={(v) => setFormData((prev: any) => ({ ...prev, tax_id: v }))}
          disabled={disabled || loadingStates.taxes}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>
              {loadingStates.taxes ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                </div>
              ) : formData.tax_id ? (
                (() => {
                  const tax = taxes.find(t => t.id === Number(formData.tax_id));
                  return tax ? `${getTaxName(tax)} (${tax.rate}%)` : '';
                })()
              ) : (
                <span className="text-muted-foreground text-xs">
                  {language === 'ar' ? 'اختر الضريبة' : 'Select tax'}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {loadingStates.taxes ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'جاري تحميل الضرائب...' : 'Loading taxes...'}
              </div>
            ) : taxes.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === 'ar' ? 'لا يوجد ضرائب' : 'No taxes found'}
              </div>
            ) : (
              taxes.map((tax) => (
                <SelectItem key={tax.id} value={tax.id.toString()}>
                  {getTaxName(tax)} ({tax.rate}%)
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FormFields;