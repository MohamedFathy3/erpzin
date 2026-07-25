import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Search, UserPlus, User, Phone, MapPin, Check, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { offlineDB, saveCustomersOffline, getCustomersOffline, searchCustomersOffline } from '@/lib/offlineDB';

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [offlineCustomers, setOfflineCustomers] = useState<Customer[]>([]);
  const [isOfflineLoading, setIsOfflineLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    name_ar: '',
    phone: '',
    address: ''
  });

  // ==================== Online/Offline Detection ====================
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ==================== Load offline customers when in offline mode ====================
  useEffect(() => {
    if (isOfflineMode && isOpen) {
      setIsOfflineLoading(true);
      getCustomersOffline()
        .then(customers => {
          setOfflineCustomers(customers as Customer[]);
        })
        .catch(error => {
          console.error('Error loading offline customers:', error);
        })
        .finally(() => {
          setIsOfflineLoading(false);
        });
    }
  }, [isOfflineMode, isOpen]);

  // ==================== Debounced Search ====================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ==================== Online Query for Customers ====================
  const { data: onlineCustomers, isLoading: onlineLoading } = useQuery({
    queryKey: ['customers-pos', debouncedSearchQuery],
    queryFn: async () => {
      try {
        const filters: any = {};
        
        if (debouncedSearchQuery.trim()) {
          filters.search = debouncedSearchQuery;
        }

        const response = await api.post('/customer/index', {
          filters: filters,
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false,
          delete: false
        });
        
        const customers = response.data.data || [];
        
        // Save to offline DB for future use
        await saveCustomersOffline(customers);
        
        return customers;
      } catch (error) {
        console.error('Error fetching customers:', error);
        
        // If offline, try to get from offline DB
        if (!navigator.onLine) {
          setIsOfflineMode(true);
          const offline = await getCustomersOffline();
          setOfflineCustomers(offline as Customer[]);
          return offline;
        }
        
        toast({
          title: language === 'ar' ? 'خطأ في جلب العملاء' : 'Error fetching customers',
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: isOpen && !isOfflineMode,
  });

  // ==================== Filter customers (online or offline) ====================
  const filteredCustomers = useMemo(() => {
    const source = isOfflineMode ? offlineCustomers : (onlineCustomers || []);
    
    if (!source.length) return [];
    
    if (!searchQuery.trim()) return source;
    
    const query = searchQuery.toLowerCase();
    return source.filter((customer: Customer) => {
      return (
        (customer.name && customer.name.toLowerCase().includes(query)) ||
        (customer.name_ar && customer.name_ar.toLowerCase().includes(query)) ||
        (customer.phone && customer.phone.includes(query))
      );
    });
  }, [isOfflineMode, onlineCustomers, offlineCustomers, searchQuery]);

  // ==================== Add Customer Mutation ====================
  const addCustomerMutation = useMutation({
    mutationFn: async (customer: typeof newCustomer) => {
      const response = await api.post('/customer', customer);
      return response.data;
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
    onError: (error: any) => {
      // If offline, we could save to offline DB
      if (!navigator.onLine) {
        // Create offline customer
        const offlineCustomer: Customer = {
          id: `OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: newCustomer.name,
          name_ar: newCustomer.name_ar || newCustomer.name,
          phone: newCustomer.phone || null,
          address: newCustomer.address || null,
          loyalty_points: 0
        };
        
        // Add to offline DB
        offlineDB.customers.add({
          ...offlineCustomer,
          lastUpdated: Date.now(),
          synced: false
        }).then(() => {
          onSelectCustomer(offlineCustomer);
          setShowAddForm(false);
          setNewCustomer({ name: '', name_ar: '', phone: '', address: '' });
          toast({
            title: language === 'ar' ? 'تم إضافة العميل محلياً' : 'Customer added locally',
            description: language === 'ar' ? 'سيتم مزامنته لاحقاً' : 'Will be synced later',
          });
          onClose();
        }).catch(err => {
          console.error('Error saving offline customer:', err);
          toast({
            title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
            description: language === 'ar' ? 'تعذر إضافة العميل' : 'Failed to add customer',
            variant: 'destructive'
          });
        });
      } else {
        toast({
          title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
          description: error?.response?.data?.message || (language === 'ar' ? 'تعذر إضافة العميل' : 'Failed to add customer'),
          variant: 'destructive'
        });
      }
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
    
    const customerData = {
      ...newCustomer,
      name_ar: newCustomer.name_ar.trim() || newCustomer.name
    };
    
    addCustomerMutation.mutate(customerData);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const isLoading = isOfflineMode ? isOfflineLoading : onlineLoading;

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
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">
              {showAddForm 
                ? (language === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer')
                : (language === 'ar' ? 'اختر العميل' : 'Select Customer')
              }
            </h2>
            {/* Offline indicator */}
            {isOfflineMode && !showAddForm && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-xs">
                <WifiOff size={12} />
                <span>{language === 'ar' ? 'بدون نت' : 'Offline'}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {showAddForm ? (
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Offline warning in add form */}
            {isOfflineMode && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-600 text-sm">
                <WifiOff size={16} />
                <span>
                  {language === 'ar' 
                    ? 'أنت في وضع عدم الاتصال. سيتم حفظ العميل محلياً.' 
                    : 'You are offline. Customer will be saved locally.'}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {language === 'ar' ? 'الاسم (English) *' : 'Name (English) *'}
              </label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {language === 'ar' ? 'الاسم (العربي)' : 'Name (Arabic)'}
              </label>
              <Input
                value={newCustomer.name_ar}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name_ar: e.target.value }))}
                placeholder="جون دو"
                className="w-full"
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
                className="w-full"
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
                className="w-full"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCustomer({ name: '', name_ar: '', phone: '', address: '' });
                }}
                className="flex-1"
                disabled={addCustomerMutation.isPending}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleAddCustomer}
                disabled={addCustomerMutation.isPending || !newCustomer.name.trim()}
                className="flex-1"
              >
                {addCustomerMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {language === 'ar' ? 'جاري الإضافة...' : 'Adding...'}
                  </>
                ) : (
                  language === 'ar' ? 'إضافة' : 'Add'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={language === 'ar' ? 'بحث بالاسم أو رقم الهاتف...' : 'Search by name or phone...'}
                  className="ps-10 pe-10"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={language === 'ar' ? 'مسح البحث' : 'Clear search'}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {isOfflineMode && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
                  <WifiOff size={12} />
                  <span>{language === 'ar' ? 'العملاء من الذاكرة المحلية' : 'Customers from offline storage'}</span>
                </div>
              )}
            </div>

            {/* Customers List */}
            <div className="flex-1 overflow-y-auto p-2">
              {/* Walk-in Customer Option */}
              <button
                onClick={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all mb-2 hover:bg-accent',
                  !selectedCustomer
                    ? 'bg-primary/10 border-primary'
                    : 'bg-background border-border hover:border-primary'
                )}
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User size={20} className="text-primary" />
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
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'جاري تحميل العملاء...' : 'Loading customers...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? (language === 'ar' ? 'لم يتم العثور على عملاء' : 'No customers found')
                          : (language === 'ar' ? 'لا توجد عملاء مسجلين' : 'No customers registered')
                        }
                      </p>
                      {searchQuery && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {language === 'ar' ? 'حاول البحث باسم أو رقم هاتف مختلف' : 'Try searching with a different name or phone number'}
                        </p>
                      )}
                      {isOfflineMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddForm(true)}
                          className="mt-4"
                        >
                          <UserPlus size={16} className="me-2" />
                          {language === 'ar' ? 'إضافة عميل محلي' : 'Add Local Customer'}
                        </Button>
                      )}
                    </div>
                  ) : (
                     filteredCustomers.map((customer: Customer) => (
    <button
      key={customer.id}
      onClick={() => {
        onSelectCustomer(customer);
        onClose();
      }}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-accent',
        selectedCustomer?.id === customer.id
          ? 'bg-primary/10 border-primary'
          : 'bg-background border-border hover:border-primary'
      )}
    >
      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
        <User size={20} className="text-primary" />
      </div>
      <div className="flex-1 text-start min-w-0">
        <p className="font-medium text-foreground truncate">
          {language === 'ar' && customer.name_ar ? customer.name_ar : customer.name}
        </p>
        {customer.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
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
        {/* ✅ التعديل هنا: تحويل id إلى string قبل استخدام startsWith */}
        {customer.id && String(customer.id).startsWith('OFFLINE-') && (
          <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
            <WifiOff size={10} />
            {language === 'ar' ? 'محلي' : 'Local'}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {customer.loyalty_points && customer.loyalty_points > 0 && (
          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full whitespace-nowrap">
            {customer.loyalty_points} {language === 'ar' ? 'نقطة' : 'pts'}
          </span>
        )}
        {selectedCustomer?.id === customer.id && (
          <Check size={20} className="text-primary" />
        )}
      </div>
    </button>
  ))
)}
                </div>
              )}
            </div>

            {/* Add Customer Button */}
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