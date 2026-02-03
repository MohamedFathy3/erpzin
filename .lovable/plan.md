
# خطة تفعيل الإعدادات الإقليمية على جميع الموديولات

## الوضع الحالي

لدينا بالفعل نظام إعدادات إقليمية (`RegionalSettingsContext`) جاهز لكنه غير مُفعّل في معظم أجزاء التطبيق. حالياً:
- العديد من الصفحات تستخدم تنسيق عملة محلي ثابت
- رموز العملات مكتوبة يدوياً (YER, ﷼, ر.ي)
- بعض الصفحات تعرّف دالة `formatCurrency` خاصة بها

## الملفات المتأثرة

| الموديول | الملف | المشكلة |
|---------|-------|---------|
| لوحة التحكم | `src/pages/Dashboard.tsx` | دالة formatCurrency محلية |
| نقطة البيع | `src/components/pos/POSCart.tsx` | رمز YER ثابت |
| نقطة البيع | `src/components/pos/POSVariantSelector.tsx` | رمز YER ثابت |
| نقطة البيع | `src/components/pos/POSReturns.tsx` | رمز ر.ي ثابت |
| نقطة البيع | `src/pages/POS.tsx` | رموز ثابتة في التنبيهات |
| المخزون | `src/components/inventory/ProductList.tsx` | رمز YER ثابت |
| المخزون | `src/components/inventory/ProductVariantsModal.tsx` | رمز YER ثابت |
| المخزون | `src/components/inventory/BarcodePrintingCenter.tsx` | رمز YER ثابت |
| المخزون | `src/components/inventory/VariantMatrix.tsx` | toLocaleString يدوي |
| المالية | `src/components/finance/RevenueManager.tsx` | رمز ر.ي ثابت |
| المالية | `src/components/finance/ExpenseManager.tsx` | رمز ر.ي ثابت |
| المالية | `src/components/finance/TreasuryBankManager.tsx` | قائمة عملات ثابتة |
| التقارير | `src/pages/Reports.tsx` | عملة SAR ثابتة |
| المبيعات | `src/components/sales/SalesInvoiceForm.tsx` | toLocaleString يدوي |
| المبيعات | `src/components/sales/InvoiceDetails.tsx` | toLocaleString يدوي |
| المشتريات | `src/components/purchasing/PurchaseOrderForm.tsx` | رمز YER ثابت |

## الحل المقترح

### الخطوة 1: تعديل لوحة التحكم (Dashboard)
استبدال الدالة المحلية بـ `useRegionalSettings`:

```typescript
// قبل
const formatCurrency = (value: number) => {
  return value.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-US');
};

// بعد
const { formatCurrency, getCurrencySymbol } = useRegionalSettings();
```

### الخطوة 2: تعديل نقطة البيع (POS)

**POSCart.tsx:**
```typescript
// قبل
const currencySymbol = defaultCurrency?.symbol ?? 'YER';

// بعد
const { getCurrencySymbol } = useRegionalSettings();
const currencySymbol = getCurrencySymbol();
```

**POSVariantSelector.tsx, POSReturns.tsx, POS.tsx:**
- استيراد `useRegionalSettings`
- استخدام `formatCurrency` أو `getCurrencySymbol()` بدلاً من القيم الثابتة

### الخطوة 3: تعديل المخزون (Inventory)

**ProductList.tsx:**
```typescript
// قبل
{product.price.toLocaleString()} <span>YER</span>

// بعد
const { formatCurrency } = useRegionalSettings();
...
{formatCurrency(product.price)}
```

**BarcodePrintingCenter.tsx:**
```typescript
// استخدام getCurrencySymbol() في تصميم الباركود
${design.showPrice ? `${product.price.toLocaleString()} ${currencySymbol}` : ''}
```

### الخطوة 4: تعديل المالية (Finance)

**RevenueManager.tsx & ExpenseManager.tsx:**
```typescript
// قبل
{totalAmount.toLocaleString()} <span>ر.ي</span>

// بعد
const { formatCurrency } = useRegionalSettings();
...
{formatCurrency(totalAmount)}
```

**TreasuryBankManager.tsx:**
- جلب قائمة العملات من `useCurrencyTax` بدلاً من القيم الثابتة
- عرض العملات النشطة من قاعدة البيانات

### الخطوة 5: تعديل التقارير (Reports)

**Reports.tsx:**
```typescript
// قبل
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency: 'SAR', // ثابت!
    ...
  }).format(value);
};

// بعد
const { formatCurrency } = useRegionalSettings();
```

### الخطوة 6: تعديل المبيعات والمشتريات

**SalesInvoiceForm.tsx, InvoiceDetails.tsx, PurchaseOrderForm.tsx:**
```typescript
// استخدام formatCurrency بدلاً من toLocaleString
const { formatCurrency } = useRegionalSettings();
```

## ملخص التغييرات

| الإجراء | عدد الملفات |
|---------|-------------|
| إضافة import لـ useRegionalSettings | 15 ملف |
| استبدال formatCurrency المحلية | 3 ملفات |
| استبدال رموز العملات الثابتة | 10 ملفات |
| استبدال toLocaleString | 8 ملفات |
| تحديث قوائم العملات الديناميكية | 1 ملف |

---

## التفاصيل التقنية

### الملفات الرئيسية للتعديل:
1. `src/pages/Dashboard.tsx`
2. `src/components/pos/POSCart.tsx`
3. `src/components/pos/POSVariantSelector.tsx`
4. `src/components/pos/POSReturns.tsx`
5. `src/pages/POS.tsx`
6. `src/components/inventory/ProductList.tsx`
7. `src/components/inventory/ProductVariantsModal.tsx`
8. `src/components/inventory/BarcodePrintingCenter.tsx`
9. `src/components/inventory/VariantMatrix.tsx`
10. `src/components/finance/RevenueManager.tsx`
11. `src/components/finance/ExpenseManager.tsx`
12. `src/components/finance/TreasuryBankManager.tsx`
13. `src/pages/Reports.tsx`
14. `src/components/sales/SalesInvoiceForm.tsx`
15. `src/components/sales/InvoiceDetails.tsx`
16. `src/components/purchasing/PurchaseOrderForm.tsx`

### التأثير:
- عند تغيير الدولة والعملة في الإعدادات الإقليمية، سيتم تحديث جميع الشاشات تلقائياً
- رمز العملة سيظهر بالشكل الصحيح حسب الإعداد (﷼، $، €، د.إ، إلخ)
- تنسيق الأرقام سيتبع إعدادات اللغة والمنطقة
