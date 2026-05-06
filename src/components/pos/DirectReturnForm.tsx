// components/pos/DirectReturnForm.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Plus, Minus, Trash2, Package, AlertCircle, Palette, Ruler, RotateCcw } from 'lucide-react';
import { useDirectReturn, DirectReturnItem } from '@/hooks/useDirectReturn';

interface DirectReturnFormProps {
  onComplete?: (amount: number) => void;
  currentShiftId?: string;
}

export const DirectReturnForm: React.FC<DirectReturnFormProps> = ({ onComplete, currentShiftId }) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  
  const {
    searchMode,
    searchQuery,
    invoiceNumber,
    items,
    returnReason,
    refundMethod,
    taxRateId,
    currencyId,
    showResults,
    filteredProducts,
    isSearching,
    subtotal,
    taxPercent,
    taxAmount,
    total,
    selectedCurrency,
    setSearchQuery,
    setInvoiceNumber,
    setReturnReason,
    setRefundMethod,
    setTaxRateId,
    setCurrencyId,
    setShowResults,
    addItem,
    updateQuantity,
    removeItem,
    updateItemColor,
    updateItemSize,
    closeResults,
    resetSearch,
    switchToInvoiceMode,
    switchToProductMode,
    processReturn,
    isProcessing,
  } = useDirectReturn({ onComplete, currentShiftId });

  const t = {
    invoiceMode: language === 'ar' ? 'بحث بفاتورة' : 'Search by Invoice',
    productMode: language === 'ar' ? 'بحث بمنتج' : 'Search by Product',
    searchPlaceholder: language === 'ar' ? 'ابحث...' : 'Search...',
    invoicePlaceholder: language === 'ar' ? 'أدخل رقم الفاتورة...' : 'Enter invoice number...',
    productPlaceholder: language === 'ar' ? 'ابحث عن المنتج...' : 'Search product...',
    noResults: language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found',
    searching: language === 'ar' ? 'جاري البحث...' : 'Searching...',
    add: language === 'ar' ? 'إضافة' : 'Add',
    remove: language === 'ar' ? 'حذف' : 'Remove',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    price: language === 'ar' ? 'السعر' : 'Price',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    subtotal: language === 'ar' ? 'المجموع الفرعي' : 'Subtotal',
    tax: language === 'ar' ? 'الضريبة' : 'Tax',
    grandTotal: language === 'ar' ? 'الإجمالي الكلي' : 'Grand Total',
    reason: language === 'ar' ? 'سبب الإرجاع' : 'Return Reason',
    refundMethod: language === 'ar' ? 'طريقة الاسترداد' : 'Refund Method',
    cash: language === 'ar' ? 'نقداً' : 'Cash',
    card: language === 'ar' ? 'بطاقة' : 'Card',
    wallet: language === 'ar' ? 'محفظة' : 'Wallet',
    credit: language === 'ar' ? 'رصيد' : 'Credit',
    confirmReturn: language === 'ar' ? 'تأكيد المرتجع' : 'Confirm Return',
    processing: language === 'ar' ? 'جاري المعالجة...' : 'Processing...',
    emptyItems: language === 'ar' ? 'لم يتم إضافة أي أصناف' : 'No items added',
    searchResults: language === 'ar' ? 'نتائج البحث' : 'Search Results',
    close: language === 'ar' ? 'إغلاق' : 'Close',
    color: language === 'ar' ? 'اللون' : 'Color',
    size: language === 'ar' ? 'المقاس' : 'Size',
    soldQuantity: language === 'ar' ? 'الكمية المباعة' : 'Sold Quantity',
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Search Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={searchMode === 'invoice' ? 'default' : 'outline'}
          size="sm"
          onClick={switchToInvoiceMode}
          className="rounded-lg"
        >
          <Search className="h-4 w-4 me-2" />
          {t.invoiceMode}
        </Button>
        {/* <Button
          variant={searchMode === 'product' ? 'default' : 'outline'}
          size="sm"
          onClick={switchToProductMode}
          className="rounded-lg"
        >
          <Package className="h-4 w-4 me-2" />
          {t.productMode}
        </Button> */}
      </div>

      {/* Search Input */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
        {searchMode === 'invoice' ? (
          <div className="relative">
            <Input
              placeholder={t.invoicePlaceholder}
              value={invoiceNumber}
              onChange={(e) => {
                setInvoiceNumber(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="h-12 ps-12 pe-10 text-base rounded-xl"
              autoFocus
            />
            {invoiceNumber && (
              <X
                className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 cursor-pointer hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  resetSearch();
                }}
              />
            )}
          </div>
        ) : (
          <div className="relative">
            <Input
              placeholder={t.productPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="h-12 ps-12 pe-10 text-base rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <X
                className="absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 cursor-pointer hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  resetSearch();
                }}
              />
            )}
          </div>
        )}

        {/* Search Results Dropdown */}
        {showResults && (searchMode === 'invoice' ? invoiceNumber : searchQuery) && (
          <div className="absolute top-full start-0 end-0 mt-1 bg-background border rounded-xl shadow-lg z-50">
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
              <span className="text-sm font-medium px-2">{t.searchResults}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  closeResults();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-80 overflow-auto">
              {isSearching ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-3">{t.searching}</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div
                    key={`${product.id}-${product.color || ''}-${product.size || ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(product);
                    }}
                    className="p-4 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base">
                          {product.name_ar || product.name}
                        </div>
                        <div className="text-sm text-muted-foreground">{product.sku}</div>
                        
                        {(product.color || product.size) && (
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            {product.color && (
                              <Badge variant="secondary" className="text-xs">
                                <Palette className="h-3 w-3 inline me-1" />
                                {product.color}
                              </Badge>
                            )}
                            {product.size && (
                              <Badge variant="secondary" className="text-xs">
                                <Ruler className="h-3 w-3 inline me-1" />
                                {product.size}
                              </Badge>
                            )}
                          </div>
                        )}

                        {searchMode === 'invoice' && product.quantity_sold && (
                          <div className="text-xs text-primary mt-2">
                            {t.soldQuantity}: {product.quantity_sold}
                          </div>
                        )}
                      </div>
                      <div className="text-left flex-shrink-0">
                        <div className="font-bold text-lg text-primary">
                          {formatCurrency(parseFloat(product.price))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t.noResults}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items List */}
      <ScrollArea className="flex-1 border rounded-xl bg-background">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t.emptyItems}</p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {items.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-muted/30 border flex flex-col gap-3">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-lg">{item.product_name}</div>
                    <div className="text-sm text-muted-foreground">{item.sku}</div>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Palette className="h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder={t.color}
                          value={item.color || ''}
                          onChange={(e) => updateItemColor(item.id, e.target.value)}
                          className="h-8 w-24 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder={t.size}
                          value={item.size || ''}
                          onChange={(e) => updateItemSize(item.id, e.target.value)}
                          className="h-8 w-24 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="text-primary font-semibold mt-2">
                      {formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.unit_price * item.quantity)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="h-8 w-8"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-8 w-8"
                      disabled={item.quantity_sold ? item.quantity >= item.quantity_sold : false}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Return Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm mb-2 block">{t.reason}</Label>
          <Input
            placeholder={t.reason}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="rounded-lg"
          />
        </div>
        <div>
          <Label className="text-sm mb-2 block">{t.refundMethod}</Label>
          <Select value={refundMethod} onValueChange={setRefundMethod}>
            <SelectTrigger className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">💵 {t.cash}</SelectItem>
              <SelectItem value="card">💳 {t.card}</SelectItem>
              <SelectItem value="wallet">📱 {t.wallet}</SelectItem>
              <SelectItem value="credit">👤 {t.credit}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoice Number Display */}
      {searchMode === 'invoice' && invoiceNumber && (
        <div className="text-sm bg-primary/10 text-primary p-3 rounded-lg">
          <span className="font-medium">📄 رقم الفاتورة الأصلية:</span> {invoiceNumber}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-sidebar rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-4 text-sm text-white/70">
              <span>{t.subtotal}: {formatCurrency(subtotal)}</span>
              <span>{t.tax} ({taxPercent}%): {formatCurrency(taxAmount)}</span>
            </div>
            <div className="text-2xl font-bold">
              {t.grandTotal}: {formatCurrency(total)}
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => processReturn()}
            disabled={items.length === 0 || isProcessing}
            className="h-14 px-8 text-lg rounded-xl bg-destructive hover:bg-destructive/90"
          >
            <RotateCcw className="h-5 w-5 me-2" />
            {isProcessing ? t.processing : t.confirmReturn}
          </Button>
        </div>
      </div>
    </div>
  );
};