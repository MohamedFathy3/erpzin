// lib/offlineDB.ts
import Dexie, { Table } from 'dexie';

// ==================== Types ====================

export interface OfflineProduct {
  id: string;
  name: string;
  name_ar?: string | null;
  price: number;
  sku: string;
  barcode?: string | null;
  stock: number;
  category_id?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  image?: any;
  hasVariants: boolean;
  units?: any[];
  lastUpdated: number;
  synced: boolean;
}

export interface OfflineCustomer {
  id: string;
  name: string;
  name_ar?: string | null;
  phone?: string | null;
  address?: string | null;
  loyalty_points?: number | null;
  lastUpdated: number;
  synced: boolean;
}

export interface OfflineOrder {
  id: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  customer_id?: string | null;
  delivery_id?: string | null;
  payment_method?: string;
  payments?: any[];
  created_at: number;
  synced: boolean;
}

export interface OfflineCategory {
  id: string;
  name: string;
  name_ar?: string | null;
  icon?: string | null;
  lastUpdated: number;
}

export interface OfflineSettings {
  key: string;
  value: any;
}

// ==================== Database Class ====================

class OfflineDatabase extends Dexie {
  products!: Table<OfflineProduct, string>;
  customers!: Table<OfflineCustomer, string>;
  orders!: Table<OfflineOrder, string>;
  categories!: Table<OfflineCategory, string>;
  settings!: Table<OfflineSettings, string>;

  constructor() {
    super('POSOfflineDB');
    
    this.version(1).stores({
      products: 'id, barcode, sku, category_id, lastUpdated',
      customers: 'id, phone, name, lastUpdated',
      orders: 'id, created_at',
      categories: 'id, lastUpdated',
      settings: 'key'
    });
  }
}

export const offlineDB = new OfflineDatabase();

// ==================== Helper Functions ====================

export const getNetworkStatus = (): boolean => {
  return navigator.onLine;
};

// ==================== Products Functions ====================

/**
 * حفظ المنتجات في قاعدة البيانات المحلية
 */
export const saveProductsOffline = async (products: any[]) => {
  try {
    const offlineProducts = products.map(p => ({
      id: p.id?.toString() || p.id,
      name: p.name || '',
      name_ar: p.name_ar || null,
      price: p.price || 0,
      sku: p.sku || '',
      barcode: p.barcode || null,
      stock: p.stock || 0,
      category_id: p.category_id || null,
      image_url: p.image_url || null,
      imageUrl: p.imageUrl || null,
      image: p.image || null,
      hasVariants: p.hasVariants || false,
      units: p.units || [],
      lastUpdated: Date.now(),
      synced: true
    }));
    
    await offlineDB.products.bulkPut(offlineProducts);
    console.log(`✅ Saved ${products.length} products offline`);
    return true;
  } catch (error) {
    console.error('❌ Error saving products offline:', error);
    return false;
  }
};

/**
 * جلب المنتجات من قاعدة البيانات المحلية
 */
export const getProductsOffline = async (categoryId?: string) => {
  try {
    let query = offlineDB.products.toCollection();
    
    if (categoryId && categoryId !== 'all') {
      query = offlineDB.products.where('category_id').equals(categoryId);
    }
    
    const products = await query.toArray();
    return products.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('❌ Error getting products offline:', error);
    return [];
  }
};

/**
 * البحث عن المنتجات في قاعدة البيانات المحلية
 */
export const searchProductsOffline = async (query: string) => {
  try {
    const lowerQuery = query.toLowerCase();
    const products = await offlineDB.products.toArray();
    
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.name_ar && p.name_ar.toLowerCase().includes(lowerQuery)) ||
      (p.barcode && p.barcode.includes(query)) ||
      p.sku.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('❌ Error searching products offline:', error);
    return [];
  }
};

/**
 * جلب منتج بواسطة الباركود من قاعدة البيانات المحلية
 */
export const getProductByBarcodeOffline = async (barcode: string) => {
  try {
    return await offlineDB.products.where('barcode').equals(barcode).first();
  } catch (error) {
    console.error('❌ Error getting product by barcode offline:', error);
    return null;
  }
};

/**
 * جلب منتج بواسطة ID من قاعدة البيانات المحلية
 */
export const getProductByIdOffline = async (id: string) => {
  try {
    return await offlineDB.products.where('id').equals(id).first();
  } catch (error) {
    console.error('❌ Error getting product by ID offline:', error);
    return null;
  }
};

