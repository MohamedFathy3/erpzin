// components/purchase/PurchaseInvoiceForm.tsx (النسخة المعدلة)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';
import { format, parseISO } from 'date-fns';
import { Loader2, Package, DollarSign, ArrowLeftRight, BadgeCheck, XCircle, Save, Copy, Printer, Edit2, Landmark, Trash2 } from 'lucide-react';

// Import types
import { InvoiceItem, ApiPurchaseInvoice, Treasury, Product } from '@/types/purchaseform';

// Import services
import { purchaseInvoiceService } from '@/services/purchaseInvoice.service';
import { productManager } from '@/services/productManager.service';
import { PurchaseInvoiceValidator, PurchaseFormData } from '@/validators/purchaseInvoice.validator';

// Import hooks
import {
  useSuppliers,
  useBranches,
  useWarehouses,
  useCurrencies,
  useTaxes,
  useTreasuries,
  useProducts
} from '@/hooks/usePurchaseFormData';

// Import components
import FormHeader from './FormHeader';
import FormFields from './FormFields';
import QuickProductSearch from '@/components/shared/QuickProductSearch';
import PurchaseVariantSelector from './PurchaseVariantSelector';
import PurchaseInvoiceTemplate from './PurchaseInvoiceTemplate';

interface PurchaseInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onSaveAndNew?: () => void;
  invoiceToEdit?: ApiPurchaseInvoice | null;
}

