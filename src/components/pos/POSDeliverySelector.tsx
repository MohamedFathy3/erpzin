import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, User, Phone, Check, Search, Truck, Bike, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ✅ تعديل الـ interface ليتوافق مع الـ API والـ POS.tsx
interface DeliveryMan {
  id: number;           // من API
  name: string;         // من API
  nameAr?: string;      // ✅ نضيفها كـ property اختياري (نفس الاسم من API)
  phone: string;        // من API
  vehicle_type: string;
  vehicle_number?: string;
  created_at?: string;
}

interface POSDeliverySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDelivery: (delivery: DeliveryMan | null) => void;  // ✅ DeliveryMan match
  selectedDelivery: DeliveryMan | null;
}

const POSDeliverySelector: React.FC<POSDeliverySelectorProps> = ({
  isOpen,
  onClose,
  onSelectDelivery,
  selectedDelivery
}) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // جلب مناديب التوصيل من API
  const { data: deliveryMen = [], isLoading } = useQuery({
    queryKey: ['delivery-men'],
    queryFn: async () => {
      try {
        const response = await api.post('/delevery-man/index');
        const data = response.data.data || [];
        
        // ✅ تحويل البيانات لتتوافق مع واجهتنا
        return data.map((item: any) => ({
          id: item.id,
          name: item.name,
          nameAr: item.name, // ✅ لو ما في اسم عربي، استخدم نفس الاسم
          phone: item.phone || '',
          vehicle_type: item.vehicle_type || '',
          vehicle_number: item.vehicle_number || '',
          created_at: item.created_at
        }));
      } catch (error) {
        console.error('Error fetching delivery men:', error);
        return [];
      }
    },
    enabled: isOpen
  });

  // فلترة حسب البحث
  const filteredDeliveries = deliveryMen.filter((delivery: DeliveryMan) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      delivery.name.toLowerCase().includes(searchLower) ||
      (delivery.nameAr && delivery.nameAr.toLowerCase().includes(searchLower)) ||
      (delivery.phone && delivery.phone.includes(searchQuery)) ||
      (delivery.vehicle_number && delivery.vehicle_number.toLowerCase().includes(searchLower))
    );
  });

  // أيقونة حسب نوع المركبة
  const getVehicleIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'car':
        return <Car size={16} className="text-blue-500" />;
      case 'motorcycle':
        return <Bike size={16} className="text-orange-500" />;
      case 'bike':
        return <Bike size={16} className="text-green-500" />;
      default:
        return <Truck size={16} className="text-purple-500" />;
    }
  };

  // ترجمة نوع المركبة
  const getVehicleTypeText = (type: string) => {
    if (!type) return '';
    
    const types: Record<string, string> = {
      'car': language === 'ar' ? 'سيارة' : 'Car',
      'motorcycle': language === 'ar' ? 'دراجة نارية' : 'Motorcycle',
      'bike': language === 'ar' ? 'دراجة' : 'Bike',
    };
    
    return types[type.toLowerCase()] || type;
  };

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
            {language === 'ar' ? 'اختر مندوب التوصيل' : 'Select Delivery Man'}
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
              placeholder={language === 'ar' ? 'بحث بالاسم أو رقم المركبة...' : 'Search by name or vehicle...'}
              className="ps-10"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
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
                {language === 'ar' ? 'بدون مندوب توصيل' : 'No Delivery Man'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'توصيل عادي' : 'Regular delivery'}
              </p>
            </div>
            {!selectedDelivery && <Check size={20} className="text-primary" />}
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {language === 'ar' ? 'لا يوجد مناديب توصيل' : 'No delivery men available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDeliveries.map((delivery: DeliveryMan) => {
                const deliveryId = String(delivery.id); // تحويل لـ string للمقارنة
                const selectedId = selectedDelivery ? String(selectedDelivery.id) : null;
                
                return (
                  <button
                    key={delivery.id}
                    onClick={() => {
                      onSelectDelivery(delivery);
                      onClose();
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                      selectedId === deliveryId
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:border-primary'
                    )}
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Truck size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 text-start">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">
                          {language === 'ar' && delivery.nameAr ? delivery.nameAr : delivery.name}
                        </p>
                        {delivery.vehicle_type && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                            {getVehicleIcon(delivery.vehicle_type)}
                            {getVehicleTypeText(delivery.vehicle_type)}
                          </span>
                        )}
                      </div>
                      
                      {delivery.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone size={12} />
                          {delivery.phone}
                        </p>
                      )}
                      
                      {delivery.vehicle_number && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === 'ar' ? 'رقم المركبة: ' : 'Vehicle: '}
                          {delivery.vehicle_number}
                        </p>
                      )}
                    </div>
                    {selectedId === deliveryId && (
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

export default POSDeliverySelector;