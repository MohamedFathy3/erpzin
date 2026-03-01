import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  imageUrl?: string;
  image_url?: string | null;
  image?: {
    id: number;
    name: string;
    mimeType: string;
    size: number;
    authorId: number | null;
    previewUrl: string;
    fullUrl: string;
    createdAt: string;
  };
  sku: string;
  barcode: string;
  stock: number;
  category_id?: string | null;  // 👈 null مسموح به
  hasVariants?: boolean;
  units?: any[];
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

  const getProductImageUrl = (product: Product): string | null => {
    if (product.image?.fullUrl) {
      return product.image.fullUrl.startsWith('http') 
        ? product.image.fullUrl 
        : `http://apierp.dentin.cloud${product.image.fullUrl}`;
    }
    if (product.imageUrl) {
      return product.imageUrl.startsWith('http') 
        ? product.imageUrl 
        : `http://apierp.dentin.cloud${product.imageUrl}`;
    }
    if (product.image_url) {
      return product.image_url.startsWith('http') 
        ? product.image_url 
        : `http://apierp.dentin.cloud${product.image_url}`;
    }
    if (product.image?.previewUrl) {
      return product.image.previewUrl.startsWith('http') 
        ? product.image.previewUrl 
        : `http://apierp.dentin.cloud${product.image.previewUrl}`;
    }
    return null;
  };

  // ✅ فلترة المنتجات - بسيطة وصحيحة
// ✅ فلترة المنتجات - بسيطة وصحيحة
const filteredProducts = useMemo(() => {
  // لو مفيش منتجات، ارجع array فاضي
  if (!products || products.length === 0) {
    return [];
  }

  console.log('All products:', products);
  console.log('Selected category:', selectedCategory);

  // فلترة حسب البحث
  let filtered = products;

  // فلترة حسب البحث
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(product => 
      product.name?.toLowerCase().includes(query) ||
      product.nameAr?.includes(query) ||
      product.barcode?.includes(query) ||
      product.sku?.toLowerCase().includes(query)
    );
  }

  // فلترة حسب الفئة
  if (selectedCategory && selectedCategory !== 'all') {
    filtered = filtered.filter(product => {
      const productCatId = product.category_id?.toString() || '';
      console.log(`Product ${product.id} category_id:`, productCatId, 'vs selected:', selectedCategory);
      return productCatId === selectedCategory;
    });
  }

  return filtered;
}, [products, searchQuery, selectedCategory]);

  return (
    <div className="w-full h-full">
      {/* شريط إحصائيات */}
      <div className="mb-3 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        <span className="bg-primary/10 px-2 py-1 rounded">
          {filteredProducts.length} {language === 'ar' ? 'منتج' : 'products'}
        </span>
        {selectedCategory !== 'all' && (
          <span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
            {language === 'ar' ? 'مصفى حسب الفئة' : 'Filtered by category'}
          </span>
        )}
      </div>

      {/* Grid المنتجات */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 auto-rows-max">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const imageUrl = getProductImageUrl(product);
            
            return (
              <button
                key={product.id}
                onClick={() => onAddToCart(product as any)}
                className={cn(
                  'relative flex flex-col rounded-lg overflow-hidden transition-all duration-200',
                  'bg-card border border-border hover:border-primary hover:shadow-md',
                  'active:scale-95 touch-manipulation w-full',
                )}
                style={{ minHeight: '180px' }}
              >
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative w-full">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={language === 'ar' ? product.nameAr : product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.fallback-icon');
                          if (fallback) fallback.classList.remove('hidden');
                        }
                      }}
                    />
                  ) : null}
                  
                  <div className={cn(
                    "fallback-icon absolute inset-0 flex items-center justify-center",
                    imageUrl ? "hidden" : "flex"
                  )}>
                    <span className="text-3xl sm:text-4xl text-muted-foreground/30">
                      {product.hasVariants ? '🔄' : '👕'}
                    </span>
                  </div>
                  
                  {product.hasVariants && (
                    <div className="absolute top-1 start-1">
                      <span className="px-1.5 py-0.5 bg-primary/90 text-white text-[8px] rounded-md">
                        {language === 'ar' ? 'متغيرات' : 'Variants'}
                      </span>
                    </div>
                  )}
                  
                  {product.stock === 0 && (
                    <div className="absolute bottom-1 end-1">
                      <span className="px-1.5 py-0.5 bg-destructive/90 text-white text-[8px] rounded-md">
                        {language === 'ar' ? 'نفذ' : 'Out'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-2 text-start w-full bg-card">
                  <p className="font-medium text-xs text-foreground line-clamp-1 leading-tight">
                    {language === 'ar' ? product.nameAr : product.name}
                  </p>
                  <p className="font-bold text-primary mt-1 text-sm">
                    {product.price.toLocaleString()} {language === 'ar' ? 'ر.ي' : 'YER'}
                  </p>
                  
                  {product.stock > 0 && product.stock < 10 && (
                    <p className="text-[9px] text-orange-500 mt-0.5">
                      {language === 'ar' ? `آخر ${product.stock}` : `Last ${product.stock}`}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-5xl mb-4">🔍</span>
            <p className="text-lg font-medium">
              {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {language === 'ar' ? 'جرب تغيير الفئة أو البحث' : 'Try changing category or search'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default POSProductGrid;