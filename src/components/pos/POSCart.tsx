import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { cn } from '@/lib/utils';
import { Minus, Plus, Trash2, CreditCard, Pause, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  stock?: number;  // 👈 أضفنا الـ stock
}

interface POSCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number, variantId?: string) => void;
  onRemoveItem: (id: string, variantId?: string) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onPay: () => void;
  heldOrdersCount: number;
}

const POSCart: React.FC<POSCartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onHoldOrder,
  onPay,
  heldOrdersCount
}) => {
  const { t, language } = useLanguage();
  const { defaultTaxRate } = useCurrencyTax();
  const { getCurrencySymbol, formatCurrency } = useRegionalSettings();

  const taxRate: number = Number(defaultTaxRate?.rate ?? 0);
  const currencySymbol = getCurrencySymbol();
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  // دالة التحقق من إمكانية الزيادة
  const canIncreaseQuantity = (item: CartItem): boolean => {
    // لو مفيش stock معرف، نسمح بالزيادة
    if (item.stock === undefined || item.stock === null) return true;
    // نتحقق أن الكمية الحالية أقل من المخزون
    return item.quantity < item.stock;
  };

  // دالة التحقق من إمكانية النقصان
  const canDecreaseQuantity = (item: CartItem): boolean => {
    return item.quantity > 1;
  };

  // رسالة الخطأ حسب اللغة
  const getStockMessage = (item: CartItem): string => {
    if (language === 'ar') {
      return `الحد الأقصى ${item.stock} قطعة فقط`;
    }
    return `Maximum ${item.stock} items only`;
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
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">🛒</span>
              <p className="text-sm">{language === 'ar' ? 'السلة فارغة' : 'Cart is empty'}</p>
              <p className="text-xs mt-2 text-center px-4">
                {language === 'ar' 
                  ? 'استخدم F9 للبحث السريع'
                  : 'Use F9 for quick search'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const itemKey = item.variantId || item.id;
                const canIncrease = canIncreaseQuantity(item);
                const canDecrease = canDecreaseQuantity(item);
                const remainingStock = item.stock !== undefined ? item.stock - item.quantity : null;
                
                return (
                  <div
                    key={itemKey}
                    className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
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
                      
                      {/* عرض المخزون المتبقي */}
                      {item.stock !== undefined && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                remainingStock! < 3 ? "bg-destructive" : "bg-primary"
                              )}
                              style={{ 
                                width: `${Math.min(100, (item.quantity / item.stock) * 100)}%` 
                              }}
                            />
                          </div>
                          <span className={cn(
                            "text-[10px]",
                            remainingStock! < 3 ? "text-destructive font-bold" : "text-muted-foreground"
                          )}>
                            {remainingStock! > 0 
                              ? `${language === 'ar' ? 'متبقي' : 'left'} ${remainingStock}`
                              : language === 'ar' ? 'نفذ' : 'out'
                            }
                          </span>
                        </div>
                      )}
                      
                      <p className="text-sm font-semibold text-primary mt-1">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* زر النقصان */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => canDecrease && onUpdateQuantity(item.id, item.quantity - 1, item.variantId)}
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                              canDecrease 
                                ? 'bg-muted hover:bg-muted/80 text-foreground cursor-pointer'
                                : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            )}
                            disabled={!canDecrease}
                          >
                            <Minus size={14} />
                          </button>
                        </TooltipTrigger>
                        {!canDecrease && (
                          <TooltipContent side="top">
                            <p>{language === 'ar' ? 'الكمية لايمكن أن تكون أقل من 1' : 'Quantity cannot be less than 1'}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>

                      <span className="w-8 text-center font-semibold text-foreground">
                        {item.quantity}
                      </span>

                      {/* زر الزيادة */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => canIncrease && onUpdateQuantity(item.id, item.quantity + 1, item.variantId)}
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative',
                              canIncrease 
                                ? 'bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer'
                                : 'bg-primary/30 text-primary-foreground/50 cursor-not-allowed'
                            )}
                            disabled={!canIncrease}
                          >
                            <Plus size={14} />
                          </button>
                        </TooltipTrigger>
                        {!canIncrease && (
                          <TooltipContent side="top" className="bg-destructive text-destructive-foreground border-destructive">
                            <div className="flex items-center gap-1">
                              <AlertCircle size={12} />
                              <p>{getStockMessage(item)}</p>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                    
                    {/* زر الحذف */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onRemoveItem(item.id, item.variantId)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{language === 'ar' ? 'حذف من السلة' : 'Remove from cart'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="border-t border-border p-4 space-y-3 bg-muted/30">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{language === 'ar' ? `الضريبة (${taxRate}%)` : `VAT (${taxRate}%)`}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-foreground pt-2 border-t border-border">
              <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* تحذير المخزون المنخفض */}
          {items.some(item => item.stock !== undefined && item.quantity >= item.stock * 0.8) && (
            <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertCircle size={16} className="text-warning shrink-0" />
              <p className="text-xs text-warning">
                {language === 'ar' 
                  ? 'بعض المنتجات قاربت على النفاد من المخزون'
                  : 'Some products are running low on stock'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onHoldOrder}
              disabled={items.length === 0}
              className="flex-1 h-12 border-warning text-warning hover:bg-warning hover:text-warning-foreground disabled:opacity-50"
            >
              <Pause size={18} className="me-2" />
              <span>{language === 'ar' ? 'تعليق' : 'Hold'}</span>
              <span className="ms-2 text-xs opacity-70">F2</span>
            </Button>
            <Button
              onClick={onPay}
              disabled={items.length === 0}
              className="flex-1 h-12 bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50"
            >
              <CreditCard size={18} className="me-2" />
              <span>{language === 'ar' ? 'دفع' : 'Pay'}</span>
              <span className="ms-2 text-xs opacity-70">F1</span>
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default POSCart;