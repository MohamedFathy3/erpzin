// components/ui/data-table.tsx
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Table, TableHeader,TableRow,TableHead,TableBody,TableCell } from './table';
import { Input } from './input';
import { Badge } from './badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  X,
  Filter,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Printer,
  Download,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

// ========== أنواع البيانات ==========
export interface Column<T> {
  key: string;
  label: string;
  labelAr?: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  width?: string | number;
}

export interface Action<T> {
  label: string;
  labelAr?: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  condition?: (item: T) => boolean;
  variant?: 'default' | 'destructive' | 'outline';
}

export interface FilterField {
  key: string;
  label: string;
  labelAr?: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'numberRange';
  options?: { value: string; label: string; labelAr?: string }[];
  placeholder?: string;
  placeholderAr?: string;
}

export interface DataTableProps<T> {
  title?: string;
  titleAr?: string;
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  loading?: boolean;
  total?: number;
  page?: number;
  perPage?: number;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  onSearch?: (search: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  onAdd?: () => void;
  addButtonText?: string;
  addButtonTextAr?: string;
  filterFields?: FilterField[];
  searchPlaceholder?: string;
  searchPlaceholderAr?: string;
  emptyMessage?: string;
  emptyMessageAr?: string;
  className?: string;
  rowClassName?: string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedItems: T[]) => void;
  sortable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}

