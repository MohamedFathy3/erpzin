import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, Edit2, Trash2, ChevronDown, ChevronRight, Package,
  Shirt, ShoppingBag, Gift, Box, Archive, Watch, Gem, Glasses,
  Footprints, Baby, Home, Utensils, Smartphone, Laptop, Headphones,
  Camera, Gamepad2, Book, Palette, Sparkles, Heart, Star, Crown,
  Layers, Tag, Briefcase, Car, Bike, Plane, Music, Film, Dumbbell,
  PanelLeftClose, PanelLeft, Tv
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DbCategory {
  id: number;
  name: string;
  name_ar?: string;
  parent_id?: number;
  icon?: string;
}

export interface CategoryWithCount extends DbCategory {
  productCount: number;
  children: CategoryWithCount[];
}

interface CategoryManagerProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

const CATEGORY_ICONS = [
  { value: 'Package', label: 'Package', labelAr: 'طرد', color: 'blue' },
  { value: 'Shirt', label: 'Clothing', labelAr: 'ملابس', color: 'purple' },
  { value: 'ShoppingBag', label: 'Shopping', labelAr: 'تسوق', color: 'pink' },
  { value: 'Gift', label: 'Gifts', labelAr: 'هدايا', color: 'red' },
  { value: 'Box', label: 'Box', labelAr: 'صندوق', color: 'orange' },
  { value: 'Archive', label: 'Archive', labelAr: 'أرشيف', color: 'teal' },
  { value: 'Watch', label: 'Watches', labelAr: 'ساعات', color: 'indigo' },
  { value: 'Gem', label: 'Jewelry', labelAr: 'مجوهرات', color: 'pink' },
  { value: 'Glasses', label: 'Eyewear', labelAr: 'نظارات', color: 'cyan' },
  { value: 'Footprints', label: 'Footwear', labelAr: 'أحذية', color: 'orange' },
  { value: 'Baby', label: 'Kids', labelAr: 'أطفال', color: 'yellow' },
  { value: 'Home', label: 'Home', labelAr: 'منزل', color: 'green' },
  { value: 'Utensils', label: 'Kitchen', labelAr: 'مطبخ', color: 'red' },
  { value: 'Smartphone', label: 'Phones', labelAr: 'هواتف', color: 'blue' },
  { value: 'Laptop', label: 'Computers', labelAr: 'حواسيب', color: 'indigo' },
  { value: 'Headphones', label: 'Audio', labelAr: 'صوتيات', color: 'purple' },
  { value: 'Camera', label: 'Cameras', labelAr: 'كاميرات', color: 'cyan' },
  { value: 'Gamepad2', label: 'Gaming', labelAr: 'ألعاب', color: 'green' },
  { value: 'Book', label: 'Books', labelAr: 'كتب', color: 'yellow' },
  { value: 'Palette', label: 'Art', labelAr: 'فنون', color: 'pink' },
  { value: 'Sparkles', label: 'Beauty', labelAr: 'تجميل', color: 'purple' },
  { value: 'Heart', label: 'Health', labelAr: 'صحة', color: 'red' },
  { value: 'Star', label: 'Featured', labelAr: 'مميز', color: 'yellow' },
  { value: 'Crown', label: 'Premium', labelAr: 'فاخر', color: 'orange' },
  { value: 'Layers', label: 'Collections', labelAr: 'مجموعات', color: 'teal' },
  { value: 'Tag', label: 'Sales', labelAr: 'تخفيضات', color: 'red' },
  { value: 'Briefcase', label: 'Business', labelAr: 'أعمال', color: 'indigo' },
  { value: 'Car', label: 'Automotive', labelAr: 'سيارات', color: 'blue' },
  { value: 'Bike', label: 'Sports', labelAr: 'رياضة', color: 'green' },
  { value: 'Plane', label: 'Travel', labelAr: 'سفر', color: 'cyan' },
  { value: 'Music', label: 'Music', labelAr: 'موسيقى', color: 'purple' },
  { value: 'Film', label: 'Entertainment', labelAr: 'ترفيه', color: 'pink' },
  { value: 'Dumbbell', label: 'Fitness', labelAr: 'لياقة', color: 'orange' },
  { value: 'Tv', label: 'Electronics', labelAr: 'إلكترونيات', color: 'blue' },
];