/**
 * حذف جميع المنتجات من قاعدة البيانات المحلية
 */
export const clearProductsOffline = async () => {
  try {
    await offlineDB.products.clear();
    console.log('✅ Cleared all products offline');
    return true;
  } catch (error) {
    console.error('❌ Error clearing products offline:', error);
    return false;
  }
};

// ==================== Categories Functions ====================

/**
 * حفظ الفئات في قاعدة البيانات المحلية
 */
export const saveCategoriesOffline = async (categories: any[]) => {
  try {
    const offlineCategories = categories.map(c => ({
      id: c.id?.toString() || c.id,
      name: c.name || '',
      name_ar: c.name_ar || null,
      icon: c.icon || null,
      lastUpdated: Date.now()
    }));
    
    await offlineDB.categories.bulkPut(offlineCategories);
    console.log(`✅ Saved ${categories.length} categories offline`);
    return true;
  } catch (error) {
    console.error('❌ Error saving categories offline:', error);
    return false;
  }
};

/**
 * جلب الفئات من قاعدة البيانات المحلية
 */
export const getCategoriesOffline = async () => {
  try {
    const categories = await offlineDB.categories.toArray();
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('❌ Error getting categories offline:', error);
    return [];
  }
};

/**
 * حذف جميع الفئات من قاعدة البيانات المحلية
 */
export const clearCategoriesOffline = async () => {
  try {
    await offlineDB.categories.clear();
    console.log('✅ Cleared all categories offline');
    return true;
  } catch (error) {
    console.error('❌ Error clearing categories offline:', error);
    return false;
  }
};

// ==================== Customers Functions ====================

/**
 * حفظ العملاء في قاعدة البيانات المحلية
 */
export const saveCustomersOffline = async (customers: any[]) => {
  try {
    const offlineCustomers = customers.map(c => ({
      id: c.id?.toString() || c.id,
      name: c.name || '',
      name_ar: c.name_ar || null,
      phone: c.phone || null,
      address: c.address || null,
      loyalty_points: c.loyalty_points || 0,
      lastUpdated: Date.now(),
      synced: true
    }));
    
    await offlineDB.customers.bulkPut(offlineCustomers);
    console.log(`✅ Saved ${customers.length} customers offline`);
    return true;
  } catch (error) {
    console.error('❌ Error saving customers offline:', error);
    return false;
  }
};

/**
 * جلب العملاء من قاعدة البيانات المحلية
 */
export const getCustomersOffline = async () => {
  try {
    const customers = await offlineDB.customers.toArray();
    return customers.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('❌ Error getting customers offline:', error);
    return [];
  }
};

/**
 * البحث عن العملاء في قاعدة البيانات المحلية
 */
export const searchCustomersOffline = async (query: string) => {
  try {
    const lowerQuery = query.toLowerCase();
    const customers = await offlineDB.customers.toArray();
    
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      (c.name_ar && c.name_ar.toLowerCase().includes(lowerQuery)) ||
      (c.phone && c.phone.includes(query))
    );
  } catch (error) {
    console.error('❌ Error searching customers offline:', error);
    return [];
  }
};

/**
 * إضافة عميل جديد إلى قاعدة البيانات المحلية
 */
export const addCustomerOffline = async (customer: any) => {
  try {
    const id = `OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await offlineDB.customers.add({
      id,
      name: customer.name || '',
      name_ar: customer.name_ar || null,
      phone: customer.phone || null,
      address: customer.address || null,
      loyalty_points: customer.loyalty_points || 0,
      lastUpdated: Date.now(),
      synced: false
    });
    
    console.log(`✅ Added customer offline with ID: ${id}`);
    return id;
  } catch (error) {
    console.error('❌ Error adding customer offline:', error);
    return null;
  }
};

/**
 * تحديث عميل في قاعدة البيانات المحلية
 */
export const updateCustomerOffline = async (id: string, customer: Partial<OfflineCustomer>) => {
  try {
    await offlineDB.customers.update(id, {
      ...customer,
      lastUpdated: Date.now(),
      synced: false
    });
    console.log(`✅ Updated customer offline: ${id}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating customer offline:', error);
    return false;
  }
};

/**
 * حذف جميع العملاء من قاعدة البيانات المحلية
 */
export const clearCustomersOffline = async () => {
  try {
    await offlineDB.customers.clear();
    console.log('✅ Cleared all customers offline');
    return true;
  } catch (error) {
    console.error('❌ Error clearing customers offline:', error);
    return false;
  }
};

