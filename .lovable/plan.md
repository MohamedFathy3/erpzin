
# خطة إصلاح مشكلة حفظ الفاتورة في نقطة البيع

## المشكلة المكتشفة

عند إتمام الدفع في نقطة البيع، يظهر خطأ في قاعدة البيانات:
```
Could not find the 'discount_amount' column of 'sale_items' in the schema cache
```

**السبب:** الكود يحاول إدراج بيانات في أعمدة غير موجودة في جدول `sale_items`:
1. `discount_amount` - غير موجود (الموجود هو `discount`)
2. `product_variant_id` - غير موجود في الجدول

## الحل المقترح

### الخطوة 1: تصحيح ملف POSPaymentModal.tsx

**تعديل الأسطر 238-246** لإزالة الأعمدة غير الموجودة:

**قبل:**
```typescript
const saleItems = cartItems.map(item => ({
  sale_id: sale.id,
  product_id: item.id,
  product_variant_id: item.variantId || null,
  quantity: item.quantity,
  unit_price: item.price,
  total_price: item.price * item.quantity,
  discount_amount: 0
}));
```

**بعد:**
```typescript
const saleItems = cartItems.map(item => ({
  sale_id: sale.id,
  product_id: item.id,
  quantity: item.quantity,
  unit_price: item.price,
  total_price: item.price * item.quantity,
  discount: 0
}));
```

### الخطوة 2: إضافة إشعار للمستخدم

إضافة رسالة نجاح (toast notification) عند إتمام الحفظ بنجاح وإغلاق النافذة تلقائياً.

### الخطوة 3: تحسين معالجة الأخطاء

إضافة رسالة خطأ واضحة للمستخدم في حالة فشل الحفظ بدلاً من الفشل الصامت.

---

## التفاصيل التقنية

### ملف يتم تعديله:
- `src/components/pos/POSPaymentModal.tsx`

### التغييرات المطلوبة:
1. تغيير `discount_amount: 0` إلى `discount: 0`
2. إزالة `product_variant_id` من كائن الإدراج
3. إضافة `toast.success()` عند نجاح الحفظ
4. إضافة `toast.error()` عند فشل الحفظ

### سبب المشكلة:
جدول `sale_items` في قاعدة البيانات يحتوي على الأعمدة التالية:
- `id`, `created_at`, `sale_id`, `product_id`, `quantity`, `unit_price`, `total_price`, `discount`

بينما الكود كان يحاول استخدام:
- `discount_amount` (الصحيح: `discount`)
- `product_variant_id` (غير موجود)
