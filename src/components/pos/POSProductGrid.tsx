import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

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
  units?: unknown[];
  prices?: Array<{ price_type: 'retail' | 'wholesale' | 'credit'; min_quantity: number; price: number; unit_id?: number | null }>;
  automotive_service?: { id: number; item_type: 'service' | 'product'; unit?: string | null; small_vehicle_quantity?: number | null; large_vehicle_quantity?: number | null; small_vehicle_price?: number | null; large_vehicle_price?: number | null; stock_quantity?: number | null } | null;
}

interface POSProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, options?: { quantity: number; priceType: 'retail' | 'wholesale' | 'credit'; price: number }) => void;
  searchQuery: string;
  selectedCategory: string;
  servicesOnly?: boolean;
}

const POSProductGrid: React.FC<POSProductGridProps> = ({
  products,
  onAddToCart,
  searchQuery,
  selectedCategory,
  servicesOnly = false
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priceTypes, setPriceTypes] = useState<Record<string, 'retail' | 'wholesale' | 'credit'>>({});

  const getQuantity = (productId: string) => Math.max(1, Number(quantities[productId] || 1));
  const getPriceType = (productId: string) => priceTypes[productId] || 'retail';

  const getTierPrice = (product: Product) => {
    const quantity = getQuantity(product.id);
    const priceType = getPriceType(product.id);
    const tiers = (product.prices || [])
      .filter((tier) => tier.price_type === priceType)
      .filter((tier) => !tier.unit_id)
      .filter((tier) => Number(tier.min_quantity) <= quantity)
      .sort((a, b) => Number(b.min_quantity) - Number(a.min_quantity));
    return Number(tiers[0]?.price ?? product.price);
  };

  const getProductImageUrl = (product: Product): string | null => {
    if (product.image?.fullUrl) {
      return product.image.fullUrl.startsWith('http') 
        ? product.image.fullUrl 
        : `https://testapi.injazyemen.cloud${product.image.fullUrl}`;
    }
    if (product.imageUrl) {
      return product.imageUrl.startsWith('http') 
        ? product.imageUrl 
        : `https://testapi.injazyemen.cloud${product.imageUrl}`;
    }
    if (product.image_url) {
      return product.image_url.startsWith('http') 
        ? product.image_url 
        : `https://testapi.injazyemen.cloud${product.image_url}`;
    }
    if (product.image?.previewUrl) {
      return product.image.previewUrl.startsWith('http') 
        ? product.image.previewUrl 
        : `https://testapi.injazyemen.cloud${product.image.previewUrl}`;
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

  // فلترة حسب البحث
  let filtered = products;

  if (servicesOnly) {
    filtered = filtered.filter(product => product.automotive_service?.item_type === 'service');
  }
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
    filtered = selectedCategory === 'automotive'
      ? filtered.filter(product => Boolean(product.automotive_service))
      : filtered.filter(product => {
      const productCatId = product.category_id?.toString() || '';
      return productCatId === selectedCategory;
    });
  }

  return filtered;
}, [products, searchQuery, selectedCategory, servicesOnly]);

  return (
    <div className="w-full h-full">
      {/* شريط إحصائيات */}
      <div className="mb-3 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        <span className="bg-primary/10 px-2 py-1 rounded">
          {filteredProducts.length} {language === 'ar' ? 'منتج' : 'products'}
        </span>
        {servicesOnly && (
          <span className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded">
            {language === 'ar' ? 'الخدمات فقط' : 'Services only'}
          </span>
        )}
        {selectedCategory !== 'all' && (
          <span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
            {language === 'ar' ? 'مصفى حسب الفئة' : 'Filtered by category'}
          </span>
        )}
      </div>

      {/* Grid المنتجات */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const imageUrl = getProductImageUrl(product);
            
            const quantity = getQuantity(product.id);
            const priceType = getPriceType(product.id);
            const displayPrice = getTierPrice(product);
            return (
              <article
                key={product.id}
                className={cn(
                  'group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200',
                  'bg-card border border-slate-200/80 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg',
                  'touch-manipulation w-full',
                  product.stock === 0 && 'opacity-60'
                )}
              >
                <div className="h-36 sm:h-40 bg-gradient-to-br from-slate-50 to-slate-100/80 flex items-center justify-center overflow-hidden relative w-full">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={language === 'ar' ? product.nameAr : product.name}
                      className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
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
                    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/5 px-4 py-3 dark:bg-white/5">
                      <img src="/fusionx-default.webp" alt="" aria-hidden="true" className="h-14 w-14 rounded-xl object-contain shadow-sm" />
                      <span className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground">
                        FUSION X
                      </span>
                    </div>
                  </div>
                  
                  {product.automotive_service && (
                    <div className="absolute top-2 end-2"><span className="px-2 py-1 bg-emerald-700/90 text-white text-[10px] font-semibold rounded-lg">خدمة سيارات</span></div>
                  )}
                  {product.hasVariants && (
                    <div className="absolute top-1 start-1">
                      <span className="px-2 py-1 bg-primary/90 text-white text-[10px] font-semibold rounded-lg">
                        {language === 'ar' ? 'متغيرات' : 'Variants'}
                      </span>
                    </div>
                  )}
                  
                  {product.stock === 0 && (
                    <div className="absolute bottom-1 end-1">
                      <span className="px-2 py-1 bg-destructive/90 text-white text-[10px] font-semibold rounded-lg">
                        {language === 'ar' ? 'نفذ' : 'Out'}
                      </span>
                    </div>
                  )}
                  {product.stock > 0 && product.stock < 10 && (
                    <div className="absolute bottom-1 end-1">
                      <span className="px-2 py-1 bg-amber-600/95 text-white text-[10px] font-semibold rounded-lg">
                        {language === 'ar' ? 'كمية قليلة' : 'Low'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-3 text-start w-full bg-card">
                  <p className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 leading-snug min-h-10">
                    {language === 'ar' ? product.nameAr : product.name}
                  </p>
                  <p className="font-extrabold text-primary mt-1 text-lg sm:text-xl tracking-tight">
                    {formatCurrency(displayPrice)}
                    
                  </p>
                  
                  <div className="mt-2 min-h-5">
                    {product.stock === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {language === 'ar' ? 'نفد المخزون' : 'Out of stock'}
                      </span>
                    ) : product.stock < 10 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {language === 'ar' ? `كمية قليلة · ${product.stock}` : `Low stock · ${product.stock}`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {language === 'ar' ? `متاح · ${product.stock}` : `In stock · ${product.stock}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-[1fr_104px] gap-2 border-t border-slate-100 p-3" onClick={(event) => event.stopPropagation()}>
                  <select
                    value={priceType}
                    onChange={(event) => setPriceTypes((current) => ({
                      ...current,
                      [product.id]: event.target.value as 'retail' | 'wholesale' | 'credit',
                    }))}
                    className="h-9 min-w-0 rounded-xl border border-border bg-background px-2 text-xs"
                    disabled={product.stock === 0}
                  >
                    <option value="retail">{language === 'ar' ? 'قطاعي' : 'Retail'}</option>
                    <option value="wholesale">{language === 'ar' ? 'جملة' : 'Wholesale'}</option>
                    <option value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</option>
                  </select>
                  <div className="flex h-9 items-center rounded-xl border border-border bg-background">
                    <button
                      type="button"
                      aria-label={language === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
                      className="h-full w-8 text-lg text-muted-foreground hover:text-foreground"
                      onClick={() => setQuantities((current) => ({
                        ...current,
                        [product.id]: Math.max(1, getQuantity(product.id) - 1),
                      }))}
                      disabled={product.stock === 0}
                    >
                      -
                    </button>
                    <input
                      aria-label={language === 'ar' ? 'الكمية' : 'Quantity'}
                      type="number"
                      min="1"
                      max={product.stock || undefined}
                      value={quantity}
                      onChange={(event) => setQuantities((current) => ({
                        ...current,
                        [product.id]: Math.max(1, Number(event.target.value) || 1),
                      }))}
                      className="h-full w-10 border-x border-border bg-transparent text-center text-sm font-semibold outline-none"
                      disabled={product.stock === 0}
                    />
                    <button
                      type="button"
                      aria-label={language === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                      className="h-full w-8 text-lg text-muted-foreground hover:text-foreground"
                      onClick={() => setQuantities((current) => ({
                        ...current,
                        [product.id]: product.stock > 0
                          ? Math.min(product.stock, getQuantity(product.id) + 1)
                          : getQuantity(product.id) + 1,
                      }))}
                      disabled={product.stock === 0}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddToCart(product, { quantity, priceType, price: displayPrice })}
                    disabled={product.stock === 0}
                    className="col-span-2 h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    {language === 'ar' ? 'إضافة للسلة' : 'Add to cart'}
                  </button>
                </div>
              </article>
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
