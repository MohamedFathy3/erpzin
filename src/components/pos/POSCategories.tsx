import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Package, Shirt, ShoppingBag, Gift, Box, Archive, Watch, Gem, Glasses,
  Footprints, Baby, Home, Utensils, Smartphone, Laptop, Headphones,
  Camera, Gamepad2, Book, Palette, Sparkles, Heart, Star, Crown,
  Layers, Tag, Briefcase, Car, Bike, Plane, Music, Film, Dumbbell,
  Tv, Coffee, Wine, Cake, Pizza, Beef, Apple, Milk, Battery, Cpu,
  HardDrive, Keyboard, Mouse, Printer, Scan, Wifi, Bluetooth,
  BatteryCharging, Monitor, Tablet, Speaker, Radio, Mic,
  Volume2, Zap, Flame, Snowflake, Sun, Moon, Cloud, Umbrella,
  Compass, Map, Flag, Trophy, Medal, Award, Shield, Lock, Unlock,
  Key, Phone, Smartphone as SmartphoneIcon, Tablet as TabletIcon,
  Laptop as LaptopIcon, Monitor as MonitorIcon, Watch as WatchIcon,
  Camera as CameraIcon, Headphones as HeadphonesIcon, Gamepad2 as Gamepad2Icon,
  Tv as TvIcon
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string; // اسم الأيقونة من Lucide (مثلاً 'Package', 'Shirt', إلخ)
}

interface POSCategoriesProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  isLoading?: boolean;
}

// مكون عرض الأيقونة
const CategoryIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className }) => {
  const icons: Record<string, React.ElementType> = useMemo(() => ({
    Package, Shirt, ShoppingBag, Gift, Box, Archive, Watch, Gem, Glasses,
    Footprints, Baby, Home, Utensils, Smartphone, Laptop, Headphones,
    Camera, Gamepad2, Book, Palette, Sparkles, Heart, Star, Crown,
    Layers, Tag, Briefcase, Car, Bike, Plane, Music, Film, Dumbbell,
    Tv, Coffee, Wine, Cake, Pizza, Beef, Apple, Milk, Battery, Cpu,
    HardDrive, Keyboard, Mouse, Printer, Scan, Wifi, Bluetooth,
    BatteryCharging, Monitor, Tablet, Speaker, Radio, Mic,
    Volume2, Zap, Flame, Snowflake, Sun, Moon, Cloud, Umbrella,
    Compass, Map, Flag, Trophy, Medal, Award, Shield, Lock, Unlock,
    Key, SmartphoneIcon, TabletIcon, LaptopIcon, MonitorIcon, WatchIcon,
    CameraIcon, HeadphonesIcon, Gamepad2Icon, TvIcon
  }), []);

  const IconComponent = icons[iconName] || Package; // افتراضي Package لو الأيقونة مش موجودة

  return <IconComponent className={cn('w-4 h-4', className)} />;
};

const POSCategories: React.FC<POSCategoriesProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false
}) => {
  const { language } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 animate-pulse min-w-[100px]"
          >
            <div className="w-4 h-4 bg-muted rounded" />
            <div className="w-16 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
        {language === 'ar' ? 'لا توجد تصنيفات' : 'No categories found'}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all duration-200',
            'font-medium text-sm',
            'hover:scale-105 active:scale-95',
            selectedCategory === category.id
              ? 'bg-primary text-primary-foreground shadow-lg hover:bg-primary/90'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
        >
          <CategoryIcon 
            iconName={category.icon} 
            className={cn(
              'transition-transform',
              selectedCategory === category.id ? 'scale-110' : ''
            )} 
          />
          <span>{language === 'ar' ? category.nameAr : category.name}</span>
        </button>
      ))}
    </div>
  );
};

export default POSCategories;