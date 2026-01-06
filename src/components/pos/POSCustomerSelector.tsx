import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Search, UserPlus, User, Phone, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  name_ar: string | null;
  phone: string | null;
  address: string | null;
  loyalty_points: number | null;
}

interface POSCustomerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

const POSCustomerSelector: React.FC<POSCustomerSelectorProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  selectedCustomer
}) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    name_ar: '',
    phone: '',
    address: ''
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers-pos', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('id, name, name_ar, phone, address, loyalty_points')
        .order('name');

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,name_ar.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data as Customer[];
    },
    enabled: isOpen
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (customer: typeof newCustomer) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: customer.name,
          name_ar: customer.name_ar || null,
          phone: customer.phone || null,
          address: customer.address || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers-pos'] });
      onSelectCustomer(data as Customer);
      setShowAddForm(false);
      setNewCustomer({ name: '', name_ar: '', phone: '', address: '' });
      toast({
        title: language === 'ar' ? 'تم إضافة العميل' : 'Customer added',
      });
      onClose();
    },
    onError: () => {
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        variant: 'destructive'
      });
    }
  });

  const handleAddCustomer = () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: language === 'ar' ? 'اسم العميل مطلوب' : 'Customer name is required',
        variant: 'destructive'
      });
      return;
    }
    addCustomerMutation.mutate(newCustomer);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground">
            {showAddForm 
              ? (language === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer')
              : (language === 'ar' ? 'اختر العميل' : 'Select Customer')
            }
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {showAddForm ? (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {language === 'ar' ? 'الاسم (English)' : 'Name (English)'}
              </label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {language === 'ar' ? 'الاسم (العربي)' : 'Name (Arabic)'}
              </label>
              <Input
                value={newCustomer.name_ar}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name_ar: e.target.value }))}
                placeholder="اسم العميل"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
              </label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="777123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {language === 'ar' ? 'العنوان' : 'Address'}
              </label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                placeholder={language === 'ar' ? 'العنوان' : 'Address'}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="flex-1"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleAddCustomer}
                disabled={addCustomerMutation.isPending}
                className="flex-1"
              >
                {addCustomerMutation.isPending
                  ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...')
                  : (language === 'ar' ? 'إضافة' : 'Add')
                }
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث بالاسم أو رقم الهاتف...' : 'Search by name or phone...'}
                  className="ps-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {/* Walk-in Customer Option */}
              <button
                onClick={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all mb-2',
                  !selectedCustomer
                    ? 'bg-primary/10 border-primary'
                    : 'bg-background border-border hover:border-primary'
                )}
              >
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User size={20} className="text-muted-foreground" />
                </div>
                <div className="flex-1 text-start">
                  <p className="font-medium text-foreground">
                    {language === 'ar' ? 'عميل عابر' : 'Walk-in Customer'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'بدون تسجيل بيانات العميل' : 'No customer data required'}
                  </p>
                </div>
                {!selectedCustomer && <Check size={20} className="text-primary" />}
              </button>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {customers?.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        onSelectCustomer(customer);
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                        selectedCustomer?.id === customer.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background border-border hover:border-primary'
                      )}
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 text-start">
                        <p className="font-medium text-foreground">
                          {language === 'ar' ? customer.name_ar || customer.name : customer.name}
                        </p>
                        {customer.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone size={12} />
                            {customer.phone}
                          </p>
                        )}
                        {customer.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin size={12} />
                            {customer.address}
                          </p>
                        )}
                      </div>
                      {customer.loyalty_points && customer.loyalty_points > 0 && (
                        <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full">
                          {customer.loyalty_points} {language === 'ar' ? 'نقطة' : 'pts'}
                        </span>
                      )}
                      {selectedCustomer?.id === customer.id && (
                        <Check size={20} className="text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/30">
              <Button
                onClick={() => setShowAddForm(true)}
                variant="outline"
                className="w-full"
              >
                <UserPlus size={18} className="me-2" />
                {language === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default POSCustomerSelector;
