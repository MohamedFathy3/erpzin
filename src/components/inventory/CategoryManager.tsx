import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  PanelLeftClose, PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DbCategory {
  id: string;
  name: string;
  name_ar: string | null;
  parent_id: string | null;
  icon: string | null;
}

export interface CategoryWithCount extends DbCategory {
  productCount: number;
  children: CategoryWithCount[];
}

interface CategoryManagerProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const CATEGORY_ICONS = [
  { value: 'Package', label: 'Package', labelAr: 'طرد' },
  { value: 'Shirt', label: 'Clothing', labelAr: 'ملابس' },
  { value: 'ShoppingBag', label: 'Shopping', labelAr: 'تسوق' },
  { value: 'Gift', label: 'Gifts', labelAr: 'هدايا' },
  { value: 'Box', label: 'Box', labelAr: 'صندوق' },
  { value: 'Archive', label: 'Archive', labelAr: 'أرشيف' },
  { value: 'Watch', label: 'Watches', labelAr: 'ساعات' },
  { value: 'Gem', label: 'Jewelry', labelAr: 'مجوهرات' },
  { value: 'Glasses', label: 'Eyewear', labelAr: 'نظارات' },
  { value: 'Footprints', label: 'Footwear', labelAr: 'أحذية' },
  { value: 'Baby', label: 'Kids', labelAr: 'أطفال' },
  { value: 'Home', label: 'Home', labelAr: 'منزل' },
  { value: 'Utensils', label: 'Kitchen', labelAr: 'مطبخ' },
  { value: 'Smartphone', label: 'Phones', labelAr: 'هواتف' },
  { value: 'Laptop', label: 'Computers', labelAr: 'حواسيب' },
  { value: 'Headphones', label: 'Audio', labelAr: 'صوتيات' },
  { value: 'Camera', label: 'Cameras', labelAr: 'كاميرات' },
  { value: 'Gamepad2', label: 'Gaming', labelAr: 'ألعاب' },
  { value: 'Book', label: 'Books', labelAr: 'كتب' },
  { value: 'Palette', label: 'Art', labelAr: 'فنون' },
  { value: 'Sparkles', label: 'Beauty', labelAr: 'تجميل' },
  { value: 'Heart', label: 'Health', labelAr: 'صحة' },
  { value: 'Star', label: 'Featured', labelAr: 'مميز' },
  { value: 'Crown', label: 'Premium', labelAr: 'فاخر' },
  { value: 'Layers', label: 'Collections', labelAr: 'مجموعات' },
  { value: 'Tag', label: 'Sales', labelAr: 'تخفيضات' },
  { value: 'Briefcase', label: 'Business', labelAr: 'أعمال' },
  { value: 'Car', label: 'Automotive', labelAr: 'سيارات' },
  { value: 'Bike', label: 'Sports', labelAr: 'رياضة' },
  { value: 'Plane', label: 'Travel', labelAr: 'سفر' },
  { value: 'Music', label: 'Music', labelAr: 'موسيقى' },
  { value: 'Film', label: 'Entertainment', labelAr: 'ترفيه' },
  { value: 'Dumbbell', label: 'Fitness', labelAr: 'لياقة' },
];

