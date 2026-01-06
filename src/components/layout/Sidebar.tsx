import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  Users,
  UserCircle,
  FileBarChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';
import injazLogo from '@/assets/injaz-logo.png';

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

interface SidebarProps {
  activeItem?: string;
  onNavigate?: (item: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'dashboard', onNavigate }) => {
  const { t, direction } = useLanguage();
  const { collapsed, toggle } = useSidebarContext();

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: t('nav.dashboard') },
    { id: 'inventory', icon: <Package size={20} />, label: t('nav.inventory') },
    { id: 'pos', icon: <ShoppingCart size={20} />, label: t('nav.pos') },
    { id: 'purchasing', icon: <Truck size={20} />, label: t('nav.purchasing') },
    { id: 'finance', icon: <Wallet size={20} />, label: t('nav.finance') },
    { id: 'hr', icon: <Users size={20} />, label: t('nav.hr') },
    { id: 'crm', icon: <UserCircle size={20} />, label: t('nav.crm') },
    { id: 'reports', icon: <FileBarChart size={20} />, label: t('nav.reports') },
  ];

  const bottomItems = [
    { id: 'settings', icon: <Settings size={20} />, label: t('nav.settings') },
    { id: 'logout', icon: <LogOut size={20} />, label: t('nav.logout') },
  ];

  const CollapseIcon = direction === 'rtl' 
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

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
        'flex items-center gap-3 p-4 border-b border-sidebar-border',
        collapsed && 'justify-center'
      )}>
        {collapsed ? (
          <img 
            src={logoIcon} 
            alt="INJAZ" 
            className="w-10 h-10 object-contain"
          />
        ) : (
          <>
            <img 
              src={injazLogo} 
              alt="INJAZ ERP" 
              className="w-12 h-12"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">INJAZ</span>
              <span className="text-xs text-sidebar-muted">ERP System</span>
            </div>
          </>
        )}
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
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {bottomItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeItem === item.id}
            collapsed={collapsed}
            onClick={() => onNavigate?.(item.id)}
          />
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
