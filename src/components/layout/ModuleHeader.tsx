import React from 'react';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ModuleTab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface ModuleHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({ eyebrow, title, description, icon, actions }) => (
  <div className="module-header flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-3">
      {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">{icon}</div>}
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">{eyebrow}</p>}
        <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

interface ModuleTabsProps {
  tabs: ModuleTab[];
  value: string;
  onChange: (value: string) => void;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({ tabs, value, onChange }) => (
  <div className="module-tabs overflow-x-auto border-b border-slate-200/80">
    <div className="flex min-w-max items-center gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-all',
            value === tab.value ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-muted-foreground hover:border-slate-300 hover:text-foreground'
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {typeof tab.count === 'number' && <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', value === tab.value ? 'bg-white/20' : 'bg-muted')}>{tab.count}</span>}
        </button>
      ))}
    </div>
  </div>
);

interface CrudToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onClear?: () => void;
  hasFilters?: boolean;
}

export const CrudToolbar: React.FC<CrudToolbarProps> = ({ searchValue, onSearchChange, searchPlaceholder = 'Search...', filters, actions, onClear, hasFilters }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm lg:flex-row lg:items-center">
    <div className="relative min-w-0 flex-1 lg:max-w-md">
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={searchValue ?? ''} onChange={(event) => onSearchChange?.(event.target.value)} placeholder={searchPlaceholder} className="h-10 rounded-lg bg-muted/30 ps-9" />
      {searchValue && onSearchChange && <button type="button" onClick={() => onSearchChange('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="h-4 w-4" /></button>}
    </div>
    {filters && <div className="flex flex-1 flex-wrap items-center gap-2">{filters}</div>}
    <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
      {hasFilters && onClear && <Button type="button" variant="ghost" size="sm" onClick={onClear}><SlidersHorizontal className="me-1.5 h-4 w-4" />Clear filters</Button>}
      {actions}
    </div>
  </div>
);

export const AddButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => <Button onClick={onClick} className="rounded-lg"><Plus className="me-2 h-4 w-4" />{label}</Button>;
