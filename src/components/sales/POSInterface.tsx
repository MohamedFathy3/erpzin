import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Search, Barcode, Clock, Loader2, User, Truck, RotateCcw, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useCategories, useProducts } from '@/hooks/usePOSData';
import { supabase } from '@/integrations/supabase/client';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const POSInterface: React.FC = () => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showDeliverySelector, setShowDeliverySelector] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryPerson | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showReturns, setShowReturns] = useState(false);
  const [showShiftPanel, setShowShiftPanel] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: products, isLoading: productsLoading } = useProducts();

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

  // Transform products for the component
  const transformedProducts = products?.map(prod => ({
    id: prod.id,
    name: prod.name,
    nameAr: prod.name_ar || prod.name,
    price: Number(prod.price),
    sku: prod.sku,
    barcode: prod.barcode || '',
    stock: prod.stock,
    category: prod.category_id || '',
    image: prod.image_url || undefined,
    hasVariants: prod.has_variants || false
  })) || [];

  // Listen for barcode scanner input (rapid keystrokes)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;

    const handleKeyPress = async (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      if (e.key === 'Enter' && barcodeBuffer.length > 5) {
        const scannedBarcode = barcodeBuffer;
        barcodeBuffer = '';
        
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', scannedBarcode)
          .eq('is_active', true)
          .maybeSingle();

        if (product) {
          addToCart({
            id: product.id,
            name: product.name,
            nameAr: product.name_ar || product.name,
            price: Number(product.price),
            sku: product.sku,
            stock: product.stock,
            hasVariants: product.has_variants || false
          });
        } else {
          toast({
            title: language === 'ar' ? 'منتج غير موجود' : 'Product not found',
            description: scannedBarcode,
            variant: 'destructive'
          });
        }
        return;
      }

      if (currentTime - lastKeyTime < 50 || barcodeBuffer === '') {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          barcodeBuffer += e.key;
        }
      } else {
        barcodeBuffer = e.key.length === 1 ? e.key : '';
      }
      
      lastKeyTime = currentTime;

      setTimeout(() => {
        if (Date.now() - lastKeyTime > 200) {
          barcodeBuffer = '';
        }
      }, 200);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [language]);

  const addToCart = (product: { id: string; name: string; nameAr: string; price: number; sku: string; stock: number; hasVariants?: boolean }) => {
    if (product.hasVariants) {
      setSelectedProductForVariant({
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        price: product.price,
        sku: product.sku
      });
      setShowVariantSelector(true);
      return;
    }

    if (product.stock === 0) {
      toast({
        title: language === 'ar' ? 'المنتج غير متوفر' : 'Out of stock',
        variant: 'destructive'
      });
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
        nameAr: product.nameAr,
        price: product.price,
        quantity: 1,
        sku: product.sku
      }];
    });
  };

  const addVariantToCart = (variant: {
    id: string;
    variantId: string;
    name: string;
    nameAr: string;
    price: number;
    sku: string;
    sizeName?: string;
    colorName?: string;
  }) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.variantId === variant.variantId);
      if (existing) {
        return prev.map(item =>
          item.variantId === variant.variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: variant.id,
        variantId: variant.variantId,
        name: variant.name,
        nameAr: variant.nameAr,
        price: variant.price,
        quantity: 1,
        sku: variant.sku,
        sizeName: variant.sizeName,
        colorName: variant.colorName
      }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
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

  const calculateTotal = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    return subtotal + tax;
  };

  const handlePaymentComplete = () => {
    setShowPayment(false);
    setCartItems([]);
    setSelectedCustomer(null);
    setSelectedDelivery(null);
    
    toast({
      title: language === 'ar' ? 'تمت العملية بنجاح' : 'Payment successful',
      description: language === 'ar' 
        ? `المبلغ: ${calculateTotal().toLocaleString()} ر.ي` 
        : `Amount: ${calculateTotal().toLocaleString()} YER`
    });
  };

  const isLoading = categoriesLoading || productsLoading;

  return (
    <Card className="h-[calc(100vh-200px)]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {language === 'ar' ? 'نقطة البيع السريعة' : 'Quick POS'}
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Shift Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShiftPanel(true)}
            className={cn(currentShift && "bg-green-100 border-green-500")}
          >
            <DollarSign size={16} className="me-1" />
            {currentShift 
              ? (language === 'ar' ? 'الوردية' : 'Shift')
              : (language === 'ar' ? 'فتح وردية' : 'Open Shift')
            }
          </Button>
          {/* Returns Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReturns(true)}
          >
            <RotateCcw size={16} className="me-1" />
            {language === 'ar' ? 'مرتجعات' : 'Returns'}
          </Button>
          {/* Customer Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomerSelector(true)}
            className={cn(selectedCustomer && "bg-blue-100 border-blue-500")}
          >
            <User size={16} className="me-1" />
            {selectedCustomer 
              ? (language === 'ar' ? selectedCustomer.name_ar || selectedCustomer.name : selectedCustomer.name).slice(0, 10)
              : (language === 'ar' ? 'العميل' : 'Customer')
            }
          </Button>
          {/* Delivery Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeliverySelector(true)}
            className={cn(selectedDelivery && "bg-purple-100 border-purple-500")}
          >
            <Truck size={16} className="me-1" />
            {selectedDelivery 
              ? (language === 'ar' ? selectedDelivery.nameAr : selectedDelivery.name).slice(0, 10)
              : (language === 'ar' ? 'التوصيل' : 'Delivery')
            }
          </Button>
          {/* Held Orders */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHeldOrders(true)}
            className="relative"
          >
            <Clock size={16} className="me-1" />
            {language === 'ar' ? 'معلق' : 'Held'}
            {heldOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-warning text-warning-foreground text-xs rounded-full flex items-center justify-center">
                {heldOrders.length}
              </span>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex gap-4 h-[calc(100vh-320px)]">
          {/* Products Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
          <div className="w-[350px] flex-shrink-0">
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
      </CardContent>

      {/* Modals */}
      <POSPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={calculateTotal()}
        onComplete={handlePaymentComplete}
        customer={selectedCustomer ? { id: selectedCustomer.id, name: selectedCustomer.name } : null}
        deliveryPerson={selectedDelivery ? { id: selectedDelivery.id, name: selectedDelivery.name } : null}
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
    </Card>
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

export default POSInterface;
