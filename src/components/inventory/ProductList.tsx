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
  if (!product.active) return 'inactive';
  if (product.stock === 0 || product.stock === '0') return 'out_of_stock';
  
  const stock = Number(product.stock);
  const reorderLevel = Number(product.reorder_level) || 5;
  
  if (stock <= reorderLevel) return 'low_stock';
  return 'active';
};

// Helper function to transform API response to Product interface
export const transformApiProduct = (apiProduct: any): Product => {
  // Ensure cost is a number (handle null/undefined)
  const cost = apiProduct.cost !== null && apiProduct.cost !== undefined 
    ? Number(apiProduct.cost) 
    : 0;

  // Handle image URL - prioritize image_url, then image.fullUrl, then imageUrl
  let imageUrl = apiProduct.image_url || '';
  if (!imageUrl && apiProduct.image && apiProduct.image.fullUrl) {
    imageUrl = apiProduct.image.fullUrl;
  } else if (!imageUrl && apiProduct.imageUrl) {
    imageUrl = apiProduct.imageUrl;
  }

  return {
    id: apiProduct.id.toString(),
    name: apiProduct.name || '',
    nameAr: apiProduct.name_ar || apiProduct.name || '',
    sku: apiProduct.sku || '',
    barcode: apiProduct.barcode || undefined,
    category: apiProduct.category?.name || 'Uncategorized',
    categoryAr: apiProduct.category?.name_ar || apiProduct.category?.name || 'غير مصنف',
    categoryId: apiProduct.category?.id?.toString() || apiProduct.category_id?.toString(),
    price: Number(apiProduct.price) || 0,
    cost: cost,
    stock: Number(apiProduct.stock) || 0,
    imageUrl: imageUrl || undefined,
    minStock: Number(apiProduct.reorder_level) || 5,
    variants: 0, // You'll need to fetch variants count separately if needed
    image: imageUrl || undefined,
    status: mapProductStatus(apiProduct),
    hasVariants: apiProduct.has_variants || false
  };
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
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '';
                              (e.target as HTMLImageElement).className = 'hidden';
                              (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={cn("fallback-icon text-2xl", product.imageUrl ? "hidden" : "block")}>
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
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {language === 'ar' ? product.description : product.description}
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
                        {product.hasVariants 
                          ? `${product.variants || 0} ${language === 'ar' ? 'متغير' : 'variants'}`
                          : (language === 'ar' ? 'بدون متغيرات' : 'No Variants')
                        }
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
                            onClick={() => onDuplicate(product)}
                            className="cursor-pointer hover:bg-muted"
                          >
                            <Copy size={14} className="me-2" />
                            {language === 'ar' ? 'نسخ' : 'Duplicate'}
                          </DropdownMenuItem>
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