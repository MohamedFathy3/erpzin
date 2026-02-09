import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  imageUrl?: string; // مع حرف U كبير
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

  // ديعلجة أول منتج فقط علشان نشوف البيانات
  React.useEffect(() => {
    if (filteredProducts.length > 0) {
      const firstProduct = filteredProducts[0];
      console.log('=== أول منتج البيانات ===');
      console.log('اسم المنتج:', firstProduct.name);
      console.log('product.imageUrl:', firstProduct.imageUrl);
      console.log('product.image_url:', firstProduct.image_url);
      console.log('product.image:', firstProduct.image);
      console.log('product.image?.fullUrl:', firstProduct.image?.fullUrl);
      
      // جرب كل الاحتمالات
      const possibleUrls = [
        firstProduct.imageUrl,
        firstProduct.image?.fullUrl,
        firstProduct.image_url
      ];
      
      console.log('جميع الروابط المحتملة:', possibleUrls);
      
      // تحقق من كل رابط
      possibleUrls.forEach((url, index) => {
        if (url) {
          console.log(`الرابط ${index + 1}: "${url}"`);
          console.log(`هل الرابط ${index + 1} موجود؟`, !!url);
          console.log(`هل الرابط ${index + 1} يحتوي على http؟`, url.includes('http'));
          console.log(`طول الرابط ${index + 1}:`, url.length);
        }
      });
    }
  }, [filteredProducts]);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
      {filteredProducts.map((product) => {
        // Get the image URL from multiple possible sources
        const imageUrl = 
          product.imageUrl || 
          product.image?.fullUrl || 
          product.image_url;
        
        console.log('=== معالجة المنتج ===');
        console.log('اسم المنتج:', product.name);
        console.log('الرابط النهائي المستخدم للصورة:', imageUrl);
        console.log('--------------------------------');
        
        return (
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
              {imageUrl ? (
                <>
                  <img 
                    src={imageUrl} 
                    alt={language === 'ar' ? product.nameAr : product.name}
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      console.log('✅ الصورة تم تحميلها بنجاح:', imageUrl);
                    }}
                    onError={(e) => {
                      console.log('❌ خطأ في تحميل الصورة:', imageUrl);
                      console.log('سبب الخطأ:', e);
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                      if (fallback) {
                        fallback.classList.remove('hidden');
                      }
                    }}
                  />
                  <div className={cn("fallback-icon hidden text-2xl sm:text-3xl text-muted-foreground/30")}>👕</div>
                </>
              ) : (
                <div className="text-2xl sm:text-3xl text-muted-foreground/30">👕</div>
              )}
            </div>
            
            {/* Product Info - Compact */}
            <div className="p-1.5 sm:p-2 text-start">
              <p className="font-medium text-[11px] sm:text-xs text-foreground line-clamp-1 leading-tight">
                {language === 'ar' ? product.nameAr : product.name}
              </p>
              <p className="font-bold text-primary mt-0.5 text-xs sm:text-sm">
                {product.price.toLocaleString()}
              </p>
              {/* يمكن إضافة ديبيج انفورمشن للمساعدة */}
              <div className="hidden">
                <p className="text-[8px] text-muted-foreground">ID: {product.id}</p>
                <p className="text-[8px] text-muted-foreground">SKU: {product.sku}</p>
              </div>
            </div>
          </button>
        );
      })}
      
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