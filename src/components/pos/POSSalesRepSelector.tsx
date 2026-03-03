import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, User, Phone, Check, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface SalesRepresentative {
  id: number;
  name: string;
  phone: string;
  email: string;
  commission_rate: string;
  active: boolean;
  branch_id: number;
  branch_name: string;
  employee_id: number;
  employee_name: string;
}

interface POSSalesRepSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRep: (rep: SalesRepresentative | null) => void;
  selectedRep: SalesRepresentative | null;
  branchId?: number; // اختياري: لفلترة مناديب المبيعات حسب الفرع
}

const POSSalesRepSelector: React.FC<POSSalesRepSelectorProps> = ({
  isOpen,
  onClose,
  onSelectRep,
  selectedRep,
  branchId
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // جلب مناديب المبيعات من API
  const { data: salesReps = [], isLoading } = useQuery({
    queryKey: ['sales-representatives', branchId],
    queryFn: async () => {
      try {
        const response = await api.post('/sales-representative/index', {
          filters: branchId ? { branch_id: branchId } : {},
          orderBy: 'name',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        const reps = response.data.data || [];
        
        // فلترة النشطين فقط (active = true)
        return reps.filter((rep: SalesRepresentative) => rep.active === true);
      } catch (error) {
        console.error('Error fetching sales representatives:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // فلترة حسب البحث
  const filteredReps = salesReps.filter((rep: SalesRepresentative) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      rep.name.toLowerCase().includes(searchLower) ||
      (rep.phone && rep.phone.includes(searchQuery)) ||
      (rep.email && rep.email.toLowerCase().includes(searchLower)) ||
      (rep.branch_name && rep.branch_name.toLowerCase().includes(searchLower))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground">
            {language === 'ar' ? 'اختر مندوب المبيعات' : 'Select Sales Representative'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
              className="ps-10"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-2 max-h-80 overflow-y-auto">
          {/* No Representative Option */}
          <button
            onClick={() => {
              onSelectRep(null);
              onClose();
            }}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-all mb-2',
              !selectedRep
                ? 'bg-primary/10 border-primary'
                : 'bg-background border-border hover:border-primary'
            )}
          >
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <User size={20} className="text-muted-foreground" />
            </div>
            <div className="flex-1 text-start">
              <p className="font-medium text-foreground">
                {language === 'ar' ? 'بدون مندوب' : 'No Representative'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مبيعات مباشرة' : 'Direct sales'}
              </p>
            </div>
            {!selectedRep && <Check size={20} className="text-primary" />}
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredReps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {language === 'ar' ? 'لا يوجد مناديب مبيعات' : 'No sales representatives available'}
              </p>
              {branchId && (
                <p className="text-xs mt-1">
                  {language === 'ar' 
                    ? `للفرع: ${salesReps[0]?.branch_name || ''}` 
                    : `For branch: ${salesReps[0]?.branch_name || ''}`}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReps.map((rep: SalesRepresentative) => {
                const repId = String(rep.id); // تحويل id لـ string للمقارنة
                const selectedId = selectedRep ? String(selectedRep.id) : null;
                
                return (
                  <button
                    key={rep.id}
                    onClick={() => {
                      onSelectRep(rep);
                      onClose();
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                      selectedId === repId
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:border-primary'
                    )}
                  >
                    <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                      <Users size={20} className="text-success" />
                    </div>
                    <div className="flex-1 text-start">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">
                          {rep.name}
                        </p>
                        {rep.commission_rate && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {rep.commission_rate}%
                          </span>
                        )}
                      </div>
                      
                      {rep.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone size={12} />
                          {rep.phone}
                        </p>
                      )}
                      
                      {rep.branch_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {rep.branch_name}
                        </p>
                      )}
                    </div>
                    {selectedId === repId && (
                      <Check size={20} className="text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default POSSalesRepSelector;