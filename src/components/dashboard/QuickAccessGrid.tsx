import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  Users,
  FileBarChart,
  Crown,
  Receipt,
} from 'lucide-react';

interface QuickAccessItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  color: string;
  bgColor: string;
  route: string;
}

const QuickAccessGrid: React.FC = () => {
  const { t, direction, language } = useLanguage();
  const navigate = useNavigate();

  const quickItems: QuickAccessItem[] = [
    { 
      id: 'pos', 
      icon: <ShoppingCart size={24} />, 
      label: 'Point of Sale', 
      labelAr: 'نقطة البيع',
      description: 'Start selling',
      descriptionAr: 'ابدأ البيع',
      color: 'text-success',
      bgColor: 'bg-success/10 hover:bg-success/20',
      route: '/pos'
    },
    { 
      id: 'sales', 
      icon: <Receipt size={24} />, 
      label: 'Sales', 
      labelAr: 'المبيعات',
      description: 'Sales invoices',
      descriptionAr: 'فواتير المبيعات',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
      route: '/sales'
    },
    { 
      id: 'inventory', 
      icon: <Package size={24} />, 
      label: 'Inventory', 
      labelAr: 'المخزون',
      description: 'Manage stock',
      descriptionAr: 'إدارة المخزون',
      color: 'text-primary',
      bgColor: 'bg-primary/10 hover:bg-primary/20',
      route: '/inventory'
    },
    { 
      id: 'purchasing', 
      icon: <Truck size={24} />, 
      label: 'Purchasing', 
      labelAr: 'المشتريات',
      description: 'Create PO',
      descriptionAr: 'أوامر الشراء',
      color: 'text-info',
      bgColor: 'bg-info/10 hover:bg-info/20',
      route: '/purchasing'
    },
    { 
      id: 'finance', 
      icon: <Wallet size={24} />, 
      label: 'Finance', 
      labelAr: 'المالية',
      description: 'View ledger',
      descriptionAr: 'دفتر الحسابات',
      color: 'text-warning',
      bgColor: 'bg-warning/10 hover:bg-warning/20',
      route: '/finance'
    },
    { 
      id: 'crm', 
      icon: <Crown size={24} />, 
      label: 'Customers & Loyalty', 
      labelAr: 'العملاء والولاء',
      description: 'Manage customers',
      descriptionAr: 'إدارة العملاء',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
      route: '/crm'
    },
    { 
      id: 'hr', 
      icon: <Users size={24} />, 
      label: 'HR & Payroll', 
      labelAr: 'الموارد البشرية',
      description: 'Employee management',
      descriptionAr: 'إدارة الموظفين',
      color: 'text-accent',
      bgColor: 'bg-accent/10 hover:bg-accent/20',
      route: '/hr'
    },
    { 
      id: 'reports', 
      icon: <FileBarChart size={24} />, 
      label: 'Reports', 
      labelAr: 'التقارير',
      description: 'Generate reports',
      descriptionAr: 'إنشاء التقارير',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted hover:bg-muted/80',
      route: '/reports'
    },
  ];

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {quickItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavigate(item.route)}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 group cursor-pointer',
            item.bgColor
          )}
        >
          <div className={cn('transition-transform group-hover:scale-110', item.color)}>
            {item.icon}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {language === 'ar' ? item.labelAr : item.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? item.descriptionAr : item.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default QuickAccessGrid;
