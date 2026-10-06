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
  colorClass: string;
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
      colorClass: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30'
    },
    {
      key: 'F2',
      label: 'Hold',
      labelAr: 'تعليق',
      icon: <Pause size={16} />,
      action: onHold,
      disabled: cartItemsCount === 0,
      colorClass: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/30'
    },
    {
      key: 'F3',
      label: 'Held',
      labelAr: 'المعلقة',
      icon: <Clock size={16} />,
      action: onShowHeldOrders,
      colorClass: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30'
    },
    {
      key: 'F4',
      label: 'Customer',
      labelAr: 'العميل',
      icon: <User size={16} />,
      action: onShowCustomer,
      colorClass: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-cyan-500/30'
    },
    {
      key: 'F5',
      label: 'Delivery',
      labelAr: 'التوصيل',
      icon: <Truck size={16} />,
      action: onShowDelivery,
      colorClass: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30'
    },
    {
      key: 'F6',
      label: 'Returns',
      labelAr: 'مرتجع',
      icon: <RotateCcw size={16} />,
      action: onShowReturns,
      colorClass: 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-rose-500/30'
    },
    {
      key: 'F7',
      label: 'Shift',
      labelAr: 'الوردية',
      icon: <DollarSign size={16} />,
      action: onShowShift,
      colorClass: 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border-violet-500/30'
    },
    {
      key: 'F8',
      label: 'Clear',
      labelAr: 'مسح',
      icon: <Trash2 size={16} />,
      action: onClearCart,
      disabled: cartItemsCount === 0,
      colorClass: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30'
    },
    {
      key: 'F9',
      label: 'Search',
      labelAr: 'بحث',
      icon: <Search size={16} />,
      action: onFocusSearch,
      colorClass: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30'
    },
    {
      key: 'F12',
      label: 'Home',
      labelAr: 'الرئيسية',
      icon: <Home size={16} />,
      action: onGoHome,
      colorClass: 'bg-slate-500/20 text-slate-300 hover:bg-slate-500/30 border-slate-500/30'
    },
  ];

  const getButtonClasses = (colorClass: string, disabled?: boolean) => {
    if (disabled) {
      return 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50 border-muted';
    }
    return colorClass;
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
            getButtonClasses(shortcut.colorClass, shortcut.disabled)
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
