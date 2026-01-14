import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShortcutItem {
  keys: string[];
  description: string;
  descriptionAr: string;
}

const shortcuts: { category: string; categoryAr: string; items: ShortcutItem[] }[] = [
  {
    category: 'General',
    categoryAr: 'عام',
    items: [
      { keys: ['Ctrl', 'F'], description: 'Focus Search', descriptionAr: 'التركيز على البحث' },
      { keys: ['/'], description: 'Focus Search', descriptionAr: 'التركيز على البحث' },
      { keys: ['Esc'], description: 'Close Modal', descriptionAr: 'إغلاق النافذة' },
      { keys: ['Alt', 'Home'], description: 'Go to Dashboard', descriptionAr: 'الذهاب للرئيسية' },
    ]
  },
  {
    category: 'Cart',
    categoryAr: 'السلة',
    items: [
      { keys: ['Ctrl', 'Enter'], description: 'Open Payment', descriptionAr: 'فتح الدفع' },
      { keys: ['Alt', 'P'], description: 'Open Payment', descriptionAr: 'فتح الدفع' },
      { keys: ['Alt', 'H'], description: 'Hold Order', descriptionAr: 'تعليق الطلب' },
      { keys: ['Ctrl', 'Del'], description: 'Clear Cart', descriptionAr: 'مسح السلة' },
      { keys: ['Alt', '+'], description: 'Increase Quantity', descriptionAr: 'زيادة الكمية' },
      { keys: ['Alt', '-'], description: 'Decrease Quantity', descriptionAr: 'تقليل الكمية' },
    ]
  },
  {
    category: 'Quick Access',
    categoryAr: 'وصول سريع',
    items: [
      { keys: ['Alt', 'O'], description: 'Held Orders', descriptionAr: 'الطلبات المعلقة' },
      { keys: ['Alt', 'C'], description: 'Select Customer', descriptionAr: 'اختيار العميل' },
      { keys: ['Alt', 'D'], description: 'Select Delivery', descriptionAr: 'اختيار التوصيل' },
      { keys: ['Alt', 'R'], description: 'Return Invoice', descriptionAr: 'فاتورة مرتجع' },
      { keys: ['Alt', 'S'], description: 'Shift Management', descriptionAr: 'إدارة الوردية' },
    ]
  },
  {
    category: 'Payment Modal',
    categoryAr: 'نافذة الدفع',
    items: [
      { keys: ['Ctrl', 'Enter'], description: 'Confirm Payment', descriptionAr: 'تأكيد الدفع' },
      { keys: ['F1'], description: 'Cash', descriptionAr: 'نقدي' },
      { keys: ['F2'], description: 'Card', descriptionAr: 'شبكة' },
      { keys: ['F3'], description: 'Kuraimi', descriptionAr: 'كريمي' },
      { keys: ['F4'], description: 'Floosak', descriptionAr: 'فلوسك' },
      { keys: ['F5'], description: 'Jawal Pay', descriptionAr: 'جوال باي' },
      { keys: ['F6'], description: 'Bank Transfer', descriptionAr: 'تحويل بنكي' },
      { keys: ['F7'], description: 'Split Payment', descriptionAr: 'تقسيم' },
      { keys: ['Alt', '1-6'], description: 'Quick Amounts', descriptionAr: 'المبالغ السريعة' },
    ]
  }
];

interface POSKeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const POSKeyboardShortcutsHelp: React.FC<POSKeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-3xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Keyboard className="text-primary" size={20} />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcuts.map((category, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                  {language === 'ar' ? category.categoryAr : category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((item, itemIdx) => (
                    <div 
                      key={itemIdx}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm text-foreground">
                        {language === 'ar' ? item.descriptionAr : item.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono font-semibold text-foreground shadow-sm">
                              {key}
                            </kbd>
                            {keyIdx < item.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex-shrink-0">
          <p className="text-center text-sm text-muted-foreground">
            {language === 'ar' 
              ? 'اضغط على ? أو F12 لفتح هذه القائمة'
              : 'Press ? or F12 to open this help'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default POSKeyboardShortcutsHelp;
