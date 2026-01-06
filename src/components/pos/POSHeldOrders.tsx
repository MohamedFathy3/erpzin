import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Clock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeldOrder {
  id: string;
  items: Array<{
    id: string;
    name: string;
    nameAr: string;
    price: number;
    quantity: number;
    sku: string;
  }>;
  total: number;
  heldAt: Date;
  note?: string;
}

interface POSHeldOrdersProps {
  isOpen: boolean;
  onClose: () => void;
  orders: HeldOrder[];
  onRestoreOrder: (order: HeldOrder) => void;
  onDeleteOrder: (orderId: string) => void;
}

const POSHeldOrders: React.FC<POSHeldOrdersProps> = ({
  isOpen,
  onClose,
  orders,
  onRestoreOrder,
  onDeleteOrder
}) => {
  const { language } = useLanguage();

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-YE' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock size={20} className="text-warning" />
            {language === 'ar' ? 'الطلبات المعلقة' : 'Held Orders'}
            <span className="px-2 py-0.5 bg-warning/20 text-warning rounded-full text-sm">
              {orders.length}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Orders List */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>{language === 'ar' ? 'لا توجد طلبات معلقة' : 'No held orders'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-background rounded-xl border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        #{order.id.slice(-4).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(order.heldAt)}
                      </p>
                    </div>
                    <p className="font-bold text-primary text-lg">
                      {order.total.toLocaleString()} YER
                    </p>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-muted-foreground">
                        <span className="truncate">
                          {item.quantity}x {language === 'ar' ? item.nameAr : item.name}
                        </span>
                        <span>{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{order.items.length - 3} {language === 'ar' ? 'منتجات أخرى' : 'more items'}
                      </p>
                    )}
                  </div>

                  {order.note && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg mb-3">
                      {order.note}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteOrder(order.id)}
                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {language === 'ar' ? 'حذف' : 'Delete'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        onRestoreOrder(order);
                        onClose();
                      }}
                      className="flex-[2] bg-primary hover:bg-primary/90"
                    >
                      <ShoppingCart size={16} className="me-2" />
                      {language === 'ar' ? 'استعادة' : 'Restore'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default POSHeldOrders;
