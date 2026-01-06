import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Search, Barcode, Clock, Home, LogOut, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useCategories, useProducts, Product } from '@/hooks/usePOSData';
import { supabase } from '@/integrations/supabase/client';
import POSProductGrid from '@/components/pos/POSProductGrid';
import POSCart from '@/components/pos/POSCart';
import POSPaymentModal from '@/components/pos/POSPaymentModal';
import POSHeldOrders from '@/components/pos/POSHeldOrders';
import POSCategories from '@/components/pos/POSCategories';
import { Link } from 'react-router-dom';

interface CartItem {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  sku: string;
}

interface HeldOrder {
  id: string;
  items: CartItem[];
  total: number;
  heldAt: Date;
  note?: string;
}

const POS: React.FC = () => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
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
    image: prod.image_url || undefined
  })) || [];

  // Listen for barcode scanner input (rapid keystrokes)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;

    const handleKeyPress = async (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If Enter is pressed and we have a buffer, it's a barcode scan
      if (e.key === 'Enter' && barcodeBuffer.length > 5) {
        const scannedBarcode = barcodeBuffer;
        barcodeBuffer = '';
        
        // Search for product by barcode
        const { data: product, error } = await supabase
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
            stock: product.stock
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

      // Build barcode buffer for rapid keypresses (within 50ms)
      if (currentTime - lastKeyTime < 50 || barcodeBuffer === '') {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          barcodeBuffer += e.key;
        }
      } else {
        barcodeBuffer = e.key.length === 1 ? e.key : '';
      }
      
      lastKeyTime = currentTime;

      // Clear buffer after 200ms of inactivity
      setTimeout(() => {
        if (Date.now() - lastKeyTime > 200) {
          barcodeBuffer = '';
        }
      }, 200);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [language]);

  const addToCart = (product: { id: string; name: string; nameAr: string; price: number; sku: string; stock: number }) => {
    if (product.stock === 0) {
      toast({
        title: language === 'ar' ? 'المنتج غير متوفر' : 'Out of stock',
        variant: 'destructive'
      });
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
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

  const handlePaymentComplete = (payments: { cash: number; card: number }) => {
    setShowPayment(false);
    setCartItems([]);
    
    toast({
      title: language === 'ar' ? 'تمت العملية بنجاح' : 'Payment successful',
      description: language === 'ar' 
        ? `المبلغ: ${calculateTotal().toLocaleString()} ر.ي` 
        : `Amount: ${calculateTotal().toLocaleString()} YER`
    });
  };

  const isLoading = categoriesLoading || productsLoading;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* POS Header */}
      <header className="h-16 bg-sidebar flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">
            {language === 'ar' ? 'نقطة البيع' : 'Point of Sale'}
          </h1>
          <span className="px-3 py-1 bg-success/20 text-success rounded-full text-sm font-medium">
            {language === 'ar' ? 'فرع أبرا' : 'Abra Branch'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHeldOrders(true)}
            className="text-white/80 hover:text-white hover:bg-white/10 relative"
          >
            <Clock size={20} />
            {heldOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-warning text-warning-foreground text-xs rounded-full flex items-center justify-center">
                {heldOrders.length}
              </span>
            )}
          </Button>
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Home size={20} />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search & Categories */}
          <div className="space-y-3 mb-4 flex-shrink-0">
            {/* Search Bar */}
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

            {/* Categories */}
            <POSCategories
              categories={transformedCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
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

      {/* Payment Modal */}
      <POSPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={calculateTotal()}
        onComplete={handlePaymentComplete}
      />

      {/* Held Orders Modal */}
      <POSHeldOrders
        isOpen={showHeldOrders}
        onClose={() => setShowHeldOrders(false)}
        orders={heldOrders}
        onRestoreOrder={restoreOrder}
        onDeleteOrder={deleteHeldOrder}
      />
    </div>
  );
};

// Helper function to convert icon names to emojis
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
