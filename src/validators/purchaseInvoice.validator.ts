// validators/purchaseInvoice.validator.ts
import { InvoiceItem } from '@/types/purchaseform';

export interface PurchaseFormData {
  supplier_id: string;
  branch_id: string;
  warehouse_id: string;
  invoice_date: string;
  due_date: string;
  payment_method: string;
  tax_id: string;
  currency_id: string;
  notes: string;
  paid_amount: number;
  treasury_id: string;
}

export class PurchaseInvoiceValidator {
  static validateForm(data: PurchaseFormData, items: InvoiceItem[], language: string): Record<string, string> {
    const errors: Record<string, string> = {};
    
    if (!data.supplier_id) {
      errors.supplier_id = language === 'ar' ? 'يرجى اختيار المورد' : 'Please select a supplier';
    }
    
    if (!data.warehouse_id) {
      errors.warehouse_id = language === 'ar' ? 'يرجى اختيار المستودع' : 'Please select a warehouse';
    }
    
    if (items.length === 0) {
      errors.items = language === 'ar' ? 'يرجى إضافة منتجات' : 'Please add products';
    }
    
    if (data.payment_method === 'cash' && data.paid_amount > 0 && !data.treasury_id) {
      errors.treasury_id = language === 'ar' ? 'يرجى اختيار الخزينة' : 'Please select treasury';
    }
    
    return errors;
  }
  
  static isFormValid(data: PurchaseFormData, items: InvoiceItem[]): boolean {
    return !!(data.supplier_id && data.warehouse_id && items.length > 0);
  }
}