import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Printer, 
  FileSpreadsheet, 
  FileText,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  Truck,
  Building2,
  CreditCard,
  BarChart3,
  ClipboardList,
  Receipt,
  UserCheck,
  Wallet,
  ArrowLeftRight,
  Eye,
  Download
} from 'lucide-react';
import { format, subMonths, subDays } from 'date-fns';

interface Report {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ReactNode;
  category: string;
}

const ReadyReports = () => {
  const { language, direction } = useLanguage();
  const [activeModule, setActiveModule] = useState('sales');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Fetch data
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales')
        .select('*, customers(name, name_ar)')
        .gte('sale_date', dateFrom)
        .lte('sale_date', dateTo)
        .order('sale_date', { ascending: false });
      return data || [];
    }
  });

  const { data: salesInvoices = [] } = useQuery({
    queryKey: ['sales-invoices-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_invoices')
        .select('*, customers(name, name_ar), salesmen(name, name_ar)')
        .gte('invoice_date', dateFrom)
        .lte('invoice_date', dateTo)
        .order('invoice_date', { ascending: false });
      return data || [];
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-reports'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*, categories(name, name_ar)');
      return data || [];
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*');
      return data || [];
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('suppliers').select('*');
      return data || [];
    }
  });

  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['purchase-invoices-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_invoices')
        .select('*, suppliers(name, name_ar)')
        .gte('invoice_date', dateFrom)
        .lte('invoice_date', dateTo)
        .order('invoice_date', { ascending: false });
      return data || [];
    }
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .order('expense_date', { ascending: false });
      return data || [];
    }
  });

  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('revenues')
        .select('*')
        .gte('revenue_date', dateFrom)
        .lte('revenue_date', dateTo)
        .order('revenue_date', { ascending: false });
      return data || [];
    }
  });

  const { data: treasuries = [] } = useQuery({
    queryKey: ['treasuries-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('treasuries').select('*, branches(name, name_ar)');
      return data || [];
    }
  });

  const { data: banks = [] } = useQuery({
    queryKey: ['banks-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('banks').select('*, branches(name, name_ar)');
      return data || [];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-reports'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('*');
      return data || [];
    }
  });

  const { data: posShifts = [] } = useQuery({
    queryKey: ['pos-shifts-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('pos_shifts')
        .select('*, branches(name, name_ar)')
        .gte('opened_at', dateFrom)
        .lte('opened_at', dateTo + 'T23:59:59')
        .order('opened_at', { ascending: false });
      return data || [];
    }
  });

  const { data: inventoryMovements = [] } = useQuery({
    queryKey: ['inventory-movements-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_movements')
        .select('*, products(name, name_ar, sku), warehouses(name, name_ar)')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: salesReturns = [] } = useQuery({
    queryKey: ['sales-returns-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_returns')
        .select('*, customers(name, name_ar)')
        .gte('return_date', dateFrom)
        .lte('return_date', dateTo)
        .order('return_date', { ascending: false });
      return data || [];
    }
  });

  const { data: purchaseReturns = [] } = useQuery({
    queryKey: ['purchase-returns-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('purchase_returns')
        .select('*, suppliers(name, name_ar)')
        .gte('return_date', dateFrom)
        .lte('return_date', dateTo)
        .order('return_date', { ascending: false });
      return data || [];
    }
  });

  const translations = {
    en: {
      title: 'Ready Reports',
      subtitle: 'Comprehensive reports for all modules',
      selectReport: 'Select a report to view',
      preview: 'Preview',
      print: 'Print',
      exportExcel: 'Excel',
      exportPdf: 'PDF',
      dateFrom: 'From',
      dateTo: 'To',
      branch: 'Branch',
      allBranches: 'All Branches',
      noData: 'No data available',
      total: 'Total',
      
      // Modules
      sales: 'Sales',
      inventory: 'Inventory',
      purchasing: 'Purchasing',
      finance: 'Finance',
      crm: 'CRM',
      hr: 'HR',
      pos: 'Point of Sale',
      treasury: 'Treasury & Banks',
      
      // Sales Reports
      dailySales: 'Daily Sales Report',
      dailySalesDesc: 'Detailed daily sales transactions',
      salesByCustomer: 'Sales by Customer',
      salesByCustomerDesc: 'Sales breakdown by customer',
      salesByProduct: 'Sales by Product',
      salesByProductDesc: 'Product sales analysis',
      salesBySalesman: 'Sales by Salesman',
      salesBySalesmanDesc: 'Salesman performance report',
      salesReturnsReport: 'Sales Returns',
      salesReturnsDesc: 'All sales returns and refunds',
      unpaidInvoices: 'Unpaid Invoices',
      unpaidInvoicesDesc: 'Outstanding customer invoices',
      
      // Inventory Reports
      stockReport: 'Stock Report',
      stockReportDesc: 'Current stock levels for all products',
      lowStockReport: 'Low Stock Report',
      lowStockReportDesc: 'Products below minimum stock level',
      outOfStockReport: 'Out of Stock Report',
      outOfStockReportDesc: 'Products with zero stock',
      stockMovements: 'Stock Movements',
      stockMovementsDesc: 'All inventory movements',
      stockValuation: 'Stock Valuation',
      stockValuationDesc: 'Total inventory value report',
      productsByCategory: 'Products by Category',
      productsByCategoryDesc: 'Products grouped by category',
      
      // Purchasing Reports
      purchaseReport: 'Purchase Report',
      purchaseReportDesc: 'All purchase invoices',
      purchaseBySupplier: 'Purchase by Supplier',
      purchaseBySupplierDesc: 'Purchases breakdown by supplier',
      supplierBalance: 'Supplier Balances',
      supplierBalanceDesc: 'Outstanding amounts to suppliers',
      purchaseReturnsReport: 'Purchase Returns',
      purchaseReturnsDesc: 'All purchase returns',
      
      // Finance Reports
      profitLoss: 'Profit & Loss',
      profitLossDesc: 'Income and expense summary',
      expenseReport: 'Expense Report',
      expenseReportDesc: 'All expenses by category',
      revenueReport: 'Revenue Report',
      revenueReportDesc: 'All revenues by category',
      cashFlow: 'Cash Flow',
      cashFlowDesc: 'Cash inflows and outflows',
      
      // Treasury Reports
      treasuryBalance: 'Treasury Balance',
      treasuryBalanceDesc: 'Current treasury balances',
      bankBalance: 'Bank Balance',
      bankBalanceDesc: 'Current bank account balances',
      treasuryTransactions: 'Treasury Transactions',
      treasuryTransactionsDesc: 'All treasury movements',
      
      // CRM Reports
      customerList: 'Customer List',
      customerListDesc: 'All registered customers',
      topCustomers: 'Top Customers',
      topCustomersDesc: 'Customers by total purchases',
      customerAging: 'Customer Aging',
      customerAgingDesc: 'Customer receivables aging',
      
      // HR Reports
      employeeList: 'Employee List',
      employeeListDesc: 'All employees information',
      employeeByDept: 'Employees by Department',
      employeeByDeptDesc: 'Employee distribution by department',
      
      // POS Reports
      shiftReport: 'Shift Report',
      shiftReportDesc: 'POS shift summary',
      dailyPOS: 'Daily POS Sales',
      dailyPOSDesc: 'Daily point of sale transactions',
      
      // Column Headers
      date: 'Date',
      invoiceNo: 'Invoice #',
      customer: 'Customer',
      amount: 'Amount',
      status: 'Status',
      product: 'Product',
      sku: 'SKU',
      quantity: 'Quantity',
      stock: 'Stock',
      minStock: 'Min Stock',
      price: 'Price',
      cost: 'Cost',
      value: 'Value',
      category: 'Category',
      supplier: 'Supplier',
      salesman: 'Salesman',
      paid: 'Paid',
      remaining: 'Remaining',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      department: 'Department',
      position: 'Position',
      shift: 'Shift',
      openingAmount: 'Opening',
      closingAmount: 'Closing',
      totalSales: 'Total Sales'
    },
    ar: {
      title: 'التقارير الجاهزة',
      subtitle: 'تقارير شاملة لجميع الموديولات',
      selectReport: 'اختر تقرير للعرض',
      preview: 'معاينة',
      print: 'طباعة',
      exportExcel: 'Excel',
      exportPdf: 'PDF',
      dateFrom: 'من',
      dateTo: 'إلى',
      branch: 'الفرع',
      allBranches: 'كل الفروع',
      noData: 'لا توجد بيانات',
      total: 'الإجمالي',
      
      // Modules
      sales: 'المبيعات',
      inventory: 'المخزون',
      purchasing: 'المشتريات',
      finance: 'المالية',
      crm: 'العملاء',
      hr: 'الموارد البشرية',
      pos: 'نقطة البيع',
      treasury: 'الخزائن والبنوك',
      
      // Sales Reports
      dailySales: 'تقرير المبيعات اليومية',
      dailySalesDesc: 'تفاصيل معاملات المبيعات اليومية',
      salesByCustomer: 'المبيعات حسب العميل',
      salesByCustomerDesc: 'تحليل المبيعات لكل عميل',
      salesByProduct: 'المبيعات حسب المنتج',
      salesByProductDesc: 'تحليل مبيعات المنتجات',
      salesBySalesman: 'المبيعات حسب المندوب',
      salesBySalesmanDesc: 'تقرير أداء المندوبين',
      salesReturnsReport: 'مرتجعات المبيعات',
      salesReturnsDesc: 'جميع مرتجعات والمستردات',
      unpaidInvoices: 'الفواتير غير المسددة',
      unpaidInvoicesDesc: 'فواتير العملاء المستحقة',
      
      // Inventory Reports
      stockReport: 'تقرير المخزون',
      stockReportDesc: 'مستويات المخزون الحالية لجميع المنتجات',
      lowStockReport: 'تقرير المخزون المنخفض',
      lowStockReportDesc: 'المنتجات أقل من الحد الأدنى',
      outOfStockReport: 'تقرير نفاذ المخزون',
      outOfStockReportDesc: 'المنتجات بدون مخزون',
      stockMovements: 'حركات المخزون',
      stockMovementsDesc: 'جميع حركات المخزون',
      stockValuation: 'تقييم المخزون',
      stockValuationDesc: 'تقرير قيمة المخزون الإجمالية',
      productsByCategory: 'المنتجات حسب الفئة',
      productsByCategoryDesc: 'المنتجات مجمعة حسب الفئات',
      
      // Purchasing Reports
      purchaseReport: 'تقرير المشتريات',
      purchaseReportDesc: 'جميع فواتير المشتريات',
      purchaseBySupplier: 'المشتريات حسب المورد',
      purchaseBySupplierDesc: 'تحليل المشتريات لكل مورد',
      supplierBalance: 'أرصدة الموردين',
      supplierBalanceDesc: 'المبالغ المستحقة للموردين',
      purchaseReturnsReport: 'مرتجعات المشتريات',
      purchaseReturnsDesc: 'جميع مرتجعات المشتريات',
      
      // Finance Reports
      profitLoss: 'الأرباح والخسائر',
      profitLossDesc: 'ملخص الإيرادات والمصروفات',
      expenseReport: 'تقرير المصروفات',
      expenseReportDesc: 'جميع المصروفات حسب الفئة',
      revenueReport: 'تقرير الإيرادات',
      revenueReportDesc: 'جميع الإيرادات حسب الفئة',
      cashFlow: 'التدفق النقدي',
      cashFlowDesc: 'التدفقات النقدية الداخلة والخارجة',
      
      // Treasury Reports
      treasuryBalance: 'أرصدة الخزائن',
      treasuryBalanceDesc: 'أرصدة الخزائن الحالية',
      bankBalance: 'أرصدة البنوك',
      bankBalanceDesc: 'أرصدة الحسابات البنكية الحالية',
      treasuryTransactions: 'حركات الخزينة',
      treasuryTransactionsDesc: 'جميع حركات الخزائن',
      
      // CRM Reports
      customerList: 'قائمة العملاء',
      customerListDesc: 'جميع العملاء المسجلين',
      topCustomers: 'أفضل العملاء',
      topCustomersDesc: 'العملاء حسب إجمالي المشتريات',
      customerAging: 'تقادم العملاء',
      customerAgingDesc: 'تقادم مستحقات العملاء',
      
      // HR Reports
      employeeList: 'قائمة الموظفين',
      employeeListDesc: 'جميع معلومات الموظفين',
      employeeByDept: 'الموظفون حسب القسم',
      employeeByDeptDesc: 'توزيع الموظفين حسب الأقسام',
      
      // POS Reports
      shiftReport: 'تقرير الورديات',
      shiftReportDesc: 'ملخص ورديات نقطة البيع',
      dailyPOS: 'مبيعات نقطة البيع اليومية',
      dailyPOSDesc: 'معاملات نقطة البيع اليومية',
      
      // Column Headers
      date: 'التاريخ',
      invoiceNo: 'رقم الفاتورة',
      customer: 'العميل',
      amount: 'المبلغ',
      status: 'الحالة',
      product: 'المنتج',
      sku: 'SKU',
      quantity: 'الكمية',
      stock: 'المخزون',
      minStock: 'الحد الأدنى',
      price: 'السعر',
      cost: 'التكلفة',
      value: 'القيمة',
      category: 'الفئة',
      supplier: 'المورد',
      salesman: 'المندوب',
      paid: 'المدفوع',
      remaining: 'المتبقي',
      name: 'الاسم',
      phone: 'الهاتف',
      email: 'البريد',
      department: 'القسم',
      position: 'المنصب',
      shift: 'الوردية',
      openingAmount: 'الافتتاح',
      closingAmount: 'الإغلاق',
      totalSales: 'إجمالي المبيعات'
    }
  };

  const t = translations[language];

  const moduleReports: Record<string, Report[]> = {
    sales: [
      { id: 'daily-sales', name: t.dailySales, nameAr: translations.ar.dailySales, description: t.dailySalesDesc, descriptionAr: translations.ar.dailySalesDesc, icon: <Receipt size={20} />, category: 'sales' },
      { id: 'sales-by-customer', name: t.salesByCustomer, nameAr: translations.ar.salesByCustomer, description: t.salesByCustomerDesc, descriptionAr: translations.ar.salesByCustomerDesc, icon: <Users size={20} />, category: 'sales' },
      { id: 'sales-by-product', name: t.salesByProduct, nameAr: translations.ar.salesByProduct, description: t.salesByProductDesc, descriptionAr: translations.ar.salesByProductDesc, icon: <Package size={20} />, category: 'sales' },
      { id: 'sales-by-salesman', name: t.salesBySalesman, nameAr: translations.ar.salesBySalesman, description: t.salesBySalesmanDesc, descriptionAr: translations.ar.salesBySalesmanDesc, icon: <UserCheck size={20} />, category: 'sales' },
      { id: 'sales-returns', name: t.salesReturnsReport, nameAr: translations.ar.salesReturnsReport, description: t.salesReturnsDesc, descriptionAr: translations.ar.salesReturnsDesc, icon: <ArrowLeftRight size={20} />, category: 'sales' },
      { id: 'unpaid-invoices', name: t.unpaidInvoices, nameAr: translations.ar.unpaidInvoices, description: t.unpaidInvoicesDesc, descriptionAr: translations.ar.unpaidInvoicesDesc, icon: <CreditCard size={20} />, category: 'sales' },
    ],
    inventory: [
      { id: 'stock-report', name: t.stockReport, nameAr: translations.ar.stockReport, description: t.stockReportDesc, descriptionAr: translations.ar.stockReportDesc, icon: <Package size={20} />, category: 'inventory' },
      { id: 'low-stock', name: t.lowStockReport, nameAr: translations.ar.lowStockReport, description: t.lowStockReportDesc, descriptionAr: translations.ar.lowStockReportDesc, icon: <ClipboardList size={20} />, category: 'inventory' },
      { id: 'out-of-stock', name: t.outOfStockReport, nameAr: translations.ar.outOfStockReport, description: t.outOfStockReportDesc, descriptionAr: translations.ar.outOfStockReportDesc, icon: <Package size={20} />, category: 'inventory' },
      { id: 'stock-movements', name: t.stockMovements, nameAr: translations.ar.stockMovements, description: t.stockMovementsDesc, descriptionAr: translations.ar.stockMovementsDesc, icon: <ArrowLeftRight size={20} />, category: 'inventory' },
      { id: 'stock-valuation', name: t.stockValuation, nameAr: translations.ar.stockValuation, description: t.stockValuationDesc, descriptionAr: translations.ar.stockValuationDesc, icon: <DollarSign size={20} />, category: 'inventory' },
      { id: 'products-by-category', name: t.productsByCategory, nameAr: translations.ar.productsByCategory, description: t.productsByCategoryDesc, descriptionAr: translations.ar.productsByCategoryDesc, icon: <BarChart3 size={20} />, category: 'inventory' },
    ],
    purchasing: [
      { id: 'purchase-report', name: t.purchaseReport, nameAr: translations.ar.purchaseReport, description: t.purchaseReportDesc, descriptionAr: translations.ar.purchaseReportDesc, icon: <Receipt size={20} />, category: 'purchasing' },
      { id: 'purchase-by-supplier', name: t.purchaseBySupplier, nameAr: translations.ar.purchaseBySupplier, description: t.purchaseBySupplierDesc, descriptionAr: translations.ar.purchaseBySupplierDesc, icon: <Truck size={20} />, category: 'purchasing' },
      { id: 'supplier-balance', name: t.supplierBalance, nameAr: translations.ar.supplierBalance, description: t.supplierBalanceDesc, descriptionAr: translations.ar.supplierBalanceDesc, icon: <CreditCard size={20} />, category: 'purchasing' },
      { id: 'purchase-returns', name: t.purchaseReturnsReport, nameAr: translations.ar.purchaseReturnsReport, description: t.purchaseReturnsDesc, descriptionAr: translations.ar.purchaseReturnsDesc, icon: <ArrowLeftRight size={20} />, category: 'purchasing' },
    ],
    finance: [
      { id: 'profit-loss', name: t.profitLoss, nameAr: translations.ar.profitLoss, description: t.profitLossDesc, descriptionAr: translations.ar.profitLossDesc, icon: <TrendingUp size={20} />, category: 'finance' },
      { id: 'expense-report', name: t.expenseReport, nameAr: translations.ar.expenseReport, description: t.expenseReportDesc, descriptionAr: translations.ar.expenseReportDesc, icon: <DollarSign size={20} />, category: 'finance' },
      { id: 'revenue-report', name: t.revenueReport, nameAr: translations.ar.revenueReport, description: t.revenueReportDesc, descriptionAr: translations.ar.revenueReportDesc, icon: <DollarSign size={20} />, category: 'finance' },
    ],
    treasury: [
      { id: 'treasury-balance', name: t.treasuryBalance, nameAr: translations.ar.treasuryBalance, description: t.treasuryBalanceDesc, descriptionAr: translations.ar.treasuryBalanceDesc, icon: <Wallet size={20} />, category: 'treasury' },
      { id: 'bank-balance', name: t.bankBalance, nameAr: translations.ar.bankBalance, description: t.bankBalanceDesc, descriptionAr: translations.ar.bankBalanceDesc, icon: <Building2 size={20} />, category: 'treasury' },
    ],
    crm: [
      { id: 'customer-list', name: t.customerList, nameAr: translations.ar.customerList, description: t.customerListDesc, descriptionAr: translations.ar.customerListDesc, icon: <Users size={20} />, category: 'crm' },
      { id: 'top-customers', name: t.topCustomers, nameAr: translations.ar.topCustomers, description: t.topCustomersDesc, descriptionAr: translations.ar.topCustomersDesc, icon: <TrendingUp size={20} />, category: 'crm' },
      { id: 'customer-aging', name: t.customerAging, nameAr: translations.ar.customerAging, description: t.customerAgingDesc, descriptionAr: translations.ar.customerAgingDesc, icon: <ClipboardList size={20} />, category: 'crm' },
    ],
    hr: [
      { id: 'employee-list', name: t.employeeList, nameAr: translations.ar.employeeList, description: t.employeeListDesc, descriptionAr: translations.ar.employeeListDesc, icon: <Users size={20} />, category: 'hr' },
      { id: 'employee-by-dept', name: t.employeeByDept, nameAr: translations.ar.employeeByDept, description: t.employeeByDeptDesc, descriptionAr: translations.ar.employeeByDeptDesc, icon: <Building2 size={20} />, category: 'hr' },
    ],
    pos: [
      { id: 'shift-report', name: t.shiftReport, nameAr: translations.ar.shiftReport, description: t.shiftReportDesc, descriptionAr: translations.ar.shiftReportDesc, icon: <ClipboardList size={20} />, category: 'pos' },
      { id: 'daily-pos', name: t.dailyPOS, nameAr: translations.ar.dailyPOS, description: t.dailyPOSDesc, descriptionAr: translations.ar.dailyPOSDesc, icon: <ShoppingCart size={20} />, category: 'pos' },
    ],
  };

  const modules = [
    { id: 'sales', name: t.sales, icon: <TrendingUp size={18} /> },
    { id: 'inventory', name: t.inventory, icon: <Package size={18} /> },
    { id: 'purchasing', name: t.purchasing, icon: <Truck size={18} /> },
    { id: 'finance', name: t.finance, icon: <DollarSign size={18} /> },
    { id: 'treasury', name: t.treasury, icon: <Wallet size={18} /> },
    { id: 'crm', name: t.crm, icon: <Users size={18} /> },
    { id: 'hr', name: t.hr, icon: <UserCheck size={18} /> },
    { id: 'pos', name: t.pos, icon: <ShoppingCart size={18} /> },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = (data: any[], fileName: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `\uFEFF${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const renderReportContent = () => {
    if (!selectedReport) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t.selectReport}</p>
          </div>
        </div>
      );
    }

    switch (selectedReport) {
      case 'daily-sales':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.invoiceNo}</TableHead>
                <TableHead>{t.customer}</TableHead>
                <TableHead>{t.amount}</TableHead>
                <TableHead>{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesInvoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell>{format(new Date(inv.invoice_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{inv.invoice_number}</TableCell>
                  <TableCell>{language === 'ar' ? inv.customers?.name_ar || inv.customers?.name : inv.customers?.name}</TableCell>
                  <TableCell>{Number(inv.total_amount).toLocaleString()} YER</TableCell>
                  <TableCell>
                    <Badge variant={inv.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {inv.payment_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'stock-report':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.product}</TableHead>
                <TableHead>{t.sku}</TableHead>
                <TableHead>{t.category}</TableHead>
                <TableHead>{t.stock}</TableHead>
                <TableHead>{t.minStock}</TableHead>
                <TableHead>{t.cost}</TableHead>
                <TableHead>{t.value}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{language === 'ar' ? p.name_ar || p.name : p.name}</TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{language === 'ar' ? p.categories?.name_ar || p.categories?.name : p.categories?.name}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>{p.min_stock || 5}</TableCell>
                  <TableCell>{Number(p.cost || 0).toLocaleString()} YER</TableCell>
                  <TableCell>{(p.stock * (p.cost || 0)).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'low-stock':
        const lowStockProducts = products.filter((p: any) => p.stock <= (p.min_stock || 5) && p.stock > 0);
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.product}</TableHead>
                <TableHead>{t.sku}</TableHead>
                <TableHead>{t.stock}</TableHead>
                <TableHead>{t.minStock}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockProducts.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{language === 'ar' ? p.name_ar || p.name : p.name}</TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell className="text-warning">{p.stock}</TableCell>
                  <TableCell>{p.min_stock || 5}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'out-of-stock':
        const outOfStockProducts = products.filter((p: any) => p.stock === 0);
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.product}</TableHead>
                <TableHead>{t.sku}</TableHead>
                <TableHead>{t.category}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outOfStockProducts.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{language === 'ar' ? p.name_ar || p.name : p.name}</TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{language === 'ar' ? p.categories?.name_ar || p.categories?.name : p.categories?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'stock-movements':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.product}</TableHead>
                <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{t.quantity}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryMovements.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{format(new Date(m.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell>{language === 'ar' ? m.products?.name_ar || m.products?.name : m.products?.name}</TableCell>
                  <TableCell>{m.movement_type}</TableCell>
                  <TableCell className={m.quantity > 0 ? 'text-accent' : 'text-destructive'}>{m.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'purchase-report':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.invoiceNo}</TableHead>
                <TableHead>{t.supplier}</TableHead>
                <TableHead>{t.amount}</TableHead>
                <TableHead>{t.paid}</TableHead>
                <TableHead>{t.remaining}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseInvoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell>{format(new Date(inv.invoice_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{inv.invoice_number}</TableCell>
                  <TableCell>{language === 'ar' ? inv.suppliers?.name_ar || inv.suppliers?.name : inv.suppliers?.name}</TableCell>
                  <TableCell>{Number(inv.total_amount).toLocaleString()} YER</TableCell>
                  <TableCell>{Number(inv.paid_amount || 0).toLocaleString()} YER</TableCell>
                  <TableCell>{Number(inv.remaining_amount || 0).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'expense-report':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.category}</TableHead>
                <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                <TableHead>{t.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{format(new Date(e.expense_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{Number(e.amount).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'revenue-report':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.category}</TableHead>
                <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                <TableHead>{t.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenues.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.revenue_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>{Number(r.amount).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'treasury-balance':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.branch}</TableHead>
                <TableHead>{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {treasuries.map((tr: any) => (
                <TableRow key={tr.id}>
                  <TableCell>{language === 'ar' ? tr.name_ar || tr.name : tr.name}</TableCell>
                  <TableCell>{language === 'ar' ? tr.branches?.name_ar || tr.branches?.name : tr.branches?.name}</TableCell>
                  <TableCell className="font-bold">{Number(tr.balance || 0).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'bank-balance':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{language === 'ar' ? 'رقم الحساب' : 'Account #'}</TableHead>
                <TableHead>{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{language === 'ar' ? b.name_ar || b.name : b.name}</TableCell>
                  <TableCell>{b.account_number}</TableCell>
                  <TableCell className="font-bold">{Number(b.balance || 0).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'customer-list':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{t.email}</TableHead>
                <TableHead>{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{language === 'ar' ? c.name_ar || c.name : c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{Number(c.total_purchases || 0).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'top-customers':
        const topCustomers = [...customers].sort((a: any, b: any) => (b.total_purchases || 0) - (a.total_purchases || 0)).slice(0, 20);
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCustomers.map((c: any, idx) => (
                <TableRow key={c.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{language === 'ar' ? c.name_ar || c.name : c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className="font-bold text-accent">{Number(c.total_purchases || 0).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'employee-list':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'كود الموظف' : 'Code'}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.department}</TableHead>
                <TableHead>{t.position}</TableHead>
                <TableHead>{t.phone}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{e.employee_code}</TableCell>
                  <TableCell>{language === 'ar' ? e.name_ar || e.name : e.name}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>{e.position}</TableCell>
                  <TableCell>{e.phone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'shift-report':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.shift}</TableHead>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.branch}</TableHead>
                <TableHead>{t.openingAmount}</TableHead>
                <TableHead>{t.closingAmount}</TableHead>
                <TableHead>{t.totalSales}</TableHead>
                <TableHead>{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posShifts.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.shift_number}</TableCell>
                  <TableCell>{format(new Date(s.opened_at), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{language === 'ar' ? s.branches?.name_ar || s.branches?.name : s.branches?.name}</TableCell>
                  <TableCell>{Number(s.opening_amount || 0).toLocaleString()} YER</TableCell>
                  <TableCell>{Number(s.closing_amount || 0).toLocaleString()} YER</TableCell>
                  <TableCell className="text-accent font-bold">{Number(s.total_sales || 0).toLocaleString()} YER</TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'closed' ? 'secondary' : 'default'}>
                      {s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'sales-returns':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{language === 'ar' ? 'رقم المرتجع' : 'Return #'}</TableHead>
                <TableHead>{t.customer}</TableHead>
                <TableHead>{t.amount}</TableHead>
                <TableHead>{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesReturns.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.return_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{r.return_number}</TableCell>
                  <TableCell>{language === 'ar' ? r.customers?.name_ar || r.customers?.name : r.customers?.name}</TableCell>
                  <TableCell>{Number(r.total_amount).toLocaleString()} YER</TableCell>
                  <TableCell>
                    <Badge>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'purchase-returns':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{language === 'ar' ? 'رقم المرتجع' : 'Return #'}</TableHead>
                <TableHead>{t.supplier}</TableHead>
                <TableHead>{t.amount}</TableHead>
                <TableHead>{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseReturns.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.return_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{r.return_number}</TableCell>
                  <TableCell>{language === 'ar' ? r.suppliers?.name_ar || r.suppliers?.name : r.suppliers?.name}</TableCell>
                  <TableCell>{Number(r.total_amount).toLocaleString()} YER</TableCell>
                  <TableCell>
                    <Badge>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'supplier-balance':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.supplier}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{language === 'ar' ? 'الرصيد المستحق' : 'Balance Due'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{language === 'ar' ? s.name_ar || s.name : s.name}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell className="font-bold">{Number(s.balance || 0).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'unpaid-invoices':
        const unpaidInvoices = salesInvoices.filter((inv: any) => inv.payment_status !== 'paid' && (inv.remaining_amount || 0) > 0);
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.invoiceNo}</TableHead>
                <TableHead>{t.customer}</TableHead>
                <TableHead>{t.amount}</TableHead>
                <TableHead>{t.paid}</TableHead>
                <TableHead>{t.remaining}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaidInvoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell>{format(new Date(inv.invoice_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{inv.invoice_number}</TableCell>
                  <TableCell>{language === 'ar' ? inv.customers?.name_ar || inv.customers?.name : inv.customers?.name}</TableCell>
                  <TableCell>{Number(inv.total_amount).toLocaleString()} YER</TableCell>
                  <TableCell>{Number(inv.paid_amount || 0).toLocaleString()} YER</TableCell>
                  <TableCell className="text-destructive font-bold">{Number(inv.remaining_amount || 0).toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'stock-valuation':
        const totalValue = products.reduce((sum: number, p: any) => sum + (p.stock * (p.cost || 0)), 0);
        return (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-lg text-muted-foreground">{language === 'ar' ? 'إجمالي قيمة المخزون' : 'Total Inventory Value'}</p>
                  <p className="text-4xl font-bold text-primary">{totalValue.toLocaleString()} YER</p>
                </div>
              </CardContent>
            </Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.product}</TableHead>
                  <TableHead>{t.stock}</TableHead>
                  <TableHead>{t.cost}</TableHead>
                  <TableHead>{t.value}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{language === 'ar' ? p.name_ar || p.name : p.name}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>{Number(p.cost || 0).toLocaleString()} YER</TableCell>
                    <TableCell className="font-bold">{(p.stock * (p.cost || 0)).toLocaleString()} YER</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case 'profit-loss':
        const totalSalesAmount = salesInvoices.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
        const totalRevenueAmount = revenues.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
        const totalExpenseAmount = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
        const netProfit = totalSalesAmount + totalRevenueAmount - totalExpenseAmount;
        
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-accent/10">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</p>
                  <p className="text-2xl font-bold text-accent">{totalSalesAmount.toLocaleString()} YER</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إيرادات أخرى' : 'Other Revenue'}</p>
                  <p className="text-2xl font-bold text-blue-600">{totalRevenueAmount.toLocaleString()} YER</p>
                </CardContent>
              </Card>
              <Card className="bg-destructive/10">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المصروفات' : 'Expenses'}</p>
                  <p className="text-2xl font-bold text-destructive">{totalExpenseAmount.toLocaleString()} YER</p>
                </CardContent>
              </Card>
              <Card className={netProfit >= 0 ? 'bg-accent/10' : 'bg-destructive/10'}>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'صافي الربح' : 'Net Profit'}</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>{netProfit.toLocaleString()} YER</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'sales-by-customer':
        const salesByCustomer = salesInvoices.reduce((acc: any[], inv: any) => {
          const customerName = language === 'ar' 
            ? inv.customers?.name_ar || inv.customers?.name || 'عميل نقدي'
            : inv.customers?.name || 'Cash Customer';
          const existing = acc.find(c => c.name === customerName);
          if (existing) {
            existing.total += Number(inv.total_amount || 0);
            existing.count += 1;
          } else {
            acc.push({ name: customerName, total: Number(inv.total_amount || 0), count: 1, phone: inv.customers?.phone || '-' });
          }
          return acc;
        }, []).sort((a, b) => b.total - a.total);
        
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t.customer}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{language === 'ar' ? 'عدد الفواتير' : 'Invoices'}</TableHead>
                <TableHead>{t.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesByCustomer.map((c: any, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.count}</TableCell>
                  <TableCell className="font-bold text-accent">{c.total.toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4}>{t.total}</TableCell>
                <TableCell className="text-primary">{salesByCustomer.reduce((s, c) => s + c.total, 0).toLocaleString()} YER</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'sales-by-product':
        const salesByProduct = salesInvoices.reduce((acc: any[], inv: any) => {
          // This is a simplified version - in a real app, you'd join with sale_items
          return acc;
        }, []);
        
        // For now, show products with their stock and price as a sales catalog
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.product}</TableHead>
                <TableHead>{t.sku}</TableHead>
                <TableHead>{t.category}</TableHead>
                <TableHead>{t.price}</TableHead>
                <TableHead>{t.stock}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{language === 'ar' ? p.name_ar || p.name : p.name}</TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell>{language === 'ar' ? p.categories?.name_ar || p.categories?.name : p.categories?.name}</TableCell>
                  <TableCell>{Number(p.price || 0).toLocaleString()} YER</TableCell>
                  <TableCell>{p.stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'sales-by-salesman':
        const salesBySalesman = salesInvoices.reduce((acc: any[], inv: any) => {
          const salesmanName = language === 'ar' 
            ? inv.salesmen?.name_ar || inv.salesmen?.name || 'بدون مندوب'
            : inv.salesmen?.name || 'No Salesman';
          const existing = acc.find(s => s.name === salesmanName);
          if (existing) {
            existing.total += Number(inv.total_amount || 0);
            existing.count += 1;
          } else {
            acc.push({ name: salesmanName, total: Number(inv.total_amount || 0), count: 1 });
          }
          return acc;
        }, []).sort((a, b) => b.total - a.total);
        
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t.salesman}</TableHead>
                <TableHead>{language === 'ar' ? 'عدد الفواتير' : 'Invoices'}</TableHead>
                <TableHead>{t.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesBySalesman.map((s: any, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.count}</TableCell>
                  <TableCell className="font-bold text-accent">{s.total.toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={3}>{t.total}</TableCell>
                <TableCell className="text-primary">{salesBySalesman.reduce((s, c) => s + c.total, 0).toLocaleString()} YER</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'products-by-category':
        const productsByCategory = products.reduce((acc: any[], p: any) => {
          const categoryName = language === 'ar' 
            ? p.categories?.name_ar || p.categories?.name || 'غير مصنف'
            : p.categories?.name || 'Uncategorized';
          const existing = acc.find(c => c.category === categoryName);
          if (existing) {
            existing.products.push(p);
            existing.totalStock += p.stock;
            existing.totalValue += (p.stock * (p.cost || 0));
          } else {
            acc.push({ 
              category: categoryName, 
              products: [p], 
              totalStock: p.stock,
              totalValue: p.stock * (p.cost || 0)
            });
          }
          return acc;
        }, []);
        
        return (
          <div className="space-y-4">
            {productsByCategory.map((cat: any, idx) => (
              <Card key={idx}>
                <CardHeader className="py-3 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{cat.category}</CardTitle>
                    <div className="flex gap-4 text-sm">
                      <Badge variant="outline">{cat.products.length} {language === 'ar' ? 'منتج' : 'products'}</Badge>
                      <Badge variant="secondary">{cat.totalStock} {language === 'ar' ? 'وحدة' : 'units'}</Badge>
                      <Badge>{cat.totalValue.toLocaleString()} YER</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.product}</TableHead>
                        <TableHead>{t.sku}</TableHead>
                        <TableHead>{t.stock}</TableHead>
                        <TableHead>{t.cost}</TableHead>
                        <TableHead>{t.value}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cat.products.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{language === 'ar' ? p.name_ar || p.name : p.name}</TableCell>
                          <TableCell>{p.sku}</TableCell>
                          <TableCell>{p.stock}</TableCell>
                          <TableCell>{Number(p.cost || 0).toLocaleString()} YER</TableCell>
                          <TableCell>{(p.stock * (p.cost || 0)).toLocaleString()} YER</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'employee-by-dept':
        const employeesByDept = employees.reduce((acc: any[], e: any) => {
          const deptName = e.department || (language === 'ar' ? 'بدون قسم' : 'No Department');
          const existing = acc.find(d => d.department === deptName);
          if (existing) {
            existing.employees.push(e);
          } else {
            acc.push({ department: deptName, employees: [e] });
          }
          return acc;
        }, []);
        
        return (
          <div className="space-y-4">
            {employeesByDept.map((dept: any, idx) => (
              <Card key={idx}>
                <CardHeader className="py-3 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{dept.department}</CardTitle>
                    <Badge>{dept.employees.length} {language === 'ar' ? 'موظف' : 'employees'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                        <TableHead>{t.name}</TableHead>
                        <TableHead>{t.position}</TableHead>
                        <TableHead>{t.phone}</TableHead>
                        <TableHead>{t.email}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dept.employees.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell>{e.employee_code}</TableCell>
                          <TableCell>{language === 'ar' ? e.name_ar || e.name : e.name}</TableCell>
                          <TableCell>{e.position}</TableCell>
                          <TableCell>{e.phone}</TableCell>
                          <TableCell>{e.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'daily-pos':
        // Group shifts by date
        const posByDate = posShifts.reduce((acc: any[], shift: any) => {
          const date = format(new Date(shift.opened_at), 'yyyy-MM-dd');
          const existing = acc.find(d => d.date === date);
          if (existing) {
            existing.shifts.push(shift);
            existing.totalSales += Number(shift.total_sales || 0);
            existing.cashSales += Number(shift.cash_sales || 0);
            existing.cardSales += Number(shift.card_sales || 0);
          } else {
            acc.push({ 
              date, 
              shifts: [shift], 
              totalSales: Number(shift.total_sales || 0),
              cashSales: Number(shift.cash_sales || 0),
              cardSales: Number(shift.card_sales || 0)
            });
          }
          return acc;
        }, []).sort((a, b) => b.date.localeCompare(a.date));
        
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-accent/10">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</p>
                  <p className="text-2xl font-bold text-accent">{posByDate.reduce((s, d) => s + d.totalSales, 0).toLocaleString()} YER</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مبيعات نقدية' : 'Cash Sales'}</p>
                  <p className="text-2xl font-bold text-blue-600">{posByDate.reduce((s, d) => s + d.cashSales, 0).toLocaleString()} YER</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مبيعات بطاقة' : 'Card Sales'}</p>
                  <p className="text-2xl font-bold text-purple-600">{posByDate.reduce((s, d) => s + d.cardSales, 0).toLocaleString()} YER</p>
                </CardContent>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{language === 'ar' ? 'عدد الورديات' : 'Shifts'}</TableHead>
                  <TableHead>{language === 'ar' ? 'مبيعات نقدية' : 'Cash'}</TableHead>
                  <TableHead>{language === 'ar' ? 'مبيعات بطاقة' : 'Card'}</TableHead>
                  <TableHead>{t.totalSales}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posByDate.map((d: any, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{d.date}</TableCell>
                    <TableCell>{d.shifts.length}</TableCell>
                    <TableCell>{d.cashSales.toLocaleString()} YER</TableCell>
                    <TableCell>{d.cardSales.toLocaleString()} YER</TableCell>
                    <TableCell className="font-bold text-accent">{d.totalSales.toLocaleString()} YER</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case 'purchase-by-supplier':
        const purchaseBySupplier = purchaseInvoices.reduce((acc: any[], inv: any) => {
          const supplierName = language === 'ar' 
            ? inv.suppliers?.name_ar || inv.suppliers?.name || 'بدون مورد'
            : inv.suppliers?.name || 'No Supplier';
          const existing = acc.find(s => s.name === supplierName);
          if (existing) {
            existing.total += Number(inv.total_amount || 0);
            existing.paid += Number(inv.paid_amount || 0);
            existing.remaining += Number(inv.remaining_amount || 0);
            existing.count += 1;
          } else {
            acc.push({ 
              name: supplierName, 
              total: Number(inv.total_amount || 0), 
              paid: Number(inv.paid_amount || 0),
              remaining: Number(inv.remaining_amount || 0),
              count: 1 
            });
          }
          return acc;
        }, []).sort((a, b) => b.total - a.total);
        
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t.supplier}</TableHead>
                <TableHead>{language === 'ar' ? 'عدد الفواتير' : 'Invoices'}</TableHead>
                <TableHead>{t.amount}</TableHead>
                <TableHead>{t.paid}</TableHead>
                <TableHead>{t.remaining}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseBySupplier.map((s: any, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.count}</TableCell>
                  <TableCell>{s.total.toLocaleString()} YER</TableCell>
                  <TableCell className="text-accent">{s.paid.toLocaleString()} YER</TableCell>
                  <TableCell className="text-destructive font-bold">{s.remaining.toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={3}>{t.total}</TableCell>
                <TableCell>{purchaseBySupplier.reduce((s, c) => s + c.total, 0).toLocaleString()} YER</TableCell>
                <TableCell className="text-accent">{purchaseBySupplier.reduce((s, c) => s + c.paid, 0).toLocaleString()} YER</TableCell>
                <TableCell className="text-destructive">{purchaseBySupplier.reduce((s, c) => s + c.remaining, 0).toLocaleString()} YER</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      case 'customer-aging':
        const customerAging = salesInvoices
          .filter((inv: any) => inv.payment_status !== 'paid' && (inv.remaining_amount || 0) > 0)
          .reduce((acc: any[], inv: any) => {
            const customerName = language === 'ar' 
              ? inv.customers?.name_ar || inv.customers?.name || 'عميل نقدي'
              : inv.customers?.name || 'Cash Customer';
            const existing = acc.find(c => c.name === customerName);
            const daysOverdue = Math.floor((new Date().getTime() - new Date(inv.invoice_date).getTime()) / (1000 * 60 * 60 * 24));
            
            if (existing) {
              existing.total += Number(inv.remaining_amount || 0);
              existing.invoices += 1;
              if (daysOverdue > existing.maxDays) existing.maxDays = daysOverdue;
            } else {
              acc.push({ 
                name: customerName, 
                phone: inv.customers?.phone || '-',
                total: Number(inv.remaining_amount || 0), 
                invoices: 1,
                maxDays: daysOverdue
              });
            }
            return acc;
          }, []).sort((a, b) => b.total - a.total);
        
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.customer}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{language === 'ar' ? 'عدد الفواتير' : 'Invoices'}</TableHead>
                <TableHead>{language === 'ar' ? 'أقدم فاتورة (أيام)' : 'Oldest (days)'}</TableHead>
                <TableHead>{t.remaining}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerAging.map((c: any, idx) => (
                <TableRow key={idx}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.invoices}</TableCell>
                  <TableCell>
                    <Badge variant={c.maxDays > 30 ? 'destructive' : c.maxDays > 15 ? 'secondary' : 'default'}>
                      {c.maxDays} {language === 'ar' ? 'يوم' : 'days'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-destructive">{c.total.toLocaleString()} YER</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={4}>{t.total}</TableCell>
                <TableCell className="text-destructive">{customerAging.reduce((s, c) => s + c.total, 0).toLocaleString()} YER</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );

      default:
        return <div className="text-center py-8 text-muted-foreground">{t.noData}</div>;
    }
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t.title}</h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        
        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t.dateFrom}</span>
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t.dateTo}</span>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t.branch} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allBranches}</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>
                  {language === 'ar' ? b.name_ar || b.name : b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Modules List */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{language === 'ar' ? 'الموديولات' : 'Modules'}</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {modules.map((module) => (
                  <Button
                    key={module.id}
                    variant={activeModule === module.id ? 'default' : 'ghost'}
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setActiveModule(module.id);
                      setSelectedReport(null);
                    }}
                  >
                    {module.icon}
                    {module.name}
                    <Badge variant="secondary" className="ms-auto">
                      {moduleReports[module.id]?.length || 0}
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {modules.find(m => m.id === activeModule)?.name} - {language === 'ar' ? 'التقارير' : 'Reports'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {moduleReports[activeModule]?.map((report) => (
                    <Card 
                      key={report.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${selectedReport === report.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                      onClick={() => setSelectedReport(report.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${selectedReport === report.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {report.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {language === 'ar' ? report.nameAr : report.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {language === 'ar' ? report.descriptionAr : report.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview */}
        <div className="col-span-12 lg:col-span-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">
                  {selectedReport 
                    ? (language === 'ar' 
                      ? moduleReports[activeModule]?.find(r => r.id === selectedReport)?.nameAr 
                      : moduleReports[activeModule]?.find(r => r.id === selectedReport)?.name)
                    : t.preview
                  }
                </CardTitle>
                {selectedReport && (
                  <CardDescription>
                    {language === 'ar' 
                      ? moduleReports[activeModule]?.find(r => r.id === selectedReport)?.descriptionAr 
                      : moduleReports[activeModule]?.find(r => r.id === selectedReport)?.description}
                  </CardDescription>
                )}
              </div>
              {selectedReport && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer size={16} className="me-1" />
                    {t.print}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel([], selectedReport)}>
                    <FileSpreadsheet size={16} className="me-1" />
                    {t.exportExcel}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {renderReportContent()}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReadyReports;
