// constants/index.ts
export const FILE_ACCEPTANCE = {
  EXCEL: '.xlsx,.xls',
  CSV: '.csv',
  PDF: '.pdf'
} as const;

export const DEFAULT_PAGINATION = {
  perPage: 100,
  page: 1
} as const;

export const PRODUCT_FILTERS = {
  BEGINNING_BALANCE: 'beginning_balance',
  ACTIVE: 'active',
  HAS_VARIANTS: 'has_variants'
} as const;

export const TOAST_MESSAGES = {
  ar: {
    saveSuccess: 'تم الحفظ بنجاح',
    saveError: 'حدث خطأ في الحفظ',
    deleteSuccess: 'تم الحذف بنجاح',
    deleteError: 'حدث خطأ في الحذف',
    importSuccess: 'تم الاستيراد بنجاح',
    importError: 'حدث خطأ في الاستيراد',
    exportSuccess: 'تم التصدير بنجاح',
    exportError: 'حدث خطأ في التصدير'
  },
  en: {
    saveSuccess: 'Saved successfully',
    saveError: 'Error saving',
    deleteSuccess: 'Deleted successfully',
    deleteError: 'Error deleting',
    importSuccess: 'Imported successfully',
    importError: 'Error importing',
    exportSuccess: 'Exported successfully',
    exportError: 'Error exporting'
  }
} as const;