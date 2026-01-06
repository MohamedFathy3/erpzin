import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  parentId: string | null;
  children: Category[];
  productCount: number;
}

interface CategoryTreeProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onAddCategory?: (parentId: string | null) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
}

const CategoryNode: React.FC<{
  category: Category;
  level: number;
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  language: string;
}> = ({ category, level, selectedCategory, onSelectCategory, onEditCategory, onDeleteCategory, language }) => {
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
        
        {expanded && hasChildren ? (
          <FolderOpen size={18} className={isSelected ? 'text-primary-foreground' : 'text-primary'} />
        ) : (
          <Folder size={18} className={isSelected ? 'text-primary-foreground' : 'text-primary'} />
        )}
        
        <span className="flex-1 font-medium text-sm truncate">
          {language === 'ar' ? category.nameAr : category.name}
        </span>
        
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          isSelected ? 'bg-white/20' : 'bg-muted-foreground/10 text-muted-foreground'
        )}>
          {category.productCount}
        </span>

        <div className="hidden group-hover:flex items-center gap-1">
          {onEditCategory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCategory(category);
              }}
              className={cn(
                'p-1 rounded hover:bg-black/10',
                isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <Edit2 size={14} />
            </button>
          )}
          {onDeleteCategory && category.productCount === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory(category.id);
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
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory
}) => {
  const { language } = useLanguage();

  const totalProducts = categories.reduce((sum, cat) => {
    const countChildren = (c: Category): number => 
      c.productCount + c.children.reduce((s, child) => s + countChildren(child), 0);
    return sum + countChildren(cat);
  }, 0);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <h3 className="font-bold text-foreground">
          {language === 'ar' ? 'التصنيفات' : 'Categories'}
        </h3>
        {onAddCategory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddCategory(null)}
            className="h-8 w-8 p-0"
          >
            <Plus size={16} />
          </Button>
        )}
      </div>

      {/* All Products */}
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-4 cursor-pointer transition-all border-b border-border',
          selectedCategory === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
        onClick={() => onSelectCategory(null)}
      >
        <Folder size={18} />
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
        {categories.map((category) => (
          <CategoryNode
            key={category.id}
            category={category}
            level={0}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            onEditCategory={onEditCategory}
            onDeleteCategory={onDeleteCategory}
            language={language}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryTree;
