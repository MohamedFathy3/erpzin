import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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

  const getStatusBadge = (status: Product['status']) => {
    const config = {
      active: { label: language === 'ar' ? 'نشط' : 'Active', variant: 'default' as const, className: 'bg-success/20 text-success border-success/30' },
      inactive: { label: language === 'ar' ? 'غير نشط' : 'Inactive', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' },
      low_stock: { label: language === 'ar' ? 'مخزون منخفض' : 'Low Stock', variant: 'outline' as const, className: 'bg-warning/20 text-warning border-warning/30' },
      out_of_stock: { label: language === 'ar' ? 'نفذ المخزون' : 'Out of Stock', variant: 'destructive' as const, className: 'bg-destructive/20 text-destructive border-destructive/30' }
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
                className="w-8 h-8 p-0"
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
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
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">👕</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {language === 'ar' ? product.nameAr : product.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {product.sku}
                      </code>
                      {product.barcode && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {product.barcode}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {language === 'ar' ? product.categoryAr : product.category}
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {product.price.toLocaleString()} <span className="text-xs text-muted-foreground">YER</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'التكلفة:' : 'Cost:'} {product.cost.toLocaleString()}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      'font-semibold',
                      product.stock === 0 ? 'text-destructive' : product.stock <= 10 ? 'text-warning' : 'text-foreground'
                    )}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => product.hasVariants && onViewVariants?.(product)}
                      disabled={!product.hasVariants}
                      className={cn(
                        "transition-all",
                        product.hasVariants 
                          ? "cursor-pointer hover:scale-105" 
                          : "cursor-default opacity-60"
                      )}
                    >
                      <Badge 
                        variant="outline" 
                        className={cn(
                          product.hasVariants 
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" 
                            : "bg-muted text-muted-foreground border-muted"
                        )}
                      >
                        {product.hasVariants 
                          ? (language === 'ar' ? 'عرض المتغيرات' : 'View Variants')
                          : (language === 'ar' ? 'بدون متغيرات' : 'No Variants')
                        }
                      </Badge>
                    </button>
                  </td>
                  <td className="p-4">
                    <Badge variant={statusConfig.variant} className={statusConfig.className}>
                      {statusConfig.label}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(product)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(product)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
                          {onPrintBarcode && (
                            <DropdownMenuItem onClick={() => onPrintBarcode(product)}>
                              <Printer size={14} className="me-2" />
                              {language === 'ar' ? 'طباعة الباركود' : 'Print Barcode'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onDuplicate(product)}>
                            <Copy size={14} className="me-2" />
                            {language === 'ar' ? 'نسخ' : 'Duplicate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDelete(product.id)}
                            className="text-destructive focus:text-destructive"
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
