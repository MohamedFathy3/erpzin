// components/pos/POSCategories.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  Key, Smartphone as SmartphoneIcon, Tablet as TabletIcon,
  Laptop as LaptopIcon, Monitor as MonitorIcon, Watch as WatchIcon,
  Camera as CameraIcon, Headphones as HeadphonesIcon, Gamepad2 as Gamepad2Icon,
  Tv as TvIcon
} from 'lucide-react';

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

  const IconComponent = icons[iconName] || Package;
  return <IconComponent className={cn('w-4 h-4', className)} />;
};

const POSCategories: React.FC<POSCategoriesProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false
}) => {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  
  // متغيرات للسحب بالماوس
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // التحقق من وجود overflow لعرض الأسهم
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  // التمرير بالأسهم
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 250;
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  // ==================== السحب بالماوس ====================
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // سرعة السحب
    scrollRef.current.scrollLeft = scrollLeft - walk;
    checkScroll();
  };

  const handleMouseUp = () => {
    if (!scrollRef.current) return;
    setIsDragging(false);
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = '';
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (scrollRef.current) {
        scrollRef.current.style.cursor = 'grab';
        scrollRef.current.style.userSelect = '';
      }
    }
  };

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
    <div className="relative flex items-center gap-1">
      {/* سهم اليسار */}
      {showLeftArrow && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 z-10 h-8 w-8 rounded-full bg-background shadow-md border-border hover:bg-muted"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* حاوية التصنيفات - قابلة للسحب بالماوس */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          userSelect: 'none'
        }}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex gap-2 px-0.5">
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
      </div>

      {/* سهم اليمين */}
      {showRightArrow && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 z-10 h-8 w-8 rounded-full bg-background shadow-md border-border hover:bg-muted"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default POSCategories;