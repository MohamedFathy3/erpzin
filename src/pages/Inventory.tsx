import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import MainLayout from '@/components/layout/MainLayout';
import { ModuleHeader, ModuleTabs } from '@/components/layout/ModuleHeader';
import CategoryManager from '@/components/inventory/CategoryManager';
import ProductList, { Product, transformApiProduct } from '@/components/inventory/ProductList';
import ProductForm, { ProductFormData } from '@/components/inventory/ProductForm';
import ProductVariantsModal from '@/components/inventory/ProductVariantsModal';
import { BarcodeScanner, BarcodeLabelPrinter } from '@/components/inventory/BarcodeSystem';
import BarcodePrintingCenter from '@/components/inventory/BarcodePrintingCenter';
import StockTransfer from '@/components/inventory/StockTransfer';
import LowStockAlerts from '@/components/inventory/LowStockAlerts';
import InventoryCount from '@/components/inventory/InventoryCount';
import UnitsVariantsManager from '@/components/inventory/UnitsVariantsManager';
import PromotionsManager from '@/components/inventory/PromotionsManager';
import AutomotiveServicesInventory from '@/components/inventory/AutomotiveServicesInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Package, ArrowRightLeft, Bell, ClipboardList, Palette, Filter, X, Tag, Gift, CarFront, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ProductVariant } from '@/hooks/useVariantData';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

/* =========================================================
   تحويل بيانات المنتج من API إلى بيانات الفورم
   ========================================================= */
export const transformApiProductToFormData = (apiProduct: any): ProductFormData => {
  let imageUrl = '';
  let imageId: number | undefined;

  if (apiProduct.image) {
    if (typeof apiProduct.image === 'object') {
      imageId = apiProduct.image.id;
      imageUrl =
        apiProduct.image.fullUrl ||
        apiProduct.image.previewUrl ||
        apiProduct.image.url ||
        '';
    } else if (typeof apiProduct.image === 'number') {
      imageId = apiProduct.image;
    }
  } else if (apiProduct.image_url || apiProduct.imageUrl) {
    imageUrl = apiProduct.image_url || apiProduct.imageUrl;
  }

  const status =
    apiProduct.active === true || apiProduct.status === 'active' ? 'active' : 'inactive';
  const categoryId =
    apiProduct.category?.id?.toString() || apiProduct.category_id?.toString() || '';

  const variants: ProductVariant[] = [];
  const selectedSizes: string[] = [];
  const selectedColors: string[] = [];

  if (apiProduct.units && Array.isArray(apiProduct.units)) {
    apiProduct.units.forEach((unit: any, index: number) => {
      if (unit.unit_id) selectedSizes.push(unit.unit_id.toString());

      if (unit.colors && Array.isArray(unit.colors) && unit.colors.length > 0) {
        unit.colors.forEach((color: any) => {
          if (color.color_id) selectedColors.push(color.color_id.toString());
          variants.push({
            id: `${unit.unit_id || index}-${color.color_id || index}`,
            colorId: color.color_id?.toString() || '',
            unitId: unit.unit_id?.toString() || '',
            sku:
              unit.sku ||
              `${apiProduct.sku}-${unit.unit_id || index}-${color.color_id || index}`,
            barcode: unit.barcode || '',
            customBarcode: false,
            stock: color.stock ?? 0,
            cost: unit.cost_price || apiProduct.cost || 0,
            price: unit.sell_price || apiProduct.price || 0,
            enabled: true,
          });
        });
      } else {
        variants.push({
          id: `${unit.unit_id || index}`,
          colorId: '',
          unitId: unit.unit_id?.toString() || '',
          sku: unit.sku || `${apiProduct.sku}-${unit.unit_id || index}`,
          barcode: unit.barcode || '',
          customBarcode: false,
          stock: unit.stock ?? 0,
          cost: unit.cost_price || apiProduct.cost || 0,
          price: unit.sell_price || apiProduct.price || 0,
          enabled: true,
        });
      }
    });
  }

  // ✅ الأهم: قراءة warehouse_stocks من الباك إند
  const rawStocks =
    apiProduct.warehouse_stocks &&
      typeof apiProduct.warehouse_stocks === 'object' &&
      !Array.isArray(apiProduct.warehouse_stocks)
      ? apiProduct.warehouse_stocks
      : {};

  const warehouseStocks: Record<string, number> = {};
  Object.entries(rawStocks).forEach(([id, stock]) => {
    warehouseStocks[String(id)] = Number(stock) || 0;
  });

  const apiWarehouseIds = Array.isArray(apiProduct.warehouse_ids)
    ? apiProduct.warehouse_ids
    : [];

  const warehouseIds: string[] = Array.from(
    new Set([
      ...apiWarehouseIds.map((id: any) => String(id)),
      ...Object.keys(warehouseStocks).map(String),
    ])
  ).filter((id) => /^\d+$/.test(id) && Number(id) > 0);

  // تأكد أن كل مخزن محدد له قيمة مخزون
  warehouseIds.forEach((id) => {
    if (warehouseStocks[id] === undefined) {
      warehouseStocks[id] = 0;
    }
  });
  return {
    id: apiProduct.id?.toString(),
    name: apiProduct.name || '',
    nameAr: apiProduct.name_ar || apiProduct.name || '',
    description: apiProduct.description || '',
    descriptionAr: apiProduct.description_ar || '',
    sku: apiProduct.sku || '',
    barcode: apiProduct.barcode || '',
    categoryId,
    main_unit_id: apiProduct.main_unit_id?.toString() || '',
    price: Number(apiProduct.price) || 0,
    cost: Number(apiProduct.cost) || 0,
    hasVariants: apiProduct.has_variants || false,
    variants,
    selectedSizes,
    selectedColors,
    stock: Number(apiProduct.stock) || 0,
    reorderPoint: Number(apiProduct.reorder_level) || 5,
    status,
    imageId,
    imageUrl,
    branchIds: Array.isArray(apiProduct.branch_ids)
      ? apiProduct.branch_ids.map((id: any) => id.toString())
      : [],
    warehouseIds,
    warehouseStocks,
    valuationMethod: apiProduct.valuation_method || 'fifo',
  };
};

