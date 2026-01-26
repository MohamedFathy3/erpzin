import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Barcode, Plus, Package, Layers, X, Keyboard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  cost: number | null;
  stock: number;
  has_variants: boolean;
  category_id: string | null;
}

interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  stock: number;
  price_adjustment: number | null;
  cost_adjustment: number | null;
  size: { id: string; name: string; name_ar: string | null } | null;
  color: { id: string; name: string; name_ar: string | null; hex_code: string | null } | null;
}

interface QuickProductSearchProps {
  onSelectProduct: (product: Product) => void;
  onSelectVariant?: (variant: ProductVariant, product: Product) => void;
  priceField?: 'price' | 'cost';
  placeholder?: string;
  autoFocus?: boolean;
  showStock?: boolean;
  className?: string;
}

const QuickProductSearch: React.FC<QuickProductSearchProps> = ({
  onSelectProduct,
  onSelectVariant,
  priceField = 'price',
  placeholder,
  autoFocus = false,
  showStock = true,
  className
}) => {
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all products for quick search
  const { data: products = [] } = useQuery({
    queryKey: ['quick-search-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, name_ar, sku, barcode, price, cost, stock, has_variants, category_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
    staleTime: 2 * 60 * 1000 // Cache for 2 minutes
  });

  // Fetch variants for barcode search
  const { data: variants = [] } = useQuery({
    queryKey: ['quick-search-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id, product_id, sku, barcode, stock, price_adjustment, cost_adjustment,
          size:sizes(id, name, name_ar),
          color:colors(id, name, name_ar, hex_code)
        `)
        .eq('is_active', true);
      if (error) throw error;
      return data as ProductVariant[];
    },
    staleTime: 2 * 60 * 1000
  });

  // Filter products based on query
  const filteredProducts = query.length > 0
    ? products.filter(p => {
        const searchLower = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(searchLower) ||
          (p.name_ar && p.name_ar.includes(query)) ||
          p.sku.toLowerCase().includes(searchLower) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchLower))
        );
      }).slice(0, 15)
    : [];

  // Check for exact barcode match (product or variant)
  const checkBarcodeMatch = useCallback((barcode: string) => {
    // Check product barcode
    const productMatch = products.find(p => p.barcode === barcode);
    if (productMatch) {
      if (productMatch.has_variants && onSelectVariant) {
        // Need to select variant
        return { type: 'product-with-variants', product: productMatch };
      }
      return { type: 'product', product: productMatch };
    }

    // Check variant barcode
    const variantMatch = variants.find(v => v.barcode === barcode);
    if (variantMatch && onSelectVariant) {
      const product = products.find(p => p.id === variantMatch.product_id);
      if (product) {
        return { type: 'variant', variant: variantMatch, product };
      }
    }

    return null;
  }, [products, variants, onSelectVariant]);

  // Handle barcode scan (fast input detection)
  useEffect(() => {
    let lastKeyTime = 0;
    let buffer = '';

    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If typing fast (< 50ms between keys), likely a barcode scanner
      if (currentTime - lastKeyTime < 50 && buffer.length > 0) {
        setIsBarcodeMode(true);
      }
      
      lastKeyTime = currentTime;

      // On Enter in barcode mode, process the barcode
      if (e.key === 'Enter' && isBarcodeMode && query.length > 3) {
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
          } else if (match.type === 'product-with-variants') {
            // Keep dropdown open to show variants
          }
        }
        setIsBarcodeMode(false);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [query, isBarcodeMode, checkBarcodeMatch, onSelectProduct, onSelectVariant]);

  // Handle keyboard navigation
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

  // Close dropdown when clicking outside
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
      pressEnter: 'Press Enter to add'
    },
    ar: {
      placeholder: placeholder || 'بحث بالاسم أو SKU أو الباركود...',
      noResults: 'لم يتم العثور على منتجات',
      stock: 'المخزون',
      variants: 'متغيرات',
      barcodeMode: 'وضع مسح الباركود',
      pressEnter: 'اضغط Enter للإضافة'
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
          onFocus={() => query.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t.placeholder}
          autoFocus={autoFocus}
          className={cn(
            "ps-10 pe-10 h-10 text-sm transition-all",
            isBarcodeMode && "ring-2 ring-primary bg-primary/5"
          )}
        />
        {query && (
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
      {isBarcodeMode && (
        <div className="absolute -top-6 start-0 flex items-center gap-1.5 text-xs text-primary">
          <Barcode size={12} />
          {t.barcodeMode}
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      {isOpen && filteredProducts.length > 0 && (
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
      {isOpen && query.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <Package size={24} className="mx-auto mb-2 opacity-50" />
              {t.noResults}
            </div>
          ) : (
            <ScrollArea className="max-h-[280px]">
              {filteredProducts.map((product, index) => {
                const displayPrice = priceField === 'cost' 
                  ? (product.cost || 0) 
                  : product.price;
                
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
                        product.has_variants ? "bg-primary/10" : "bg-muted"
                      )}>
                        {product.has_variants ? (
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
                            product.stock === 0 && "border-destructive/50 text-destructive",
                            product.stock > 0 && product.stock <= 5 && "border-warning/50 text-warning"
                          )}
                        >
                          {product.stock}
                        </Badge>
                      )}
                      
                      {/* Price */}
                      <div className="text-end min-w-[70px]">
                        <p className="font-semibold text-sm">
                          {displayPrice.toLocaleString()}
                        </p>
                        {product.has_variants && (
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
