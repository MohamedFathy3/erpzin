// POS.tsx - إضافة Offline Features
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { cn } from '@/lib/utils';
import { 
  Search, Barcode, Home, LogOut, Loader2, Crown, Clock, User, 
  Truck, RotateCcw, DollarSign, Building2, Wifi, WifiOff, RefreshCw,
  ShoppingBag, AlertCircle, CheckCircle2,
  UserCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useCategories, useProducts, useProductByBarcode, Product } from '@/hooks/usePOSData';
import { useNavigate } from 'react-router-dom';
import POSProductGrid from '@/components/pos/POSProductGrid';
import POSCart from '@/components/pos/POSCart';
import POSPaymentModal from '@/components/pos/POSPaymentModal';
import POSHeldOrders from '@/components/pos/POSHeldOrders';
import POSCategories from '@/components/pos/POSCategories';
import POSVariantSelector from '@/components/pos/POSVariantSelector';
import POSCustomerSelector from '@/components/pos/POSCustomerSelector';
import POSShiftManagement from '@/components/pos/POSShiftManagement';
import POSReturns from '@/components/pos/POSReturns';
import POSShortcutsBar from '@/components/pos/POSShortcutsBar';
import { useAuth } from '@/contexts/AuthContext';
import { usePOSKeyboardShortcuts, getPOSShortcuts } from '@/hooks/usePOSKeyboardShortcuts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';
import { 
  saveOrderOffline, 
  getUnsyncedOrders, 
  markOrderSynced, 
  syncAllOfflineData,
  getOfflineStats 
} from '@/lib/offlineDB';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import POSSalesRepSelector from '@/components/pos/POSSalesRepSelector'; // ✅ التصحيح هنا

interface CartItem {
  id: string;
  variantId?: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  sku: string;
  sizeName?: string;
  colorName?: string;
  unitId?: number;
  colorId?: number;
  stock?: number;
}
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


interface HeldOrder {
  id: string;
  items: CartItem[];
  total: number;
  heldAt: Date;
  note?: string;
}

interface Customer {
  id: string;
  name: string;
  name_ar: string | null;
  phone: string | null;
  address: string | null;
  loyalty_points: number | null;
}

interface DeliveryPerson {
  id: string;
  name: string;
  nameAr: string;
  phone: string;
}

interface OfflineStats {
  products: number;
  customers: number;
  orders: number;
  categories: number;
  unsyncedOrders: number;
  lastUpdated: string;
}

