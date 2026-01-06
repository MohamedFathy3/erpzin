import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Truck, User, Phone, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryPerson {
  id: string;
  name: string;
  nameAr: string;
  phone: string;
}

interface POSDeliverySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDelivery: (delivery: DeliveryPerson | null) => void;
  selectedDelivery: DeliveryPerson | null;
}

const POSDeliverySelector: React.FC<POSDeliverySelectorProps> = ({
  isOpen,
  onClose,
  onSelectDelivery,
  selectedDelivery
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: deliveryPersons = [], isLoading } = useQuery({
    queryKey: ['delivery-persons-pos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_persons')
        .select('id, name, name_ar, phone')
        .eq('is_active', true)
        .eq('is_available', true)
        .order('name');
      
      if (error) throw error;
      return data.map(d => ({
        id: d.id,
        name: d.name,
        nameAr: d.name_ar || d.name,
        phone: d.phone || ''
      }));
    },
    enabled: isOpen
  });

  const filteredDeliveryPersons = deliveryPersons.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.nameAr.includes(searchQuery) ||
    person.phone.includes(searchQuery)
  );

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
            {language === 'ar' ? 'اختر مندوب التوصيل' : 'Select Delivery Person'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              className="ps-10"
            />
          </div>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto">
          {/* No Delivery Option */}
          <button
            onClick={() => {
              onSelectDelivery(null);
              onClose();
            }}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-all mb-2',
              !selectedDelivery
                ? 'bg-primary/10 border-primary'
                : 'bg-background border-border hover:border-primary'
            )}
          >
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <User size={20} className="text-muted-foreground" />
            </div>
            <div className="flex-1 text-start">
              <p className="font-medium text-foreground">
                {language === 'ar' ? 'بدون توصيل' : 'No Delivery'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'استلام من المحل' : 'Store pickup'}
              </p>
            </div>
            {!selectedDelivery && <Check size={20} className="text-primary" />}
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDeliveryPersons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {language === 'ar' ? 'لا يوجد مناديب توصيل' : 'No delivery persons available'}
              </p>
              <p className="text-xs mt-1">
                {language === 'ar' ? 'أضف مناديب من الموارد البشرية' : 'Add from HR section'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDeliveryPersons.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    onSelectDelivery(person);
                    onClose();
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                    selectedDelivery?.id === person.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background border-border hover:border-primary'
                  )}
                >
                  <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                    <Truck size={20} className="text-success" />
                  </div>
                  <div className="flex-1 text-start">
                    <p className="font-medium text-foreground">
                      {language === 'ar' ? person.nameAr : person.name}
                    </p>
                    {person.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone size={12} />
                        {person.phone}
                      </p>
                    )}
                  </div>
                  {selectedDelivery?.id === person.id && (
                    <Check size={20} className="text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

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

export default POSDeliverySelector;
