import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  activeItem?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, activeItem }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, enabledModules, modulesLoading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const getActiveFromPath = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path === '/manufacturing/setup') return 'manufacturingSetup';
    return path.slice(1);
  };

  const currentActive = activeItem || getActiveFromPath();

  useEffect(() => {
    setMobileNavOpen(false);
    // Route protection follows the same hierarchy as the Sidebar: a disabled
    // tenant module wins over tenant-admin role permissions.
    if (!user || user.super_admin || modulesLoading) return;
    const moduleByPath: Record<string, string> = {
      '/inventory': 'inventory',
      '/sales': 'sales',
      '/purchasing': 'purchasing',
      '/finance': 'finance',
      '/hr': 'hr',
      '/crm': 'crm',
      '/whatsapp': 'whatsapp',
      '/google-integrations': 'google_calendar',
      '/calendar': 'google_calendar',
      '/tasks': 'tasks',
      '/reports': 'reports',
      '/employee-financial-reports': 'employee_financial_reports',
      '/warehouse-reports': 'warehouse_reports',
      '/inventory-transfer-requests': 'inventory_transfer_requests',
      '/industries': 'industries',
      '/manufacturing': 'manufacturing',
      '/manufacturing/setup': 'manufacturing',
      '/product-ledger': 'product_ledger',
      '/representative': 'representative',
      '/projects': 'projects',
      '/workflow': 'workflow',
      '/settings': 'settings',
      '/access-control': 'access_control',
      '/ai-assistant': 'ai_assistant',
      '/automotive': 'automotive_service',
    };
    const module = moduleByPath[location.pathname];
    if (module && !enabledModules.includes(module)) navigate('/dashboard');
  }, [enabledModules, location.pathname, modulesLoading, navigate, user]);

  const handleNavigate = async (item: string) => {
    if (item === 'logout') {
      await signOut();
      navigate('/auth');
      return;
    }
    
    const routes: Record<string, string> = {
      dashboard: '/dashboard',
      pos: '/pos',
      inventory: '/inventory',
      'inventory-transfer-requests': '/inventory-transfer-requests',
      sales: '/sales',
      purchasing: '/purchasing',
      finance: '/finance',
      hr: '/hr',
      crm: '/crm',
      whatsapp: '/whatsapp',
      'google-integrations': '/google-integrations',
      calendar: '/calendar',
      productLedger: '/product-ledger',
      tasks: '/tasks',
      reports: '/reports',
      'employee-financial-reports': '/employee-financial-reports',
      'warehouse-reports': '/warehouse-reports',
      aiAssistant: '/ai-assistant',
      industries: '/industries',
      manufacturing: '/manufacturing',
      manufacturingSetup: '/manufacturing/setup',
      projects: '/projects',
      workflow: '/workflow',
      automotive: '/automotive',
      settings: '/settings',
      'access-control': '/access-control',
      'super-admin': '/super-admin',
      posreturn: '/POSRetrun',
    };
    navigate(routes[item] || '/dashboard');
  };

  return (
    <SidebarProvider>
      <div className="app-shell flex h-screen w-full overflow-hidden bg-[#f7f9fc]">
        {mobileNavOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] md:hidden" onClick={() => setMobileNavOpen(false)} />}
        <Sidebar activeItem={currentActive} onNavigate={handleNavigate} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuToggle={() => setMobileNavOpen((open) => !open)} />
          <main className={cn(
            'flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-10',
            'app-main bg-[#f7f9fc]'
          )}>
            <div className="mx-auto w-full max-w-[1760px]">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
