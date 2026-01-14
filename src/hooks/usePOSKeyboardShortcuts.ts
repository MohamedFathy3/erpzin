import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
  descriptionAr: string;
}

export const usePOSKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled: boolean = true) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in input fields (except for specific shortcuts)
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() || 
                       event.code.toLowerCase() === `key${shortcut.key.toLowerCase()}` ||
                       event.code.toLowerCase() === shortcut.key.toLowerCase();
      
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      
      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        // Allow specific shortcuts even in input fields
        if (isInputField && !shortcut.ctrl && !shortcut.alt) {
          continue;
        }
        
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Pre-defined shortcuts configuration with F-keys
export const getPOSShortcuts = (handlers: {
  onPay?: () => void;
  onHold?: () => void;
  onClearCart?: () => void;
  onFocusSearch?: () => void;
  onShowHeldOrders?: () => void;
  onShowCustomer?: () => void;
  onShowDelivery?: () => void;
  onShowReturns?: () => void;
  onShowShift?: () => void;
  onGoHome?: () => void;
  onEscape?: () => void;
  onIncreaseQuantity?: () => void;
  onDecreaseQuantity?: () => void;
}): KeyboardShortcut[] => [
  // F1 - Payment
  {
    key: 'F1',
    action: () => handlers.onPay?.(),
    description: 'Open Payment',
    descriptionAr: 'فتح الدفع'
  },
  // F2 - Hold order
  {
    key: 'F2',
    action: () => handlers.onHold?.(),
    description: 'Hold Order',
    descriptionAr: 'تعليق الطلب'
  },
  // F3 - Show held orders
  {
    key: 'F3',
    action: () => handlers.onShowHeldOrders?.(),
    description: 'Show Held Orders',
    descriptionAr: 'الطلبات المعلقة'
  },
  // F4 - Customer
  {
    key: 'F4',
    action: () => handlers.onShowCustomer?.(),
    description: 'Select Customer',
    descriptionAr: 'اختيار العميل'
  },
  // F5 - Delivery
  {
    key: 'F5',
    action: () => handlers.onShowDelivery?.(),
    description: 'Select Delivery',
    descriptionAr: 'اختيار التوصيل'
  },
  // F6 - Returns
  {
    key: 'F6',
    action: () => handlers.onShowReturns?.(),
    description: 'Return Invoice',
    descriptionAr: 'فاتورة مرتجع'
  },
  // F7 - Shift
  {
    key: 'F7',
    action: () => handlers.onShowShift?.(),
    description: 'Shift Management',
    descriptionAr: 'إدارة الوردية'
  },
  // F8 - Clear cart
  {
    key: 'F8',
    action: () => handlers.onClearCart?.(),
    description: 'Clear Cart',
    descriptionAr: 'مسح السلة'
  },
  // F9 - Search focus
  {
    key: 'F9',
    action: () => handlers.onFocusSearch?.(),
    description: 'Focus Search',
    descriptionAr: 'البحث'
  },
  // F12 - Home
  {
    key: 'F12',
    action: () => handlers.onGoHome?.(),
    description: 'Go to Dashboard',
    descriptionAr: 'الذهاب للرئيسية'
  },
  // Escape - Close modals
  {
    key: 'Escape',
    action: () => handlers.onEscape?.(),
    description: 'Close Modal / Cancel',
    descriptionAr: 'إغلاق / إلغاء'
  },
  // Quantity shortcuts
  {
    key: '+',
    alt: true,
    action: () => handlers.onIncreaseQuantity?.(),
    description: 'Increase Quantity',
    descriptionAr: 'زيادة الكمية'
  },
  {
    key: '-',
    alt: true,
    action: () => handlers.onDecreaseQuantity?.(),
    description: 'Decrease Quantity',
    descriptionAr: 'تقليل الكمية'
  },
];

// Payment modal shortcuts
export const getPaymentShortcuts = (handlers: {
  onConfirm?: () => void;
  onCancel?: () => void;
  onSelectCash?: () => void;
  onSelectCard?: () => void;
  onSelectKuraimi?: () => void;
  onSelectFloosak?: () => void;
  onSelectJawal?: () => void;
  onSelectBank?: () => void;
  onSelectSplit?: () => void;
  onQuickAmount1?: () => void;
  onQuickAmount2?: () => void;
  onQuickAmount3?: () => void;
  onQuickAmount4?: () => void;
  onQuickAmount5?: () => void;
  onQuickAmount6?: () => void;
}): KeyboardShortcut[] => [
  // Confirm payment
  {
    key: 'Enter',
    ctrl: true,
    action: () => handlers.onConfirm?.(),
    description: 'Confirm Payment',
    descriptionAr: 'تأكيد الدفع'
  },
  // Cancel
  {
    key: 'Escape',
    action: () => handlers.onCancel?.(),
    description: 'Cancel',
    descriptionAr: 'إلغاء'
  },
  // Payment methods (F1-F7)
  {
    key: 'F1',
    action: () => handlers.onSelectCash?.(),
    description: 'Cash Payment',
    descriptionAr: 'نقدي'
  },
  {
    key: 'F2',
    action: () => handlers.onSelectCard?.(),
    description: 'Card Payment',
    descriptionAr: 'شبكة'
  },
  {
    key: 'F3',
    action: () => handlers.onSelectKuraimi?.(),
    description: 'Kuraimi',
    descriptionAr: 'كريمي'
  },
  {
    key: 'F4',
    action: () => handlers.onSelectFloosak?.(),
    description: 'Floosak',
    descriptionAr: 'فلوسك'
  },
  {
    key: 'F5',
    action: () => handlers.onSelectJawal?.(),
    description: 'Jawal Pay',
    descriptionAr: 'جوال باي'
  },
  {
    key: 'F6',
    action: () => handlers.onSelectBank?.(),
    description: 'Bank Transfer',
    descriptionAr: 'تحويل بنكي'
  },
  {
    key: 'F7',
    action: () => handlers.onSelectSplit?.(),
    description: 'Split Payment',
    descriptionAr: 'تقسيم'
  },
  // Quick amounts (1-6)
  {
    key: '1',
    alt: true,
    action: () => handlers.onQuickAmount1?.(),
    description: 'Quick Amount 1',
    descriptionAr: 'مبلغ سريع 1'
  },
  {
    key: '2',
    alt: true,
    action: () => handlers.onQuickAmount2?.(),
    description: 'Quick Amount 2',
    descriptionAr: 'مبلغ سريع 2'
  },
  {
    key: '3',
    alt: true,
    action: () => handlers.onQuickAmount3?.(),
    description: 'Quick Amount 3',
    descriptionAr: 'مبلغ سريع 3'
  },
  {
    key: '4',
    alt: true,
    action: () => handlers.onQuickAmount4?.(),
    description: 'Quick Amount 4',
    descriptionAr: 'مبلغ سريع 4'
  },
  {
    key: '5',
    alt: true,
    action: () => handlers.onQuickAmount5?.(),
    description: 'Quick Amount 5',
    descriptionAr: 'مبلغ سريع 5'
  },
  {
    key: '6',
    alt: true,
    action: () => handlers.onQuickAmount6?.(),
    description: 'Quick Amount 6',
    descriptionAr: 'مبلغ سريع 6'
  },
];
