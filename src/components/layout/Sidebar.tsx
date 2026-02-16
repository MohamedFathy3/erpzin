// components/layout/Sidebar.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { getAllowedPages } from '@/config/permissions';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';
import logoFull from '@/assets/logo-full.png';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, collapsed, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'sidebar-item w-full',
        active && 'sidebar-item-active',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
};

// دالة لجلب الأيقونة المناسبة
const getIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    LayoutDashboard: Icons.LayoutDashboard,
    ShoppingCart: Icons.ShoppingCart,
    Package: Icons.Package,
    Receipt: Icons.Receipt,
    Truck: Icons.Truck,
    Wallet: Icons.Wallet,
    Users: Icons.Users,
    Crown: Icons.Crown,
    FileBarChart: Icons.FileBarChart,
    Settings: Icons.Settings,
    LogOut: Icons.LogOut,
    Warehouse: Icons.Warehouse,
  };
  
  const Icon = icons[iconName] || Icons.LayoutDashboard;
  return <Icon size={20} />;
};

interface SidebarProps {
  activeItem?: string;
  onNavigate?: (item: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'dashboard', onNavigate }) => {
  // ✅ هنا بنستخدم hooks في بداية المكون
  const { t, direction, language } = useLanguage(); // ✅ language موجودة هنا
  const { collapsed, toggle } = useSidebarContext();
  const { user } = useAuth();

  // جلب الصفحات المسموحة للمستخدم
  const allowedPages = getAllowedPages(user?.role as any);

  // ✅ تصفية وبناء عناصر القائمة
  const navItems = React.useMemo(() => {
    return allowedPages
      .filter(page => page.id !== 'settings')
      .map(page => ({
        id: page.id,
        icon: getIcon(page.icon),
        label: language === 'ar' ? page.labelAr : page.label, // ✅ هنا بنستخدم language
      }));
  }, [allowedPages, language]);

  // ✅ عناصر القائمة السفلية
  const bottomItems = React.useMemo(() => {
    const items = [];
    
    const settingsPage = allowedPages.find(page => page.id === 'settings');
    if (settingsPage) {
      items.push({
        id: 'settings',
        icon: getIcon(settingsPage.icon),
        label: language === 'ar' ? settingsPage.labelAr : settingsPage.label,
      });
    }

    items.push({
      id: 'logout',
      icon: <Icons.LogOut size={20} />,
      label: t('nav.logout'),
    });

    return items;
  }, [allowedPages, language, t]);

  const CollapseIcon = direction === 'rtl' 
    ? (collapsed ? Icons.ChevronLeft : Icons.ChevronRight)
    : (collapsed ? Icons.ChevronRight : Icons.ChevronLeft);

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar flex flex-col transition-all duration-300 relative flex-shrink-0',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
      style={{ background: 'linear-gradient(180deg, hsl(217 47% 14%) 0%, hsl(217 47% 10%) 100%)' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center bg-white m-2 rounded-lg border-2 border-sidebar overflow-hidden transition-all duration-300',
        collapsed ? 'justify-center p-3' : 'justify-center p-4'
      )}>
        <div className="relative w-full h-12 flex items-center justify-center">
          <img 
            src={logoIcon} 
            alt="INJAZ" 
            className={cn(
              'absolute object-contain transition-all duration-300 ease-in-out',
              collapsed 
                ? 'w-10 h-10 opacity-100 scale-100 rotate-0' 
                : 'w-0 h-0 opacity-0 scale-50 rotate-180'
            )}
          />
          <img 
            src={logoFull} 
            alt="INJAZ ERP" 
            className={cn(
              'object-contain transition-all duration-300 ease-in-out',
              collapsed 
                ? 'w-0 h-0 opacity-0 scale-75' 
                : 'h-12 opacity-100 scale-100'
            )}
          />
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={toggle}
        className={cn(
          'absolute top-20 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center',
          'text-primary-foreground shadow-md hover:bg-primary/90 transition-colors',
          direction === 'rtl' ? '-left-3' : '-right-3'
        )}
      >
        <CollapseIcon size={14} />
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeItem === item.id}
            collapsed={collapsed}
            onClick={() => onNavigate?.(item.id)}
          />
        ))}
      </nav>

      {/* Bottom Items */}
      {bottomItems.length > 0 && (
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {bottomItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeItem === item.id}
              collapsed={collapsed}
              onClick={() => {
                if (item.id === 'logout') {
                  // تسجيل الخروج
                  console.log('Logout clicked');
                } else {
                  onNavigate?.(item.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;