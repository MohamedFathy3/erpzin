// components/ProductFilters.tsx
import React from 'react';
import { Search, List, Grid3X3, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Branch, Warehouse } from '../types';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  selectedWarehouse: string;
  onWarehouseChange: (value: string) => void;
  activeView: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
  branches: Branch[] | undefined; // Allow undefined
  warehouses: Warehouse[] | undefined; // Allow undefined
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedBranch,
  onBranchChange,
  selectedWarehouse,
  onWarehouseChange,
  activeView,
  onViewChange,
  branches = [], // Default to empty array
  warehouses = [] // Default to empty array
}) => {
  const { language } = useLanguage();

  const t = {
    search: language === 'ar' ? 'ابحث باسم المنتج...' : 'Search by product name...',
    branch: language === 'ar' ? 'الفرع' : 'Branch',
    warehouse: language === 'ar' ? 'المستودع' : 'Warehouse',
    allBranches: language === 'ar' ? 'جميع الفروع' : 'All Branches',
    allWarehouses: language === 'ar' ? 'جميع المستودعات' : 'All Warehouses'
  };

  // Ensure branches is an array before mapping
  const branchesArray = Array.isArray(branches) ? branches : [];
  const warehousesArray = Array.isArray(warehouses) ? warehouses : [];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-muted/30 rounded-xl">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>
      
      <Select value={selectedBranch} onValueChange={onBranchChange}>
        <SelectTrigger className="w-[150px] bg-background">
          <Building2 size={14} className="mr-2" />
          <SelectValue placeholder={t.branch} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.allBranches}</SelectItem>
          {branchesArray.map((branch) => (
            <SelectItem key={branch.id} value={branch.id.toString()}>
              {language === 'ar' ? branch.name_ar || branch.name : branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={selectedWarehouse} onValueChange={onWarehouseChange}>
        <SelectTrigger className="w-[150px] bg-background">
          <SelectValue placeholder={t.warehouse} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.allWarehouses}</SelectItem>
          {warehousesArray.map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
              {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex items-center gap-1 p-1 bg-background rounded-lg border">
        <Button
          variant={activeView === 'list' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onViewChange('list')}
        >
          <List size={14} />
        </Button>
        <Button
          variant={activeView === 'grid' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onViewChange('grid')}
        >
          <Grid3X3 size={14} />
        </Button>
      </div>
    </div>
  );
};