const POS: React.FC = () => {
  const { language, t } = useLanguage();
  const { userBranch, userWarehouse, currentBranch, currentWarehouse } = useApp();
  const { formatCurrency } = useRegionalSettings();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showDeliverySelector, setShowDeliverySelector] = useState(false);
  const [showSalesRepSelector, setShowSalesRepSelector] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryPerson | null>(null);
  const [selectedSalesRep, setSelectedSalesRep] = useState<SalesRepresentative | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showReturns, setShowReturns] = useState(false);
  const [showShiftPanel, setShowShiftPanel] = useState(false);
  const [selectedCartItemIndex, setSelectedCartItemIndex] = useState<number>(-1);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [offlineStats, setOfflineStats] = useState<OfflineStats | null>(null);
  const [showOfflineStats, setShowOfflineStats] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // ==================== Offline Mode Management ====================
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: language === 'ar' ? 'تم الاتصال بالإنترنت' : 'Back online',
        description: language === 'ar' ? 'سيتم مزامنة البيانات تلقائياً' : 'Data will sync automatically',
      });
      checkUnsyncedOrders();
      loadOfflineStats();
      syncOfflineOrders();
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: language === 'ar' ? 'أنت الآن في وضع عدم الاتصال' : 'You are offline',
        description: language === 'ar' 
          ? 'سيتم حفظ الفواتير محلياً ومزامنتها لاحقاً' 
          : 'Invoices will be saved locally and synced later',
        variant: 'destructive',
      });
      loadOfflineStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkUnsyncedOrders();
    loadOfflineStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [language]);

  const loadOfflineStats = async () => {
    try {
      const stats = await getOfflineStats();
      setOfflineStats(stats);
    } catch (error) {
      console.error('Error loading offline stats:', error);
    }
  };

  const checkUnsyncedOrders = async () => {
    try {
      const orders = await getUnsyncedOrders();
      setUnsyncedCount(orders.length);
      console.log(`📦 Found ${orders.length} unsynced orders`);
    } catch (error) {
      console.error('Error checking unsynced orders:', error);
      setUnsyncedCount(0);
    }
  };

  const syncOfflineOrders = async () => {
    if (!navigator.onLine) {
      toast({
        title: language === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    try {
      const unsyncedOrders = await getUnsyncedOrders();
      
      if (unsyncedOrders.length === 0) {
        toast({
          title: language === 'ar' ? 'لا توجد طلبات للمزامنة' : 'No orders to sync',
        });
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const order of unsyncedOrders) {
        try {
          const response = await fetch('/api/invoice/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              customer_id: parseInt(order.customer_id || '1'),
              items: order.items.map((item: any) => ({
                product_id: parseInt(item.id),
                quantity: item.quantity,
                price: item.price,
                color: item.colorName || null,
                size: item.sizeName || null
              })),
              payments: order.payments || [],
              subtotal: order.subtotal,
              tax: order.tax,
              total: order.total,
            })
          });

          if (response.ok) {
            await markOrderSynced(order.id);
            successCount++;
            console.log('✅ Synced order:', order.id);
          } else {
            const errorData = await response.json();
            console.error('Failed to sync order:', order.id, errorData);
            failCount++;
          }
        } catch (error) {
          console.error('Error syncing order:', order.id, error);
          failCount++;
        }
      }

      await checkUnsyncedOrders();
      await loadOfflineStats();
      
      toast({
        title: language === 'ar' ? 'تمت المزامنة' : 'Sync completed',
        description: language === 'ar' 
          ? `تمت مزامنة ${successCount} طلب، فشل ${failCount}`
          : `${successCount} orders synced, ${failCount} failed`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: language === 'ar' ? 'حدث خطأ في المزامنة' : 'Sync failed',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const clearAllOfflineData = async () => {
    if (!window.confirm(language === 'ar' 
      ? 'هل أنت متأكد من حذف جميع البيانات المحلية؟' 
      : 'Are you sure you want to delete all local data?')) {
      return;
    }

    try {
      const { clearAllOfflineData } = await import('@/lib/offlineDB');
      await clearAllOfflineData();
      setUnsyncedCount(0);
      setOfflineStats(null);
      toast({
        title: language === 'ar' ? 'تم مسح جميع البيانات المحلية' : 'All local data cleared',
      });
    } catch (error) {
      console.error('Error clearing offline data:', error);
      toast({
        title: language === 'ar' ? 'حدث خطأ في مسح البيانات' : 'Error clearing data',
        variant: 'destructive',
      });
    }
  };

  const { data: categories, isLoading: categoriesLoading, isOffline: categoriesOffline } = useCategories();
  const { data: products, isLoading: productsLoading, isOffline: productsOffline } = useProducts(selectedCategory);
  
  const { data: barcodeProduct } = useProductByBarcode(searchQuery);

  useEffect(() => {
    if (barcodeProduct) {
      addToCart(barcodeProduct as Product);
      setSearchQuery('');
    }
  }, [barcodeProduct]);

  const transformedCategories = useMemo(() => [
    { id: 'all', name: 'All', nameAr: 'الكل', icon: '🏷️' },
    ...(categories?.map(cat => ({
      id: cat.id,
      name: cat.name,
      nameAr: cat.name_ar || cat.name,
      icon: getIconEmoji(cat.icon)
    })) || [])
  ], [categories]);

  const transformedProducts = useMemo(() => {
    if (!products) return [];
    
    return products.map((prod: Product) => ({
      id: prod.id.toString(),
      name: prod.name,
      nameAr: prod.name_ar || prod.name,
      price: prod.price,
      sku: prod.sku,
      barcode: prod.barcode || '',
      stock: prod.stock || 0,
      category_id: prod.category_id,
      image_url: prod.image_url,
      imageUrl: prod.imageUrl,
      image: prod.image,
      hasVariants: prod.has_variants,
      units: prod.units || [],
    }));
  }, [products]);

  useEffect(() => {
    setSearchQuery('');
  }, [selectedCategory]);

  const addToCart = (product: Product) => {
    if (product.units && product.units.length > 0) {
      setSelectedProductForVariant(product);
      setShowVariantSelector(true);
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id && !item.variantId);
      if (existing) {
        return prev.map(item =>
          item.id === product.id && !item.variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        nameAr: product.name_ar || product.name,
        price: product.price,
        quantity: 1,
        sku: product.sku
      }];
    });
  };

  const addVariantToCart = (variant: {
    productId: string;
    unitId: number;
    colorId: number;
    size: string;
    color: string;
    price: number;
    sku: string;
    stock: number;
  }) => {
    if (!selectedProductForVariant) return;

    const variantId = `${selectedProductForVariant.id}-${variant.unitId}-${variant.colorId}`;
    
    setCartItems(prev => {
      const existing = prev.find(item => item.variantId === variantId);
      if (existing) {
        return prev.map(item =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: selectedProductForVariant.id,
        variantId: variantId,
        name: selectedProductForVariant.name,
        nameAr: selectedProductForVariant.name_ar || selectedProductForVariant.name,
        price: variant.price,
        quantity: 1,
        sku: variant.sku,
        sizeName: variant.size,
        colorName: variant.color,
        unitId: variant.unitId,
        colorId: variant.colorId,
        stock: variant.stock
      }];
    });

    setShowVariantSelector(false);
    setSelectedProductForVariant(null);
  };

  const updateQuantity = (itemKey: string, quantity: number, variantId?: string) => {
    if (quantity < 1) {
      removeItem(itemKey, variantId);
    } else {
      setCartItems(prev =>
        prev.map(item => {
          const match = variantId 
            ? item.variantId === variantId 
            : item.id === itemKey && !item.variantId;
          return match ? { ...item, quantity } : item;
        })
      );
    }
  };

  const removeItem = (itemKey: string, variantId?: string) => {
    setCartItems(prev => prev.filter(item => {
      if (variantId) {
        return item.variantId !== variantId;
      }
      return !(item.id === itemKey && !item.variantId);
    }));
  };

  const clearCart = () => setCartItems([]);

  const holdOrder = () => {
    if (cartItems.length === 0) return;
    
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    const newHeldOrder: HeldOrder = {
      id: `HOLD-${Date.now()}`,
      items: [...cartItems],
      total,
      heldAt: new Date()
    };

    setHeldOrders(prev => [...prev, newHeldOrder]);
    setCartItems([]);
    
    toast({
      title: language === 'ar' ? 'تم تعليق الطلب' : 'Order held',
      description: language === 'ar' ? `رقم الطلب: ${newHeldOrder.id.slice(-4)}` : `Order #${newHeldOrder.id.slice(-4)}`
    });
  };

  const restoreOrder = (order: HeldOrder) => {
    setCartItems(order.items);
    setHeldOrders(prev => prev.filter(o => o.id !== order.id));
  };

  const deleteHeldOrder = (orderId: string) => {
    setHeldOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const calculateSubtotal = () => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateTax = () => calculateSubtotal() * 0.05;
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const handlePaymentComplete = async (payments: { method: string; amount: number }[]) => {
    if (!navigator.onLine || isOffline) {
      try {
        const orderId = await saveOrderOffline({
          items: cartItems,
          subtotal: calculateSubtotal(),
          tax: calculateTax(),
          total: calculateTotal(),
          customer_id: selectedCustomer?.id,
          delivery_id: selectedDelivery?.id,
          payment_method: payments[0]?.method,
          payments
        });
        
        if (orderId) {
          await checkUnsyncedOrders();
          await loadOfflineStats();
          
          toast({
            title: language === 'ar' ? 'تم حفظ الطلب محلياً' : 'Order saved locally',
            description: language === 'ar' 
              ? `رقم الطلب: ${orderId.slice(-8)}` 
              : `Order #: ${orderId.slice(-8)}`,
          });
        } else {
          throw new Error('Failed to save offline');
        }
      } catch (error) {
        console.error('Error saving offline order:', error);
        toast({
          title: language === 'ar' ? 'حدث خطأ في حفظ الطلب' : 'Error saving order',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: language === 'ar' ? 'تمت العملية بنجاح' : 'Payment successful',
        description: language === 'ar'
          ? `المبلغ: ${formatCurrency(calculateTotal())}`
          : `Amount: ${formatCurrency(calculateTotal())}`
      });
    }

    setShowPayment(false);
    setCartItems([]);
    setSelectedCustomer(null);
    setSelectedDelivery(null);
  };

  const handleLogout = async () => {
    localStorage.removeItem('sb-auth');
    navigate('/auth');
  };

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleCloseAllModals = useCallback(() => {
    if (showPayment) setShowPayment(false);
    else if (showHeldOrders) setShowHeldOrders(false);
    else if (showCustomerSelector) setShowCustomerSelector(false);
    else if (showDeliverySelector) setShowDeliverySelector(false);
    else if (showReturns) setShowReturns(false);
    else if (showShiftPanel) setShowShiftPanel(false);
    else if (showVariantSelector) setShowVariantSelector(false);
  }, [showPayment, showHeldOrders, showCustomerSelector, showDeliverySelector, showReturns, showShiftPanel, showVariantSelector]);

  const handleIncreaseQuantity = useCallback(() => {
    if (cartItems.length > 0) {
      const index = selectedCartItemIndex >= 0 ? selectedCartItemIndex : cartItems.length - 1;
      const item = cartItems[index];
      if (item) {
        updateQuantity(item.id, item.quantity + 1, item.variantId);
      }
    }
  }, [cartItems, selectedCartItemIndex]);

  const handleDecreaseQuantity = useCallback(() => {
    if (cartItems.length > 0) {
      const index = selectedCartItemIndex >= 0 ? selectedCartItemIndex : cartItems.length - 1;
      const item = cartItems[index];
      if (item) {
        updateQuantity(item.id, item.quantity - 1, item.variantId);
      }
    }
  }, [cartItems, selectedCartItemIndex]);

  const isAnyModalOpen = showPayment || showHeldOrders || showCustomerSelector || showDeliverySelector || showReturns || showShiftPanel || showVariantSelector;

  const posShortcuts = getPOSShortcuts({
    onPay: () => cartItems.length > 0 && setShowPayment(true),
    onHold: holdOrder,
    onClearCart: clearCart,
    onFocusSearch: handleFocusSearch,
    onShowHeldOrders: () => setShowHeldOrders(true),
    onShowCustomer: () => setShowCustomerSelector(true),
    onShowDelivery: () => setShowDeliverySelector(true),
    onShowReturns: () => setShowReturns(true),
    onShowShift: () => setShowShiftPanel(true),
    onGoHome: () => navigate('/'),
    onEscape: handleCloseAllModals,
    onIncreaseQuantity: handleIncreaseQuantity,
    onDecreaseQuantity: handleDecreaseQuantity,
  });

  usePOSKeyboardShortcuts(posShortcuts, !isAnyModalOpen);

  const isLoading = categoriesLoading || productsLoading;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* POS Header */}
        <header className="h-14 bg-sidebar flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-white" />
              <h1 className="text-xl font-bold text-white">
                {language === 'ar' ? 'نقطة البيع' : 'Point of Sale'}
              </h1>
            </div>
            
            {/* Offline/Online Status */}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
              isOffline 
                ? "bg-red-500/20 text-red-400" 
                : "bg-green-500/20 text-green-400"
            )}>
              {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
              <span>
                {isOffline 
                  ? (language === 'ar' ? 'بدون نت' : 'Offline') 
                  : (language === 'ar' ? 'متصل' : 'Online')}
              </span>
            </div>
            
            {/* Branch Info */}
            {(userBranch || currentBranch) && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                <Building2 size={14} />
                <span>
                  {userBranch 
                    ? (language === 'ar' && userBranch.name_ar ? userBranch.name_ar : userBranch.name)
                    : currentBranch 
                      ? (language === 'ar' && currentBranch.name_ar ? currentBranch.name_ar : currentBranch.name)
                      : null
                  }
                </span>
              </div>
            )}
            
            {/* User Info */}
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl shadow-sm">
              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500 text-white">
                <User size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">
                  {user?.name}
                </span>
              </div>
            </div>
            
            {currentShift && (
              <span className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded text-xs font-medium">
                {language === 'ar' ? 'الوردية نشطة' : 'Shift Active'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 me-2 border-e border-white/20 pe-3">
              {/* Sync Button */}
              {unsyncedCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={syncOfflineOrders}
                  disabled={syncing || isOffline}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 relative gap-1.5 px-2"
                >
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  <span className="text-xs font-medium">
                    {language === 'ar' ? 'مزامنة' : 'Sync'}
                  </span>
                  <span className="absolute -top-1 -end-1 w-4 h-4 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unsyncedCount}
                  </span>
                </Button>
              )}

              {/* Held Orders */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowHeldOrders(true)}
                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 relative gap-1.5 px-2"
              >
                <Clock size={16} />
                <span className="text-xs font-medium">{language === 'ar' ? 'المعلقة' : 'Held'}</span>
                {heldOrders.length > 0 && (
                  <span className="absolute -top-1 -end-1 w-4 h-4 bg-warning text-warning-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {heldOrders.length}
                  </span>
                )}
              </Button>

              {/* Customer */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCustomerSelector(true)}
                className={cn(
                  "gap-1.5 px-2",
                  selectedCustomer 
                    ? "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20" 
                    : "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/20"
                )}
              >
                <User size={16} />
                <span className="text-xs font-medium">{language === 'ar' ? 'العميل' : 'Customer'}</span>
              </Button>

              {/* Sales Rep - مش Delivery */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSalesRepSelector(true)}
                className={cn(
                  "gap-1.5 px-2",
                  selectedSalesRep 
                    ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20" 
                    : "text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/20"
                )}
              >
                <UserCheck size={16} />
                <span className="text-xs font-medium">{language === 'ar' ? 'المبيعات' : 'Sales'}</span>
                {selectedSalesRep && (
                  <span className="absolute -top-1 -end-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </Button>

              {/* Returns */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowReturns(true)}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 gap-1.5 px-2"
              >
                <RotateCcw size={16} />
                <span className="text-xs font-medium">{language === 'ar' ? 'مرتجع' : 'Returns'}</span>
              </Button>

              {/* Shift */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowShiftPanel(true)}
                className={cn(
                  "gap-1.5 px-2",
                  currentShift 
                    ? "text-violet-400 hover:text-violet-300 hover:bg-violet-500/20" 
                    : "text-violet-400/70 hover:text-violet-300 hover:bg-violet-500/20"
                )}
              >
                <DollarSign size={16} />
                <span className="text-xs font-medium">{language === 'ar' ? 'الوردية' : 'Shift'}</span>
              </Button>
            </div>

            {/* Selected Customer Display */}
            {selectedCustomer && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
                <span className="text-white/90 text-sm">
                  {language === 'ar' ? selectedCustomer.name_ar || selectedCustomer.name : selectedCustomer.name}
                </span>
                <div className="flex items-center gap-1">
                  <Crown size={14} className="text-warning" />
                  <span className="text-warning font-semibold text-xs">
                    {selectedCustomer.loyalty_points || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Selected Delivery Display */}
            {selectedDelivery && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-lg">
                <span className="text-white/90 text-sm">
                  {language === 'ar' ? selectedDelivery.nameAr : selectedDelivery.name}
                </span>
              </div>
            )}

            {/* Selected Sales Rep Display */}
            {selectedSalesRep && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-lg">
                <span className="text-white/90 text-sm">
                  {selectedSalesRep.name}
                </span>
                {selectedSalesRep.commission_rate && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                    {selectedSalesRep.commission_rate}%
                  </span>
                )}
              </div>
            )}

            {/* Offline Stats Button */}
            {isOffline && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOfflineStats(!showOfflineStats)}
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/20"
                  >
                    <AlertCircle size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{language === 'ar' ? 'إحصائيات محلية' : 'Offline Stats'}</span>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Home */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/">
                  <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                    <Home size={20} />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border border-border">
                <span>{language === 'ar' ? 'الرئيسية' : 'Home'} (F12)</span>
              </TooltipContent>
            </Tooltip>

            {/* Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <LogOut size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-card border border-border">
                <span>{language === 'ar' ? 'خروج' : 'Logout'}</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Products Section */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="space-y-3 mb-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder={language === 'ar' ? 'بحث بالاسم، الباركود، أو SKU...' : 'Search by name, barcode, or SKU...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-10 pe-10 h-12 text-base"
                />
                <Barcode className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              </div>
              
              {/* Offline indicator for categories */}
              {categoriesOffline && (
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <WifiOff size={12} />
                  <span>{language === 'ar' ? 'الفئات من الذاكرة المحلية' : 'Categories from offline storage'}</span>
                </div>
              )}

              {/* POSCategories */}
              <POSCategories
                categories={transformedCategories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            {/* Offline Stats Panel */}
            {showOfflineStats && offlineStats && (
              <Card className="mb-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm flex items-center gap-1">
                      <AlertCircle size={14} className="text-amber-600" />
                      {language === 'ar' ? 'إحصائيات محلية' : 'Offline Stats'}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(offlineStats.lastUpdated), 'HH:mm')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'منتجات' : 'Products'}:</span>
                      <span className="font-medium">{offlineStats.products}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'عملاء' : 'Customers'}:</span>
                      <span className="font-medium">{offlineStats.customers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'فئات' : 'Categories'}:</span>
                      <span className="font-medium">{offlineStats.categories}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'غير متزامنة' : 'Unsynced'}:</span>
                      <span className="font-medium text-amber-600">{offlineStats.unsyncedOrders}</span>
                    </div>
                  </div>
                  {unsyncedCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={syncOfflineOrders}
                      disabled={syncing}
                      className="w-full mt-2 h-7 text-xs"
                    >
                      {syncing ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      {language === 'ar' ? 'مزامنة' : 'Sync Now'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Offline indicator for products */}
                  {productsOffline && (
                    <div className="mb-2 flex items-center gap-1 text-xs text-amber-500">
                      <WifiOff size={12} />
                      <span>{language === 'ar' ? 'المنتجات من الذاكرة المحلية' : 'Products from offline storage'}</span>
                    </div>
                  )}
                  <POSProductGrid
                    products={transformedProducts}
                    onAddToCart={addToCart}
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                  />
                </>
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="w-[380px] p-4 ps-0 flex-shrink-0">
            <POSCart
              items={cartItems}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              onHoldOrder={holdOrder}
              onPay={() => setShowPayment(true)}
              heldOrdersCount={heldOrders.length}
            />
          </div>
        </div>

        {/* Shortcuts Bar */}
        <POSShortcutsBar
          onPay={() => cartItems.length > 0 && setShowPayment(true)}
          onHold={holdOrder}
          onClearCart={clearCart}
          onShowHeldOrders={() => setShowHeldOrders(true)}
          onShowCustomer={() => setShowCustomerSelector(true)}
          onShowDelivery={() => setShowDeliverySelector(true)}
          onShowReturns={() => setShowReturns(true)}
          onShowShift={() => setShowShiftPanel(true)}
          onFocusSearch={handleFocusSearch}
          onGoHome={() => navigate('/')}
          cartItemsCount={cartItems.length}
          heldOrdersCount={heldOrders.length}
          hasShift={!!currentShift}
        />

        {/* Modals */}
        <POSPaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          total={calculateTotal()}
          subtotal={calculateSubtotal()}
          tax={calculateTax()}
          cartItems={cartItems}
          onComplete={handlePaymentComplete}
          customer={selectedCustomer ? { 
            id: selectedCustomer.id, 
            name: selectedCustomer.name, 
            loyalty_points: selectedCustomer.loyalty_points 
          } : null}
          deliveryPerson={selectedDelivery ? { 
            id: selectedDelivery.id, 
            name: selectedDelivery.name 
          } : null}
          salesRepresentative={selectedSalesRep ? { 
            id: selectedSalesRep.id, 
            name: selectedSalesRep.name,
            commission_rate: selectedSalesRep.commission_rate 
          } : null}
          shiftId={currentShift?.id || null}
          branchId={userBranch?.id || currentBranch?.id || null}
        />

        <POSHeldOrders
          isOpen={showHeldOrders}
          onClose={() => setShowHeldOrders(false)}
          orders={heldOrders}
          onRestoreOrder={restoreOrder}
          onDeleteOrder={deleteHeldOrder}
        />

        {selectedProductForVariant && (
          <POSVariantSelector
            isOpen={showVariantSelector}
            onClose={() => {
              setShowVariantSelector(false);
              setSelectedProductForVariant(null);
            }}
            product={selectedProductForVariant}
            onSelectVariant={addVariantToCart}
          />
        )}

        <POSCustomerSelector
          isOpen={showCustomerSelector}
          onClose={() => setShowCustomerSelector(false)}
          onSelectCustomer={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />

        

        {/* ✅ مودال مندوب المبيعات */}
        {showSalesRepSelector && (
          <POSSalesRepSelector
            isOpen={showSalesRepSelector}
            onClose={() => setShowSalesRepSelector(false)}
            onSelectRep={setSelectedSalesRep}
            selectedRep={selectedSalesRep}
            branchId={userBranch?.id || currentBranch?.id}
          />
        )}

        <Dialog open={showShiftPanel} onOpenChange={setShowShiftPanel}>
          <DialogContent className="sm:max-w-md">
            <POSShiftManagement
              currentShift={currentShift}
              onShiftChange={setCurrentShift}
            />
          </DialogContent>
        </Dialog>

        <POSReturns
          isOpen={showReturns}
          onClose={() => setShowReturns(false)}
          currentShiftId={currentShift?.id}
          onReturnComplete={(amount) => {
            toast({
              title: language === 'ar' ? 'تم الإرجاع' : 'Return completed',
              description: `${amount.toLocaleString()} ${language === 'ar' ? 'ر.ي' : 'YER'}`
            });
          }}
        />
      </div>
    </TooltipProvider>
  );
};

function getIconEmoji(iconName: string | null): string {
  const iconMap: Record<string, string> = {
    'Smartphone': '📱',
    'Shirt': '👔',
    'Coffee': '☕',
    'Home': '🏠',
    'Dumbbell': '🏋️',
    'Package': '📦',
  };
  return iconMap[iconName || ''] || '📦';
}

export default POS;