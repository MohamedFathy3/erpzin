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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {filteredProducts.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          disabled={product.stock === 0}
          className={cn(
            'relative flex flex-col rounded-xl overflow-hidden transition-all duration-200',
            'bg-card border border-border hover:border-primary hover:shadow-lg',
            'active:scale-95 touch-manipulation',
            product.stock === 0 && 'opacity-50 cursor-not-allowed'
          )}
        >
          {/* Product Image */}
          <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img 
                src={product.image} 
                alt={language === 'ar' ? product.nameAr : product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-4xl text-muted-foreground/30">👕</div>
            )}
          </div>
          
          {/* Stock Badge */}
          {product.stock <= 5 && product.stock > 0 && (
            <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded-full bg-warning/20 text-warning">
              {product.stock}
            </span>
          )}
          {product.stock === 0 && (
            <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded-full bg-destructive/20 text-destructive">
              {language === 'ar' ? 'نفذ' : 'Out'}
            </span>
          )}
          
          {/* Product Info */}
          <div className="p-3 text-start">
            <p className="font-medium text-sm text-foreground line-clamp-2 min-h-[2.5rem]">
              {language === 'ar' ? product.nameAr : product.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{product.sku}</p>
            <p className="font-bold text-primary mt-2 text-base">
              {product.price.toLocaleString()} <span className="text-xs">YER</span>
            </p>
          </div>
        </button>
      ))}
      
      {filteredProducts.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
          <span className="text-4xl mb-2">🔍</span>
          <p>{language === 'ar' ? 'لا توجد منتجات' : 'No products found'}</p>
        </div>
      )}
    </div>
  );
};

export default POSProductGrid;
