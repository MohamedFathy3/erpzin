import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { cn } from '@/lib/utils';
import { Edit2, Trash2, Copy, Eye, MoreVertical, Package, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// تحديث interface Product ليشمل units
export interface Product {
  id: string;
  name: string;
  nameAr: string;
  sku: string;
  barcode?: string;
  category: string;
  categoryAr: string;
  categoryId?: string;
  price: number;
  cost: number;
  stock: number;
  imageUrl?: string;
  minStock?: number;
  variants: number;
  image?: string;
  status: 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
  hasVariants?: boolean;
  image_url?: string | null;
  description?: string;
  active?: boolean;
  // ✅ إضافة units من API
  units?: Array<{
    id: number;
    unit_id: number;
    unit_name: string;
    cost_price: string;
    sell_price: string;
    barcode: string;
    colors: Array<{
      id: number;
      color_id: number;
      color: string;
      stock: number;
    }>;
  }>;
}

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onDuplicate: (product: Product) => void;
  onView: (product: Product) => void;
  onPrintBarcode?: (product: Product) => void;
  onViewVariants?: (product: Product) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalProducts: number;
  itemsPerPage: number;
}

// Fixed mapProductStatus function with proper type checking
const mapProductStatus = (product: any): Product['status'] => {
  console.log('🔍 Checking product status:', {
    id: product.id,
    name: product.name,
    active: product.active,
    stock: product.stock,
    reorder_level: product.reorder_level
  });

  if (!product.active) {
    console.log('↪️ Status: inactive (active is false)');
    return 'inactive';
  }
  
  const stock = Number(product.stock);
  if (stock === 0 || product.stock === '0') {
    console.log('↪️ Status: out_of_stock (stock is 0)');
    return 'out_of_stock';
  }
  
  const reorderLevel = Number(product.reorder_level) || 5;
  
  if (stock <= reorderLevel) {
    console.log('↪️ Status: low_stock (stock <= reorder level)');
    return 'low_stock';
  }
  
  console.log('↪️ Status: active');
  return 'active';
};

// Helper function to transform API response to Product interface
export const transformApiProduct = (apiProduct: any): Product => {
  console.log('🔄 Transforming API product:', {
    id: apiProduct.id,
    name: apiProduct.name,
    imageUrl: apiProduct.imageUrl,
    image_url: apiProduct.image_url,
    image: apiProduct.image,
    category: apiProduct.category,
    active: apiProduct.active,
    units: apiProduct.units // ✅ إضافة log للـ units
  });

  // Ensure cost is a number (handle null/undefined)
  const cost = apiProduct.cost !== null && apiProduct.cost !== undefined 
    ? Number(apiProduct.cost) 
    : 0;

  // Handle image URL - use the correct field name
  let imageUrl = '';
  
  // جرب كل الاحتمالات بالترتيب
  if (apiProduct.imageUrl && typeof apiProduct.imageUrl === 'string') {
    imageUrl = apiProduct.imageUrl; // مع حرف U كبير
  } else if (apiProduct.image_url && typeof apiProduct.image_url === 'string') {
    imageUrl = apiProduct.image_url; // مع حرف u صغير
  } else if (apiProduct.image?.fullUrl && typeof apiProduct.image.fullUrl === 'string') {
    imageUrl = apiProduct.image.fullUrl; // من object الصورة
  }

  // احصل على اسم التصنيف
  const categoryName = apiProduct.category?.name || 'Uncategorized';
  const categoryAr = apiProduct.category?.name_ar || categoryName || 'غير مصنف';

  // حساب عدد المتغيرات من الـ units ✅
  let variantsCount = 0;
  if (apiProduct.units && Array.isArray(apiProduct.units)) {
    apiProduct.units.forEach((unit: any) => {
      if (unit.colors && Array.isArray(unit.colors)) {
        variantsCount += unit.colors.length;
      }
    });
  }

  const transformedProduct = {
    id: apiProduct.id.toString(),
    name: apiProduct.name || '',
    nameAr: apiProduct.name_ar || apiProduct.name || '',
    description: apiProduct.description || '',
    sku: apiProduct.sku || '',
    barcode: apiProduct.barcode || undefined,
    category: categoryName,
    categoryAr: categoryAr,
    categoryId: apiProduct.category?.id?.toString() || apiProduct.category_id?.toString(),
    price: Number(apiProduct.price) || 0,
    cost: cost,
    imageUrl: imageUrl || undefined,
    image_url: apiProduct.image_url,
    stock: Number(apiProduct.stock) || 0,
    minStock: Number(apiProduct.reorder_level) || 5,
    variants: variantsCount, // ✅ عدد المتغيرات المحسوب
    image: imageUrl || undefined,
    status: mapProductStatus(apiProduct),
    hasVariants: (apiProduct.units && apiProduct.units.length > 0) || false, // ✅ true إذا في units
    active: apiProduct.active || false,
    units: apiProduct.units || [] // ✅ تمرير units كاملة
  };

  console.log('✅ Transformed product:', {
    ...transformedProduct,
    variants: transformedProduct.variants,
    hasVariants: transformedProduct.hasVariants,
    unitsCount: transformedProduct.units?.length
  });
  
  return transformedProduct;
};

