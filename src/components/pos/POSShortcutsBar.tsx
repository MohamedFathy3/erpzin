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
  onShowReturns?: () => void;
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
      colorClass: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700 shadow-sm'
    },
    {
      key: 'F2',
      label: 'Hold',
      labelAr: 'تعليق',
      icon: <Pause size={16} />,
      action: onHold,
      disabled: cartItemsCount === 0,
      colorClass: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
    },
    {
      key: 'F3',
      label: 'Held',
      labelAr: 'المعلقة',
      icon: <Clock size={16} />,
      action: onShowHeldOrders,
      colorClass: 'bg-white text-amber-800 hover:bg-amber-50 border-slate-200'
    },
    {
      key: 'F4',
      label: 'Customer',
      labelAr: 'العميل',
      icon: <User size={16} />,
      action: onShowCustomer,
      colorClass: 'bg-white text-cyan-800 hover:bg-cyan-50 border-slate-200'
    },
    {
      key: 'F5',
      label: 'Delivery',
      labelAr: 'التوصيل',
      icon: <Truck size={16} />,
      action: onShowDelivery,
      colorClass: 'bg-white text-emerald-800 hover:bg-emerald-50 border-slate-200'
    },
    ...(onShowReturns ? [{
      key: 'F6',
      label: 'Returns',
      labelAr: 'مرتجع',
      icon: <RotateCcw size={16} />,
      action: onShowReturns,
      colorClass: 'bg-white text-rose-700 hover:bg-rose-50 border-slate-200'
    }] : []),
    {
      key: 'F7',
      label: 'Shift',
      labelAr: 'الوردية',
      icon: <DollarSign size={16} />,
      action: onShowShift,
      colorClass: 'bg-white text-violet-800 hover:bg-violet-50 border-slate-200'
    },
    {
      key: 'F8',
      label: 'Clear',
      labelAr: 'مسح',
      icon: <Trash2 size={16} />,
      action: onClearCart,
      disabled: cartItemsCount === 0,
      colorClass: 'bg-white text-rose-700 hover:bg-rose-50 border-slate-200'
    },
    {
      key: 'F9',
      label: 'Search',
      labelAr: 'بحث',
      icon: <Search size={16} />,
      action: onFocusSearch,
      colorClass: 'bg-white text-blue-800 hover:bg-blue-50 border-slate-200'
    },
    {
      key: 'F12',
      label: 'Home',
      labelAr: 'الرئيسية',
      icon: <Home size={16} />,
      action: onGoHome,
      colorClass: 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
    },
  ];

  const getButtonClasses = (colorClass: string, disabled?: boolean) => {
    if (disabled) {
      return 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 border-slate-200';
    }
    return colorClass;
  };

  return (
    <div className="pos-shortcuts h-14 bg-white border-t border-slate-200 flex items-center justify-start md:justify-center px-3 gap-1.5 flex-shrink-0 overflow-x-auto shadow-[0_-6px_20px_rgba(15,23,42,0.04)]">
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.key}
          onClick={shortcut.action}
          disabled={shortcut.disabled}
          className={cn(
            "flex h-10 items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-150",
            "text-xs font-semibold whitespace-nowrap",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            getButtonClasses(shortcut.colorClass, shortcut.disabled)
          )}
        >
          <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-extrabold text-slate-600">
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
