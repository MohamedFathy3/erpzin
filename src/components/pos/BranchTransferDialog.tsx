import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ArrowRightLeft, Loader2, Search } from 'lucide-react';

interface Branch { id: number; name: string; name_ar?: string | null; }
interface BranchProduct {
  id: number; name: string; name_ar?: string | null; sku?: string | null;
  stock: number; source_warehouse_id: number; source_warehouse_name?: string;
}

interface Props { open: boolean; onOpenChange: (open: boolean) => void; currentBranchId?: number; language: string; }

export default function BranchTransferDialog({ open, onOpenChange, currentBranchId, language }: Props) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<BranchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    api.post('/branch/index', { filters: { active: true }, paginate: false, perPage: 100 })
      .then(response => setBranches((response.data?.data || []).filter((branch: Branch) => branch.id !== currentBranchId)))
      .catch(() => toast({ title: language === 'ar' ? 'تعذر جلب الفروع' : 'Could not load branches', variant: 'destructive' }));
  }, [open, currentBranchId, language]);

  const searchProducts = async () => {
    if (!sourceBranchId) return;
    setLoading(true);
    try {
      const response = await api.post('/inventory-transfer-requests/products', {
        source_branch_id: Number(sourceBranchId), search: search || undefined,
      });
      setProducts(response.data?.data || []);
    } catch (error) {
      toast({ title: language === 'ar' ? 'تعذر جلب منتجات الفرع' : 'Could not load branch products', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const createRequest = async (product: BranchProduct) => {
    const raw = window.prompt(language === 'ar' ? `الكمية المطلوبة من ${product.name_ar || product.name}` : `Quantity for ${product.name}`, '1');
    const quantity = Number(raw);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    if (quantity > product.stock) {
      toast({ title: language === 'ar' ? 'الكمية أكبر من المخزون المتاح' : 'Quantity exceeds available stock', variant: 'destructive' });
      return;
    }
    setRequesting(product.id);
    try {
      await api.post('/inventory-transfer-requests', {
        product_id: product.id,
        from_branch_id: Number(sourceBranchId),
        from_warehouse_id: product.source_warehouse_id,
        quantity,
      });
      toast({ title: language === 'ar' ? 'تم إرسال طلب النقل للموافقة' : 'Transfer request sent for approval' });
    } catch (error) {
      toast({ title: language === 'ar' ? 'تعذر إنشاء طلب النقل' : 'Could not create transfer request', variant: 'destructive' });
    } finally { setRequesting(null); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft size={20} />{language === 'ar' ? 'منتجات الفروع وطلبات النقل' : 'Branch products and transfer requests'}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <select className="w-full rounded-md border bg-background p-2" value={sourceBranchId} onChange={event => { setSourceBranchId(event.target.value); setProducts([]); }}>
          <option value="">{language === 'ar' ? 'اختر الفرع المصدر' : 'Select source branch'}</option>
          {branches.map(branch => <option key={branch.id} value={branch.id}>{language === 'ar' ? (branch.name_ar || branch.name) : branch.name}</option>)}
        </select>
        <div className="flex gap-2">
          <Input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && searchProducts()} placeholder={language === 'ar' ? 'ابحث بالاسم أو SKU أو الباركود' : 'Search by name, SKU or barcode'} />
          <Button onClick={searchProducts} disabled={!sourceBranchId || loading}><Search size={16} className="me-1" />{language === 'ar' ? 'بحث' : 'Search'}</Button>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {loading && <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>}
          {!loading && sourceBranchId && products.length === 0 && <p className="text-center text-muted-foreground p-6">{language === 'ar' ? 'لا توجد منتجات متاحة' : 'No products available'}</p>}
          {products.map(product => <div key={product.id} className="flex items-center justify-between rounded-md border p-3">
            <div><p className="font-medium">{language === 'ar' ? (product.name_ar || product.name) : product.name}</p><p className="text-xs text-muted-foreground">{product.sku || '-'} · {language === 'ar' ? 'المتاح' : 'Available'}: {product.stock} · {product.source_warehouse_name || ''}</p></div>
            <Button size="sm" onClick={() => createRequest(product)} disabled={requesting === product.id}>{requesting === product.id ? <Loader2 className="animate-spin" size={15} /> : (language === 'ar' ? 'طلب نقل' : 'Request')}</Button>
          </div>)}
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