// ✅ دالة لحساب عدد المتغيرات
const getVariantsCount = (product: Product): number => {
  if (!product.units || product.units.length === 0) return 0;
  
  return product.units.reduce((total, unit) => {
    return total + (unit.colors?.length || 0);
  }, 0);
};

const ProductList: React.FC<ProductListProps> = ({
  products,
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  onPrintBarcode,
  onViewVariants,
  currentPage,
  totalPages,
  onPageChange,
  totalProducts,
  itemsPerPage
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  console.log('📊 ProductList received products:', products);

  const getStatusBadge = (status: Product['status']) => {
    const config = {
      active: { 
        label: language === 'ar' ? 'نشط' : 'Active', 
        variant: 'default' as const, 
        className: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
      },
      inactive: { 
        label: language === 'ar' ? 'غير نشط' : 'Inactive', 
        variant: 'secondary' as const, 
        className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' 
      },
      low_stock: { 
        label: language === 'ar' ? 'مخزون منخفض' : 'Low Stock', 
        variant: 'outline' as const, 
        className: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
      },
      out_of_stock: { 
        label: language === 'ar' ? 'نفذ المخزون' : 'Out of Stock', 
        variant: 'destructive' as const, 
        className: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' 
      }
    };

    return config[status];
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalProducts);

  const PaginationControls = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
      <p className="text-sm text-muted-foreground">
        {language === 'ar' 
          ? `عرض ${startItem} - ${endItem} من ${totalProducts} منتج`
          : `Showing ${startItem} - ${endItem} of ${totalProducts} products`
        }
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8"
        >
          <ChevronLeft size={16} />
          {language === 'ar' ? 'السابق' : 'Previous'}
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                className="w-8 h-8 p-0 min-w-8"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8"
        >
          {language === 'ar' ? 'التالي' : 'Next'}
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );

  if (totalProducts === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package size={64} className="mb-4 opacity-30" />
        <p className="text-lg font-medium">
          {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
        </p>
        <p className="text-sm">
          {language === 'ar' ? 'قم بإضافة منتج جديد للبدء' : 'Add a new product to get started'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Top Pagination */}
      <PaginationControls />

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-start p-4 font-medium text-muted-foreground">
                {language === 'ar' ? 'المنتج' : 'Product'}
              </th>
              <th className="text-start p-4 font-medium text-muted-foreground">
                {language === 'ar' ? 'SKU / الباركود' : 'SKU / Barcode'}
              </th>
              <th className="text-start p-4 font-medium text-muted-foreground">
                {language === 'ar' ? 'التصنيف' : 'Category'}
              </th>
              <th className="text-start p-4 font-medium text-muted-foreground">
                {language === 'ar' ? 'السعر' : 'Price'}
              </th>
              <th className="text-start p-4 font-medium text-muted-foreground">
                {language === 'ar' ? 'المخزون' : 'Stock'}
              </th>
              <th className="text-start p-4 font-medium text-muted-foreground">
                {language === 'ar' ? 'المتغيرات' : 'Variants'}
              </th>
              <th className="text-start p-4 font-medium text-muted-foreground">
                {language === 'ar' ? 'الحالة' : 'Status'}
              </th>
              <th className="text-end p-4 font-medium text-muted-foreground">
                {language === 'ar' ? 'الإجراءات' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const statusConfig = getStatusBadge(product.status);
              const stock = Number(product.stock);
              const minStock = Number(product.minStock) || 5;
              const variantsCount = getVariantsCount(product); // ✅ استخدام الدالة
              
              console.log('🎯 Rendering product:', {
                id: product.id,
                name: product.name,
                status: product.status,
                hasVariants: product.hasVariants,
                variantsCount: variantsCount,
                units: product.units
              });

              return (
                <tr 
                  key={product.id}
                  className={cn(
                    'border-b border-border hover:bg-muted/30 transition-colors',
                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                  )}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.imageUrl || product.image ? (
                          <img 
                            src={product.imageUrl || product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('✅ Image loaded:', product.imageUrl || product.image)}
                            onError={(e) => {
                              console.log('❌ Image error:', product.imageUrl || product.image);
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon');
                              if (fallback) {
                                fallback.classList.remove('hidden');
                              }
                            }}
                          />
                        ) : null}
                        <div className={cn("fallback-icon text-2xl", (product.imageUrl || product.image) ? "hidden" : "block")}>
                          {product.category?.toLowerCase().includes('shirt') ? '👕' : 
                           product.category?.toLowerCase().includes('shoes') ? '👟' :
                           product.category?.toLowerCase().includes('electronic') ? '📱' : '📦'}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate" title={language === 'ar' ? product.nameAr : product.name}>
                          {language === 'ar' ? product.nameAr : product.name}
                        </p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5" title={product.description}>
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono block truncate max-w-[150px]" title={product.sku}>
                        {product.sku}
                      </code>
                      {product.barcode && (
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px]" title={product.barcode}>
                          {language === 'ar' ? 'باركود:' : 'Barcode:'} {product.barcode}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    <div className="truncate max-w-[120px]" title={language === 'ar' ? product.categoryAr : product.category}>
                      {language === 'ar' ? product.categoryAr : product.category}
                    </div>
                    {product.active !== undefined && (
                      <div className="mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${product.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {product.active 
                            ? (language === 'ar' ? 'فعال' : 'Active')
                            : (language === 'ar' ? 'غير فعال' : 'Inactive')
                          }
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'التكلفة:' : 'Cost:'} {formatCurrency(product.cost)}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <span className={cn(
                        'font-semibold inline-block',
                        stock === 0 ? 'text-red-600 dark:text-red-400' : 
                        stock <= minStock ? 'text-amber-600 dark:text-amber-400' : 
                        'text-foreground'
                      )}>
                        {stock}
                      </span>
                      {product.minStock && (
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'الحد الأدنى:' : 'Min:'} {product.minStock}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => product.hasVariants && onViewVariants?.(product)}
                      disabled={!product.hasVariants}
                      className={cn(
                        "transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md",
                        product.hasVariants 
                          ? "cursor-pointer hover:scale-105 active:scale-95" 
                          : "cursor-default opacity-60"
                      )}
                    >
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "whitespace-nowrap",
                          product.hasVariants 
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" 
                            : "bg-muted text-muted-foreground border-muted"
                        )}
                      >
                        {product.hasVariants ? (
                          <>
                            {variantsCount} {language === 'ar' ? 'متغير' : 'variants'}
                          </>
                        ) : (
                          language === 'ar' ? 'بدون متغيرات' : 'No Variants'
                        )}
                      </Badge>
                    </button>
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "whitespace-nowrap font-medium",
                        statusConfig.className
                      )}
                    >
                      {statusConfig.label}
                    </Badge>
                    <div className="mt-1 text-[10px] text-gray-500">
                      Stock: {stock} | Min: {minStock}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(product)}
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                        title={language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(product)}
                        className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-600"
                        title={language === 'ar' ? 'تعديل' : 'Edit'}
                      >
                        <Edit2 size={16} />
                      </Button>
                      {onPrintBarcode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPrintBarcode(product)}
                          className="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-600"
                          title={language === 'ar' ? 'طباعة الباركود' : 'Print Barcode'}
                        >
                          <Printer size={16} />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-muted"
                            title={language === 'ar' ? 'المزيد' : 'More'}
                          >
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          className="bg-popover border border-border shadow-lg min-w-[180px] z-50"
                        >
                          
                          <DropdownMenuItem 
                            onClick={() => onDelete(product.id)}
                            className="text-destructive focus:text-destructive cursor-pointer hover:bg-destructive/10"
                          >
                            <Trash2 size={14} className="me-2" />
                            {language === 'ar' ? 'حذف' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      <PaginationControls />
    </div>
  );
};

export default ProductList;