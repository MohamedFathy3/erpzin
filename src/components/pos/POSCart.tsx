import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';
import { cn } from '@/lib/utils';
import { Minus, Plus, Trash2, CreditCard, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

interface POSCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
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
  const { defaultTaxRate, defaultCurrency } = useCurrencyTax();

  const taxRate = defaultTaxRate?.rate ?? 0;
  const currencySymbol = defaultCurrency?.symbol ?? 'YER';
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  return (
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
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {language === 'ar' ? item.nameAr : item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {item.price.toLocaleString()} {currencySymbol}
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      'bg-muted hover:bg-muted/80 text-foreground'
                    )}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-semibold text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      'bg-primary hover:bg-primary/90 text-primary-foreground'
                    )}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary */}
      <div className="border-t border-border p-4 space-y-3 bg-muted/30">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span>{subtotal.toLocaleString()} {currencySymbol}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{language === 'ar' ? `الضريبة (${taxRate}%)` : `VAT (${taxRate}%)`}</span>
            <span>{tax.toLocaleString()} {currencySymbol}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-foreground pt-2 border-t border-border">
            <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
            <span className="text-primary">{total.toLocaleString()} {currencySymbol}</span>
          </div>
        </div>

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
  );
};

export default POSCart;