/* =========================================================
   Interceptors (Logging)
   ========================================================= */
api.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params,
    });
    return config;
  },
  (error) => {
    console.error('📤 Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('📥 Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

/* =========================================================
   Inventory Component
   ========================================================= */
const Inventory: React.FC = () => {
  const { language } = useLanguage();
  const { currentBranch, currentWarehouse } = useApp();
  const [activeTab, setActiveTab] = useState('products');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductFormData | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodePrinter, setShowBarcodePrinter] = useState(false);
  const [selectedProductForPrint, setSelectedProductForPrint] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);

  const queryClient = useQueryClient();

  // المستودع النشط
  const activeWarehouseId = useMemo<number | null>(() => {
    if (warehouseFilter !== 'all') return Number(warehouseFilter);
    // if (currentWarehouse?.id) return Number(currentWarehouse.id);
    return null;
  }, [warehouseFilter, currentWarehouse?.id]);

  /* ========== جلب المنتجات ========== */
  const {
    data: dbProducts = [],
    refetch,
    isLoading: productsLoading,
  } = useQuery({
    queryKey: [
      'inventory-products',
      selectedCategory,
      categoryFilter,
      statusFilter,
      warehouseFilter,
      currentBranch?.id,
      currentWarehouse?.id,
      searchQuery,
    ],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false,
          delete: false,
          filters: {},
        };

        if (selectedCategory && selectedCategory !== 'all') {
          payload.filters.category_id = parseInt(selectedCategory);
        } else if (categoryFilter && categoryFilter !== 'all') {
          payload.filters.category_id = parseInt(categoryFilter);
        }

        if (statusFilter !== 'all') {
          payload.filters.active = statusFilter === 'active';
        }

        if (currentBranch?.id) payload.filters.branch_id = parseInt(String(currentBranch.id));

        if (activeWarehouseId) {
          payload.filters.stock_warehouse_id = activeWarehouseId;
        }

        if (searchQuery.trim()) {
          payload.filters.name = searchQuery.trim();
        }

        const response = await api.post('/product/index', payload);
        return response.data.data || [];
      } catch (error) {
        console.error('❌ Error fetching products:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب المنتجات' : 'Error fetching products',
          variant: 'destructive',
        });
        return [];
      }
    },
  });

  /* ========== جلب التصنيفات ========== */
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories-filter'],
    queryFn: async () => {
      try {
        const response = await api.post('/category/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false,
        });
        return response.data.data || [];
      } catch (error) {
        toast({
          title: language === 'ar' ? 'خطأ في جلب التصنيفات' : 'Error fetching categories',
          variant: 'destructive',
        });
        return [];
      }
    },
  });

  /* ========== جلب الفروع ========== */
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false,
        });
        return response.data.data || [];
      } catch {
        return [];
      }
    },
  });

  /* ========== جلب المستودعات ========== */
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      try {
        const response = await api.post('/warehouse/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false,
        });
        return response.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const dbCategories = categories;






  
  const products: Product[] = useMemo(() => {
    return dbProducts.map((product: any) => {
      const transformed: any = transformApiProduct(product);

      // نحتفظ بكميات كل المخازن
      transformed.warehouseStocks = product.warehouse_stocks || {};

      if (activeWarehouseId) {
        const ws = product.warehouse_stocks || {};
        transformed.stock =
          product.display_stock !== undefined && product.display_stock !== null
            ? Number(product.display_stock) || 0
            : Number(ws[activeWarehouseId] ?? 0);
      }

      return transformed as Product;
    });
  }, [dbProducts, activeWarehouseId]);

  /* ========== فلترة المنتجات ========== */
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      const query = searchQuery.trim().toLocaleLowerCase();
      const matchesSearch =
        query === '' ||
        product.name.toLocaleLowerCase().includes(query) ||
        (product.nameAr || '').toLocaleLowerCase().includes(query) ||
        product.sku.toLocaleLowerCase().includes(query) ||
        (product.barcode && product.barcode.toLocaleLowerCase().includes(query));

      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = product.stock > 10;
      else if (stockFilter === 'low_stock')
        matchesStock = product.stock > 0 && product.stock <= 10;
      else if (stockFilter === 'out_of_stock') matchesStock = product.stock === 0;
      else if (stockFilter === 'minimum_stock')
        matchesStock = product.stock <= (product.minStock ?? 5);

      return matchesSearch && matchesStock;
    });

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (language === 'ar' ? a.nameAr : a.name).localeCompare(
            language === 'ar' ? b.nameAr : b.name
          );
        case 'name_desc':
          return (language === 'ar' ? b.nameAr : b.name).localeCompare(
            language === 'ar' ? a.nameAr : a.name
          );
        case 'barcode_asc':
          return (a.barcode || '').localeCompare(b.barcode || '');
        case 'barcode_desc':
          return (b.barcode || '').localeCompare(a.barcode || '');
        case 'stock_asc':
          return a.stock - b.stock;
        case 'stock_desc':
          return b.stock - a.stock;
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'sku_asc':
          return a.sku.localeCompare(b.sku);
        case 'sku_desc':
          return b.sku.localeCompare(a.sku);
        case 'created_desc':
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, stockFilter, sortBy, language]);

  /* ========== Pagination ========== */
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, stockFilter, categoryFilter, warehouseFilter, sortBy, selectedCategory]);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const clearFilters = () => {
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setWarehouseFilter('all');
    setSelectedCategory(null);
    setSearchQuery('');
    setSortBy('created_desc');
  };

  /* ========== تصدير الحد الأدنى Excel ========== */
  const exportMinimumStockToExcel = () => {
    const minimumStockProducts = filteredProducts.filter(
      (product) => product.stock <= (product.minStock ?? 5)
    );
    if (minimumStockProducts.length === 0) {
      toast({
        title: language === 'ar' ? 'لا توجد منتجات للتصدير' : 'No products to export',
        description:
          language === 'ar'
            ? 'لا توجد منتجات وصلت إلى الحد الأدنى للمخزون.'
            : 'No products have reached their minimum stock level.',
        variant: 'destructive',
      });
      return;
    }

    const rows = minimumStockProducts.map((product) =>
      language === 'ar'
        ? {
          'اسم المنتج': product.nameAr || product.name,
          'كود المنتج': product.sku,
          الباركود: product.barcode || '',
          التصنيف: product.categoryAr || product.category,
          'الكمية الحالية': product.stock,
          'الحد الأدنى للمخزون': product.minStock ?? 5,
        }
        : {
          'Product name': product.name,
          SKU: product.sku,
          Barcode: product.barcode || '',
          Category: product.category,
          'Current stock': product.stock,
          'Minimum stock': product.minStock ?? 5,
        }
    );
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      language === 'ar' ? 'الحد الأدنى' : 'Minimum Stock'
    );
    XLSX.writeFile(
      workbook,
      `minimum-stock-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast({
      title: language === 'ar' ? 'تم تصدير ملف Excel' : 'Excel export complete',
      description:
        language === 'ar'
          ? `تم تصدير ${minimumStockProducts.length} منتج.`
          : `Exported ${minimumStockProducts.length} products.`,
    });
  };

  const hasActiveFilters =
    statusFilter !== 'all' ||
    stockFilter !== 'all' ||
    categoryFilter !== 'all' ||
    warehouseFilter !== 'all' ||
    selectedCategory !== null ||
    searchQuery !== '' ||
    sortBy !== 'created_desc';

  /* ========== إضافة منتج ========== */
  const handleAddProduct = () => {
    setEditProduct(null);
    setShowProductForm(true);
  };

  /* ========== تعديل منتج ========== */
  const handleEditProduct = async (product: Product) => {
    try {
      const response = await api.get(`/product/${product.id}`);
      const dbProduct = response.data.data;

      if (!dbProduct) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'المنتج غير موجود' : 'Product not found',
          variant: 'destructive',
        });
        return;
      }

      const formData = transformApiProductToFormData(dbProduct);
      formData.main_unit_id = dbProduct.main_unit_id?.toString() || '';

      console.log('✅ [EDIT] warehouse_stocks raw:', dbProduct.warehouse_stocks);
      console.log('✅ [EDIT] warehouseIds:', formData.warehouseIds);
      console.log('✅ [EDIT] warehouseStocks:', formData.warehouseStocks);
      console.log('✅ [EDIT] stock total:', formData.stock);

      setEditProduct(formData);
      setShowProductForm(true);
    } catch (error) {
      console.error('❌ Error fetching product details:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description:
          language === 'ar'
            ? 'تعذر جلب بيانات المنتج'
            : 'Failed to fetch product details',
        variant: 'destructive',
      });
    }
  };

  /* ========== حذف منتج ========== */
  const handleDeleteProduct = async (productId: string) => {
    try {
      await api.delete(`/product/delete`, { data: { items: [productId] } });
      toast({
        title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully',
      });
      refetch();
    } catch {
      toast({
        title: language === 'ar' ? 'خطأ في الحذف' : 'Delete Error',
        variant: 'destructive',
      });
    }
  };

  /* ========== نسخ منتج ========== */
  const handleDuplicateProduct = (product: Product) => {
    setEditProduct({
      ...product,
      id: undefined,
      name: `${product.name} (Copy)`,
      nameAr: `${product.nameAr} (نسخة)`,
      sku: `${product.sku}-COPY`,
    });
    setShowProductForm(true);
    toast({
      title: language === 'ar' ? 'تم تجهيز النسخة' : 'Ready to duplicate',
      description:
        language === 'ar' ? 'قم بتعديل البيانات ثم احفظ' : 'Edit data then save',
    });
  };

  const handleViewProduct = (product: Product) => handleEditProduct(product);

  /* ========== طباعة باركود ========== */
  const handlePrintBarcode = (product: Product) => {
    setSelectedProductForPrint({
      id: product.id,
      name: product.name,
      name_ar: product.nameAr,
      sku: product.sku,
      barcode: product.barcode,
      price: product.price,
      stock: product.stock,
    });
    setShowBarcodePrinter(true);
  };

  /* ========== عرض المتغيرات ========== */
  const handleViewVariants = (product: Product) => {
    const dbProduct = dbProducts.find((p: any) => p.id.toString() === product.id);
    setSelectedProductForVariants({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      cost: product.cost,
      sku: product.sku,
      stock: product.stock,
      image: product.image,
      imageUrl: product.imageUrl,
      image_url: product.image_url,
      minStock: product.minStock,
      units: dbProduct?.units || [],
    });
    setShowVariantsModal(true);
  };

  /* =========================================================
     ✅ handleSaveProduct — النسخة النهائية المصححة
     ========================================================= */
  const handleSaveProduct = async (formData: ProductFormData) => {
    try {
      const selectedWarehouseIds = [
        ...new Set(
          (formData.warehouseIds ?? [])
            .map((id) => Number(id))
            .filter((id) => Number.isSafeInteger(id) && id > 0)
        ),
      ];

      const warehouseStocksPayload: Record<string, number> = {};

      for (const warehouseId of selectedWarehouseIds) {
        const key = String(warehouseId);
        const rawStock = formData.warehouseStocks?.[key];
        const quantity = Number(rawStock ?? 0);

        if (!Number.isFinite(quantity) || quantity < 0) {
          throw new Error(`Invalid stock for warehouse ${warehouseId}`);
        }

        warehouseStocksPayload[key] = quantity;
      }
      const totalStock = Object.values(warehouseStocksPayload).reduce(
        (sum, quantity) => sum + quantity,
        0
      );



      const productData: any = {
        name: formData.name,
        description: formData.description || '',
        category_id: formData.categoryId ? parseInt(formData.categoryId) : null,
        sku: formData.sku,
        barcode: formData.barcode || null,
        main_unit_id: formData.main_unit_id ? parseInt(formData.main_unit_id) : null,
        reorder_level: formData.reorderPoint || 5,
        cost: formData.cost || 0,
        price: formData.price || 0,
        stock: totalStock, // ✅ دايماً مجموع المخازن
        active: formData.status === 'active',
        has_variants: formData.hasVariants || false,
        branch_ids: formData.branchIds?.length
          ? formData.branchIds.map((id) => parseInt(id))
          : [],
        warehouse_ids: JSON.stringify(selectedWarehouseIds),
        warehouse_stocks: JSON.stringify(warehouseStocksPayload),
        valuation_method: formData.valuationMethod || 'fifo',

        units: [],
      };

      if (formData.nameAr?.trim()) productData.name_ar = formData.nameAr;
      if (formData.descriptionAr?.trim())
        productData.description_ar = formData.descriptionAr;

      if (formData.imageId && formData.imageId > 0) {
        productData.image = formData.imageId;
      } else if (formData.imageUrl?.trim()) {
        productData.image_url = formData.imageUrl;
      }
      if (formData.id) {
        const originalIds = (editProduct?.warehouseIds ?? []).map(Number);
        productData.removed_warehouse_ids = JSON.stringify(
          originalIds.filter((id) => !selectedWarehouseIds.includes(id))
        );
      }
      // ✅ معالجة الـ variants
      if (formData.hasVariants && formData.variants?.length > 0) {
        const enabledVariants = formData.variants.filter((v) => v.enabled);
        if (enabledVariants.length > 0) {
          const unitsMap = new Map();

          enabledVariants.forEach((variant) => {
            const unitId =
              variant.unitId && variant.unitId !== ''
                ? parseInt(variant.unitId)
                : null;
            if (!unitId) return;

            if (!unitsMap.has(unitId)) {
              unitsMap.set(unitId, {
                unit_id: unitId,
                cost_price: variant.cost || formData.cost || 0,
                sell_price: variant.price || formData.price || 0,
                barcode: variant.barcode || `${formData.sku}-${unitId}`,
                colors: [],
              });
            }

            if (variant.colorId && variant.colorId !== '') {
              const colorId = parseInt(variant.colorId);
              const existingColors = unitsMap.get(unitId).colors;
              if (!existingColors.some((c: any) => c.color_id === colorId)) {
                unitsMap.get(unitId).colors.push({
                  color_id: colorId,
                  stock: variant.stock || 0,
                });
              }
            }
          });

          productData.units = Array.from(unitsMap.values());
        }
      }

      // ✅ Log للتشخيص


      let productId = formData.id;
      if (productId) {
        console.log('WAREHOUSE DEBUG', {
          selectedWarehouseIds,
          warehouseStocksPayload,
          warehouseIdsTypes: selectedWarehouseIds.map((id) => typeof id),
          stockKeys: Object.keys(warehouseStocksPayload),
          stock: totalStock,
        });
        const res = await api.put(`/product/${productId}`, productData);
        console.log('PUT result:', res.status, res.data);

        // السيرفر ممكن يرجّع 200 والخطأ جوه الـ body
        if (res.data?.result === 'Error' || res.data?.status === false) {
          throw { response: { data: { message: res.data.message || 'Update failed' } } };
        }

        // اقرأ المنتج تاني وقارن اللي اتحفظ باللي اتبعت
        const check = await api.get(`/product/${productId}`);
        const saved = check.data?.data?.warehouse_stocks || {};
        const mismatch = Object.entries(warehouseStocksPayload).filter(
          ([id, qty]) => Number(saved[id] ?? 0) !== Number(qty)
        );
        console.log('VERIFY saved:', saved, 'sent:', warehouseStocksPayload, 'mismatch:', mismatch);
        if (mismatch.length) {
          throw {
            response: {
              data: {
                message: `السيرفر لم يحفظ الكميات: ${JSON.stringify(mismatch)}`,
              },
            },
          };
        }
      } else {
        const response = await api.post('/product', productData);
        productId = response.data.id;
      }

      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      await refetch();

      setShowProductForm(false);
      setEditProduct(null);

      toast({
        title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully',
        description:
          language === 'ar'
            ? `تم حفظ المنتج "${formData.name}" — إجمالي المخزون: ${totalStock}`
            : `Product "${formData.name}" saved — total stock: ${totalStock}`,
      });
    } catch (error: any) {
      let errorMessage = 'Unknown error';
      if (error.response?.data?.message) errorMessage = error.response.data.message;
      else if (error.response?.data?.errors)
        errorMessage = Object.values(error.response.data.errors).flat().join(', ');
      else if (error.message) errorMessage = error.message;

      toast({
        title: language === 'ar' ? 'خطأ في الحفظ' : 'Save Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleBarcodeProductFound = (product: any) => {
    const found = products.find((p) => p.id === product.id);
    if (found) handleEditProduct(found);
  };

  const barcodeProducts = dbProducts.map((p: any) => ({
    id: p.id,
    name: p.name,
    name_ar: p.name_ar,
    sku: p.sku,
    barcode: p.barcode,
    price: Number(p.price),
    stock: p.stock,
  }));

  const isLoading = productsLoading || categoriesLoading;

  return (
    <MainLayout activeItem="inventory">
      <div className="h-full flex flex-col gap-4">
        <ModuleHeader
          eyebrow={language === 'ar' ? 'دورة المخزون' : 'Inventory cycle'}
          title={language === 'ar' ? 'المخزون والمنتجات' : 'Inventory & products'}
          description={
            language === 'ar'
              ? 'المنتجات والتصنيفات والتحويلات والجرد في مساحة تشغيل واحدة.'
              : 'Products, categories, transfers and counts in one operating workspace.'
          }
          icon={<Package className="h-5 w-5" />}
          actions={
            <Button onClick={handleAddProduct} className="rounded-lg">
              <Plus size={16} className="me-2" />
              {language === 'ar' ? 'إضافة منتج' : 'Add product'}
            </Button>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <ModuleTabs
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { value: 'products', label: language === 'ar' ? 'المنتجات' : 'Products', icon: <Package size={14} /> },
              { value: 'transfers', label: language === 'ar' ? 'التحويلات' : 'Transfers', icon: <ArrowRightLeft size={14} /> },
              { value: 'count', label: language === 'ar' ? 'الجرد' : 'Stock count', icon: <ClipboardList size={14} /> },
              { value: 'alerts', label: language === 'ar' ? 'التنبيهات' : 'Alerts', icon: <Bell size={14} /> },
              { value: 'variants', label: language === 'ar' ? 'الوحدات والمتغيرات' : 'Variants', icon: <Palette size={14} /> },
              { value: 'barcode', label: language === 'ar' ? 'الباركود' : 'Barcode', icon: <Tag size={14} /> },
              { value: 'promotions', label: language === 'ar' ? 'العروض' : 'Promotions', icon: <Gift size={14} /> },
              { value: 'automotive-services', label: language === 'ar' ? 'خدمات السيارات' : 'Auto services', icon: <CarFront size={14} /> },
            ]}
          />

          <TabsContent value="products" className="flex-1 flex flex-col mt-2">
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter size={18} className="text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {language === 'ar' ? 'تصفية المنتجات' : 'Filter Products'}
                  </span>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="ms-auto text-destructive hover:text-destructive"
                    >
                      <X size={14} className="me-1" />
                      {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <div className="relative">
                      <Search
                        className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={16}
                      />
                      <Input
                        placeholder={
                          language === 'ar'
                            ? 'بحث بالباركود أو الاسم أو SKU...'
                            : 'Search by barcode, name, or SKU...'
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-9 h-9"
                      />
                    </div>
                  </div>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={language === 'ar' ? 'التصنيف' : 'Category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}
                      </SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {language === 'ar' ? cat.name_ar || cat.name : cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar' ? 'جميع الحالات' : 'All Status'}
                      </SelectItem>
                      <SelectItem value="active">
                        {language === 'ar' ? 'نشط' : 'Active'}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {language === 'ar' ? 'غير نشط' : 'Inactive'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-3 flex flex-col gap-3 md:flex-row">
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="h-9 w-full md:w-64">
                      <SelectValue
                        placeholder={language === 'ar' ? 'حالة المخزون' : 'Stock level'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar' ? 'كل مستويات المخزون' : 'All stock levels'}
                      </SelectItem>
                      <SelectItem value="in_stock">
                        {language === 'ar' ? 'متوفر' : 'In stock'}
                      </SelectItem>
                      <SelectItem value="low_stock">
                        {language === 'ar' ? 'مخزون منخفض (10 أو أقل)' : 'Low stock (10 or less)'}
                      </SelectItem>
                      <SelectItem value="out_of_stock">
                        {language === 'ar' ? 'نفد المخزون' : 'Out of stock'}
                      </SelectItem>
                      <SelectItem value="minimum_stock">
                        {language === 'ar' ? 'الحد الأدنى للمخزون' : 'Minimum stock'}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-2"
                    onClick={exportMinimumStockToExcel}
                    disabled={stockFilter !== 'minimum_stock' || filteredProducts.length === 0}
                  >
                    <FileSpreadsheet size={16} />
                    {language === 'ar'
                      ? 'تنزيل نتائج الحد الأدنى Excel'
                      : 'Export minimum stock to Excel'}
                  </Button>
                </div>

                {/* Warehouse Filter */}
                <div className="mt-3">
                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="h-9 w-full md:w-64">
                      <SelectValue
                        placeholder={language === 'ar' ? 'المستودع' : 'Warehouse'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar'
                          ? currentWarehouse?.id
                            ? 'المستودع الحالي'
                            : 'جميع المخازن'
                          : currentWarehouse?.id
                            ? 'Current warehouse'
                            : 'All Warehouses'}
                      </SelectItem>
                      {warehouses.map((warehouse: any) => (
                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                          {language === 'ar'
                            ? warehouse.name_ar || warehouse.name
                            : warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeWarehouseId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'ar'
                        ? `عرض المخزون من: ${warehouses.find((w: any) => Number(w.id) === activeWarehouseId)
                          ?.name || `#${activeWarehouseId}`
                        }`
                        : `Showing stock from: ${warehouses.find((w: any) => Number(w.id) === activeWarehouseId)
                          ?.name || `#${activeWarehouseId}`
                        }`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex-1 flex gap-4 min-h-0">
              <div
                className={cn(
                  'flex-shrink-0 hidden lg:block transition-all duration-300',
                  isCategoryCollapsed ? 'w-12' : 'w-66'
                )}
              >
                <CategoryManager
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  isCollapsed={isCategoryCollapsed}
                  onCollapseChange={setIsCategoryCollapsed}
                />
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <ProductList
                      products={paginatedProducts}
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                      onDuplicate={handleDuplicateProduct}
                      onView={handleViewProduct}
                      onPrintBarcode={handlePrintBarcode}
                      onViewVariants={handleViewVariants}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      totalProducts={filteredProducts.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transfers" className="flex-1 mt-2">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <StockTransfer />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="flex-1 mt-2">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <LowStockAlerts />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="count" className="flex-1 mt-2">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <InventoryCount />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automotive-services" className="flex-1 mt-2">
            <AutomotiveServicesInventory />
          </TabsContent>

          <TabsContent value="variants" className="flex-1 mt-2">
            <UnitsVariantsManager />
          </TabsContent>

          <TabsContent value="barcode" className="flex-1 mt-2">
            <BarcodePrintingCenter />
          </TabsContent>

          <TabsContent value="promotions" className="flex-1 mt-2">
            <PromotionsManager />
          </TabsContent>
        </Tabs>
      </div>

      <ProductForm
        isOpen={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setEditProduct(null);
        }}
        onSave={handleSaveProduct}
        editProduct={editProduct}
        branches={branches}
        warehouses={warehouses}
        categories={dbCategories}
        isLoadingBranches={loadingBranches}
        isLoadingWarehouses={loadingWarehouses}
        isLoadingCategories={categoriesLoading}
      />

      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onProductFound={handleBarcodeProductFound}
        products={barcodeProducts}
      />

      <BarcodeLabelPrinter
        isOpen={showBarcodePrinter}
        onClose={() => {
          setShowBarcodePrinter(false);
          setSelectedProductForPrint(null);
        }}
        products={barcodeProducts}
        selectedProduct={selectedProductForPrint}
      />

      <ProductVariantsModal
        isOpen={showVariantsModal}
        onClose={() => {
          setShowVariantsModal(false);
          setSelectedProductForVariants(null);
        }}
        product={selectedProductForVariants}
        onEditProduct={() => {
          setShowVariantsModal(false);
          if (selectedProductForVariants) {
            const found = products.find(
              (p) => p.id === selectedProductForVariants.id
            );
            if (found) handleEditProduct(found);
          }
        }}
      />
    </MainLayout>
  );
};

export default Inventory;