export function DataTable<T extends Record<string, any>>({
  title,
  titleAr,
  data,
  columns,
  actions,
  loading = false,
  total,
  page = 1,
  perPage = 10,
  onPageChange,
  onPerPageChange,
  onSearch,
  onFilter,
  onRefresh,
  onExport,
  onPrint,
  onAdd,
  addButtonText,
  addButtonTextAr,
  filterFields,
  searchPlaceholder,
  searchPlaceholderAr,
  emptyMessage = 'No data found',
  emptyMessageAr = 'لا توجد بيانات',
  className,
  rowClassName,
  onRowClick,
  selectable = false,
  onSelectionChange,
  sortable = false,
  onSort,
}: DataTableProps<T>) {
  const { language, direction } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // الترجمات
  const t = {
    search: searchPlaceholder || (language === 'ar' ? (searchPlaceholderAr || 'بحث...') : 'Search...'),
    empty: language === 'ar' ? emptyMessageAr : emptyMessage,
    showing: language === 'ar' ? 'عرض' : 'Showing',
    to: language === 'ar' ? 'إلى' : 'to',
    of: language === 'ar' ? 'من' : 'of',
    items: language === 'ar' ? 'عنصر' : 'items',
    previous: language === 'ar' ? 'السابق' : 'Previous',
    next: language === 'ar' ? 'التالي' : 'Next',
    filters: language === 'ar' ? 'تصفية' : 'Filters',
    clearFilters: language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters',
    apply: language === 'ar' ? 'تطبيق' : 'Apply',
    add: addButtonText || (language === 'ar' ? (addButtonTextAr || 'إضافة') : 'Add'),
    export: language === 'ar' ? 'تصدير' : 'Export',
    print: language === 'ar' ? 'طباعة' : 'Print',
    refresh: language === 'ar' ? 'تحديث' : 'Refresh',
    actions: language === 'ar' ? 'الإجراءات' : 'Actions',
    selectAll: language === 'ar' ? 'تحديد الكل' : 'Select All',
  };

  // معالجة البحث
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  // معالجة تغيير الصفحة
  const handlePageChange = (newPage: number) => {
    onPageChange?.(newPage);
  };

  // معالجة الفرز
  const handleSort = (key: string) => {
    if (!sortable) return;
    
    let newDirection: 'asc' | 'desc' = 'asc';
    if (sortKey === key) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  // معالجة اختيار عنصر
  const handleSelectItem = (item: T, checked: boolean) => {
    let newSelected: T[];
    if (checked) {
      newSelected = [...selectedItems, item];
    } else {
      newSelected = selectedItems.filter(i => i.id !== item.id);
    }
    setSelectedItems(newSelected);
    onSelectionChange?.(newSelected);
  };

  // معالجة اختيار الكل
  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? data : [];
    setSelectedItems(newSelected);
    onSelectionChange?.(newSelected);
  };

  // حساب نطاق العرض
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total || data.length);

  // أيقونة الفرز
  const getSortIcon = (key: string) => {
    if (!sortable) return null;
    if (sortKey !== key) return <ArrowUpDown size={14} className="ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="ml-1" /> 
      : <ArrowDown size={14} className="ml-1" />;
  };

  return (
    <Card className={cn("card-elevated", className)}>
      {/* Header */}
      {(title || onSearch || onAdd || onExport || onPrint || onRefresh) && (
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            {/* العنوان وزر الإضافة */}
            <div className="flex items-center justify-between">
              {title && (
                <CardTitle className="text-lg">
                  {language === 'ar' ? titleAr || title : title}
                </CardTitle>
              )}
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                    <RefreshCw size={16} className={cn(loading && "animate-spin")} />
                  </Button>
                )}
                {onExport && (
                  <Button variant="outline" size="sm" onClick={onExport}>
                    <Download size={16} />
                  </Button>
                )}
                {onPrint && (
                  <Button variant="outline" size="sm" onClick={onPrint}>
                    <Printer size={16} />
                  </Button>
                )}
                {onAdd && (
                  <Button size="sm" onClick={onAdd}>
                    {t.add}
                  </Button>
                )}
              </div>
            </div>

            {/* البحث والفلاتر */}
            <div className="flex flex-col sm:flex-row gap-3">
              {onSearch && (
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.search}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="ps-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute end-2 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => handleSearch('')}
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
              )}

              {filterFields && filterFields.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter size={16} />
                  {t.filters}
                </Button>
              )}
            </div>

            {/* فلاتر متقدمة */}
            {showFilters && filterFields && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-sm font-medium">
                        {language === 'ar' ? field.labelAr || field.label : field.label}
                      </label>
                      {field.type === 'text' && (
                        <Input
                          placeholder={language === 'ar' ? field.placeholderAr || field.placeholder : field.placeholder}
                          value={filters[field.key] || ''}
                          onChange={(e) => setFilters({ ...filters, [field.key]: e.target.value })}
                        />
                      )}
                      {field.type === 'select' && field.options && (
                        <select
                          className="w-full px-3 py-2 border rounded-md bg-background"
                          value={filters[field.key] || ''}
                          onChange={(e) => setFilters({ ...filters, [field.key]: e.target.value })}
                        >
                          <option value="">{language === 'ar' ? 'الكل' : 'All'}</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {language === 'ar' ? opt.labelAr || opt.label : opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setFilters({})}>
                    {t.clearFilters}
                  </Button>
                  <Button size="sm" onClick={() => onFilter?.(filters)}>
                    {t.apply}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      )}

      {/* Table */}
      <CardContent className="p-0">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {selectable && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === data.length && data.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                  )}
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        col.className,
                        sortable && col.sortable !== false && "cursor-pointer select-none"
                      )}
                      style={{ width: col.width }}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {language === 'ar' ? col.labelAr || col.label : col.label}
                        {getSortIcon(col.key)}
                      </div>
                    </TableHead>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableHead className="text-center w-24">{t.actions}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-12 text-muted-foreground">
                      {t.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => (
                    <TableRow
                      key={item.id || index}
                      className={cn(
                        "hover:bg-muted/30",
                        onRowClick && "cursor-pointer",
                        rowClassName
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItems.some(i => i.id === item.id)}
                            onChange={(e) => handleSelectItem(item, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render ? col.render(item, index) : item[col.key]}
                        </TableCell>
                      ))}
                      {actions && actions.length > 0 && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {actions.length <= 3 ? (
                              // لو أقل من 3 أزرار، نعرضهم مباشرة
                              actions
                                .filter(action => !action.condition || action.condition(item))
                                .map((action, idx) => (
                                  <Button
                                    key={idx}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => action.onClick(item)}
                                    title={language === 'ar' ? action.labelAr || action.label : action.label}
                                  >
                                    {action.icon || (
                                      action.label === 'edit' ? <Edit2 size={16} /> :
                                      action.label === 'delete' ? <Trash2 size={16} className="text-destructive" /> :
                                      action.label === 'view' ? <Eye size={16} /> :
                                      action.label === 'print' ? <Printer size={16} /> : null
                                    )}
                                  </Button>
                                ))
                            ) : (
                              // لو أكثر من 3، نحطهم في Dropdown
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {actions
                                    .filter(action => !action.condition || action.condition(item))
                                    .map((action, idx) => (
                                      <DropdownMenuItem
                                        key={idx}
                                        onClick={() => action.onClick(item)}
                                        className={action.variant === 'destructive' ? 'text-destructive' : ''}
                                      >
                                        {action.icon}
                                        {language === 'ar' ? action.labelAr || action.label : action.label}
                                      </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {(total !== undefined || onPageChange) && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t.showing} {from} {t.to} {to} {t.of} {total || data.length} {t.items}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm px-2">
                  {page} / {Math.ceil((total || data.length) / perPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= Math.ceil((total || data.length) / perPage)}
                >
                  <ChevronRight size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.ceil((total || data.length) / perPage))}
                  disabled={page >= Math.ceil((total || data.length) / perPage)}
                >
                  <ChevronsRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}