const ICON_COLORS: Record<string, string> = {
  blue: 'text-blue-500 bg-blue-500/10',
  green: 'text-emerald-500 bg-emerald-500/10',
  purple: 'text-purple-500 bg-purple-500/10',
  orange: 'text-orange-500 bg-orange-500/10',
  pink: 'text-pink-500 bg-pink-500/10',
  cyan: 'text-cyan-500 bg-cyan-500/10',
  yellow: 'text-amber-500 bg-amber-500/10',
  red: 'text-red-500 bg-red-500/10',
  indigo: 'text-indigo-500 bg-indigo-500/10',
  teal: 'text-teal-500 bg-teal-500/10',
};

const getIconColor = (iconName: string): string => {
  const icon = CATEGORY_ICONS.find(i => i.value === iconName);
  return icon?.color || 'blue';
};

const IconComponent: React.FC<{ iconName: string; size?: number; className?: string; showBackground?: boolean }> = ({ 
  iconName, 
  size = 18, 
  className,
  showBackground = false 
}) => {
  const icons: Record<string, React.ElementType> = {
    Package, Shirt, ShoppingBag, Gift, Box, Archive, Watch, Gem, Glasses,
    Footprints, Baby, Home, Utensils, Smartphone, Laptop, Headphones,
    Camera, Gamepad2, Book, Palette, Sparkles, Heart, Star, Crown,
    Layers, Tag, Briefcase, Car, Bike, Plane, Music, Film, Dumbbell, Tv,
  };
  const Icon = icons[iconName] || Package;
  const colorClass = ICON_COLORS[getIconColor(iconName)] || ICON_COLORS.blue;
  
  if (showBackground) {
    return (
      <div className={cn('p-1.5 rounded-lg transition-all duration-200', colorClass, className)}>
        <Icon size={size} />
      </div>
    );
  }
  
  return <Icon size={size} className={cn(colorClass.split(' ')[0], className)} />;
};