const PurchaseInvoiceForm: React.FC<PurchaseInvoiceFormProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndNew,
  invoiceToEdit
}) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [variantProduct, setVariantProduct] = useState<any>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invoicePrintRef = useRef<HTMLDivElement>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  const isEditMode = !!invoiceToEdit;

  const getTodayDate = useCallback(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const [formData, setFormData] = useState<PurchaseFormData>({
    supplier_id: '',
    branch_id: '',
    warehouse_id: '',
    invoice_date: getTodayDate(),
    due_date: '',
    payment_method: 'cash',
    tax_id: '',
    currency_id: '',
    notes: '',
    paid_amount: 0,
    treasury_id: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  // ========== Fetch Data ==========
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers(isOpen);
  const { data: branches = [], isLoading: loadingBranches } = useBranches(isOpen);
  const { data: warehouses = [], isLoading: loadingWarehouses } = useWarehouses(formData.branch_id, isOpen);
  const { data: currencies = [], isLoading: loadingCurrencies } = useCurrencies(isOpen);
  const { data: taxes = [], isLoading: loadingTaxes } = useTaxes(isOpen);
  const { data: treasuries = [], isLoading: treasuryLoading } = useTreasuries(formData.branch_id, isOpen);
  const { data: products = [], isLoading: loadingProducts } = useProducts(isOpen);

  // ========== Effects ==========
  useEffect(() => {
    if (currencies.length > 0 && !formData.currency_id && !isEditMode) {
      const defaultCurr = currencies.find((c: any) => c.default === true) || currencies[0];
      setFormData(prev => ({ ...prev, currency_id: defaultCurr?.id?.toString() || '' }));
    }
  }, [currencies, formData.currency_id, isEditMode]);

  useEffect(() => {
    if (taxes.length > 0 && !formData.tax_id && !isEditMode) {
      const defaultTax = taxes.find((t: any) => t.default === true) || taxes[0];
      setFormData(prev => ({ ...prev, tax_id: defaultTax?.id?.toString() || '' }));
    }
  }, [taxes, formData.tax_id, isEditMode]);

  useEffect(() => {
    if (isEditMode && invoiceToEdit) {
      loadInvoiceData();
    }
  }, [isEditMode, invoiceToEdit]);

  const loadInvoiceData = () => {
    if (!invoiceToEdit) return;
    
    setFormData({
      supplier_id: invoiceToEdit.supplier?.id?.toString() || '',
      branch_id: invoiceToEdit.branch?.id?.toString() || '',
      warehouse_id: invoiceToEdit.warehouse?.id?.toString() || '',
      invoice_date: invoiceToEdit.invoice_date || getTodayDate(),
      due_date: invoiceToEdit.due_date || '',
      payment_method: invoiceToEdit.payment_method || 'cash',
      tax_id: invoiceToEdit.tax?.id?.toString() || '',
      currency_id: invoiceToEdit.currency?.id?.toString() || '',
      notes: invoiceToEdit.note || '',
      paid_amount: invoiceToEdit.paid_amount || 0,
      treasury_id: invoiceToEdit.treasury?.id?.toString() || ''
    });

    const loadedItems: InvoiceItem[] = (invoiceToEdit.items || []).map((item: any, index: number) => ({
      id: `edit-${index}-${Date.now()}`,
      product_id: item.product_id,
      product_variant_id: item.product_variant_id,
      product_name: language === 'ar' ? (item.product_name_ar || item.product_name) : item.product_name,
      product_sku: item.product_sku,
      size_name: item.variant_details?.size,
      color_name: item.variant_details?.color,
      quantity: item.quantity,
      unit_cost: item.price,
      discount_percent: item.discount,
      discount_amount: 0,
      tax_percent: item.tax,
      tax_amount: 0,
      total_cost: item.total,
      product_unit_id: item.product_unit_id,
      color_id: item.color_id
    }));

    const recalculatedItems = loadedItems.map(item => productManager.calculateItemTotals(item));
    setItems(recalculatedItems);
    
    if (invoiceToEdit.paid_amount > 0) {
      setShowPaymentDetails(true);
    }
  };

  // ========== Product Management ==========
  const handleProductClick = (product: Product) => {
    if (product.units && product.units.length > 0) {
      setVariantProduct(product);
    } else {
      addProduct(product);
    }
  };

  const addProduct = (product: Product, unitId?: number, colorId?: number) => {
    const existingIndex = productManager.checkDuplicateProduct(items, product.id);
    
    if (existingIndex >= 0) {
      const newItems = productManager.incrementQuantity(items, existingIndex);
      setItems(newItems);
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم زيادة الكمية' : 'Quantity increased'
      });
    } else {
      const newItem = productManager.createItemFromProduct(product, language, unitId, colorId);
      setItems([...items, newItem]);
      toast({
        title: language === 'ar' ? 'تمت الإضافة' : 'Added',
        description: language === 'ar' ? 'تم إضافة المنتج' : 'Product added'
      });
    }
  };

  const addVariant = (variant: {
    product_id: string;
    variant_id: string;
    product_name: string;
    product_sku: string;
    unit_cost: number;
    size_name?: string;
    color_name?: string;
    product_unit_id?: number;
    color_id?: number;
  }) => {
    const product = products.find(p => p.id === Number(variant.product_id));
    if (product) {
      addProduct(product, variant.product_unit_id, variant.color_id);
    }
    setVariantProduct(null);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: number) => {
    let newItems = [...items];
    
    switch (field) {
      case 'quantity':
        newItems = productManager.updateItemQuantity(newItems, index, value);
        break;
      case 'unit_cost':
        newItems = productManager.updateItemPrice(newItems, index, value);
        break;
      case 'discount_percent':
        newItems = productManager.updateItemDiscount(newItems, index, value);
        break;
      case 'tax_percent':
        newItems = productManager.updateItemTax(newItems, index, value);
        break;
      default:
        (newItems[index] as any)[field] = value;
        newItems = productManager.recalculateItem(newItems, index);
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(productManager.removeItem(items, index));
    toast({
      title: language === 'ar' ? 'تم الحذف' : 'Removed',
      description: language === 'ar' ? 'تم حذف المنتج' : 'Product removed'
    });
  };

  // ========== Calculations ==========
  const totals = useMemo(() => productManager.calculateTotals(items), [items]);
  const remainingAmount = totals.total - (formData.paid_amount || 0);

  // ========== Validation ==========
  const validateForm = (): boolean => {
    const newErrors = PurchaseInvoiceValidator.validateForm(formData, items, language);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = PurchaseInvoiceValidator.isFormValid(formData, items);

  // ========== Submit Handlers ==========
  const handleSubmit = async (action: 'save' | 'save_and_new' | 'save_and_print') => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    const payload = {
      supplier_id: Number(formData.supplier_id),
      branch_id: formData.branch_id ? Number(formData.branch_id) : null,
      warehouse_id: Number(formData.warehouse_id),
      currency_id: Number(formData.currency_id),
      tax_id: formData.tax_id ? Number(formData.tax_id) : null,
      payment_method: formData.payment_method,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date || null,
      note: formData.notes || null,
      paid_amount: formData.paid_amount || 0,
      remaining_amount: remainingAmount,
      treasury_id: formData.treasury_id ? Number(formData.treasury_id) : null,
      items: productManager.preparePayloadItems(items)
    };
    
    try {
      let response;
      if (isEditMode && invoiceToEdit) {
        response = await purchaseInvoiceService.updateInvoice(invoiceToEdit.id, payload);
      } else {
        response = await purchaseInvoiceService.createInvoice(payload);
      }
      
      toast({
        title: language === 'ar' ? (isEditMode ? 'تم التحديث' : 'تم الحفظ') : (isEditMode ? 'Updated' : 'Saved'),
        description: language === 'ar' 
          ? `تم ${isEditMode ? 'تحديث' : 'إنشاء'} فاتورة الشراء بنجاح` 
          : `Purchase invoice ${isEditMode ? 'updated' : 'created'} successfully`
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      
      // Handle print
      if (action === 'save_and_print') {
        const printInvoiceData = {
          id: response.data.id,
          invoice_number: response.data.invoice_number,
          date: new Date().toISOString(),
          supplier: suppliers.find(s => s.id === Number(formData.supplier_id)),
          cashierName: user?.name || 'المدير',
          items: items.map(item => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_cost,
            discount_percent: item.discount_percent,
            tax_percent: item.tax_percent
          })),
          subtotal: totals.subtotal,
          tax: totals.totalTax,
          discount_total: totals.totalDiscount,
          total: totals.total,
          paid_amount: formData.paid_amount,
          remaining_amount: remainingAmount,
          payment_method: formData.payment_method,
          notes: formData.notes,
        };
        
        setPrintData(printInvoiceData);
        setShowPrint(true);
        setTimeout(() => handlePrint(), 100);
      }
      
      // Handle save and new
      if (action === 'save_and_new' && onSaveAndNew) {
        resetForm();
        onSaveAndNew();
      } else {
        onSave();
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.response?.data?.message || error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrint = useReactToPrint({
    contentRef: invoicePrintRef,
    documentTitle: `فاتورة-مشتريات-${Date.now()}`,
    onAfterPrint: () => {
      setShowPrint(false);
      setPrintData(null);
    },
  });
  
  const resetForm = () => {
    const defaultCurrency = currencies.find((c: any) => c.default === true) || currencies[0];
    const defaultTax = taxes.find((t: any) => t.default === true) || taxes[0];
    
    setFormData({
      supplier_id: '',
      branch_id: '',
      warehouse_id: '',
      invoice_date: getTodayDate(),
      due_date: '',
      payment_method: 'cash',
      tax_id: defaultTax?.id?.toString() || '',
      currency_id: defaultCurrency?.id?.toString() || '',
      notes: '',
      paid_amount: 0,
      treasury_id: ''
    });
    setItems([]);
    setShowPaymentDetails(false);
    setErrors({});
  };
  
  const formatCurrency = (amount: number) => {
    const currency = currencies.find((c: any) => c.id === Number(formData.currency_id));
    return `${amount.toLocaleString()} ${currency?.symbol || ''}`;
  };
  
  const disabled = loading;
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          <FormHeader isEditMode={isEditMode} invoiceToEdit={invoiceToEdit} />
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <FormFields
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              suppliers={suppliers}
              branches={branches}
              warehouses={warehouses}
              currencies={currencies}
              taxes={taxes}
              loadingStates={{
                suppliers: loadingSuppliers,
                branches: loadingBranches,
                warehouses: loadingWarehouses,
                currencies: loadingCurrencies,
                taxes: loadingTaxes
              }}
              disabled={disabled}
            />
            
            {/* Products Section */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package size={14} />
                  {language === 'ar' ? 'المنتجات' : 'Products'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <QuickProductSearch
                  onSelectProduct={handleProductClick}
                  priceField="cost"
                  placeholder={language === 'ar' ? 'بحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
                  autoFocus
                  showStock
                  products={products}
                  disabled={disabled}
                />
                
                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-8 py-2 text-xs">#</TableHead>
                        <TableHead className="py-2 text-xs">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="w-16 py-2 text-xs text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                        <TableHead className="w-20 py-2 text-xs text-center">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                        <TableHead className="w-14 py-2 text-xs text-center">{language === 'ar' ? 'خصم%' : 'Disc%'}</TableHead>
                        <TableHead className="w-14 py-2 text-xs text-center">{language === 'ar' ? 'ضريبة%' : 'Tax%'}</TableHead>
                        <TableHead className="w-20 py-2 text-xs text-end">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        <TableHead className="w-8 py-2"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">
                            {language === 'ar' ? 'لم يتم إضافة منتجات' : 'No products added'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="py-1.5 text-xs text-center">{index + 1}</TableCell>
                            <TableCell className="py-1.5">
                              <div>
                                <p className="font-medium text-xs">{item.product_name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.product_sku}</p>
                                {(item.size_name || item.color_name) && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {item.size_name && `📏 ${item.size_name}`}
                                    {item.color_name && ` 🎨 ${item.color_name}`}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                className="w-14 h-7 text-xs text-center mx-auto"
                                disabled={disabled}
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(e) => updateItem(index, 'unit_cost', Number(e.target.value))}
                                className="w-18 h-7 text-xs text-center mx-auto"
                                disabled={disabled}
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discount_percent}
                                onChange={(e) => updateItem(index, 'discount_percent', Number(e.target.value))}
                                className="w-12 h-7 text-xs text-center mx-auto"
                                disabled={disabled}
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.tax_percent}
                                onChange={(e) => updateItem(index, 'tax_percent', Number(e.target.value))}
                                className="w-12 h-7 text-xs text-center mx-auto"
                                disabled={disabled}
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-end font-semibold text-xs">
                              {formatCurrency(item.total_cost)}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => removeItem(index)}
                                disabled={disabled}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {errors.items && (
                  <p className="text-[10px] text-destructive text-center">{errors.items}</p>
                )}
              </CardContent>
            </Card>
            
            {/* Payment Section */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                    className="gap-2"
                    disabled={disabled}
                  >
                    <DollarSign size={16} />
                    {showPaymentDetails 
                      ? (language === 'ar' ? 'إخفاء تفاصيل الدفع' : 'Hide Payment Details')
                      : (language === 'ar' ? 'إظهار تفاصيل الدفع' : 'Show Payment Details')
                    }
                  </Button>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(totals.total)}</p>
                    </div>
                    <ArrowLeftRight size={20} className="text-muted-foreground" />
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'المتبقي للمورد' : 'Remaining'}</p>
                      <p className={`text-lg font-bold ${remainingAmount > 0 ? 'text-warning' : 'text-success'}`}>
                        {formatCurrency(remainingAmount)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {showPaymentDetails && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-primary/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>{language === 'ar' ? 'المبلغ المدفوع' : 'Paid Amount'}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.paid_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: Number(e.target.value) }))}
                          placeholder="0"
                          className="text-lg font-bold"
                          disabled={disabled}
                        />
                      </div>
                      
                      {(formData.payment_method === 'cash' || formData.payment_method === 'credit') && (
                        <div>
                          <Label className="flex items-center gap-1 mb-1.5 font-medium">
                            <Landmark size={16} className="text-primary" />
                            {language === 'ar' ? 'الخزينة' : 'Treasury'}
                            {formData.paid_amount > 0 && <span className="text-destructive">*</span>}
                          </Label>
                          
                          {!formData.branch_id ? (
                            <div className="text-sm text-muted-foreground p-2.5 border rounded-md bg-muted/20 border-dashed">
                              {language === 'ar' ? '⏳ اختر الفرع أولاً' : '⏳ Select branch first'}
                            </div>
                          ) : treasuryLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2.5 border rounded-md bg-muted/20">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {language === 'ar' ? 'جاري تحميل الخزائن...' : 'Loading treasuries...'}
                            </div>
                          ) : treasuries.length === 0 ? (
                            <div className="text-sm text-muted-foreground p-2.5 border rounded-md bg-muted/20 border-dashed">
                              {language === 'ar' ? '❌ لا يوجد خزائن لهذا الفرع' : '❌ No treasuries for this branch'}
                            </div>
                          ) : (
                            <select
                              value={formData.treasury_id}
                              onChange={(e) => setFormData(prev => ({ ...prev, treasury_id: e.target.value }))}
                              className={cn(
                                "w-full px-3 py-2.5 border rounded-md bg-background text-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                                "transition-all duration-200",
                                errors.treasury_id 
                                  ? "border-destructive bg-destructive/5" 
                                  : "border-input hover:border-primary/50"
                              )}
                              disabled={disabled}
                            >
                              <option value="" disabled>
                                {language === 'ar' ? '-- اختر الخزينة --' : '-- Select treasury --'}
                              </option>
                              {treasuries.map((treasury: Treasury) => (
                                <option key={treasury.id} value={treasury.id.toString()}>
                                  {language === 'ar' ? (treasury.name_ar || treasury.name) : treasury.name}
                                  {treasury.is_main && ` (${language === 'ar' ? 'رئيسية' : 'Main'})`}
                                </option>
                              ))}
                            </select>
                          )}
                          
                          {errors.treasury_id && (
                            <p className="text-xs text-destructive mt-1">{errors.treasury_id}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {remainingAmount > 0 && (
                      <div className="bg-warning/10 p-3 rounded-lg flex items-center gap-2">
                        <DollarSign size={18} className="text-warning" />
                        <p className="text-sm text-warning">
                          {language === 'ar' 
                            ? `المتبقي للمورد: ${formatCurrency(remainingAmount)}`
                            : `Remaining for supplier: ${formatCurrency(remainingAmount)}`
                          }
                        </p>
                      </div>
                    )}
                    
                    {remainingAmount === 0 && totals.total > 0 && (
                      <div className="bg-success/10 p-3 rounded-lg flex items-center gap-2">
                        <BadgeCheck size={18} className="text-success" />
                        <p className="text-sm text-success">
                          {language === 'ar' ? 'تم الدفع بالكامل' : 'Fully paid'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={language === 'ar' ? 'ملاحظات...' : 'Notes...'}
                rows={2}
                className="text-sm"
                disabled={disabled}
              />
            </div>
          </div>
          
          <DialogFooter className="p-4 pt-3 border-t bg-muted/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{language === 'ar' ? 'الإجمالي:' : 'Total:'} {formatCurrency(totals.total)}</span>
              {remainingAmount > 0 && (
                <span className="text-sm font-medium text-warning">
                  {language === 'ar' ? 'المتبقي:' : 'Remaining:'} {formatCurrency(remainingAmount)}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} size="sm" disabled={disabled}>
                <XCircle size={14} className="me-1.5" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              
              <Button 
                onClick={() => handleSubmit('save')} 
                disabled={disabled || !isFormValid} 
                size="sm" 
                className="min-w-24"
              >
                {disabled ? (
                  <Loader2 size={14} className="me-1.5 animate-spin" />
                ) : (
                  <>
                    {isEditMode ? <Edit2 size={14} className="me-1.5" /> : <Save size={14} className="me-1.5" />}
                    {isEditMode ? (language === 'ar' ? 'تحديث' : 'Update') : (language === 'ar' ? 'حفظ فقط' : 'Save Only')}
                  </>
                )}
              </Button>
              
              {!isEditMode && onSaveAndNew && (
                <Button 
                  onClick={() => handleSubmit('save_and_new')} 
                  disabled={disabled || !isFormValid} 
                  size="sm" 
                  variant="secondary"
                >
                  <Copy size={14} className="me-1.5" />
                  {language === 'ar' ? 'حفظ وإضافة' : 'Save & New'}
                </Button>
              )}
              
              <Button 
                onClick={() => handleSubmit('save_and_print')} 
                disabled={disabled || !isFormValid} 
                size="sm" 
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <Printer size={14} className="me-1.5" />
                {language === 'ar' ? 'حفظ وطباعة' : 'Save & Print'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {showPrint && printData && (
        <div style={{ display: 'none' }}>
          <PurchaseInvoiceTemplate ref={invoicePrintRef} invoiceData={printData} />
        </div>
      )}
      
      {variantProduct && (
        <PurchaseVariantSelector
          isOpen={!!variantProduct}
          onClose={() => setVariantProduct(null)}
          product={variantProduct}
          onSelectVariant={addVariant}
        />
      )}
    </>
  );
};

export default PurchaseInvoiceForm;