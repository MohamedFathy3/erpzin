import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Search, FileDown, Save, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface PurchaseOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editOrder?: any;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ isOpen, onClose, onSave, editOrder }) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const queryClient = useQueryClient();
  
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-order'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    productSearch === '' || 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.name_ar?.includes(productSearch) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode?.includes(productSearch)
  );

  // Load edit data
  useEffect(() => {
    if (editOrder && isOpen) {
      setSupplierId(editOrder.supplier_id || '');
      setExpectedDate(editOrder.expected_date ? new Date(editOrder.expected_date).toISOString().split('T')[0] : '');
      setNotes(editOrder.notes || '');
      loadOrderItems(editOrder.id);
    } else if (!editOrder && isOpen) {
      resetForm();
    }
  }, [editOrder, isOpen]);

  const loadOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*, products(name, name_ar, sku)')
      .eq('purchase_order_id', orderId);
    
    if (!error && data) {
      setItems(data.map((item: any) => ({
        product_id: item.product_id,
        product_name: language === 'ar' ? item.products?.name_ar || item.products?.name : item.products?.name,
        sku: item.products?.sku || '',
        quantity: item.quantity,
        unit_cost: Number(item.unit_cost),
        total_cost: Number(item.total_cost)
      })));
    }
  };

  const resetForm = () => {
    setSupplierId('');
    setExpectedDate('');
    setNotes('');
    setItems([]);
    setProductSearch('');
  };

  const addProduct = (product: any) => {
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].total_cost = newItems[existingIndex].quantity * newItems[existingIndex].unit_cost;
      setItems(newItems);
    } else {
      setItems([...items, {
        product_id: product.id,
        product_name: language === 'ar' ? product.name_ar || product.name : product.name,
        sku: product.sku,
        quantity: 1,
        unit_cost: Number(product.cost || 0),
        total_cost: Number(product.cost || 0)
      }]);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const updateItem = (index: number, field: string, value: number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    newItems[index].total_cost = newItems[index].quantity * newItems[index].unit_cost;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total_cost, 0);

  // Generate order number
  const generateOrderNumber = async () => {
    const { count } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true });
    const num = (count || 0) + 1;
    return `PO-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${String(num).padStart(4, '0')}`;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error(language === 'ar' ? 'يرجى اختيار المورد' : 'Please select a supplier');
      if (items.length === 0) throw new Error(language === 'ar' ? 'يرجى إضافة منتجات' : 'Please add products');

      if (editOrder) {
        // Update order
        const { error: orderError } = await supabase
          .from('purchase_orders')
          .update({
            supplier_id: supplierId,
            expected_date: expectedDate || null,
            notes,
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', editOrder.id);
        
        if (orderError) throw orderError;

        // Delete old items and insert new
        await supabase.from('purchase_order_items').delete().eq('purchase_order_id', editOrder.id);
        
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(items.map(item => ({
            purchase_order_id: editOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost
          })));
        
        if (itemsError) throw itemsError;
      } else {
        // Create new order
        const orderNumber = await generateOrderNumber();
        
        const { data: newOrder, error: orderError } = await supabase
          .from('purchase_orders')
          .insert({
            order_number: orderNumber,
            supplier_id: supplierId,
            expected_date: expectedDate || null,
            notes,
            total_amount: totalAmount,
            status: 'pending'
          })
          .select()
          .single();
        
        if (orderError) throw orderError;

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(items.map(item => ({
            purchase_order_id: newOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost
          })));
        
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      toast.success(editOrder 
        ? (language === 'ar' ? 'تم تحديث أمر الشراء' : 'Purchase order updated')
        : (language === 'ar' ? 'تم إنشاء أمر الشراء' : 'Purchase order created')
      );
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      onSave();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editOrder 
              ? (language === 'ar' ? 'تعديل أمر الشراء' : 'Edit Purchase Order')
              : (language === 'ar' ? 'أمر شراء جديد' : 'New Purchase Order')
            }
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 py-4">
            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{language === 'ar' ? 'المورد *' : 'Supplier *'}</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر المورد' : 'Select supplier'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {language === 'ar' ? s.name_ar || s.name : s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'تاريخ التسليم المتوقع' : 'Expected Delivery'}</Label>
                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الإجمالي' : 'Total'}</Label>
                <div className="h-10 px-3 flex items-center bg-muted rounded-md text-lg font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>

            {/* Product Search */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      placeholder={language === 'ar' ? 'بحث عن منتج بالاسم أو SKU أو الباركود...' : 'Search by name, SKU or barcode...'}
                      value={productSearch}
                      onChange={(e) => { setProductSearch(e.target.value); setShowProductSearch(true); }}
                      onFocus={() => setShowProductSearch(true)}
                      className="ps-10"
                    />
                  </div>
                </div>

                {showProductSearch && productSearch && (
                  <div className="border rounded-lg max-h-48 overflow-auto mb-4">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {language === 'ar' ? 'لم يتم العثور على منتجات' : 'No products found'}
                      </div>
                    ) : (
                      filteredProducts.slice(0, 10).map((product: any) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                          onClick={() => addProduct(product)}
                        >
                          <div className="flex items-center gap-3">
                            <Package size={18} className="text-muted-foreground" />
                            <div>
                              <p className="font-medium">{language === 'ar' ? product.name_ar || product.name : product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                          </div>
                          <div className="text-end">
                            <p className="font-medium">{formatCurrency(Number(product.cost || 0))}</p>
                            <Badge variant="outline" className="text-xs">
                              {language === 'ar' ? 'المتوفر:' : 'Stock:'} {product.stock}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Order Items */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                      <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead className="w-32">{language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}</TableHead>
                      <TableHead className="w-32">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'ابحث عن منتجات لإضافتها' : 'Search for products to add'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-20 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={item.unit_cost}
                              onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                              className="w-28 h-8"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.total_cost)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(index)}>
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Notes */}
            <div>
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-lg font-bold">
            {language === 'ar' ? 'الإجمالي:' : 'Total:'} {formatCurrency(totalAmount)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save size={16} className="me-2" />
              {saveMutation.isPending 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderForm;