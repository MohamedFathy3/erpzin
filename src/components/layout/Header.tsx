import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Bell,
  Languages,
  Building2,
  ChevronDown,
  Warehouse,
  Check,
} from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';

const Header: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { 
    currentBranch, 
    setCurrentBranch, 
    branches, 
    loadingBranches,
    currentWarehouse,
    setCurrentWarehouse,
    warehouses,
    permissions,
    userBranch,
    userWarehouse
  } = useApp();
  const { user } = useAuth();

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getRoleLabel = () => {
    const roleLabels: Record<string, string> = {
      admin: language === 'ar' ? 'مدير النظام' : 'Admin',
      moderator: language === 'ar' ? 'مشرف' : 'Moderator',
      cashier: language === 'ar' ? 'كاشير' : 'Cashier',
      viewer: language === 'ar' ? 'عارض' : 'Viewer',
    };
    return roleLabels[permissions.role || ''] || (language === 'ar' ? 'مستخدم' : 'User');
  };

  // Check if user has assigned branch/warehouse (restricted access)
  const hasRestrictedBranch = userBranch !== null;
  const hasRestrictedWarehouse = userWarehouse !== null;

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder={t('common.search')}
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Branch Display/Selector */}
        {hasRestrictedBranch ? (
          // User has assigned branch - show as badge (not selectable)
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
            <Building2 size={16} className="text-primary" />
            <span className="text-sm font-medium">
              {language === 'ar' && userBranch.name_ar ? userBranch.name_ar : userBranch.name}
            </span>
          </div>
        ) : (
          // Admin/All access - show dropdown
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 size={16} />
                {loadingBranches ? (
                  <Skeleton className="w-20 h-4" />
                ) : (
                  <span className="max-w-[120px] truncate">
                    {currentBranch ? (language === 'ar' && currentBranch.name_ar ? currentBranch.name_ar : currentBranch.name) : (language === 'ar' ? 'كل الفروع' : 'All Branches')}
                  </span>
                )}
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {language === 'ar' ? 'اختر الفرع' : 'Select Branch'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* All Branches Option */}
              <DropdownMenuItem 
                onClick={() => setCurrentBranch(null)}
                className="flex items-center justify-between"
              >
                <span className="font-medium">{language === 'ar' ? 'كل الفروع' : 'All Branches'}</span>
                {currentBranch === null && <Check size={16} className="text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {branches.map((branch) => (
                <DropdownMenuItem 
                  key={branch.id}
                  onClick={() => setCurrentBranch(branch)}
                  className="flex items-center justify-between"
                >
                  <span>{language === 'ar' && branch.name_ar ? branch.name_ar : branch.name}</span>
                  {currentBranch?.id === branch.id && <Check size={16} className="text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Warehouse Display/Selector */}
        {hasRestrictedWarehouse ? (
          // User has assigned warehouse - show as badge (not selectable)
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded-lg">
            <Warehouse size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">
              {language === 'ar' && userWarehouse.name_ar ? userWarehouse.name_ar : userWarehouse.name}
            </span>
          </div>
        ) : warehouses.length > 0 ? (
          // Admin/All access - show dropdown
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Warehouse size={16} />
                <span className="max-w-[100px] truncate">
                  {currentWarehouse ? (language === 'ar' && currentWarehouse.name_ar ? currentWarehouse.name_ar : currentWarehouse.name) : (language === 'ar' ? 'كل المخازن' : 'All Warehouses')}
                </span>
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                {language === 'ar' ? 'اختر المخزن' : 'Select Warehouse'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* All Warehouses Option */}
              <DropdownMenuItem 
                onClick={() => setCurrentWarehouse(null)}
                className="flex items-center justify-between"
              >
                <span className="font-medium">{language === 'ar' ? 'كل المخازن' : 'All Warehouses'}</span>
                {currentWarehouse === null && <Check size={16} className="text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {warehouses.map((warehouse) => (
                <DropdownMenuItem 
                  key={warehouse.id}
                  onClick={() => setCurrentWarehouse(warehouse)}
                  className="flex items-center justify-between"
                >
                  <span>{language === 'ar' && warehouse.name_ar ? warehouse.name_ar : warehouse.name}</span>
                  {currentWarehouse?.id === warehouse.id && <Check size={16} className="text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="relative"
        >
          <Languages size={20} />
          <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-primary text-primary-foreground rounded px-1">
            {language.toUpperCase()}
          </span>
        </Button>

        {/* Notifications */}
        <NotificationCenter />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{language === 'ar' ? 'حسابي' : 'My Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</DropdownMenuItem>
            <DropdownMenuItem>{language === 'ar' ? 'الإعدادات' : 'Settings'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
