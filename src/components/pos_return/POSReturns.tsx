// POSReturns.tsx - الجزء المحدث
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, RotateCcw, Search } from 'lucide-react';
import { DirectReturnForm } from '@/components/pos/DirectReturnForm';

interface POSReturnsProps {
  isOpen: boolean;
  onClose: () => void;
  currentShiftId?: string;
  onReturnComplete?: (amount: number) => void;
}

const POSReturns: React.FC<POSReturnsProps> = ({
  isOpen,
  onClose,
  currentShiftId,
  onReturnComplete
}) => {
  const { language } = useLanguage();

  const handleComplete = (amount: number) => {
    onReturnComplete?.(amount);
    onClose();
  };

  const t = {
    title: language === 'ar' ? 'فاتورة مرتجع مباشرة' : 'Direct Return Invoice',
    description: language === 'ar' 
      ? 'إنشاء فاتورة مرتجع بدون ربط بفاتورة بيع' 
      : 'Create a return invoice without linking to a sale invoice',
    close: language === 'ar' ? 'إغلاق' : 'Close',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col bg-background">
        {/* Header */}
        <div className="bg-sidebar px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.title}</h2>
              <p className="text-white/60 text-sm">{t.description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <DirectReturnForm 
            onComplete={handleComplete}
            currentShiftId={currentShiftId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POSReturns;