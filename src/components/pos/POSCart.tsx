// POSCart.tsx - النسخة المعدلة

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { cn } from '@/lib/utils';
import { Minus, Plus, Trash2, CreditCard, Pause, AlertCircle, Info, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

interface CartItem {
  id: string;
  variantId?: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  sku: string;
  sizeName?: string;
  colorName?: string;
  stock?: number;
  discount_percentage?: number;
  discount_amount?: number;
  itemType?: 'product' | 'service';
  meter_quantity?: number;
}

interface POSCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number, variantId?: string) => void;
  onRemoveItem: (id: string, variantId?: string) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onPay: () => void;
  heldOrdersCount: number;
  // ✅ إضافات للخصومات
  invoiceDiscountPercentage?: number;
  invoiceDiscountAmount?: number;
  onInvoiceDiscountChange?: (percentage: number, amount: number) => void;
  onItemDiscountChange?: (itemId: string, percentage: number, variantId?: string) => void;
  canManageDiscounts?: boolean;
  extraCharge?: number;
  onExtraChargeChange?: (amount: number) => void;
}

const POSCart: React.FC<POSCartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onHoldOrder,
  onPay,
  heldOrdersCount,
  invoiceDiscountPercentage = 0,
  invoiceDiscountAmount = 0,
  onInvoiceDiscountChange,
  onItemDiscountChange,
  canManageDiscounts = false,
  extraCharge = 0,
  onExtraChargeChange
}) => {
  const { language } = useLanguage();
  const { taxRates } = useCurrencyTax();
  const { formatCurrency } = useRegionalSettings();

  // ✅ منطق اختيار الضريبة النشطة
  const getActiveTax = () => {
    if (!taxRates || taxRates.length === 0) return null;
    const activeTaxes = taxRates.filter(tax => tax.active === true);
    if (activeTaxes.length === 0) return null;
    return activeTaxes.find(tax => tax.default === true) || activeTaxes[0];
  };

  const activeTax = getActiveTax();
  const taxRate = Number(activeTax?.rate ?? 0);

  // ✅ حساب إجمالي المنتج مع الخصم
  const getItemTotalAfterDiscount = (item: CartItem): number => {
    const itemSubtotal = item.price * item.quantity;
    const discountRate = (item.discount_percentage || 0) / 100;
    return itemSubtotal * (1 - discountRate);
  };

  // ✅ حساب المجموع الفرعي (بعد خصم المنتجات)
  const subtotalAfterItemDiscounts = items.reduce((sum, item) => sum + getItemTotalAfterDiscount(item), 0);
  
  // ✅ خصم الفاتورة (يتم تطبيقه بعد خصم المنتجات وقبل الضريبة)
  const invoiceDiscountApplied = (subtotalAfterItemDiscounts * invoiceDiscountPercentage) / 100;
  const subtotalAfterAllDiscounts = subtotalAfterItemDiscounts - invoiceDiscountApplied;
  
  // ✅ الضريبة (تحسب بعد كل الخصومات)
  const tax = (subtotalAfterAllDiscounts * taxRate) / 100;
  const total = subtotalAfterAllDiscounts + tax + extraCharge;

  // ✅ معالج تغيير خصم المنتج
  const handleItemDiscountChange = (item: CartItem, percentage: number) => {
    if (onItemDiscountChange) {
      onItemDiscountChange(item.id, percentage, item.variantId);
    }
  };

  // ✅ معالج تغيير خصم الفاتورة
  const handleInvoiceDiscountChange = (value: number) => {
    if (onInvoiceDiscountChange) {
      onInvoiceDiscountChange(value, (subtotalAfterItemDiscounts * value) / 100);
    }
  };

  const getStockStatusColor = (remaining: number, total: number): string => {
    const percentage = (remaining / total) * 100;
    if (percentage < 10) return 'bg-destructive';
    if (percentage < 30) return 'bg-warning';
    return 'bg-primary';
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-card rounded-2xl border border-slate-200/80 overflow-hidden shadow-lg shadow-slate-900/5">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-lg text-foreground">
              {language === 'ar' ? 'سلة المشتريات' : 'Cart'}
            </h2>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearCart}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                >
                  <Trash2 size={16} />
                  <span className="text-[10px] ms-1 opacity-60">F8</span>
                </Button>
              )}
              <span className="min-w-8 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-sm font-bold text-center shadow-sm">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
          </div>

          {/* عرض معلومات الضريبة */}
          {activeTax && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Info size={12} />
              <span>
                {language === 'ar'
                  ? `الضريبة: ${activeTax.name} (${taxRate}%) ${activeTax.default ? ' - الافتراضية' : ''}`
                  : `Tax: ${activeTax.name} (${taxRate}%) ${activeTax.default ? ' - Default' : ''}`}
              </span>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">🛒</span>
              <p className="text-sm">{language === 'ar' ? 'السلة فارغة' : 'Cart is empty'}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => {
                const itemKey = item.variantId || item.id;
                const itemSubtotal = item.price * item.quantity;
                const itemDiscount = itemSubtotal * ((item.discount_percentage || 0) / 100);
                const itemTotal = itemSubtotal - itemDiscount;

                return (
                  <div
                    key={itemKey}
                    className="p-3 bg-background rounded-xl border border-slate-200/80 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {language === 'ar' ? item.nameAr : item.name}
                        </p>
                        {(item.sizeName || item.colorName) && (
                          <p className="text-xs text-primary">
                            {[item.sizeName, item.colorName].filter(Boolean).join(' - ')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                        {(item.itemType === 'service' || item.meter_quantity) && (
                          <p className="text-xs text-violet-600">
                            {item.itemType === 'service' ? (language === 'ar' ? 'خدمة' : 'Service') : ''}
                            {item.meter_quantity ? ` · ${item.meter_quantity} ${language === 'ar' ? 'متر/سيارة' : 'm/car'}` : ''}
                          </p>
                        )}

                        {canManageDiscounts && <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 bg-primary/5 rounded-lg px-2 py-1">
                            <Percent size={12} className="text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'خصم:' : 'Discount:'}
                            </span>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={item.discount_percentage || 0}
                              onChange={(e) => handleItemDiscountChange(item, Number(e.target.value))}
                              className="w-16 h-6 text-xs text-center px-1"
                            />
                            <span className="text-xs">%</span>
                          </div>
                          {canManageDiscounts && item.discount_percentage > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              -{formatCurrency(itemDiscount)}
                            </span>
                          )}
                        </div>}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1, item.variantId)}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                            >
                              <Minus size={12} />
                            </button>
                          </TooltipTrigger>
                        </Tooltip>

                        <span className="min-w-9 h-8 px-2 rounded-lg border border-slate-200 bg-white flex items-center justify-center font-bold text-sm">{item.quantity}</span>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1, item.variantId)}
                              className="w-8 h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-sm"
                            >
                              <Plus size={12} />
                            </button>
                          </TooltipTrigger>
                        </Tooltip>

                        {/* Delete Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onRemoveItem(item.id, item.variantId)}
                              className="w-7 h-7 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center"
                            >
                              <Trash2 size={14} />
                            </button>
                          </TooltipTrigger>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Price Display */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                      <div>
                          {canManageDiscounts && item.discount_percentage > 0 && <p className="text-xs text-muted-foreground line-through">{formatCurrency(item.price)}</p>}
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(item.price * (1 - (item.discount_percentage || 0) / 100))}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCurrency(itemTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="sticky bottom-0 border-t border-slate-200 p-4 space-y-3 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span>{formatCurrency(subtotalAfterItemDiscounts)}</span>
            </div>
            
            {/* ✅ خصم الفاتورة */}
            {canManageDiscounts && invoiceDiscountPercentage > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Percent size={12} />
                  {language === 'ar' ? 'خصم الفاتورة' : 'Invoice Discount'} ({invoiceDiscountPercentage}%)
                </span>
                <span>-{formatCurrency(invoiceDiscountApplied)}</span>
              </div>
            )}

            {canManageDiscounts && <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 bg-primary/5 rounded-lg px-2 py-1">
                <Percent size={14} className="text-primary" />
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'خصم إضافي' : 'Extra Discount'}:
                </span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={invoiceDiscountPercentage}
                  onChange={(e) => handleInvoiceDiscountChange(Number(e.target.value))}
                  className="w-20 h-7 text-sm text-center"
                />
                <span className="text-xs">%</span>
              </div>
              {invoiceDiscountApplied > 0 && (
                <span className="text-sm font-medium text-green-600">
                  -{formatCurrency(invoiceDiscountApplied)}
                </span>
              )}
            </div>}

            <div className="flex justify-between">
              <span>{language === 'ar' ? `الضريبة (${taxRate}%)` : `VAT (${taxRate}%)`}</span>
              <span>{formatCurrency(tax)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span>{language === 'ar' ? 'بند الزيادات' : 'Sales Increases'}</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={extraCharge || ''}
                onChange={(e) => onExtraChargeChange?.(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 h-7 text-sm text-center"
              />
            </div>
            
            <div className="flex items-center justify-between gap-3 rounded-xl bg-sidebar px-4 py-3 text-white">
              <span className="text-sm font-semibold text-white/75">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
              <span className="text-xl font-extrabold tracking-tight text-white">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onHoldOrder}
              disabled={items.length === 0}
              className="flex-1 h-12 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Pause size={18} className="me-2" />
              <span>{language === 'ar' ? 'تعليق' : 'Hold'}</span>
            </Button>
            <Button
              onClick={onPay}
              disabled={items.length === 0}
              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/10"
            >
              <CreditCard size={18} className="me-2" />
              <span>{language === 'ar' ? 'دفع' : 'Pay'}</span>
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default POSCart;
