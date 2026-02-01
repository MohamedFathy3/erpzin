
# خطة إصلاح مشكلة تفعيل الأدوار

## المشكلة المكتشفة

بعد فحص قاعدة البيانات والكود، وجدت المشكلة التالية:

### السبب الرئيسي
1. **سياسة الأمان (RLS)** على جدول `user_roles` تسمح فقط للمستخدمين الذين لديهم دور `admin` بتعديل الأدوار
2. **لا يوجد مسؤول**: جميع المستخدمين في النظام حالياً لديهم دور `viewer` فقط
3. **فشل صامت**: عند محاولة التحديث، لا يظهر خطأ لكن التعديل لا يتم

### البيانات الحالية
جميع المستخدمين السبعة في النظام لديهم دور `viewer`:
- sameh, samehsaber484@gmail.com, ahmed, injaz.taiz@gmail.com, mohamed, zts.egy@gmail.com

## الحل المقترح

### الخطوة 1: ترقية مستخدم إلى مسؤول (Admin)
يجب تشغيل الأمر التالي في قاعدة البيانات لترقية مستخدم واحد على الأقل إلى admin:

```sql
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'samehsaber484@gmail.com' LIMIT 1);
```

### الخطوة 2: تحسين الكود لمعالجة الفشل الصامت
تعديل ملف `src/components/settings/UsersPermissions.tsx`:

- إضافة التحقق من عدد الصفوف المتأثرة بعد التحديث
- عرض رسالة خطأ واضحة إذا لم يتم التحديث بسبب عدم وجود صلاحيات
- إضافة تنبيه للمستخدم عند محاولة تغيير الدور بدون صلاحيات كافية

### التغييرات في الكود

**الملف:** `src/components/settings/UsersPermissions.tsx`

**التعديل:** تحسين `updateRoleMutation` للتحقق من نجاح العملية:

```typescript
const updateRoleMutation = useMutation({
  mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { data, error, count } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(language === 'ar' 
          ? 'ليس لديك صلاحية لتغيير الأدوار. يجب أن تكون مسؤولاً.' 
          : 'You do not have permission to change roles. Admin access required.');
      }
    } else {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(language === 'ar' 
          ? 'ليس لديك صلاحية لتغيير الأدوار. يجب أن تكون مسؤولاً.' 
          : 'You do not have permission to change roles. Admin access required.');
      }
    }
  },
  // ... باقي الكود
});
```

---

## ملخص الحل

| الخطوة | الإجراء |
|--------|---------|
| 1 | ترقية مستخدم إلى admin من قاعدة البيانات |
| 2 | تحسين معالجة الأخطاء في الكود |
| 3 | عرض رسالة واضحة عند عدم وجود صلاحيات |

## ملاحظة هامة

بعد تنفيذ الخطوة الأولى (ترقية مستخدم إلى admin)، سيتمكن هذا المستخدم من إدارة أدوار باقي المستخدمين من واجهة النظام.
