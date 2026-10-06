import React, { useEffect, useState, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
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
  Package,
  X,
  Loader2,
  Tag,
  Hash,
  Barcode,
  FolderTree,
  Sparkles
} from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

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
  branch_id?: number | Branch;
  image?: string;
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  barcode?: string;
  price: string;
  cost?: string;
  stock: number;
  reorder_level?: number;
  image_url?: string | null;
  imageUrl?: string | null;
  category?: {
    id: number;
    name: string;
    name_ar?: string;
    icon?: string;
  };
  units?: Array<{
    unit_id: number;
    unit_name: string;
    sell_price: string;
    colors?: Array<{
      color_id: number;
      color: string;
      hex_code: string;
      stock: number;
    }>;
  }>;
}

type SearchType = 'name' | 'sku' | 'barcode' | 'category';

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
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('name');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search products
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['product-search-header', debouncedSearchQuery, searchType],
    queryFn: async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.trim().length < 2) {
        return [];
      }

      try {
        const filters: any = {};
        
        switch (searchType) {
          case 'name':
            filters.name = debouncedSearchQuery;
            break;
          case 'sku':
            filters.sku = debouncedSearchQuery;
            break;
          case 'barcode':
            filters.barcode = debouncedSearchQuery;
            break;
          case 'category':
            filters.category_id = debouncedSearchQuery;
            break;
        }

        const payload = {
          filters: filters,
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 10,
          paginate: false,
          delete: false
        };

        const response = await api.post('/product/index', payload);
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error searching products:', error);
        return [];
      }
    },
    enabled: debouncedSearchQuery.length >= 2,
    staleTime: 30000,
  });

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
    staleTime: 5 * 60 * 1000,
  });

  // جلب المخازن
  const { data: warehouses = [], isLoading: loadingWarehouses, refetch: refetchWarehouses } = useQuery({
    queryKey: ['warehouses-header', currentBranch?.id],
    queryFn: async () => {
      try {
        const filters: any = { active: true };
        
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
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (warehouses.length > 0) {
      const warehouseExists = warehouses.some(w => w.id === currentWarehouse?.id);
      if (!warehouseExists) {
        setCurrentWarehouse(null);
      }
    } else {
      setCurrentWarehouse(null);
    }
  }, [warehouses, currentWarehouse?.id, setCurrentWarehouse]);

  const handleProductClick = (product: Product) => {
    setShowSearchResults(false);
    setSearchQuery('');
    setIsFocused(false);
    navigate(`/products/${product.id}`);
  };

  const searchTypes: { type: SearchType; label: string; labelAr: string; icon: React.ReactNode; placeholder: string; placeholderAr: string }[] = [
    { type: 'name', label: 'Name', labelAr: 'الاسم', icon: <Tag size={14} />, placeholder: 'Search by product name...', placeholderAr: 'ابحث باسم المنتج...' },
    { type: 'sku', label: 'SKU', labelAr: 'SKU', icon: <Hash size={14} />, placeholder: 'Search by SKU...', placeholderAr: 'ابحث برقم SKU...' },
    { type: 'barcode', label: 'Barcode', labelAr: 'باركود', icon: <Barcode size={14} />, placeholder: 'Search by barcode...', placeholderAr: 'ابحث بالباركود...' },
    { type: 'category', label: 'Category', labelAr: 'تصنيف', icon: <FolderTree size={14} />, placeholder: 'Search by category...', placeholderAr: 'ابحث باسم التصنيف...' },
  ];

  const currentSearchType = searchTypes.find(t => t.type === searchType)!;

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

  const handleSelectWarehouse = (warehouse: Warehouse | null) => {
    setCurrentWarehouse(warehouse);
  };

  const getLocalizedName = (item: any, defaultText: string) => {
    if (!item) return defaultText;
    return language === 'ar' && item.name_ar ? item.name_ar : item.name;
  };

  const getWarehouseBranchName = (warehouse: Warehouse) => {
    if (!warehouse.branch_id) return '';
    
    if (typeof warehouse.branch_id === 'object' && warehouse.branch_id !== null) {
      return getLocalizedName(warehouse.branch_id, '');
    }
    
    const branch = branches.find(b => b.id === warehouse.branch_id);
    return branch ? getLocalizedName(branch, '') : '';
  };

  const hasRestrictedBranch = userBranch !== null;
  const hasRestrictedWarehouse = userWarehouse !== null;

  const getPrimaryVariant = (product: Product) => {
    if (product.units && product.units.length > 0) {
      const firstUnit = product.units[0];
      if (firstUnit.colors && firstUnit.colors.length > 0) {
        return {
          color: firstUnit.colors[0].color,
          hexCode: firstUnit.colors[0].hex_code,
          unit: firstUnit.unit_name
        };
      }
      return { unit: firstUnit.unit_name };
    }
    return null;
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
      {/* Search Section - تصميم منفصل للأزرار */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl relative" ref={searchRef}>
        {/* Search Type Buttons - خارج الـ Input */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          {searchTypes.map((type) => (
            <button
              key={type.type}
              onClick={() => setSearchType(type.type)}
              className={`
                flex items-center gap-1 px-1 py-1 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${searchType === type.type 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
              title={language === 'ar' ? type.labelAr : type.label}
            >
              {type.icon}
              <span>
                {language === 'ar' ? type.labelAr : type.label}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-2">
          <div className={`
            relative transition-all duration-200
            ${isFocused ? 'ring-2 ring-primary/20' : ''}
          `}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={18} />
            </div>
            <Input
              placeholder={language === 'ar' ? currentSearchType.placeholderAr : currentSearchType.placeholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => {
                setIsFocused(true);
                setShowSearchResults(true);
              }}
              className="pl-10 pr-10 h-10 bg-secondary/30 border-border/50 focus-visible:ring-primary/30 rounded-xl text-sm"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && (searchQuery.length >= 2) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-xl shadow-xl z-50 max-h-[450px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {language === 'ar' ? 'نتائج البحث' : 'Search Results'}
                  </span>
                  {!isSearching && searchResults && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {searchResults.length}
                    </Badge>
                  )}
                </div>
                <button
                  className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center"
                  onClick={() => setShowSearchResults(false)}
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {isSearching ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/50" />
                  <p className="text-sm text-muted-foreground mt-3">
                    {language === 'ar' ? 'جاري البحث...' : 'Searching...'}
                  </p>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="divide-y divide-border">
                  {searchResults.map((product: Product) => {
                    const primaryVariant = getPrimaryVariant(product);
                    const productName = language === 'ar' ? product.name_ar || product.name : product.name;
                    
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="p-3 hover:bg-muted/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Product Image */}
                          <div className="w-12 h-12 bg-gradient-to-br from-muted to-muted/50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                            {(product.image_url || product.imageUrl) ? (
                              <img
                                src={product.image_url || product.imageUrl}
                                alt={productName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                }}
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground/50" />
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                                  {productName}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {product.sku && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono bg-muted/30">
                                      SKU: {product.sku}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">
                                  {parseFloat(product.price).toLocaleString()} ر.ي
                                </p>
                                {product.stock !== undefined && (
                                  <p className={`text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {language === 'ar' ? 'المخزون' : 'Stock'}: {product.stock}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Category and Variants */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {product.category && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                                  <FolderTree size={10} />
                                  {getLocalizedName(product.category, product.category.name)}
                                </Badge>
                              )}
                              {primaryVariant?.unit && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {primaryVariant.unit}
                                </Badge>
                              )}
                              {primaryVariant?.color && (
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-3 h-3 rounded-full shadow-sm"
                                    style={{ backgroundColor: primaryVariant.hexCode || '#888' }}
                                  />
                                  <span className="text-[10px] text-muted-foreground">
                                    {primaryVariant.color}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : debouncedSearchQuery.length >= 2 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search size={20} className="text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'لم يتم العثور على منتجات' : 'No products found'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {language === 'ar' ? 'حاول باستخدام كلمات بحث مختلفة' : 'Try using different search terms'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Branch Display/Selector */}
        {hasRestrictedBranch ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl">
            <Building2 size={16} className="text-primary" />
            <span className="text-sm font-medium">
              {getLocalizedName(userBranch, '')}
            </span>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9">
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
            <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto rounded-xl">
              <DropdownMenuLabel>
                {language === 'ar' ? 'اختر الفرع' : 'Select Branch'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => {
                  setCurrentBranch(null);
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
              
              {branches.length > 0 ? (
                branches.map((branch: Branch) => (
                  <DropdownMenuItem 
                    key={branch.id}
                    onClick={() => setCurrentBranch(branch)}
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

        {/* Warehouse Display/Selector */}
        {hasRestrictedWarehouse ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl">
            <Warehouse size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">
              {getLocalizedName(userWarehouse, '')}
            </span>
          </div>
        ) : warehouses.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9">
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
            <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto rounded-xl">
              <DropdownMenuLabel>
                {language === 'ar' ? 'اختر المخزن' : 'Select Warehouse'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
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
          className="relative rounded-xl h-9 w-9"
        >
          <Languages size={18} />
          <span className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-primary text-primary-foreground rounded-full px-1 min-w-[20px] text-center">
            {language.toUpperCase()}
          </span>
        </Button>

        {/* Notifications */}
        <NotificationCenter />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3 rounded-xl h-9">
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
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
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