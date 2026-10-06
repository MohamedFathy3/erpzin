import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Barcode, Plus, Package, Layers, X, Keyboard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  barcode?: string | null;
  price?: number | string;
  cost?: number | string;
  stock: number;
  has_variants?: boolean;
  category_id?: number | null;
  units?: Array<{
    id: number;
    unit_id: number;
    unit_name: string;
    cost_price: string;
    sell_price: string;
    barcode: string;
    colors?: Array<{
      id: number;
      color_id: number;
      color: string;
      stock: number;
    }>;
  }>;
}

interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  barcode?: string | null;
  stock: number;
  price?: number;
  cost?: number;
  size_name?: string;
  color_name?: string;
  hex_code?: string | null;
}

interface QuickProductSearchProps {
  onSelectProduct: (product: Product) => void;
  onSelectVariant?: (variant: ProductVariant, product: Product) => void;
  priceField?: 'price' | 'cost';
  placeholder?: string;
  autoFocus?: boolean;
  showStock?: boolean;
  className?: string;
  products?: Product[];
  disabled?: boolean;
}

const QuickProductSearch: React.FC<QuickProductSearchProps> = ({
  onSelectProduct,
  onSelectVariant,
  priceField = 'price',
  placeholder,
  autoFocus = false,
  showStock = true,
  className,
  products = [],
  disabled = false
}) => {
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // فلترة المنتجات بناءً على البحث
  const filteredProducts = query.length > 0
    ? products.filter(p => {
        const searchLower = query.toLowerCase();
        return (
          (p.name?.toLowerCase().includes(searchLower) || false) ||
          (p.name_ar?.toLowerCase().includes(searchLower) || false) ||
          (p.sku?.toLowerCase().includes(searchLower) || false) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchLower))
        );
      }).slice(0, 15)
    : [];

  // إنشاء قائمة المتغيرات من المنتجات
  const extractVariants = useCallback((): ProductVariant[] => {
    const variants: ProductVariant[] = [];
    
    products.forEach(product => {
      if (product.units && product.units.length > 0) {
        product.units.forEach((unit, unitIndex) => {
          if (unit.colors && unit.colors.length > 0) {
            unit.colors.forEach(color => {
              variants.push({
                id: color.id,
                product_id: product.id,
                sku: `${product.sku}-${unitIndex + 1}-${color.id}`,
                barcode: unit.barcode,
                stock: color.stock || 0,
                price: parseFloat(unit.sell_price) || 0,
                cost: parseFloat(unit.cost_price) || 0,
                size_name: unit.unit_name,
                color_name: color.color,
              });
            });
          } else {
            variants.push({
              id: unit.id,
              product_id: product.id,
              sku: `${product.sku}-${unitIndex + 1}`,
              barcode: unit.barcode,
              stock: 0, // المخزون الرئيسي للمنتج
              price: parseFloat(unit.sell_price) || 0,
              cost: parseFloat(unit.cost_price) || 0,
              size_name: unit.unit_name,
            });
          }
        });
      }
    });
    
    return variants;
  }, [products]);

  const variants = extractVariants();

  // التحقق من مطابقة الباركود
  const checkBarcodeMatch = useCallback((barcode: string) => {
    // التحقق في المنتجات
    const productMatch = products.find(p => p.barcode === barcode);
    if (productMatch) {
      if (productMatch.units && productMatch.units.length > 0 && onSelectVariant) {
        return { type: 'product-with-variants', product: productMatch };
      }
      return { type: 'product', product: productMatch };
    }

    // التحقق في المتغيرات
    const variantMatch = variants.find(v => v.barcode === barcode);
    if (variantMatch && onSelectVariant) {
      const product = products.find(p => p.id === variantMatch.product_id);
      if (product) {
        return { type: 'variant', variant: variantMatch, product };
      }
    }

    return null;
  }, [products, variants, onSelectVariant]);

  // التعامل مع الباركود
  useEffect(() => {
    let lastKeyTime = 0;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (disabled) return;
      
      const currentTime = Date.now();
      
      // إذا كانت سرعة الكتابة سريعة (< 50ms) فهذا يعني باركود سكانر
      if (currentTime - lastKeyTime < 50) {
        setIsBarcodeMode(true);
      }
      
      lastKeyTime = currentTime;

      // عند الضغط على Enter في وضع الباركود
      if (e.key === 'Enter' && isBarcodeMode && query.length > 3) {
        e.preventDefault();
        const match = checkBarcodeMatch(query.trim());
        if (match) {
          if (match.type === 'product') {
            onSelectProduct(match.product!);
            setQuery('');
            setIsOpen(false);
          } else if (match.type === 'variant' && onSelectVariant) {
            onSelectVariant(match.variant!, match.product!);
            setQuery('');
            setIsOpen(false);
          }
        }
        setIsBarcodeMode(false);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [query, isBarcodeMode, checkBarcodeMatch, onSelectProduct, onSelectVariant, disabled]);

  // إعادة تعيين وضع الباركود بعد 3 ثواني من عدم الكتابة
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBarcodeMode) {
      timer = setTimeout(() => {
        setIsBarcodeMode(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isBarcodeMode, query]);

  // التعامل مع أزرار الكيبورد
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[selectedIndex]) {
          handleSelectProduct(filteredProducts[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const t = {
    en: {
      placeholder: placeholder || 'Search by name, SKU or barcode...',
      noResults: 'No products found',
      stock: 'Stock',
      variants: 'Variants',
      barcodeMode: 'Barcode scanning mode',
      pressEnter: 'Press Enter to add',
      disabled: 'Select warehouse first'
    },
    ar: {
      placeholder: placeholder || 'بحث بالاسم أو SKU أو الباركود...',
      noResults: 'لم يتم العثور على منتجات',
      stock: 'المخزون',
      variants: 'متغيرات',
      barcodeMode: 'وضع مسح الباركود',
      pressEnter: 'اضغط Enter للإضافة',
      disabled: 'اختر المخزن أولاً'
    }
  }[language];

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute start-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isBarcodeMode ? (
            <Barcode size={16} className="text-primary animate-pulse" />
          ) : (
            <Search size={16} className="text-muted-foreground" />
          )}
        </div>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => !disabled && query.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? t.disabled : t.placeholder}
          autoFocus={autoFocus && !disabled}
          disabled={disabled}
          className={cn(
            "ps-10 pe-10 h-10 text-sm transition-all",
            isBarcodeMode && "ring-2 ring-primary bg-primary/5",
            disabled && "bg-muted/50 cursor-not-allowed"
          )}
        />
        {query && !disabled && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute end-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Barcode Mode Indicator */}
      {isBarcodeMode && !disabled && (
        <div className="absolute -top-6 start-0 flex items-center gap-1.5 text-xs text-primary">
          <Barcode size={12} />
          {t.barcodeMode}
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      {isOpen && filteredProducts.length > 0 && !disabled && (
        <div className="absolute -bottom-5 start-0 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Keyboard size={10} />
            ↑↓ {language === 'ar' ? 'تنقل' : 'Navigate'}
          </span>
          <span>Enter {language === 'ar' ? 'اختيار' : 'Select'}</span>
          <span>Esc {language === 'ar' ? 'إغلاق' : 'Close'}</span>
        </div>
      )}

      {/* Results Dropdown */}
      {isOpen && query.length > 0 && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <Package size={24} className="mx-auto mb-2 opacity-50" />
              {t.noResults}
            </div>
          ) : (
            <ScrollArea className="max-h-[280px]">
              {filteredProducts.map((product, index) => {
                // تحديد السعر المناسب
                let displayPrice = 0;
                if (priceField === 'cost') {
                  displayPrice = parseFloat(String(product.cost || '0'));
                } else {
                  displayPrice = parseFloat(String(product.price || '0'));
                }
                
                // حساب المخزون
                const totalStock = product.units && product.units.length > 0
                  ? product.units.reduce((sum, unit) => {
                      if (unit.colors && unit.colors.length > 0) {
                        return sum + unit.colors.reduce((s, c) => s + (c.stock || 0), 0);
                      }
                      return sum + (product.stock || 0);
                    }, 0)
                  : (product.stock || 0);

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={cn(
                      "flex items-center justify-between p-3 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors",
                      index === selectedIndex 
                        ? "bg-primary/10" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Product Icon */}
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        product.units && product.units.length > 0 ? "bg-primary/10" : "bg-muted"
                      )}>
                        {product.units && product.units.length > 0 ? (
                          <Layers size={16} className="text-primary" />
                        ) : (
                          <Package size={16} className="text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {language === 'ar' ? product.name_ar || product.name : product.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{product.sku}</span>
                          {product.barcode && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Barcode size={10} />
                                {product.barcode}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Stock */}
                      {showStock && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            totalStock === 0 && "border-destructive/50 text-destructive",
                            totalStock > 0 && totalStock <= 5 && "border-warning/50 text-warning"
                          )}
                        >
                          {totalStock}
                        </Badge>
                      )}
                      
                      {/* Price */}
                      <div className="text-end min-w-[70px]">
                        <p className="font-semibold text-sm">
                          {displayPrice.toLocaleString()}
                        </p>
                        {product.units && product.units.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5">
                            {t.variants}
                          </Badge>
                        )}
                      </div>

                      {/* Quick Add Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProduct(product);
                        }}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickProductSearch;