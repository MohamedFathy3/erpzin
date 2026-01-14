import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Filter, 
  X, 
  CalendarIcon, 
  ChevronDown, 
  RotateCcw,
  Search
} from 'lucide-react';

export interface FilterField {
  key: string;
  label: string;
  labelAr: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'numberRange';
  options?: { value: string; label: string; labelAr?: string }[];
  placeholder?: string;
  placeholderAr?: string;
}

export interface FilterValues {
  [key: string]: any;
}

interface AdvancedFilterProps {
  fields: FilterField[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onReset: () => void;
  language: 'ar' | 'en';
  className?: string;
}

export const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  fields,
  values,
  onChange,
  onReset,
  language,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeFiltersCount = Object.values(values).filter(v => 
    v !== '' && v !== null && v !== undefined && v !== 'all'
  ).length;

  const handleFieldChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handleRemoveFilter = (key: string) => {
    const newValues = { ...values };
    delete newValues[key];
    onChange(newValues);
  };

  const renderField = (field: FilterField) => {
    const label = language === 'ar' ? field.labelAr : field.label;
    const placeholder = language === 'ar' ? (field.placeholderAr || field.placeholder) : field.placeholder;

    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={values[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={placeholder}
                className="ps-8 h-9 text-sm"
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <Input
              type="number"
              value={values[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={placeholder}
              className="h-9 text-sm"
            />
          </div>
        );

      case 'numberRange':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={values[`${field.key}_min`] || ''}
                onChange={(e) => handleFieldChange(`${field.key}_min`, e.target.value)}
                placeholder={language === 'ar' ? 'من' : 'Min'}
                className="h-9 text-sm"
              />
              <Input
                type="number"
                value={values[`${field.key}_max`] || ''}
                onChange={(e) => handleFieldChange(`${field.key}_max`, e.target.value)}
                placeholder={language === 'ar' ? 'إلى' : 'Max'}
                className="h-9 text-sm"
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <Select
              value={values[field.key] || 'all'}
              onValueChange={(value) => handleFieldChange(field.key, value)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={placeholder || (language === 'ar' ? 'اختر...' : 'Select...')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {language === 'ar' ? (option.labelAr || option.label) : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-9 justify-start text-sm font-normal",
                    !values[field.key] && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="me-2 h-4 w-4" />
                  {values[field.key] 
                    ? format(new Date(values[field.key]), 'PPP')
                    : (placeholder || (language === 'ar' ? 'اختر تاريخ' : 'Pick a date'))
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={values[field.key] ? new Date(values[field.key]) : undefined}
                  onSelect={(date) => handleFieldChange(field.key, date?.toISOString())}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'dateRange':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 h-9 justify-start text-sm font-normal",
                      !values[`${field.key}_from`] && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="me-2 h-3 w-3" />
                    {values[`${field.key}_from`] 
                      ? format(new Date(values[`${field.key}_from`]), 'PP')
                      : (language === 'ar' ? 'من' : 'From')
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={values[`${field.key}_from`] ? new Date(values[`${field.key}_from`]) : undefined}
                    onSelect={(date) => handleFieldChange(`${field.key}_from`, date?.toISOString())}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 h-9 justify-start text-sm font-normal",
                      !values[`${field.key}_to`] && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="me-2 h-3 w-3" />
                    {values[`${field.key}_to`] 
                      ? format(new Date(values[`${field.key}_to`]), 'PP')
                      : (language === 'ar' ? 'إلى' : 'To')
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={values[`${field.key}_to`] ? new Date(values[`${field.key}_to`]) : undefined}
                    onSelect={(date) => handleFieldChange(`${field.key}_to`, date?.toISOString())}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getActiveFilterBadges = () => {
    return Object.entries(values)
      .filter(([_, value]) => value !== '' && value !== null && value !== undefined && value !== 'all')
      .map(([key, value]) => {
        const baseKey = key.replace(/_from|_to|_min|_max$/, '');
        const field = fields.find(f => f.key === baseKey);
        if (!field) return null;

        let displayValue = value;
        if (field.type === 'select' && field.options) {
          const option = field.options.find(o => o.value === value);
          displayValue = option ? (language === 'ar' ? option.labelAr || option.label : option.label) : value;
        } else if (field.type === 'date' || key.includes('_from') || key.includes('_to')) {
          try {
            displayValue = format(new Date(value), 'PP');
          } catch { displayValue = value; }
        }

        const label = language === 'ar' ? field.labelAr : field.label;
        let suffix = '';
        if (key.endsWith('_from')) suffix = language === 'ar' ? ' (من)' : ' (from)';
        if (key.endsWith('_to')) suffix = language === 'ar' ? ' (إلى)' : ' (to)';
        if (key.endsWith('_min')) suffix = language === 'ar' ? ' (أقل)' : ' (min)';
        if (key.endsWith('_max')) suffix = language === 'ar' ? ' (أكثر)' : ' (max)';

        return (
          <Badge
            key={key}
            variant="secondary"
            className="gap-1 text-xs py-1 px-2"
          >
            <span className="text-muted-foreground">{label}{suffix}:</span>
            <span className="font-medium">{String(displayValue).substring(0, 20)}</span>
            <button
              onClick={() => handleRemoveFilter(key)}
              className="ms-1 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })
      .filter(Boolean);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 transition-colors",
                activeFiltersCount > 0 && "border-primary text-primary"
              )}
            >
              <Filter className="h-4 w-4" />
              {language === 'ar' ? 'فلترة متقدمة' : 'Advanced Filter'}
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
            </Button>
          )}

          <div className="flex flex-wrap gap-1.5">
            {getActiveFilterBadges()}
          </div>
        </div>

        <CollapsibleContent className="mt-3">
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {fields.map(renderField)}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default AdvancedFilter;