const CategoryNode: React.FC<{
  category: CategoryWithCount;
  level: number;
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onEdit: (category: DbCategory) => void;
  onDelete: (category: DbCategory) => void;
  language: string;
}> = ({ category, level, selectedCategory, onSelectCategory, onEdit, onDelete, language }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = category.children.length > 0;
  const isSelected = selectedCategory === category.id.toString();

  return (
    <div className="animate-fade-in">
      <div
        className={cn(
          'flex items-center gap-2 py-2.5 px-2 rounded-lg cursor-pointer transition-all duration-200 group hover:translate-x-1 rtl:hover:-translate-x-1',
          isSelected 
            ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md' 
            : 'hover:bg-muted/80'
        )}
        style={{ paddingInlineStart: `${level * 16 + 8}px` }}
        onClick={() => onSelectCategory(category.id.toString())}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className={cn(
              'p-0.5 rounded transition-transform duration-200',
              expanded ? 'rotate-0' : '-rotate-90 rtl:rotate-90',
              isSelected ? 'hover:bg-white/10' : 'hover:bg-black/10'
            )}
          >
            <ChevronDown size={16} className="transition-transform duration-200" />
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        <IconComponent 
          iconName={category.icon || 'Package'} 
          size={16} 
          showBackground={!isSelected}
          className={isSelected ? '!text-primary-foreground !bg-white/20' : ''} 
        />
        
        <span className="flex-1 font-medium text-sm truncate">
          {language === 'ar' ? (category.name_ar || category.name) : category.name}
        </span>
        
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium transition-all duration-200',
          isSelected 
            ? 'bg-white/20 text-primary-foreground' 
            : 'bg-primary/10 text-primary'
        )}>
          {category.productCount}
        </span>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            className={cn(
              'p-1 rounded transition-colors duration-200',
              isSelected ? 'hover:bg-white/20 text-primary-foreground' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'
            )}
          >
            <Edit2 size={14} />
          </button>
          {category.productCount === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category);
              }}
              className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors duration-200"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        expanded && hasChildren ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        {category.children.map((child, index) => (
          <div 
            key={child.id} 
            style={{ animationDelay: `${index * 50}ms` }}
            className="animate-slide-up"
          >
            <CategoryNode
              category={child}
              level={level + 1}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              onEdit={onEdit}
              onDelete={onDelete}
              language={language}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const CategoryManager: React.FC<CategoryManagerProps> = ({
  selectedCategory,
  onSelectCategory,
  isCollapsed: controlledCollapsed,
  onCollapseChange,
}) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<DbCategory | null>(null);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const setIsCollapsed = (value: boolean) => {
    if (onCollapseChange) {
      onCollapseChange(value);
    } else {
      setInternalCollapsed(value);
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    parent_id: '' as string | number | '',
    icon: 'Package',
  });

  // Fetch categories from Laravel API
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => {
      try {
        const response = await api.post('/category/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب التصنيفات' : 'Error fetching categories',
          variant: 'destructive'
        });
        return [];
      }
    },
  });

  // Fetch product counts per category
  const { data: productCounts = {} } = useQuery({
    queryKey: ['category-product-counts'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        const products = response.data.data || [];
        const counts: Record<string, number> = {};
        
        products.forEach((p: any) => {
          if (p.category_id) {
            const catId = p.category_id.toString();
            counts[catId] = (counts[catId] || 0) + 1;
          }
        });
        
        return counts;
      } catch (error) {
        console.error('Error fetching product counts:', error);
        return {};
      }
    },
  });

  // Build category tree
  const buildTree = (cats: DbCategory[]): CategoryWithCount[] => {
    const map: Record<string, CategoryWithCount> = {};
    const roots: CategoryWithCount[] = [];

    cats.forEach((cat) => {
      map[cat.id] = {
        ...cat,
        productCount: productCounts[cat.id] || 0,
        children: [],
      };
    });

    cats.forEach((cat) => {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else {
        roots.push(map[cat.id]);
      }
    });

    return roots;
  };

  const categoryTree = buildTree(categories);
  const totalProducts = Object.values(productCounts).reduce((a, b) => a + b, 0);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      name_ar?: string; 
      parent_id?: number; 
      icon: string 
    }) => {
      const response = await api.post('/category', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] }); // For Inventory page
      toast({ 
        title: language === 'ar' ? 'تم إضافة التصنيف' : 'Category added',
        variant: 'default'
      });
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error creating category:', error);
      toast({ 
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred', 
        description: error.response?.data?.message || 'Failed to create category',
        variant: 'destructive' 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { 
      id: number; 
      name: string; 
      name_ar?: string; 
      parent_id?: number; 
      icon: string 
    }) => {
      const response = await api.put(`/category/${data.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] }); // For Inventory page
      toast({ 
        title: language === 'ar' ? 'تم تحديث التصنيف' : 'Category updated',
        variant: 'default'
      });
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error updating category:', error);
      toast({ 
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        description: error.response?.data?.message || 'Failed to update category',
        variant: 'destructive' 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/category/${id}`, {
        data: {
          items: [id],
        },
      })
      
      return response.data
      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] }); // For Inventory page
      toast({ 
        title: language === 'ar' ? 'تم حذف التصنيف' : 'Category deleted',
        variant: 'default'
      });
      setDeleteCategory(null);
    },
    onError: (error: any) => {
      console.error('Error deleting category:', error);
      toast({ 
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        description: error.response?.data?.message || 'Failed to delete category',
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', name_ar: '', parent_id: '', icon: 'Package' });
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', name_ar: '', parent_id: '', icon: 'Package' });
    setShowForm(true);
  };

  const handleEdit = (cat: DbCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      name_ar: cat.name_ar || '',
      parent_id: cat.parent_id || '',
      icon: cat.icon || 'Package',
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ 
        title: language === 'ar' ? 'اسم التصنيف مطلوب' : 'Category name is required', 
        variant: 'destructive' 
      });
      return;
    }

    const categoryData = {
      name: formData.name,
      name_ar: formData.name_ar || undefined,
      parent_id: formData.parent_id ? Number(formData.parent_id) : undefined,
      icon: formData.icon,
    };

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        ...categoryData
      });
    } else {
      createMutation.mutate(categoryData);
    }
  };

  if (isCollapsed) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col items-center py-4 panel-transition animate-fade-in">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-10 w-10 p-0 mb-2 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
          onClick={() => setIsCollapsed(false)}
        >
          <Layers size={20} className="text-primary animate-pulse-slow" />
        </Button>
        <div className="w-px bg-gradient-to-b from-transparent via-border to-transparent flex-1 my-2" />
        <span className="text-xs font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180 tracking-wider">
          {language === 'ar' ? 'التصنيفات' : 'Categories'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col panel-transition animate-scale-in shadow-card">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-muted/50 to-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200"
            onClick={() => setIsCollapsed(true)}
          >
            <PanelLeftClose size={16} />
          </Button>
          <h3 className="font-bold text-foreground section-header">
            {language === 'ar' ? 'التصنيفات' : 'Categories'}
          </h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleAdd} 
          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:rotate-90"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          <Plus size={16} />
        </Button>
      </div>

      {/* All Products */}
      <div
        className={cn(
          'flex items-center gap-3 py-3 px-4 cursor-pointer transition-all duration-200 border-b border-border group',
          selectedCategory === null 
            ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md' 
            : 'hover:bg-muted/80 hover:translate-x-1 rtl:hover:-translate-x-1'
        )}
        onClick={() => onSelectCategory(null)}
      >
        <div className={cn(
          'p-1.5 rounded-lg transition-all duration-200',
          selectedCategory === null 
            ? 'bg-white/20' 
            : 'bg-primary/10 text-primary group-hover:bg-primary/20'
        )}>
          <Package size={16} />
        </div>
        <span className="flex-1 font-medium text-sm">
          {language === 'ar' ? 'جميع المنتجات' : 'All Products'}
        </span>
        <span className={cn(
          'text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-200',
          selectedCategory === null 
            ? 'bg-white/20 text-primary-foreground' 
            : 'bg-primary/10 text-primary'
        )}>
          {totalProducts}
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground animate-pulse">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : categoryTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground animate-fade-in">
            <div className="p-4 rounded-full bg-muted/50 mb-3">
              <Package size={32} className="opacity-50" />
            </div>
            <p className="text-sm">{language === 'ar' ? 'لا توجد تصنيفات' : 'No categories'}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {categoryTree.map((category, index) => (
              <div 
                key={category.id} 
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-slide-up"
              >
                <CategoryNode
                  category={category}
                  level={0}
                  selectedCategory={selectedCategory}
                  onSelectCategory={onSelectCategory}
                  onEdit={handleEdit}
                  onDelete={setDeleteCategory}
                  language={language}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? (language === 'ar' ? 'تعديل التصنيف' : 'Edit Category')
                : (language === 'ar' ? 'إضافة تصنيف جديد' : 'Add New Category')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="اسم التصنيف"
                dir="rtl"
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'التصنيف الأب' : 'Parent Category'}</Label>
              <Select
                value={formData.parent_id.toString()}
                onValueChange={(val) => setFormData({ ...formData, parent_id: val === 'none' ? '' : Number(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'بدون (تصنيف رئيسي)' : 'None (root category)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون (تصنيف رئيسي)' : 'None (root category)'}</SelectItem>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {language === 'ar' ? (cat.name_ar || cat.name) : cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'الأيقونة' : 'Icon'}</Label>
              <Select
                value={formData.icon}
                onValueChange={(val) => setFormData({ ...formData, icon: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {CATEGORY_ICONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent iconName={icon.value} size={16} />
                        <span>{language === 'ar' ? icon.labelAr : icon.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent me-2" />
                  {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : editingCategory ? (
                language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
              ) : (
                language === 'ar' ? 'إضافة' : 'Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'حذف التصنيف' : 'Delete Category'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? `هل أنت متأكد من حذف التصنيف "${deleteCategory?.name_ar || deleteCategory?.name}"؟`
                : `Are you sure you want to delete "${deleteCategory?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCategory && deleteMutation.mutate(deleteCategory.id)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent me-2" />
                  {language === 'ar' ? 'جاري الحذف...' : 'Deleting...'}
                </>
              ) : (
                language === 'ar' ? 'حذف' : 'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoryManager;