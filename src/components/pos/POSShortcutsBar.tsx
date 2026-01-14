import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { 
  CreditCard, 
  Pause, 
  RotateCcw, 
  User, 
  Truck, 
  Clock, 
  DollarSign,
  Trash2,
  Search,
  Home
} from 'lucide-react';

interface ShortcutItem {
  key: string;
  label: string;
  labelAr: string;
  icon: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

interface POSShortcutsBarProps {
  onPay: () => void;
  onHold: () => void;
  onClearCart: () => void;
  onShowHeldOrders: () => void;
  onShowCustomer: () => void;
  onShowDelivery: () => void;
  onShowReturns: () => void;
  onShowShift: () => void;
  onFocusSearch: () => void;
  onGoHome: () => void;
  cartItemsCount: number;
  heldOrdersCount: number;
  hasShift: boolean;
}

const POSShortcutsBar: React.FC<POSShortcutsBarProps> = ({
  onPay,
  onHold,
  onClearCart,
  onShowHeldOrders,
  onShowCustomer,
  onShowDelivery,
  onShowReturns,
  onShowShift,
  onFocusSearch,
  onGoHome,
  cartItemsCount,
  heldOrdersCount,
  hasShift
}) => {
  const { language } = useLanguage();

  const shortcuts: ShortcutItem[] = [
    {
      key: 'F1',
      label: 'Pay',
      labelAr: 'دفع',
      icon: <CreditCard size={16} />,
      action: onPay,
      disabled: cartItemsCount === 0,
      variant: 'success'
    },
    {
      key: 'F2',
      label: 'Hold',
      labelAr: 'تعليق',
      icon: <Pause size={16} />,
      action: onHold,
      disabled: cartItemsCount === 0,
      variant: 'warning'
    },
    {
      key: 'F3',
      label: 'Held',
      labelAr: 'المعلقة',
      icon: <Clock size={16} />,
      action: onShowHeldOrders,
      variant: heldOrdersCount > 0 ? 'warning' : 'default'
    },
    {
      key: 'F4',
      label: 'Customer',
      labelAr: 'العميل',
      icon: <User size={16} />,
      action: onShowCustomer,
    },
    {
      key: 'F5',
      label: 'Delivery',
      labelAr: 'التوصيل',
      icon: <Truck size={16} />,
      action: onShowDelivery,
    },
    {
      key: 'F6',
      label: 'Returns',
      labelAr: 'مرتجع',
      icon: <RotateCcw size={16} />,
      action: onShowReturns,
    },
    {
      key: 'F7',
      label: 'Shift',
      labelAr: 'الوردية',
      icon: <DollarSign size={16} />,
      action: onShowShift,
      variant: hasShift ? 'primary' : 'default'
    },
    {
      key: 'F8',
      label: 'Clear',
      labelAr: 'مسح',
      icon: <Trash2 size={16} />,
      action: onClearCart,
      disabled: cartItemsCount === 0,
      variant: 'danger'
    },
    {
      key: 'F9',
      label: 'Search',
      labelAr: 'بحث',
      icon: <Search size={16} />,
      action: onFocusSearch,
    },
    {
      key: 'F12',
      label: 'Home',
      labelAr: 'الرئيسية',
      icon: <Home size={16} />,
      action: onGoHome,
    },
  ];

  const getVariantClasses = (variant: string = 'default', disabled?: boolean) => {
    if (disabled) {
      return 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50';
    }
    
    switch (variant) {
      case 'success':
        return 'bg-success/20 text-success hover:bg-success/30 border-success/30';
      case 'warning':
        return 'bg-warning/20 text-warning hover:bg-warning/30 border-warning/30';
      case 'danger':
        return 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30';
      case 'primary':
        return 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30';
      default:
        return 'bg-muted/50 text-foreground hover:bg-muted border-border';
    }
  };

  return (
    <div className="h-12 bg-sidebar/95 backdrop-blur-sm border-t border-border flex items-center justify-center px-2 gap-1 flex-shrink-0">
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.key}
          onClick={shortcut.action}
          disabled={shortcut.disabled}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all duration-150",
            "text-xs font-medium whitespace-nowrap",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            getVariantClasses(shortcut.variant, shortcut.disabled)
          )}
        >
          <span className="px-1.5 py-0.5 bg-black/30 rounded text-[10px] font-bold text-white/90">
            {shortcut.key}
          </span>
          {shortcut.icon}
          <span className="hidden sm:inline">
            {language === 'ar' ? shortcut.labelAr : shortcut.label}
          </span>
          {shortcut.key === 'F3' && heldOrdersCount > 0 && (
            <span className="w-4 h-4 bg-warning text-warning-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
              {heldOrdersCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default POSShortcutsBar;
