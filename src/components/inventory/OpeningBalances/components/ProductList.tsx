// components/ProductList.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Product, Branch, SelectedProduct } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { AddBalanceModal } from './AddBalanceModal';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface ProductListProps {
  products: Product[];
  onDelete: (productId: number) => void;
  isDeleting?: boolean;
  deletingId?: number | null;
  branches?: Branch[];
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onDelete,
  isDeleting = false,
  deletingId = null,
  branches = [],
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const queryClient = useQueryClient();

  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [editingProducts, setEditingProducts] = useState<SelectedProduct[]>([]);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editingBranch, setEditingBranch] = useState<string>('all');
  const [editingWarehouse, setEditingWarehouse] = useState<string>('all');
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const [originalStock, setOriginalStock] = useState<number | null>(null);
  const [originalWarehouseId, setOriginalWarehouseId] = useState<number | null>(null);
  const [originalUnitId, setOriginalUnitId] = useState<number | null>(null);
  const [originalColorId, setOriginalColorId] = useState<number | null>(null);

  // ✅ بيانات إضافية للعرض
  const [originalWarehouseName, setOriginalWarehouseName] = useState<string | null>(null);
  const [originalBranchName, setOriginalBranchName] = useState<string | null>(null);
  const [editingBranches, setEditingBranches] = useState<Branch[]>([]);

  const t = {
    product: language === 'ar' ? 'المنتج' : 'Product',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    costPrice: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    salePrice: language === 'ar' ? 'سعر البيع' : 'Sale Price',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    edit: language === 'ar' ? 'تعديل' : 'Edit',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    noProducts: language === 'ar' ? 'لا توجد منتجات' : 'No products found',
    stockNotFound: language === 'ar' ? 'لم يتم العثور على بيانات الرصيد' : 'Stock data not found',
  };

  const handleOpenEdit = async (product: Product) => {
    setIsLoadingStock(true);

    try {
      const response = await api.post('/products/stock-details', {
        product_id: product.id,
      });

      console.log('📦 Stock details response:', response.data);

      const stockRecord = response.data?.data ?? null;

      if (!stockRecord) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: t.stockNotFound,
          variant: 'destructive',
        });
        setIsLoadingStock(false);
        return;
      }

      const warehouseId = stockRecord.warehouse_id ? Number(stockRecord.warehouse_id) : null;
      const branchId = stockRecord.branch_id ? Number(stockRecord.branch_id) : null;
      const unitId = stockRecord.unit_id ? Number(stockRecord.unit_id) : null;
      const colorId = stockRecord.color_id ? Number(stockRecord.color_id) : null;
      const recordId = stockRecord.record_id ? Number(stockRecord.record_id) : null;
      const stockQty = Number(stockRecord.stock ?? 0);
      const cost = Number(stockRecord.cost ?? product.cost ?? 0);
      const price = Number(stockRecord.price ?? product.price ?? 0);

      // ✅ حفظ أسماء المخزن والفرع
      setOriginalWarehouseName(stockRecord.warehouse_name || null);
      setOriginalBranchName(stockRecord.branch_name || null);

      // ✅ ابني قايمة فروع مدمجة
      const branchFromApi: Branch | null = stockRecord.branch_id
        ? ({
          id: stockRecord.branch_id,
          name: stockRecord.branch_name || `Branch ${stockRecord.branch_id}`,
          name_ar: stockRecord.branch_name_ar || null,
        } as any)
        : null;

      const mergedBranches = [...branches];
      if (branchFromApi && !mergedBranches.some(b => String(b.id) === String(branchFromApi.id))) {
        mergedBranches.push(branchFromApi);
      }
      setEditingBranches(mergedBranches);

      console.log('📊 Resolved:', {
        warehouseId,
        branchId,
        stockQty,
        branchFromApi,
        mergedBranches,
        originalWarehouseName: stockRecord.warehouse_name,
        originalBranchName: stockRecord.branch_name,
      });

      const selectedProduct: SelectedProduct = {
        product: product,
        quantity: stockQty,
        cost: cost,
        price: price,
        unit_id: unitId,
        unitId: unitId ?? undefined,
        colorId: colorId ?? undefined,
        warehouse_id: warehouseId ?? undefined,
        branch_id: branchId ?? undefined,
      };

      setEditingProducts([selectedProduct]);
      setEditingRecordId(recordId);
      setEditingBranch(branchId ? String(branchId) : 'all');
      setEditingWarehouse(warehouseId ? String(warehouseId) : 'all');

      setOriginalStock(stockQty);
      setOriginalWarehouseId(warehouseId);
      setOriginalUnitId(unitId);
      setOriginalColorId(colorId);

      setIsBalanceModalOpen(true);
    } catch (error: any) {
      console.error('❌ Error loading stock:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          (language === 'ar' ? 'فشل تحميل بيانات الرصيد' : 'Failed to load stock data'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingStock(false);
    }
  };

  const handleCloseModal = () => {
    setIsBalanceModalOpen(false);
    setEditingProducts([]);
    setEditingRecordId(null);
    setEditingBranch('all');
    setEditingWarehouse('all');
    setOriginalStock(null);
    setOriginalWarehouseId(null);
    setOriginalUnitId(null);
    setOriginalColorId(null);
    setOriginalWarehouseName(null);
    setOriginalBranchName(null);
    setEditingBranches([]);
  };

  return (
    <>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-semibold">{t.product}</TableHead>
              <TableHead className="text-right font-semibold">{t.quantity}</TableHead>
              <TableHead className="text-right font-semibold">{t.costPrice}</TableHead>
              <TableHead className="text-right font-semibold">{t.salePrice}</TableHead>
              <TableHead className="text-right font-semibold">{t.total}</TableHead>
              <TableHead className="text-right w-[100px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  {t.noProducts}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className={`hover:bg-muted/20 transition-opacity ${deletingId === product.id ? 'opacity-50 pointer-events-none' : ''
                    }`}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>
                        {language === 'ar' && product.name_ar
                          ? product.name_ar
                          : product.name}
                      </span>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{product.sku}</span>
                        {product.barcode && (
                          <span className="text-xs text-muted-foreground">• {product.barcode}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-mono">{product.stock}</TableCell>

                  <TableCell className="text-right font-mono">
                    {formatCurrency(product.cost)}
                  </TableCell>

                  <TableCell className="text-right font-mono">
                    {formatCurrency(product.price || 0)}
                  </TableCell>

                  <TableCell className="text-right font-mono font-semibold text-emerald-600">
                    {formatCurrency((product.stock || 0) * product.cost)}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(product)}
                        disabled={isDeleting || deletingId === product.id || isLoadingStock}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title={t.edit}
                      >
                        {isLoadingStock ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Pencil size={14} />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                        title={t.delete}
                      >
                        {deletingId === product.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddBalanceModal
        open={isBalanceModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
          else setIsBalanceModalOpen(true);
        }}
        selectedProducts={editingProducts}
        onProductsChange={setEditingProducts}
        branches={editingBranches.length > 0 ? editingBranches : branches}
        selectedBranch={editingBranch}
        selectedWarehouse={editingWarehouse}
        onSave={() => { }}
        isSaving={false}
        mode="edit"
        editingRecordId={editingRecordId}
        originalStock={originalStock}
        originalWarehouseId={originalWarehouseId}
        originalUnitId={originalUnitId}
        originalColorId={originalColorId}
        originalWarehouseName={originalWarehouseName}
        originalBranchName={originalBranchName}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['products-with-balance'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          handleCloseModal();
        }}
      />
    </>
  );
};