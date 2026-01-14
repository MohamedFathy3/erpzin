import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Minus, Plus, Trash2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface CartItem {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  sku: string;
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

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% VAT
  const total = subtotal + tax;

  return (
    <TooltipProvider delayDuration={300}>
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Cart Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">
            {language === 'ar' ? 'سلة المشتريات' : 'Cart'}
          </h2>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearCart}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border border-border">
                  <div className="flex items-center gap-2">
                    <span>{language === 'ar' ? 'مسح السلة' : 'Clear Cart'}</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Del</kbd>
                  </div>
                </TooltipContent>
              </Tooltip>
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
                ? 'استخدم Ctrl+F أو / للبحث السريع'
                : 'Use Ctrl+F or / for quick search'
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
                    {item.price.toLocaleString()} YER
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                          'bg-muted hover:bg-muted/80 text-foreground'
                        )}
                      >
                        <Minus size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-card border border-border">
                      <div className="flex items-center gap-2 text-xs">
                        <span>{language === 'ar' ? 'تقليل' : 'Decrease'}</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded font-mono">Alt+-</kbd>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <span className="w-8 text-center font-semibold text-foreground">
                    {item.quantity}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                          'bg-primary hover:bg-primary/90 text-primary-foreground'
                        )}
                      >
                        <Plus size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-card border border-border">
                      <div className="flex items-center gap-2 text-xs">
                        <span>{language === 'ar' ? 'زيادة' : 'Increase'}</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded font-mono">Alt++</kbd>
                      </div>
                    </TooltipContent>
                  </Tooltip>
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
            <span>{subtotal.toLocaleString()} YER</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{language === 'ar' ? 'الضريبة (5%)' : 'VAT (5%)'}</span>
            <span>{tax.toLocaleString()} YER</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-foreground pt-2 border-t border-border">
            <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
            <span className="text-primary">{total.toLocaleString()} YER</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onHoldOrder}
                disabled={items.length === 0}
                className="flex-1 h-12 relative"
              >
                <Pause size={18} className="me-2" />
                {language === 'ar' ? 'تعليق' : 'Hold'}
                {heldOrdersCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-warning text-warning-foreground text-xs rounded-full flex items-center justify-center">
                    {heldOrdersCount}
                  </span>
                )}
                <span className="absolute -bottom-1 end-1 text-[8px] px-1 bg-muted/80 border border-border rounded font-mono text-muted-foreground">
                  Alt+H
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-card border border-border">
              <div className="flex items-center gap-2">
                <span>{language === 'ar' ? 'تعليق الطلب' : 'Hold Order'}</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Alt+H</kbd>
              </div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onPay}
                disabled={items.length === 0}
                className="flex-[2] h-12 bg-gradient-to-r from-success to-success-light hover:opacity-90 text-white font-bold text-lg relative"
              >
                {language === 'ar' ? 'دفع' : 'Pay'}
                <span className="absolute -bottom-1 end-1 text-[8px] px-1 bg-white/20 border border-white/30 rounded font-mono text-white/90">
                  Ctrl+↵
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-card border border-border">
              <div className="flex items-center gap-2">
                <span>{language === 'ar' ? 'فتح الدفع' : 'Open Payment'}</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default POSCart;
