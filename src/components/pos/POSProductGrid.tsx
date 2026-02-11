import React from 'react';
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
  category: string | number; // ممكن يكون string أو number
  category_id?: string | number;
  hasVariants?: boolean;
  units?: any[]; // للـ variants
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

  // 🔴 دالة لجلب رابط الصورة الصحيح
  const getProductImageUrl = (product: Product): string | null => {
    // 1. الأولوية الأولى: product.image?.fullUrl (اللي جاي من API)
    if (product.image?.fullUrl) {
      return product.image.fullUrl;
    }
    
    // 2. الأولوية الثانية: product.imageUrl
    if (product.imageUrl) {
      return product.imageUrl;
    }
    
    // 3. الأولوية الثالثة: product.image_url
    if (product.image_url) {
      return product.image_url;
    }
    
    // 4. الأولوية الرابعة: product.image?.previewUrl
    if (product.image?.previewUrl) {
      return product.image.previewUrl;
    }
    
    return null;
  };

  // 🔴 دالة لجلب اسم الفئة
  const getCategoryName = (product: Product): string => {
    // لو الفئة عبارة عن string
    if (typeof product.category === 'string') {
      return product.category;
    }
    // لو الفئة عبارة عن number (ID)
    if (typeof product.category === 'number') {
      return product.category.toString();
    }
    // لو الفئة object مع name
    if (product.category && typeof product.category === 'object' && 'name' in product.category) {
      return (product.category as any).name;
    }
    return '';
  };

  // فلترة المنتجات
  const filteredProducts = products.filter(product => {
    const productName = product.name || '';
    const productNameAr = product.nameAr || '';
    const productBarcode = product.barcode || '';
    const productSku = product.sku || '';
    const productCategory = getCategoryName(product);
    const productCategoryId = product.category_id?.toString() || '';

    const matchesSearch = searchQuery === '' || 
      productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      productNameAr.includes(searchQuery) ||
      productBarcode.includes(searchQuery) ||
      productSku.toLowerCase().includes(searchQuery.toLowerCase());
    
    // مقارنة الفئة: لازم نقارن بالـ ID أو بالاسم
    const matchesCategory = selectedCategory === 'all' || 
      productCategoryId === selectedCategory ||
      productCategory === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // ديالجة أول منتج فقط للتأكد من البيانات
  React.useEffect(() => {
    if (filteredProducts.length > 0) {
      const firstProduct = filteredProducts[0];
      console.log('=== أول منتج البيانات ===');
      console.log('اسم المنتج:', firstProduct.name);
      console.log('السعر:', firstProduct.price);
      console.log('المخزون:', firstProduct.stock);
      console.log('product.image:', firstProduct.image);
      console.log('product.image?.fullUrl:', firstProduct.image?.fullUrl);
      console.log('product.imageUrl:', firstProduct.imageUrl);
      console.log('product.image_url:', firstProduct.image_url);
      console.log('category_id:', firstProduct.category_id);
      console.log('category:', firstProduct.category);
      console.log('hasVariants:', firstProduct.hasVariants);
      console.log('units:', firstProduct.units);
      
      // الرابط النهائي
      const finalUrl = getProductImageUrl(firstProduct);
      console.log('🔴 الرابط النهائي:', finalUrl);
    }
  }, [filteredProducts]);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
      {filteredProducts.map((product) => {
        // ✅ استخدام الدالة لجلب الرابط الصحيح
        const imageUrl = getProductImageUrl(product);
        
        // عرض الـ logs لأول 3 منتجات فقط (عشان ما يزحمش الكونسول)
        const shouldLog = filteredProducts.indexOf(product) < 3;
        if (shouldLog) {
          console.log(`=== معالجة المنتج: ${product.name} ===`);
          console.log('الرابط النهائي:', imageUrl);
          console.log('--------------------------------');
        }
        
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
            {/* Product Image */}
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={language === 'ar' ? product.nameAr : product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.warn(`❌ فشل تحميل الصورة للمنتج ${product.name}:`, imageUrl);
                    e.currentTarget.style.display = 'none';
                    // إظهار الفال باك
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.fallback-icon');
                      if (fallback) {
                        fallback.classList.remove('hidden');
                      }
                    }
                  }}
                />
              ) : null}
              
              {/* Fallback Icon - يظهر لما مفيش صورة أو فشل التحميل */}
              <div className={cn(
                "fallback-icon absolute inset-0 flex items-center justify-center",
                imageUrl ? "hidden" : "flex"
              )}>
                <span className="text-3xl sm:text-4xl text-muted-foreground/30">
                  {product.hasVariants ? '🔄' : '👕'}
                </span>
              </div>
              
              {/* Badge للـ variants */}
              {product.hasVariants && (
                <div className="absolute top-1 start-1">
                  <span className="px-1.5 py-0.5 bg-primary/90 text-white text-[8px] rounded-md">
                    متغيرات
                  </span>
                </div>
              )}
              
              {/* Badge للمخزون */}
              {product.stock === 0 && (
                <div className="absolute bottom-1 end-1">
                  <span className="px-1.5 py-0.5 bg-destructive/90 text-white text-[8px] rounded-md">
                    نفذ
                  </span>
                </div>
              )}
            </div>
            
            {/* Product Info */}
            <div className="p-1.5 sm:p-2 text-start">
              <p className="font-medium text-[11px] sm:text-xs text-foreground line-clamp-1 leading-tight">
                {language === 'ar' ? product.nameAr : product.name}
              </p>
              <p className="font-bold text-primary mt-0.5 text-xs sm:text-sm">
                {product.price.toLocaleString()} ر.ي
              </p>
              
              {/* إظهار السعر القديم لو فيه variants */}
              {product.units && product.units.length > 0 && (
                <p className="text-[8px] text-muted-foreground line-through">
                  {product.units[0]?.cost_price?.toLocaleString()} ر.ي
                </p>
              )}
              
              {/* إظهار المخزون لو قليل */}
              {product.stock > 0 && product.stock < 10 && (
                <p className="text-[8px] text-orange-500 mt-0.5">
                  آخر {product.stock}
                </p>
              )}
            </div>
          </button>
        );
      })}
      
      {filteredProducts.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-base font-medium">
            {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'ar' ? 'جرب بحث آخر أو قسم آخر' : 'Try another search or category'}
          </p>
        </div>
      )}
    </div>
  );
};

export default POSProductGrid;