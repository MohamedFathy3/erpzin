// components/sales/ProductSearch.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, Barcode, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalSettings } from "@/contexts/RegionalSettingsContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProductSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
  embedded?: boolean; // ✅ وضع مدمج (بدون Modal)
}

const ProductSearch = ({ isOpen, onClose, onSelectProduct, embedded = false }: ProductSearchProps) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'barcode' | 'sku'>('name');

  // دالة البحث المتقدمة
  const searchProducts = async (query: string) => {
    if (!query || query.length < 2) return [];
    
    const isBarcode = /^\d+$/.test(query) && query.length > 3;
    const isSKU = query.startsWith('PRD-') || query.includes('-');
    
    try {
      let filters: any = { active: true };
      
      if (isBarcode) {
        filters.barcode = query;
        setSearchType('barcode');
      } else if (isSKU) {
        filters.sku = query;
        setSearchType('sku');
      } else {
        filters.name = query;
        setSearchType('name');
      }
      
      const response = await api.post('/product/index', {
        filters: filters,
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 50,
        paginate: false
      });
      
      let products = response.data.result === 'Success' ? response.data.data || [] : [];
      
      // إذا لم نجد نتائج، جرب البحث بطريقة أخرى
      if (products.length === 0 && !isBarcode && !isSKU) {
        const response2 = await api.post('/product/index', {
          filters: { barcode: query, active: true },
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 50,
          paginate: false
        });
        products = response2.data.result === 'Success' ? response2.data.data || [] : [];
        if (products.length > 0) setSearchType('barcode');
      }
      
      if (products.length === 0 && !isBarcode) {
        const response3 = await api.post('/product/index', {
          filters: { sku: query, active: true },
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 50,
          paginate: false
        });
        products = response3.data.result === 'Success' ? response3.data.data || [] : [];
        if (products.length > 0) setSearchType('sku');
      }
      
      return products;
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  };

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['product-search', searchQuery],
    queryFn: () => searchProducts(searchQuery),
    enabled: (embedded ? true : isOpen) && searchQuery.length >= 2,
  });

  // Debounce للبحث
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        refetch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, refetch]);

  const handleSelect = (product: any) => {
    onSelectProduct(product);
    if (!embedded) {
      onClose();
    }
    setSearchQuery('');
  };

  const getSearchTypeLabel = () => {
    if (searchType === 'barcode') return language === 'ar' ? 'نتائج البحث بالباركود' : 'Barcode search results';
    if (searchType === 'sku') return language === 'ar' ? 'نتائج البحث بـ SKU' : 'SKU search results';
    return language === 'ar' ? 'نتائج البحث' : 'Search results';
  };

  // ✅ وضع مدمج (بدون Modal) - للموبيل
  if (embedded) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'ar' ? '🔍 ابحث بالاسم، الباركود، أو SKU...' : '🔍 Search by name, barcode, or SKU...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10 pe-10 h-11 text-base"
            autoFocus
          />
          <Barcode className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* مؤشر نوع البحث */}
        {searchQuery.length >= 2 && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant={searchType === 'barcode' ? 'default' : 'outline'} className="text-xs">
              {searchType === 'barcode' ? (language === 'ar' ? 'بحث بالباركود' : 'Barcode') : 
               searchType === 'sku' ? (language === 'ar' ? 'بحث بـ SKU' : 'SKU') : 
               (language === 'ar' ? 'بحث بالاسم' : 'Name')}
            </Badge>
            <span className="text-muted-foreground">
              {isLoading ? (language === 'ar' ? 'جاري البحث...' : 'Searching...') : `${products.length} ${language === 'ar' ? 'نتيجة' : 'results'}`}
            </span>
          </div>
        )}

        {/* نتائج البحث */}
        {searchQuery.length >= 2 && (
          <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">{language === 'ar' ? 'لا توجد منتجات' : 'No products found'}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {products.map((product: any) => (
                  <div
                    key={product.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(product)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {language === 'ar' ? (product.name_ar || product.name) : product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                          {product.barcode && (
                            <span className="text-xs text-muted-foreground font-mono">
                              <Barcode size={10} className="inline mr-1" />
                              {product.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-sm">
                          {formatCurrency(Number(product.sell_price || product.price || 0))}
                        </p>
                        <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-xs">
                          {product.stock || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ✅ وضع Modal (للديسكتوب)
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {language === 'ar' ? 'بحث المنتجات' : 'Product Search'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'ar' ? 'ابحث بالاسم، الباركود، أو SKU...' : 'Search by name, barcode, or SKU...'}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {searchType !== 'name' && searchQuery.length >= 2 && products.length > 0 && (
          <div className="mb-3 text-xs text-primary bg-primary/10 p-2 rounded-lg">
            {getSearchTypeLabel()}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>{language === 'ar' ? 'الباركود' : 'Barcode'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المخزون' : 'Stock'}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Package className="mx-auto h-12 w-12 mb-2 opacity-20" />
                      {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product: any) => (
                    <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">
                          {language === 'ar' ? product.name_ar || product.name : product.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="font-mono text-sm">{product.barcode || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(Number(product.sell_price || product.price || 0))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.stock > 0 ? "default" : "destructive"} className="text-xs">
                          {product.stock || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleSelect(product)}>
                          {language === 'ar' ? 'اختيار' : 'Select'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductSearch;