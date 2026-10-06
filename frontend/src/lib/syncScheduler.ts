// lib/syncScheduler.ts
import {
  clearProductsOffline,
  clearCategoriesOffline,
  saveProductsOffline,
  saveCategoriesOffline,
  getNetworkStatus,
} from './offlineDB';

// دالة لمسح المنتجات والتصنيفات فقط (مع الاحتفاظ بالطلبات والعملاء)
export const refreshProductsAndCategories = async (fetchLatestData: () => Promise<{ products: any[], categories: any[] }>) => {
  if (!getNetworkStatus()) {
    console.log('⚠️ No internet connection. Skipping refresh.');
    return false;
  }

  try {
    console.log('🔄 Starting scheduled refresh of products and categories...');
    
    // 1. جلب أحدث البيانات من السيرفر (هذه الدالة يجب أن تمررها من التطبيق الرئيسي)
    const { products, categories } = await fetchLatestData();
    
    // 2. مسح القديم
    await Promise.all([
      clearProductsOffline(),
      clearCategoriesOffline()
    ]);
    
    // 3. حفظ الجديد
    await Promise.all([
      saveProductsOffline(products),
      saveCategoriesOffline(categories)
    ]);
    
    console.log('✅ Scheduled refresh completed successfully.');
    return true;
  } catch (error) {
    console.error('❌ Error in scheduled refresh:', error);
    return false;
  }
};

// دالة لبدء المجدول (تعمل كل 10 دقائق)
export const startSyncScheduler = (
  fetchLatestData: () => Promise<{ products: any[], categories: any[] }>,
  intervalMinutes: number = 10
) => {
  console.log(`⏰ Starting sync scheduler every ${intervalMinutes} minutes...`);
  
  // تحويل الدقائق إلى ملي ثانية
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // تشغيل التحديث فوراً عند بدء التشغيل
  refreshProductsAndCategories(fetchLatestData);
  
  // ثم تشغيله كل 10 دقائق
  const intervalId = setInterval(() => {
    refreshProductsAndCategories(fetchLatestData);
  }, intervalMs);
  
  // إرجاع الدالة التي توقف المجدول
  return () => clearInterval(intervalId);
};