// ==================== Orders Functions ====================

/**
 * حفظ طلب في قاعدة البيانات المحلية (بدون اتصال)
 */
export const saveOrderOffline = async (order: Omit<OfflineOrder, 'id' | 'created_at' | 'synced'>) => {
  try {
    const id = `OFFLINE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const orderToSave = {
      id,
      ...order,
      created_at: Date.now(),
      synced: false
    };
    
    await offlineDB.orders.add(orderToSave);
    console.log(`✅ Saved order offline with ID: ${id}`);
    return id;
  } catch (error) {
    console.error('❌ Error saving order offline:', error);
    return null;
  }
};

/**
 * جلب الطلبات غير المتزامنة (التي لم ترسل للسيرفر بعد)
 */
export const getUnsyncedOrders = async () => {
  try {
    const allOrders = await offlineDB.orders.toArray();
    const unsynced = allOrders.filter(order => order.synced === false);
    console.log(`📦 Found ${unsynced.length} unsynced orders`);
    return unsynced;
  } catch (error) {
    console.error('❌ Error getting unsynced orders:', error);
    return [];
  }
};

/**
 * تحديث حالة الطلب إلى "متزامن"
 */
export const markOrderSynced = async (id: string) => {
  try {
    const order = await offlineDB.orders.where('id').equals(id).first();
    if (order) {
      await offlineDB.orders.update(id, { synced: true });
      console.log(`✅ Marked order as synced: ${id}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error marking order as synced:', error);
    return false;
  }
};

/**
 * جلب جميع الطلبات من قاعدة البيانات المحلية
 */
export const getAllOrdersOffline = async () => {
  try {
    return await offlineDB.orders.toArray();
  } catch (error) {
    console.error('❌ Error getting all orders offline:', error);
    return [];
  }
};

/**
 * حذف جميع الطلبات من قاعدة البيانات المحلية
 */
export const clearOrdersOffline = async () => {
  try {
    await offlineDB.orders.clear();
    console.log('✅ Cleared all orders offline');
    return true;
  } catch (error) {
    console.error('❌ Error clearing orders offline:', error);
    return false;
  }
};

// ==================== Settings Functions ====================

/**
 * حفظ إعداد في قاعدة البيانات المحلية
 */
export const saveSettingOffline = async (key: string, value: any) => {
  try {
    await offlineDB.settings.put({ key, value });
    console.log(`✅ Saved setting offline: ${key}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving setting offline:', error);
    return false;
  }
};

/**
 * جلب إعداد من قاعدة البيانات المحلية
 */
export const getSettingOffline = async (key: string) => {
  try {
    const setting = await offlineDB.settings.where('key').equals(key).first();
    return setting?.value;
  } catch (error) {
    console.error('❌ Error getting setting offline:', error);
    return null;
  }
};

// ==================== Sync Functions ====================

/**
 * مزامنة جميع البيانات غير المتزامنة
 */
export const syncAllOfflineData = async () => {
  try {
    const unsyncedOrders = await getUnsyncedOrders();
    
    return {
      orders: unsyncedOrders.length,
      customers: 0,
      products: 0,
    };
  } catch (error) {
    console.error('❌ Error syncing offline data:', error);
    return {
      orders: 0,
      customers: 0,
      products: 0,
    };
  }
};

/**
 * مسح جميع البيانات من قاعدة البيانات المحلية
 */
export const clearAllOfflineData = async () => {
  try {
    await offlineDB.products.clear();
    await offlineDB.customers.clear();
    await offlineDB.orders.clear();
    await offlineDB.categories.clear();
    await offlineDB.settings.clear();
    console.log('✅ Cleared all offline data');
    return true;
  } catch (error) {
    console.error('❌ Error clearing all offline data:', error);
    return false;
  }
};

/**
 * الحصول على إحصائيات قاعدة البيانات المحلية
 */
export const getOfflineStats = async () => {
  try {
    const productsCount = await offlineDB.products.count();
    const customersCount = await offlineDB.customers.count();
    const ordersCount = await offlineDB.orders.count();
    const categoriesCount = await offlineDB.categories.count();
    const unsyncedOrders = await getUnsyncedOrders();
    
    return {
      products: productsCount,
      customers: customersCount,
      orders: ordersCount,
      categories: categoriesCount,
      unsyncedOrders: unsyncedOrders.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error getting offline stats:', error);
    return null;
  }
};