const IconComponent: React.FC<{ iconName: string; size?: number; className?: string }> = ({ iconName, size = 18, className }) => {
  const icons: Record<string, React.ElementType> = {
    Package, Shirt, ShoppingBag, Gift, Box, Archive, Watch, Gem, Glasses,
    Footprints, Baby, Home, Utensils, Smartphone, Laptop, Headphones,
    Camera, Gamepad2, Book, Palette, Sparkles, Heart, Star, Crown,
    Layers, Tag, Briefcase, Car, Bike, Plane, Music, Film, Dumbbell,
  };
  const Icon = icons[iconName] || Package;
  return <Icon size={size} className={className} />;
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
  const isSelected = selectedCategory === category.id;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all group',
          isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
        style={{ paddingInlineStart: `${level * 16 + 8}px` }}
        onClick={() => onSelectCategory(category.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-black/10 rounded"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        <IconComponent 
          iconName={category.icon || 'Package'} 
          size={18} 
          className={isSelected ? 'text-primary-foreground' : 'text-primary'} 
        />
        
        <span className="flex-1 font-medium text-sm truncate">
          {language === 'ar' ? (category.name_ar || category.name) : category.name}
        </span>
        
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          isSelected ? 'bg-white/20' : 'bg-muted-foreground/10 text-muted-foreground'
        )}>
          {category.productCount}
        </span>

        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            className={cn(
              'p-1 rounded hover:bg-black/10',
              isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
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
              className="p-1 rounded hover:bg-destructive/20 text-destructive"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              onEdit={onEdit}
              onDelete={onDelete}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryManager: React.FC<CategoryManagerProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<DbCategory | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    parent_id: '',
    icon: 'Package',
  });

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as DbCategory[];
    },
  });

  // Fetch product counts per category
  const { data: productCounts = {} } = useQuery({
    queryKey: ['category-product-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });
      return counts;
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
    mutationFn: async (data: { name: string; name_ar: string; parent_id: string | null; icon: string }) => {
      const { error } = await supabase.from('categories').insert({
        name: data.name,
        name_ar: data.name_ar || null,
        parent_id: data.parent_id || null,
        icon: data.icon,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: language === 'ar' ? 'تم إضافة التصنيف' : 'Category added' });
      resetForm();
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'Error occurred', variant: 'destructive' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; name_ar: string; parent_id: string | null; icon: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({
          name: data.name,
          name_ar: data.name_ar || null,
          parent_id: data.parent_id || null,
          icon: data.icon,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: language === 'ar' ? 'تم تحديث التصنيف' : 'Category updated' });
      resetForm();
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'Error occurred', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: language === 'ar' ? 'تم حذف التصنيف' : 'Category deleted' });
      setDeleteCategory(null);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'Error occurred', variant: 'destructive' });
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
      toast({ title: language === 'ar' ? 'اسم التصنيف مطلوب' : 'Category name is required', variant: 'destructive' });
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        name: formData.name,
        name_ar: formData.name_ar,
        parent_id: formData.parent_id || null,
        icon: formData.icon,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        name_ar: formData.name_ar,
        parent_id: formData.parent_id || null,
        icon: formData.icon,
      });
    }
  };

  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={(open) => setIsCollapsed(!open)}
      className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </Button>
          </CollapsibleTrigger>
          {!isCollapsed && (
            <h3 className="font-bold text-foreground">
              {language === 'ar' ? 'التصنيفات' : 'Categories'}
            </h3>
          )}
        </div>
        {!isCollapsed && (
          <Button variant="ghost" size="sm" onClick={handleAdd} className="h-8 w-8 p-0">
            <Plus size={16} />
          </Button>
        )}
      </div>

      <CollapsibleContent className="flex-1 flex flex-col overflow-hidden">
        {/* All Products */}
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-4 cursor-pointer transition-all border-b border-border',
            selectedCategory === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
          onClick={() => onSelectCategory(null)}
        >
          <Package size={18} />
          <span className="flex-1 font-medium text-sm">
            {language === 'ar' ? 'جميع المنتجات' : 'All Products'}
          </span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            selectedCategory === null ? 'bg-white/20' : 'bg-muted-foreground/10 text-muted-foreground'
          )}>
            {totalProducts}
          </span>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : categoryTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package size={32} className="mb-2 opacity-50" />
              <p className="text-sm">{language === 'ar' ? 'لا توجد تصنيفات' : 'No categories'}</p>
            </div>
          ) : (
            categoryTree.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                level={0}
                selectedCategory={selectedCategory}
                onSelectCategory={onSelectCategory}
                onEdit={handleEdit}
                onDelete={setDeleteCategory}
                language={language}
              />
            ))
          )}
        </div>
      </CollapsibleContent>

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
                value={formData.parent_id}
                onValueChange={(val) => setFormData({ ...formData, parent_id: val === 'none' ? '' : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'بدون (تصنيف رئيسي)' : 'None (root category)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون (تصنيف رئيسي)' : 'None (root category)'}</SelectItem>
                  {categories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
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
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCategory
                ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                : (language === 'ar' ? 'إضافة' : 'Add')}
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
            >
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
};

export default CategoryManager;
