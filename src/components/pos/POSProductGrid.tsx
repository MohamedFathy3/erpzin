import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  image?: string;
  sku: string;
  barcode: string;
  stock: number;
  category: string;
  hasVariants?: boolean;
}

interface POSProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  searchQuery: string;
  selectedCategory: string;
}

const POSProductGrid: React.FC<POSProductGridProps> = ({
  products,
  onAddToCart,
  searchQuery,
  selectedCategory
}) => {
  const { language } = useLanguage();

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.nameAr.includes(searchQuery) ||
      product.barcode.includes(searchQuery) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
      {filteredProducts.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          className={cn(
            'relative flex flex-col rounded-lg overflow-hidden transition-all duration-200',
            'bg-card border border-border hover:border-primary hover:shadow-md',
            'active:scale-95 touch-manipulation',
          )}
        >
          {/* Product Image - Compact */}
          <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img 
                src={product.image} 
                alt={language === 'ar' ? product.nameAr : product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn("text-2xl sm:text-3xl text-muted-foreground/30", product.image && "hidden")}>👕</div>
          </div>
          
          {/* Stock Badge - Smaller */}
          {/* {product.stock <= 5 && product.stock > 0 && (
            <span className="absolute top-1 end-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-warning/20 text-warning">
              {product.stock}
            </span>
          )} */}
          {/* {product.stock === 0 && (
            <span className="absolute top-1 end-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-destructive/20 text-destructive">
              {language === 'ar' ? 'نفذ' : 'Out'}
            </span>
          )} */}
          
          {/* Product Info - Compact */}
          <div className="p-1.5 sm:p-2 text-start">
            <p className="font-medium text-[11px] sm:text-xs text-foreground line-clamp-1 leading-tight">
              {language === 'ar' ? product.nameAr : product.name}
            </p>
            <p className="font-bold text-primary mt-0.5 text-xs sm:text-sm">
              {product.price.toLocaleString()}
            </p>
          </div>
        </button>
      ))}
      
      {filteredProducts.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-8 text-muted-foreground">
          <span className="text-3xl mb-2">🔍</span>
          <p className="text-sm">{language === 'ar' ? 'لا توجد منتجات' : 'No products found'}</p>
        </div>
      )}
    </div>
  );
};

export default POSProductGrid;
