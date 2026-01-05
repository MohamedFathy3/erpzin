import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  Users,
  FileBarChart,
  Settings,
  ArrowRight,
} from 'lucide-react';

interface QuickAccessItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const QuickAccessGrid: React.FC = () => {
  const { t, direction } = useLanguage();

  const quickItems: QuickAccessItem[] = [
    { 
      id: 'pos', 
      icon: <ShoppingCart size={24} />, 
      label: t('nav.pos'), 
      description: 'Start selling',
      color: 'text-success',
      bgColor: 'bg-success/10 hover:bg-success/20'
    },
    { 
      id: 'inventory', 
      icon: <Package size={24} />, 
      label: t('nav.inventory'), 
      description: 'Manage stock',
      color: 'text-primary',
      bgColor: 'bg-primary/10 hover:bg-primary/20'
    },
    { 
      id: 'purchasing', 
      icon: <Truck size={24} />, 
      label: t('nav.purchasing'), 
      description: 'Create PO',
      color: 'text-info',
      bgColor: 'bg-info/10 hover:bg-info/20'
    },
    { 
      id: 'finance', 
      icon: <Wallet size={24} />, 
      label: t('nav.finance'), 
      description: 'View ledger',
      color: 'text-warning',
      bgColor: 'bg-warning/10 hover:bg-warning/20'
    },
    { 
      id: 'hr', 
      icon: <Users size={24} />, 
      label: t('nav.hr'), 
      description: 'Employee management',
      color: 'text-accent',
      bgColor: 'bg-accent/10 hover:bg-accent/20'
    },
    { 
      id: 'reports', 
      icon: <FileBarChart size={24} />, 
      label: t('nav.reports'), 
      description: 'Generate reports',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted hover:bg-muted/80'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {quickItems.map((item) => (
        <button
          key={item.id}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 group',
            item.bgColor
          )}
        >
          <div className={cn('transition-transform group-hover:scale-110', item.color)}>
            {item.icon}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default QuickAccessGrid;
