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
  discount_percentage?: number;  // ✅ خصم المنتج %
  discount_amount?: number;       // ✅ قيمة خصم المنتج
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
  onItemDiscountChange
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
  const total = subtotalAfterAllDiscounts + tax;

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
      <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground">
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
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
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
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">🛒</span>
              <p className="text-sm">{language === 'ar' ? 'السلة فارغة' : 'Cart is empty'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const itemKey = item.variantId || item.id;
                const itemSubtotal = item.price * item.quantity;
                const itemDiscount = itemSubtotal * ((item.discount_percentage || 0) / 100);
                const itemTotal = itemSubtotal - itemDiscount;

                return (
                  <div
                    key={itemKey}
                    className="p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
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

                        {/* ✅ حقل خصم المنتج */}
                        <div className="flex items-center gap-2 mt-2">
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
                          {item.discount_percentage > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              -{formatCurrency(itemDiscount)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1, item.variantId)}
                              className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
                            >
                              <Minus size={12} />
                            </button>
                          </TooltipTrigger>
                        </Tooltip>

                        <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1, item.variantId)}
                              className="w-7 h-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center"
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
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(item.price)}
                        </p>
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
        <div className="border-t border-border p-4 space-y-3 bg-muted/30">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span>{formatCurrency(subtotalAfterItemDiscounts)}</span>
            </div>
            
            {/* ✅ خصم الفاتورة */}
            {invoiceDiscountPercentage > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Percent size={12} />
                  {language === 'ar' ? 'خصم الفاتورة' : 'Invoice Discount'} ({invoiceDiscountPercentage}%)
                </span>
                <span>-{formatCurrency(invoiceDiscountApplied)}</span>
              </div>
            )}

            {/* ✅ حقل إدخال خصم الفاتورة */}
            <div className="flex items-center justify-between gap-2 pt-1">
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
            </div>

            <div className="flex justify-between">
              <span>{language === 'ar' ? `الضريبة (${taxRate}%)` : `VAT (${taxRate}%)`}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
              <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onHoldOrder}
              disabled={items.length === 0}
              className="flex-1 h-12 border-warning text-warning hover:bg-warning hover:text-warning-foreground"
            >
              <Pause size={18} className="me-2" />
              <span>{language === 'ar' ? 'تعليق' : 'Hold'}</span>
            </Button>
            <Button
              onClick={onPay}
              disabled={items.length === 0}
              className="flex-1 h-12 bg-success hover:bg-success/90 text-success-foreground"
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