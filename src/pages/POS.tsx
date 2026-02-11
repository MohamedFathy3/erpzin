import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { cn } from '@/lib/utils';
import { Search, Barcode, Home, LogOut, Loader2, Crown, Clock, User, Truck, RotateCcw, DollarSign, Building2, Warehouse } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useCategories, useProducts, useProductByBarcode, Product, getProductImageUrl, getProductColors, getProductSizes, getAvailableVariants } from '@/hooks/usePOSData';
import { useNavigate } from 'react-router-dom';
import POSProductGrid from '@/components/pos/POSProductGrid';
import POSCart from '@/components/pos/POSCart';
import POSPaymentModal from '@/components/pos/POSPaymentModal';
import POSHeldOrders from '@/components/pos/POSHeldOrders';
import POSCategories from '@/components/pos/POSCategories';
import POSVariantSelector from '@/components/pos/POSVariantSelector';
import POSCustomerSelector from '@/components/pos/POSCustomerSelector';
import POSDeliverySelector from '@/components/pos/POSDeliverySelector';
import POSShiftManagement from '@/components/pos/POSShiftManagement';
import POSReturns from '@/components/pos/POSReturns';
import POSShortcutsBar from '@/components/pos/POSShortcutsBar';

import { usePOSKeyboardShortcuts, getPOSShortcuts } from '@/hooks/usePOSKeyboardShortcuts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';

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
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryPerson | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showReturns, setShowReturns] = useState(false);
  const [showShiftPanel, setShowShiftPanel] = useState(false);
  const [selectedCartItemIndex, setSelectedCartItemIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // جلب الفئات
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  
  // جلب المنتجات مع فلترة حسب الفئة المختارة 🎯
  const { data: products, isLoading: productsLoading } = useProducts(selectedCategory);

  // البحث بالباركود - من الـ API بتاعك
  const { data: barcodeProduct } = useProductByBarcode(searchQuery);

  // إضافة المنتج عند المسح بالباركود
  useEffect(() => {
    if (barcodeProduct) {
      addToCart(barcodeProduct);
      setSearchQuery('');
    }
  }, [barcodeProduct]);

  // Transform categories for the component
  const transformedCategories = [
    { id: 'all', name: 'All', nameAr: 'الكل', icon: '🏷️' },
    ...(categories?.map(cat => ({
      id: cat.id,
      name: cat.name,
      nameAr: cat.name_ar || cat.name,
      icon: getIconEmoji(cat.icon)
    })) || [])
  ];

  // ✅ Transform products for the component - مع كل البيانات المهمة
  const transformedProducts = products?.map((prod: Product) => ({
    id: prod.id.toString(),
    name: prod.name,
    nameAr: prod.name_ar || prod.name,
    price: prod.price,
    sku: prod.sku,
    barcode: prod.barcode || '',
    stock: prod.stock || 0,
    category: prod.category_id?.toString() || '',
    category_id: prod.category_id,
    image_url: prod.image_url,
    imageUrl: prod.imageUrl,
    image: prod.image,
    // ✅ مهم: hasVariants من units
    hasVariants: (prod.units && prod.units.length > 0) || false,
    // ✅ تمرير units كاملة للـ POSProductGrid
    units: prod.units || [],
    // ✅ تمرير category كاملة
    category_obj: prod.category
  })) || [];

  // Reset search when category changes
  useEffect(() => {
    setSearchQuery('');
  }, [selectedCategory]);

  const addToCart = (product: Product) => {
    // ✅ التحقق من وجود variants
    if (product.units && product.units.length > 0) {
      // المنتج عنده variants - نفتح الـ selector
      setSelectedProductForVariant(product);
      setShowVariantSelector(true);
      return;
    }

    // منتج عادي - نضيفه مباشرة
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

  // ✅ إضافة variant إلى السلة
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

    // قفل الـ selector بعد الإضافة
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

  const clearCart = () => {
    setCartItems([]);
  };

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

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.05;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handlePaymentComplete = (payments: { method: string; amount: number }[]) => {
    setShowPayment(false);
    setCartItems([]);
    setSelectedCustomer(null);
    setSelectedDelivery(null);
    
    toast({
      title: language === 'ar' ? 'تمت العملية بنجاح' : 'Payment successful',
      description: language === 'ar' 
        ? `المبلغ: ${formatCurrency(calculateTotal())}` 
        : `Amount: ${formatCurrency(calculateTotal())}`
    });
  };

  const handleLogout = async () => {
    // ✅ إزالة Supabase من الـ logout
    localStorage.removeItem('sb-auth');
    navigate('/auth');
  };

  // Keyboard shortcuts handlers
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
        updateQuantity(item.id, item.quantity + 1);
      }
    }
  }, [cartItems, selectedCartItemIndex]);

  const handleDecreaseQuantity = useCallback(() => {
    if (cartItems.length > 0) {
      const index = selectedCartItemIndex >= 0 ? selectedCartItemIndex : cartItems.length - 1;
      const item = cartItems[index];
      if (item) {
        updateQuantity(item.id, item.quantity - 1);
      }
    }
  }, [cartItems, selectedCartItemIndex]);

  // Any modal open check for disabling main shortcuts
  const isAnyModalOpen = showPayment || showHeldOrders || showCustomerSelector || showDeliverySelector || showReturns || showShiftPanel || showVariantSelector;

  // Main POS shortcuts
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
      {/* POS Header - Simplified */}
      <header className="h-14 bg-sidebar flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">
            {language === 'ar' ? 'نقطة البيع' : 'Point of Sale'}
          </h1>
          
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
          
          {/* Warehouse Info */}
          {(userWarehouse || currentWarehouse) && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-success/20 text-success rounded-full text-sm font-medium">
              <Warehouse size={14} />
              <span>
                {userWarehouse 
                  ? (language === 'ar' && userWarehouse.name_ar ? userWarehouse.name_ar : userWarehouse.name)
                  : currentWarehouse 
                    ? (language === 'ar' && currentWarehouse.name_ar ? currentWarehouse.name_ar : currentWarehouse.name)
                    : null
                }
              </span>
            </div>
          )}
          
          {currentShift && (
            <span className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded text-xs font-medium">
              {language === 'ar' ? 'الوردية نشطة' : 'Shift Active'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 me-2 border-e border-white/20 pe-3">
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

            {/* Delivery */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDeliverySelector(true)}
              className={cn(
                "gap-1.5 px-2",
                selectedDelivery 
                  ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20" 
                  : "text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/20"
              )}
            >
              <Truck size={16} />
              <span className="text-xs font-medium">{language === 'ar' ? 'التوصيل' : 'Delivery'}</span>
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
            
            {/* POSCategories مع فلتر حسب الفئة 🎯 */}
            <POSCategories
              categories={transformedCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <POSProductGrid
                products={transformedProducts}
                onAddToCart={addToCart}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
              />
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

      {/* Shortcuts Bar at Bottom */}
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
        customer={selectedCustomer ? { id: selectedCustomer.id, name: selectedCustomer.name, loyalty_points: selectedCustomer.loyalty_points } : null}
        deliveryPerson={selectedDelivery ? { id: selectedDelivery.id, name: selectedDelivery.name } : null}
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

      {/* ✅ POSVariantSelector معدل لاستقبال Product كامل */}
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

      <POSDeliverySelector
        isOpen={showDeliverySelector}
        onClose={() => setShowDeliverySelector(false)}
        onSelectDelivery={setSelectedDelivery}
        selectedDelivery={selectedDelivery}
      />

      {/* Shift Management Panel */}
      <Dialog open={showShiftPanel} onOpenChange={setShowShiftPanel}>
        <DialogContent className="sm:max-w-md">
          <POSShiftManagement
            currentShift={currentShift}
            onShiftChange={setCurrentShift}
          />
        </DialogContent>
      </Dialog>

      {/* Returns Modal */}
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