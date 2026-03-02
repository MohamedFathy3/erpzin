import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Languages,
  Building2,
  ChevronDown,
  Warehouse,
  Check,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useQuery } from '@tanstack/react-query';
import  api  from '@/lib/api';

interface Branch {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  phone?: string;
  address?: string;
  manager?: string;
  active: boolean;
  main_branch?: boolean;
  image?: string;
}

interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  phone?: string;
  address?: string;
  manager?: string;
  active: boolean;
  main_branch?: boolean;
  note?: string;
  branch_id?: number | Branch; // ممكن يكون object أو رقم
  image?: string;
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { 
    currentBranch, 
    setCurrentBranch, 
    currentWarehouse,
    setCurrentWarehouse,
    permissions,
    userBranch,
    userWarehouse
  } = useApp();
  const { user, signOut } = useAuth();

  // جلب الفروع
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches-header'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
  });

  // ✅ جلب المخازن بناءً على الفرع المحدد
  const { data: warehouses = [], isLoading: loadingWarehouses, refetch: refetchWarehouses } = useQuery({
    queryKey: ['warehouses-header', currentBranch?.id], // ✅ يتغير مع تغير الفرع
    queryFn: async () => {
      try {
        // بناء الفلاتر
        const filters: any = { active: true };
        
        // ✅ إضافة فلتر الفرع إذا كان موجود
        if (currentBranch?.id) {
          filters.branch_id = currentBranch.id;
        } else if (userBranch?.id) {
          filters.branch_id = userBranch.id;
        }

        const response = await api.post('/warehouse/index', {
          filters: filters,
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
  });

  // ✅ تأثير: لما يتغير الفرع، نعيد تعيين المخزن المختار إذا لم يعد موجوداً
  useEffect(() => {
    if (warehouses.length > 0) {
      // لو المخزن الحالي مش موجود في القائمة الجديدة، نختار أول مخزن أو null
      const warehouseExists = warehouses.some(w => w.id === currentWarehouse?.id);
      if (!warehouseExists) {
        setCurrentWarehouse(null); // أو يمكن اختيار أول مخزن: setCurrentWarehouse(warehouses[0])
      }
    } else {
      setCurrentWarehouse(null);
    }
  }, [warehouses, currentWarehouse?.id, setCurrentWarehouse]);

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

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleProfileClick = () => {
    navigate('/settings?tab=profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  // ✅ دالة مساعدة لاختيار المخزن
  const handleSelectWarehouse = (warehouse: Warehouse | null) => {
    setCurrentWarehouse(warehouse);
  };

  // Helper function for localized names
  const getLocalizedName = (item: any, defaultText: string) => {
    if (!item) return defaultText;
    return language === 'ar' && item.name_ar ? item.name_ar : item.name;
  };

  // استخراج اسم الفرع من المخزن (لو كان object)
  const getWarehouseBranchName = (warehouse: Warehouse) => {
    if (!warehouse.branch_id) return '';
    
    // لو branch_id هو object
    if (typeof warehouse.branch_id === 'object' && warehouse.branch_id !== null) {
      return getLocalizedName(warehouse.branch_id, '');
    }
    
    // لو هو رقم، ندور على الفرع في قائمة الفروع
    const branch = branches.find(b => b.id === warehouse.branch_id);
    return branch ? getLocalizedName(branch, '') : '';
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

      {/* Right Section - Branches and Warehouses together */}
      <div className="flex items-center gap-2">
        {/* Branch Display/Selector */}
        {hasRestrictedBranch ? (
          // User has assigned branch - show as badge (not selectable)
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
            <Building2 size={16} className="text-primary" />
            <span className="text-sm font-medium">
              {getLocalizedName(userBranch, '')}
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
                    {getLocalizedName(currentBranch, language === 'ar' ? 'كل الفروع' : 'All Branches')}
                  </span>
                )}
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>
                {language === 'ar' ? 'اختر الفرع' : 'Select Branch'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* All Branches Option */}
              <DropdownMenuItem 
                onClick={() => {
                  setCurrentBranch(null);
                  // ✅ عند اختيار كل الفروع، نجيب كل المخازن
                  refetchWarehouses();
                }}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="font-medium">
                  {language === 'ar' ? 'كل الفروع' : 'All Branches'}
                </span>
                {currentBranch === null && <Check size={16} className="text-primary" />}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Branches List */}
              {branches.length > 0 ? (
                branches.map((branch: Branch) => (
                  <DropdownMenuItem 
                    key={branch.id}
                    onClick={() => {
                      setCurrentBranch(branch);
                      // ✅ المخازن هتتجيب تلقائياً لأن queryKey اتغير
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span>{getLocalizedName(branch, branch.name)}</span>
                      {branch.code && (
                        <span className="text-xs text-muted-foreground">{branch.code}</span>
                      )}
                    </div>
                    {currentBranch?.id === branch.id && <Check size={16} className="text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {language === 'ar' ? 'لا توجد فروع' : 'No branches found'}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Warehouse Display/Selector - Now right next to branch */}
        {hasRestrictedWarehouse ? (
          // User has assigned warehouse - show as badge (not selectable)
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded-lg">
            <Warehouse size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">
              {getLocalizedName(userWarehouse, '')}
            </span>
          </div>
        ) : warehouses.length > 0 ? (
          // Admin/All access - show dropdown
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Warehouse size={16} />
                {loadingWarehouses ? (
                  <Skeleton className="w-20 h-4" />
                ) : (
                  <span className="max-w-[100px] truncate">
                    {getLocalizedName(currentWarehouse, language === 'ar' ? 'كل المخازن' : 'All Warehouses')}
                  </span>
                )}
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>
                {language === 'ar' ? 'اختر المخزن' : 'Select Warehouse'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* All Warehouses Option - يظهر فقط لو مختار كل الفروع أو مفيش فرع محدد */}
              {!currentBranch && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleSelectWarehouse(null)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">
                      {language === 'ar' ? 'كل المخازن' : 'All Warehouses'}
                    </span>
                    {currentWarehouse === null && <Check size={16} className="text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {/* Warehouses List - فلترة حسب الفرع */}
              {warehouses.length > 0 ? (
                warehouses.map((warehouse: Warehouse) => {
                  const branchName = getWarehouseBranchName(warehouse);
                  
                  return (
                    <DropdownMenuItem 
                      key={warehouse.id}
                      onClick={() => handleSelectWarehouse(warehouse)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span>{getLocalizedName(warehouse, warehouse.name)}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {warehouse.code && <span>كود: {warehouse.code}</span>}
                          {branchName && (
                            <>
                              <span>•</span>
                              <span>{branchName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {currentWarehouse?.id === warehouse.id && <Check size={16} className="text-primary shrink-0" />}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? currentBranch 
                      ? 'لا توجد مخازن لهذا الفرع' 
                      : 'لا توجد مخازن'
                    : currentBranch 
                      ? 'No warehouses for this branch' 
                      : 'No warehouses found'}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="relative ml-1"
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
            <DropdownMenuItem onClick={handleProfileClick} className="gap-2 cursor-pointer">
              <User size={16} />
              {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettingsClick} className="gap-2 cursor-pointer">
              <Settings size={16} />
              {language === 'ar' ? 'الإعدادات' : 'Settings'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut size={16} />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;