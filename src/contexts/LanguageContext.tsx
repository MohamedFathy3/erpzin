import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.inventory': 'Inventory',
    'nav.pos': 'Point of Sale',
    'nav.purchasing': 'Purchasing',
    'nav.finance': 'Finance',
    'nav.hr': 'HR & Payroll',
    'nav.crm': 'CRM',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Dashboard
    'dashboard.title': 'Analytics Dashboard',
    'dashboard.welcome': 'Welcome back',
    'dashboard.todaySales': "Today's Sales",
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.totalOrders': 'Total Orders',
    'dashboard.avgOrderValue': 'Avg Order Value',
    'dashboard.salesTrend': 'Sales Trend & AI Prediction',
    'dashboard.branchRevenue': 'Branch Revenue',
    'dashboard.categoryPerformance': 'Category Performance',
    'dashboard.topProducts': 'Top Products',
    'dashboard.recentTransactions': 'Recent Transactions',
    'dashboard.lowStock': 'Low Stock Alerts',
    'dashboard.aiPrediction': 'AI Prediction',
    'dashboard.actualSales': 'Actual Sales',
    
    // Common
    'common.search': 'Search...',
    'common.all': 'All',
    'common.today': 'Today',
    'common.thisWeek': 'This Week',
    'common.thisMonth': 'This Month',
    'common.thisYear': 'This Year',
    'common.currency': 'YER',
    'common.branches': 'Branches',
    
    // Branches
    'branch.abra': 'Abra',
    'branch.primark': 'Primark',
    'branch.fashionKings': 'Fashion Kings',
    'branch.ahyan': 'Ahyan',
    
    // Categories
    'category.boys': 'Boys',
    'category.girls': 'Girls',
    'category.women': 'Women',
    'category.men': 'Men',
    'category.kids': 'Kids',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.inventory': 'المخزون',
    'nav.pos': 'نقطة البيع',
    'nav.purchasing': 'المشتريات',
    'nav.finance': 'المالية',
    'nav.hr': 'الموارد البشرية',
    'nav.crm': 'العملاء',
    'nav.reports': 'التقارير',
    'nav.settings': 'الإعدادات',
    'nav.logout': 'تسجيل الخروج',
    
    // Dashboard
    'dashboard.title': 'لوحة التحليلات',
    'dashboard.welcome': 'مرحباً بعودتك',
    'dashboard.todaySales': 'مبيعات اليوم',
    'dashboard.totalRevenue': 'إجمالي الإيرادات',
    'dashboard.totalOrders': 'إجمالي الطلبات',
    'dashboard.avgOrderValue': 'متوسط قيمة الطلب',
    'dashboard.salesTrend': 'اتجاه المبيعات والتنبؤ الذكي',
    'dashboard.branchRevenue': 'إيرادات الفروع',
    'dashboard.categoryPerformance': 'أداء الفئات',
    'dashboard.topProducts': 'أفضل المنتجات',
    'dashboard.recentTransactions': 'آخر المعاملات',
    'dashboard.lowStock': 'تنبيهات المخزون',
    'dashboard.aiPrediction': 'التنبؤ الذكي',
    'dashboard.actualSales': 'المبيعات الفعلية',
    
    // Common
    'common.search': 'بحث...',
    'common.all': 'الكل',
    'common.today': 'اليوم',
    'common.thisWeek': 'هذا الأسبوع',
    'common.thisMonth': 'هذا الشهر',
    'common.thisYear': 'هذا العام',
    'common.currency': 'ريال',
    'common.branches': 'الفروع',
    
    // Branches
    'branch.abra': 'أبرا',
    'branch.primark': 'بريمارك',
    'branch.fashionKings': 'فاشن كينجز',
    'branch.ahyan': 'أحيان',
    
    // Categories
    'category.boys': 'أولاد',
    'category.girls': 'بنات',
    'category.women': 'نساء',
    'category.men': 'رجال',
    'category.kids': 'أطفال',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('injaz-language');
    return (saved as Language) || 'ar';
  });
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    document.body.style.fontFamily = language === 'ar' ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('injaz-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
