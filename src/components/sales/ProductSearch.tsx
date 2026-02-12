// components/sales/ProductSearch.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, Barcode } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import api from "@/lib/api";
import { debounce } from "@/lib/utils";

interface ProductSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
}

const ProductSearch = ({ isOpen, onClose, onSelectProduct }: ProductSearchProps) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['product-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const response = await api.post('/product/index', {
        filters: {
          name: searchQuery,
          active: true
        },
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 50,
        paginate: false
      });
      
      return response.data.result === 'Success' ? response.data.data || [] : [];
    },
    enabled: isOpen && searchQuery.length >= 2
  });

  const handleSelect = (product: any) => {
    onSelectProduct(product);
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'بحث المنتجات' : 'Product Search'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'ar' ? 'ابحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>{language === 'ar' ? 'الباركود' : 'Barcode'}</TableHead>
                  <TableHead className="text-right">
                    {language === 'ar' ? 'السعر' : 'Price'}
                  </TableHead>
                  <TableHead className="text-center">
                    {language === 'ar' ? 'المخزون' : 'Stock'}
                  </TableHead>
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
                        {product.sell_price || product.price} 
                        <span className="text-xs text-muted-foreground mr-1">ريال</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          onClick={() => handleSelect(product)}
                        >
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