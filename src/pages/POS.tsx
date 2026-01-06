import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Search, Barcode, Grid3X3, List, Clock, Home, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import POSProductGrid from '@/components/pos/POSProductGrid';
import POSCart from '@/components/pos/POSCart';
import POSPaymentModal from '@/components/pos/POSPaymentModal';
import POSHeldOrders from '@/components/pos/POSHeldOrders';
import POSCategories from '@/components/pos/POSCategories';

// Mock data
const mockCategories = [
  { id: 'all', name: 'All', nameAr: 'الكل', icon: '🏷️' },
  { id: 'boys', name: 'Boys', nameAr: 'أولاد', icon: '👦' },
  { id: 'girls', name: 'Girls', nameAr: 'بنات', icon: '👧' },
  { id: 'women', name: 'Women', nameAr: 'نساء', icon: '👩' },
  { id: 'men', name: 'Men', nameAr: 'رجال', icon: '👨' },
  { id: 'accessories', name: 'Accessories', nameAr: 'إكسسوارات', icon: '👜' },
];

const mockProducts = [
  { id: '1', name: 'Boys Jeans Classic', nameAr: 'جينز أولاد كلاسيك', price: 4500, sku: 'BJ-001', barcode: '1234567890123', stock: 25, category: 'boys' },
  { id: '2', name: 'Girls Summer Dress', nameAr: 'فستان صيفي بنات', price: 6000, sku: 'GD-002', barcode: '1234567890124', stock: 15, category: 'girls' },
  { id: '3', name: 'Women Blouse Elegant', nameAr: 'بلوزة نسائية أنيقة', price: 8500, sku: 'WB-003', barcode: '1234567890125', stock: 8, category: 'women' },
  { id: '4', name: 'Men Formal Shirt', nameAr: 'قميص رجالي رسمي', price: 7000, sku: 'MS-004', barcode: '1234567890126', stock: 20, category: 'men' },
  { id: '5', name: 'Boys T-Shirt Sport', nameAr: 'تيشيرت رياضي أولاد', price: 2500, sku: 'BT-005', barcode: '1234567890127', stock: 45, category: 'boys' },
  { id: '6', name: 'Girls Skirt Floral', nameAr: 'تنورة زهور بنات', price: 3800, sku: 'GS-006', barcode: '1234567890128', stock: 3, category: 'girls' },
  { id: '7', name: 'Women Pants Casual', nameAr: 'بنطال نسائي كاجوال', price: 5500, sku: 'WP-007', barcode: '1234567890129', stock: 12, category: 'women' },
  { id: '8', name: 'Men Jacket Winter', nameAr: 'جاكيت شتوي رجالي', price: 15000, sku: 'MJ-008', barcode: '1234567890130', stock: 0, category: 'men' },
  { id: '9', name: 'Leather Belt Classic', nameAr: 'حزام جلد كلاسيك', price: 2000, sku: 'AC-009', barcode: '1234567890131', stock: 30, category: 'accessories' },
  { id: '10', name: 'Fashion Handbag', nameAr: 'حقيبة يد عصرية', price: 12000, sku: 'AC-010', barcode: '1234567890132', stock: 5, category: 'accessories' },
  { id: '11', name: 'Boys Shorts Denim', nameAr: 'شورت جينز أولاد', price: 3200, sku: 'BS-011', barcode: '1234567890133', stock: 18, category: 'boys' },
  { id: '12', name: 'Girls Cardigan Knit', nameAr: 'كارديجان تريكو بنات', price: 4800, sku: 'GC-012', barcode: '1234567890134', stock: 10, category: 'girls' },
];

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

  // Listen for barcode scanner input (rapid keystrokes)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;

    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If Enter is pressed and we have a buffer, it's a barcode scan
      if (e.key === 'Enter' && barcodeBuffer.length > 5) {
        const product = mockProducts.find(p => p.barcode === barcodeBuffer);
        if (product) {
          addToCart(product);
        } else {
          toast({
            title: language === 'ar' ? 'منتج غير موجود' : 'Product not found',
            description: barcodeBuffer,
            variant: 'destructive'
          });
        }
        barcodeBuffer = '';
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

  const addToCart = (product: typeof mockProducts[0]) => {
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
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Home size={20} />
          </Button>
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
              categories={mockCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto">
            <POSProductGrid
              products={mockProducts}
              onAddToCart={addToCart}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
            />
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

export default POS;
