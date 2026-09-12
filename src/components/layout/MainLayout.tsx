import React, { useEffect } from 'react';
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

  const getActiveFromPath = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path === '/manufacturing/setup') return 'manufacturingSetup';
    return path.slice(1);
  };

  const currentActive = activeItem || getActiveFromPath();

  useEffect(() => {
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
      '/manufacturing': 'manufacturing',
      '/manufacturing/setup': 'manufacturing',
      '/projects': 'projects',
      '/workflow': 'workflow',
    };
    const module = moduleByPath[location.pathname];
    if (module && !enabledModules.includes(module)) navigate('/');
  }, [enabledModules, location.pathname, modulesLoading, navigate, user]);

  const handleNavigate = async (item: string) => {
    if (item === 'logout') {
      await signOut();
      navigate('/auth');
      return;
    }
    
    const routes: Record<string, string> = {
      dashboard: '/',
      pos: '/pos',
      inventory: '/inventory',
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
      aiAssistant: '/ai-assistant',
      industries: '/industries',
      manufacturing: '/manufacturing',
      manufacturingSetup: '/manufacturing/setup',
      projects: '/projects',
      workflow: '/workflow',
      settings: '/settings',
      'super-admin': '/super-admin',
      posreturn: '/POSRetrun',
    };
    navigate(routes[item] || '/');
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar activeItem={currentActive} onNavigate={handleNavigate} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className={cn(
            'flex-1 overflow-y-auto p-6',
            'bg-background'
          )}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
