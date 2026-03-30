// components/inventory/OpeningBalances.tsx
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import AddProductWithBalance from './AddProductWithBalance';

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  cost: number;
  beginning_balance?: number;
}

const OpeningBalances: React.FC = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  // جلب المنتجات اللي ليها رصيد
  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ['products-with-balance'],
    queryFn: async () => {
      const response = await api.post('/product/index', {
        filters: { 
          active: true,
          beginning_balance: true 
        },
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 100,
        paginate: false
      });
      const allProducts = response.data?.data || [];
      // تصفية اللي ليهم beginning_balance
      return allProducts.filter(p => p.beginning_balance && p.beginning_balance > 0);
    }
  });

  // ✅ حذف المنتج (بإرسال id بس)
  const deleteBalanceMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await api.delete(`/product/delete`, {
        data: { items: [productId] }
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ 
        title: language === 'ar' ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: language === 'ar' ? 'حدث خطأ' : 'Error', 
        description: error.response?.data?.message || error.message, 
        variant: 'destructive' 
      });
    }
  });

  const handleDelete = (product: Product) => {
    if (window.confirm(
      language === 'ar' 
        ? `هل أنت متأكد من حذف المنتج ${product.name_ar || product.name}؟` 
        : `Are you sure you want to delete ${product.name}?`
    )) {
      deleteBalanceMutation.mutate(product.id); // ✅ إرسال id بس
    }
  };

  const t = {
    title: language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances',
    description: language === 'ar' ? 'المنتجات التي لها رصيد أول مدة' : 'Products with opening balance',
    product: language === 'ar' ? 'المنتج' : 'Product',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    costPrice: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    actions: language === 'ar' ? 'إجراءات' : 'Actions',
    add: language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    noData: language === 'ar' ? 'لا توجد منتجات لها رصيد أول مدة' : 'No products with opening balance',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...'
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="text-emerald-500" size={20} />
                {t.title}
              </CardTitle>
              <CardDescription className="mt-1">{t.description}</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus size={16} />
              {t.add}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.product}</TableHead>
                  <TableHead className="text-right">{t.quantity}</TableHead>
                  <TableHead className="text-right">{t.costPrice}</TableHead>
                  <TableHead className="text-right">{t.total}</TableHead>
                  <TableHead className="text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="animate-spin mx-auto" size={24} />
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Package className="mx-auto h-12 w-12 mb-3 opacity-20" />
                      <p>{t.noData}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div>{language === 'ar' && product.name_ar ? product.name_ar : product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{product.beginning_balance}</TableCell>
                      <TableCell className="text-right font-mono">{Number(product.cost).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {(Number(product.beginning_balance) * Number(product.cost)).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(product)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Product Form Modal */}
      <AddProductWithBalance
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={() => refetch()}
      />
    </>
  );
};

export default OpeningBalances;