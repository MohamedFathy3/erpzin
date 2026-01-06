import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
}

interface POSCategoriesProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

const POSCategories: React.FC<POSCategoriesProps> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  const { language } = useLanguage();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all',
            'font-medium text-sm',
            selectedCategory === category.id
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <span>{category.icon}</span>
          <span>{language === 'ar' ? category.nameAr : category.name}</span>
        </button>
      ))}
    </div>
  );
};

export default POSCategories;
