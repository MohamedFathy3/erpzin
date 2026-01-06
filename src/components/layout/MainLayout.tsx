import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  activeItem?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, activeItem }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveFromPath = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    return path.slice(1);
  };

  const currentActive = activeItem || getActiveFromPath();

  const handleNavigate = (item: string) => {
    const routes: Record<string, string> = {
      dashboard: '/',
      inventory: '/inventory',
      pos: '/pos',
      purchasing: '/purchasing',
      finance: '/finance',
      hr: '/hr',
      crm: '/crm',
      reports: '/reports',
      settings: '/settings'
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
