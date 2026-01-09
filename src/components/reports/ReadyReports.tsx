import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Printer, 
  FileSpreadsheet, 
  Eye,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  ShoppingCart,
  Truck,
  Building2,
  Wallet,
  Receipt,
  RotateCcw,
  ClipboardList,
  UserCheck,
  Calendar,
  Warehouse,
  User,
  FileText,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Clock
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface ReportDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ReactNode;
  module: string;
}

const ReadyReports = () => {
  const { language, direction } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeModule, setActiveModule] = useState('sales');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  // Fetch filter data
  const { data: branches = [] } = useQuery({
    queryKey: ['report-branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['report-warehouses'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['report-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    }
  });

  // Fetch report data based on selected report
  const { data: salesData = [] } = useQuery({
    queryKey: ['report-sales', dateFrom, dateTo, selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('*, customers(name, name_ar)')
        .gte('sale_date', dateFrom)
        .lte('sale_date', dateTo + 'T23:59:59')
        .order('sale_date', { ascending: false });
      if (selectedBranch !== 'all') query = query.eq('branch', selectedBranch);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'sales' || activeModule === 'pos'
  });

  const { data: salesInvoices = [] } = useQuery({
    queryKey: ['report-sales-invoices', dateFrom, dateTo, selectedBranch, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('sales_invoices')
        .select('*, customers(name, name_ar), salesmen(name, name_ar), branches(name, name_ar), warehouses(name, name_ar)')
        .gte('invoice_date', dateFrom)
        .lte('invoice_date', dateTo)
        .order('invoice_date', { ascending: false });
      if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
      if (selectedUser !== 'all') query = query.eq('created_by', selectedUser);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'sales'
  });

  const { data: salesReturns = [] } = useQuery({
    queryKey: ['report-sales-returns', dateFrom, dateTo, selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from('sales_returns')
        .select('*, customers(name, name_ar)')
        .gte('return_date', dateFrom)
        .lte('return_date', dateTo)
        .order('return_date', { ascending: false });
      if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'sales'
  });

  const { data: products = [] } = useQuery({
    queryKey: ['report-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, categories(name, name_ar)');
      return data || [];
    },
    enabled: activeModule === 'inventory'
  });

  const { data: inventoryMovements = [] } = useQuery({
    queryKey: ['report-inventory-movements', dateFrom, dateTo, selectedWarehouse, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('inventory_movements')
        .select('*, products(name, name_ar, sku), warehouses(name, name_ar)')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });
      if (selectedWarehouse !== 'all') query = query.eq('warehouse_id', selectedWarehouse);
      if (selectedUser !== 'all') query = query.eq('created_by', selectedUser);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'inventory'
  });

  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['report-purchase-invoices', dateFrom, dateTo, selectedBranch, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('purchase_invoices')
        .select('*, suppliers(name, name_ar), branches(name, name_ar), warehouses(name, name_ar)')
        .gte('invoice_date', dateFrom)
        .lte('invoice_date', dateTo)
        .order('invoice_date', { ascending: false });
      if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
      if (selectedUser !== 'all') query = query.eq('created_by', selectedUser);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'purchasing'
  });

  const { data: purchaseReturns = [] } = useQuery({
    queryKey: ['report-purchase-returns', dateFrom, dateTo, selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from('purchase_returns')
        .select('*, suppliers(name, name_ar)')
        .gte('return_date', dateFrom)
        .lte('return_date', dateTo)
        .order('return_date', { ascending: false });
      if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'purchasing'
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['report-suppliers'],
    queryFn: async () => {
      const { data } = await supabase.from('suppliers').select('*');
      return data || [];
    },
    enabled: activeModule === 'purchasing'
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['report-expenses', dateFrom, dateTo, selectedBranch, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*, branches(name, name_ar)')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .order('expense_date', { ascending: false });
      if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'finance'
  });

  const { data: revenues = [] } = useQuery({
    queryKey: ['report-revenues', dateFrom, dateTo, selectedBranch, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('revenues')
        .select('*, branches(name, name_ar)')
        .gte('revenue_date', dateFrom)
        .lte('revenue_date', dateTo)
        .order('revenue_date', { ascending: false });
      if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'finance'
  });

  const { data: treasuries = [] } = useQuery({
    queryKey: ['report-treasuries'],
    queryFn: async () => {
      const { data } = await supabase.from('treasuries').select('*, branches(name, name_ar)');
      return data || [];
    },
    enabled: activeModule === 'finance'
  });

  const { data: banks = [] } = useQuery({
    queryKey: ['report-banks'],
    queryFn: async () => {
      const { data } = await supabase.from('banks').select('*, branches(name, name_ar)');
      return data || [];
    },
    enabled: activeModule === 'finance'
  });

  const { data: treasuryTransactions = [] } = useQuery({
    queryKey: ['report-treasury-transactions', dateFrom, dateTo, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('treasury_transactions')
        .select('*, treasuries(name, name_ar)')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo + 'T23:59:59')
        .order('transaction_date', { ascending: false });
      if (selectedUser !== 'all') query = query.eq('created_by', selectedUser);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'finance'
  });

  const { data: bankTransactions = [] } = useQuery({
    queryKey: ['report-bank-transactions', dateFrom, dateTo, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*, banks(name, name_ar)')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo + 'T23:59:59')
        .order('transaction_date', { ascending: false });
      if (selectedUser !== 'all') query = query.eq('created_by', selectedUser);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'finance'
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['report-customers'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*');
      return data || [];
    },
    enabled: activeModule === 'crm'
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['report-employees'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('*');
      return data || [];
    },
    enabled: activeModule === 'hr'
  });

  const { data: posShifts = [] } = useQuery({
    queryKey: ['report-pos-shifts', dateFrom, dateTo, selectedBranch, selectedUser],
    queryFn: async () => {
      let query = supabase
        .from('pos_shifts')
        .select('*, branches(name, name_ar)')
        .gte('opened_at', dateFrom)
        .lte('opened_at', dateTo + 'T23:59:59')
        .order('opened_at', { ascending: false });
      if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
      if (selectedUser !== 'all') query = query.eq('cashier_id', selectedUser);
      const { data } = await query;
      return data || [];
    },
    enabled: activeModule === 'pos'
  });

  const { data: posReturns = [] } = useQuery({
    queryKey: ['report-pos-returns', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('pos_returns')
        .select('*, customers(name, name_ar)')
        .gte('return_date', dateFrom)
        .lte('return_date', dateTo)
        .order('return_date', { ascending: false });
      return data || [];
    },
    enabled: activeModule === 'pos'
  });

  const translations = {
    en: {
      title: 'Ready Reports',
      subtitle: 'Select a report to preview and print',
      filters: 'Filters',
      dateFrom: 'From',
      dateTo: 'To',
      branch: 'Branch',
      warehouse: 'Warehouse',
      user: 'User',
      allBranches: 'All Branches',
      allWarehouses: 'All Warehouses',
      allUsers: 'All Users',
      preview: 'Preview',
      print: 'Print',
      exportExcel: 'Excel',
      noData: 'No data available',
      total: 'Total',
      selectReport: 'Select a report from the list',
      
      // Modules
      modules: {
        pos: 'Point of Sale',
        sales: 'Sales',
        purchasing: 'Purchasing',
        inventory: 'Inventory',
        finance: 'Finance',
        crm: 'CRM',
        hr: 'HR'
      },
      
      // Reports
      reports: {
        // POS
        posShifts: 'Shift Reports',
        posShiftsDesc: 'All POS shifts with totals',
        posSales: 'POS Sales',
        posSalesDesc: 'Point of sale transactions',
        posReturns: 'POS Returns',
        posReturnsDesc: 'POS return transactions',
        
        // Sales
        salesInvoices: 'Sales Invoices',
        salesInvoicesDesc: 'All sales invoices',
        salesByCustomer: 'Sales by Customer',
        salesByCustomerDesc: 'Sales grouped by customer',
        salesBySalesman: 'Sales by Salesman',
        salesBySalesmanDesc: 'Sales grouped by salesman',
        salesReturns: 'Sales Returns',
        salesReturnsDesc: 'All sales returns',
        unpaidInvoices: 'Unpaid Invoices',
        unpaidInvoicesDesc: 'Outstanding customer invoices',
        
        // Purchasing
        purchaseInvoices: 'Purchase Invoices',
        purchaseInvoicesDesc: 'All purchase invoices',
        purchaseBySupplier: 'Purchases by Supplier',
        purchaseBySupplierDesc: 'Purchases grouped by supplier',
        purchaseReturns: 'Purchase Returns',
        purchaseReturnsDesc: 'All purchase returns',
        supplierBalances: 'Supplier Balances',
        supplierBalancesDesc: 'Outstanding supplier amounts',
        
        // Inventory
        stockReport: 'Stock Report',
        stockReportDesc: 'Current stock levels',
        lowStock: 'Low Stock Report',
        lowStockDesc: 'Products below minimum',
        outOfStock: 'Out of Stock',
        outOfStockDesc: 'Products with zero stock',
        stockMovements: 'Stock Movements',
        stockMovementsDesc: 'All inventory movements',
        stockValuation: 'Stock Valuation',
        stockValuationDesc: 'Inventory value report',
        
        // Finance
        expenseReport: 'Expense Report',
        expenseReportDesc: 'All expenses by category',
        revenueReport: 'Revenue Report',
        revenueReportDesc: 'All revenues by category',
        profitLoss: 'Profit & Loss',
        profitLossDesc: 'Income vs expenses',
        treasuryBalance: 'Treasury Balances',
        treasuryBalanceDesc: 'Current treasury balances',
        bankBalance: 'Bank Balances',
        bankBalanceDesc: 'Current bank balances',
        treasuryTransactions: 'Treasury Transactions',
        treasuryTransactionsDesc: 'Treasury movements',
        bankTransactions: 'Bank Transactions',
        bankTransactionsDesc: 'Bank movements',
        
        // CRM
        customerList: 'Customer List',
        customerListDesc: 'All registered customers',
        topCustomers: 'Top Customers',
        topCustomersDesc: 'By total purchases',
        customerBalances: 'Customer Balances',
        customerBalancesDesc: 'Outstanding amounts',
        
        // HR
        employeeList: 'Employee List',
        employeeListDesc: 'All employees',
        employeeByDept: 'By Department',
        employeeByDeptDesc: 'Employees by department'
      },
      
      // Table headers
      date: 'Date',
      invoiceNo: 'Invoice #',
      customer: 'Customer',
      supplier: 'Supplier',
      amount: 'Amount',
      status: 'Status',
      product: 'Product',
      sku: 'SKU',
      quantity: 'Quantity',
      stock: 'Stock',
      minStock: 'Min',
      price: 'Price',
      cost: 'Cost',
      value: 'Value',
      category: 'Category',
      salesman: 'Salesman',
      paid: 'Paid',
      remaining: 'Remaining',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      department: 'Department',
      position: 'Position',
      type: 'Type',
      description: 'Description',
      balance: 'Balance',
      shift: 'Shift',
      opening: 'Opening',
      closing: 'Closing',
      totalSales: 'Total Sales',
      movement: 'Movement',
      warehouse: 'Warehouse'
    },
    ar: {
      title: 'التقارير الجاهزة',
      subtitle: 'اختر تقريراً للمعاينة والطباعة',
      filters: 'الفلاتر',
      dateFrom: 'من',
      dateTo: 'إلى',
      branch: 'الفرع',
      warehouse: 'المخزن',
      user: 'المستخدم',
      allBranches: 'كل الفروع',
      allWarehouses: 'كل المخازن',
      allUsers: 'كل المستخدمين',
      preview: 'معاينة',
      print: 'طباعة',
      exportExcel: 'Excel',
      noData: 'لا توجد بيانات',
      total: 'الإجمالي',
      selectReport: 'اختر تقريراً من القائمة',
      
      // Modules
      modules: {
        pos: 'نقطة البيع',
        sales: 'المبيعات',
        purchasing: 'المشتريات',
        inventory: 'المخزون',
        finance: 'المالية',
        crm: 'العملاء',
        hr: 'الموارد البشرية'
      },
      
      // Reports
      reports: {
        // POS
        posShifts: 'تقارير الورديات',
        posShiftsDesc: 'جميع ورديات نقطة البيع',
        posSales: 'مبيعات نقطة البيع',
        posSalesDesc: 'معاملات نقطة البيع',
        posReturns: 'مرتجعات نقطة البيع',
        posReturnsDesc: 'معاملات مرتجعات نقطة البيع',
        
        // Sales
        salesInvoices: 'فواتير المبيعات',
        salesInvoicesDesc: 'جميع فواتير المبيعات',
        salesByCustomer: 'المبيعات حسب العميل',
        salesByCustomerDesc: 'المبيعات مجمعة حسب العميل',
        salesBySalesman: 'المبيعات حسب المندوب',
        salesBySalesmanDesc: 'المبيعات مجمعة حسب المندوب',
        salesReturns: 'مرتجعات المبيعات',
        salesReturnsDesc: 'جميع مرتجعات المبيعات',
        unpaidInvoices: 'الفواتير غير المسددة',
        unpaidInvoicesDesc: 'فواتير العملاء المستحقة',
        
        // Purchasing
        purchaseInvoices: 'فواتير المشتريات',
        purchaseInvoicesDesc: 'جميع فواتير المشتريات',
        purchaseBySupplier: 'المشتريات حسب المورد',
        purchaseBySupplierDesc: 'المشتريات مجمعة حسب المورد',
        purchaseReturns: 'مرتجعات المشتريات',
        purchaseReturnsDesc: 'جميع مرتجعات المشتريات',
        supplierBalances: 'أرصدة الموردين',
        supplierBalancesDesc: 'المبالغ المستحقة للموردين',
        
        // Inventory
        stockReport: 'تقرير المخزون',
        stockReportDesc: 'مستويات المخزون الحالية',
        lowStock: 'تقرير المخزون المنخفض',
        lowStockDesc: 'المنتجات أقل من الحد الأدنى',
        outOfStock: 'نفاذ المخزون',
        outOfStockDesc: 'المنتجات بدون مخزون',
        stockMovements: 'حركات المخزون',
        stockMovementsDesc: 'جميع حركات المخزون',
        stockValuation: 'تقييم المخزون',
        stockValuationDesc: 'تقرير قيمة المخزون',
        
        // Finance
        expenseReport: 'تقرير المصروفات',
        expenseReportDesc: 'المصروفات حسب الفئة',
        revenueReport: 'تقرير الإيرادات',
        revenueReportDesc: 'الإيرادات حسب الفئة',
        profitLoss: 'الأرباح والخسائر',
        profitLossDesc: 'الإيرادات مقابل المصروفات',
        treasuryBalance: 'أرصدة الخزائن',
        treasuryBalanceDesc: 'أرصدة الخزائن الحالية',
        bankBalance: 'أرصدة البنوك',
        bankBalanceDesc: 'أرصدة البنوك الحالية',
        treasuryTransactions: 'حركات الخزينة',
        treasuryTransactionsDesc: 'حركات الخزائن',
        bankTransactions: 'حركات البنوك',
        bankTransactionsDesc: 'حركات البنوك',
        
        // CRM
        customerList: 'قائمة العملاء',
        customerListDesc: 'جميع العملاء المسجلين',
        topCustomers: 'أفضل العملاء',
        topCustomersDesc: 'حسب إجمالي المشتريات',
        customerBalances: 'أرصدة العملاء',
        customerBalancesDesc: 'المبالغ المستحقة',
        
        // HR
        employeeList: 'قائمة الموظفين',
        employeeListDesc: 'جميع الموظفين',
        employeeByDept: 'حسب القسم',
        employeeByDeptDesc: 'الموظفون حسب الأقسام'
      },
      
      // Table headers
      date: 'التاريخ',
      invoiceNo: 'رقم الفاتورة',
      customer: 'العميل',
      supplier: 'المورد',
      amount: 'المبلغ',
      status: 'الحالة',
      product: 'المنتج',
      sku: 'الكود',
      quantity: 'الكمية',
      stock: 'المخزون',
      minStock: 'الحد الأدنى',
      price: 'السعر',
      cost: 'التكلفة',
      value: 'القيمة',
      category: 'الفئة',
      salesman: 'المندوب',
      paid: 'المدفوع',
      remaining: 'المتبقي',
      name: 'الاسم',
      phone: 'الهاتف',
      email: 'البريد',
      department: 'القسم',
      position: 'المنصب',
      type: 'النوع',
      description: 'الوصف',
      balance: 'الرصيد',
      shift: 'الوردية',
      opening: 'الافتتاح',
      closing: 'الإغلاق',
      totalSales: 'إجمالي المبيعات',
      movement: 'الحركة',
      warehouse: 'المخزن'
    }
  };

  const t = translations[language];

  // Module definitions with icons
  const modules = [
    { id: 'pos', icon: <ShoppingCart size={18} />, label: t.modules.pos },
    { id: 'sales', icon: <Receipt size={18} />, label: t.modules.sales },
    { id: 'purchasing', icon: <Truck size={18} />, label: t.modules.purchasing },
    { id: 'inventory', icon: <Package size={18} />, label: t.modules.inventory },
    { id: 'finance', icon: <Wallet size={18} />, label: t.modules.finance },
    { id: 'crm', icon: <Users size={18} />, label: t.modules.crm },
    { id: 'hr', icon: <UserCheck size={18} />, label: t.modules.hr },
  ];

  // Reports by module
  const reportsByModule: Record<string, ReportDefinition[]> = {
    pos: [
      { id: 'posShifts', name: t.reports.posShifts, nameAr: t.reports.posShifts, description: t.reports.posShiftsDesc, descriptionAr: t.reports.posShiftsDesc, icon: <Clock size={20} />, module: 'pos' },
      { id: 'posSales', name: t.reports.posSales, nameAr: t.reports.posSales, description: t.reports.posSalesDesc, descriptionAr: t.reports.posSalesDesc, icon: <ShoppingCart size={20} />, module: 'pos' },
      { id: 'posReturns', name: t.reports.posReturns, nameAr: t.reports.posReturns, description: t.reports.posReturnsDesc, descriptionAr: t.reports.posReturnsDesc, icon: <RotateCcw size={20} />, module: 'pos' },
    ],
    sales: [
      { id: 'salesInvoices', name: t.reports.salesInvoices, nameAr: t.reports.salesInvoices, description: t.reports.salesInvoicesDesc, descriptionAr: t.reports.salesInvoicesDesc, icon: <FileText size={20} />, module: 'sales' },
      { id: 'salesByCustomer', name: t.reports.salesByCustomer, nameAr: t.reports.salesByCustomer, description: t.reports.salesByCustomerDesc, descriptionAr: t.reports.salesByCustomerDesc, icon: <Users size={20} />, module: 'sales' },
      { id: 'salesBySalesman', name: t.reports.salesBySalesman, nameAr: t.reports.salesBySalesman, description: t.reports.salesBySalesmanDesc, descriptionAr: t.reports.salesBySalesmanDesc, icon: <UserCheck size={20} />, module: 'sales' },
      { id: 'salesReturns', name: t.reports.salesReturns, nameAr: t.reports.salesReturns, description: t.reports.salesReturnsDesc, descriptionAr: t.reports.salesReturnsDesc, icon: <RotateCcw size={20} />, module: 'sales' },
      { id: 'unpaidInvoices', name: t.reports.unpaidInvoices, nameAr: t.reports.unpaidInvoices, description: t.reports.unpaidInvoicesDesc, descriptionAr: t.reports.unpaidInvoicesDesc, icon: <CreditCard size={20} />, module: 'sales' },
    ],
    purchasing: [
      { id: 'purchaseInvoices', name: t.reports.purchaseInvoices, nameAr: t.reports.purchaseInvoices, description: t.reports.purchaseInvoicesDesc, descriptionAr: t.reports.purchaseInvoicesDesc, icon: <FileText size={20} />, module: 'purchasing' },
      { id: 'purchaseBySupplier', name: t.reports.purchaseBySupplier, nameAr: t.reports.purchaseBySupplier, description: t.reports.purchaseBySupplierDesc, descriptionAr: t.reports.purchaseBySupplierDesc, icon: <Truck size={20} />, module: 'purchasing' },
      { id: 'purchaseReturns', name: t.reports.purchaseReturns, nameAr: t.reports.purchaseReturns, description: t.reports.purchaseReturnsDesc, descriptionAr: t.reports.purchaseReturnsDesc, icon: <RotateCcw size={20} />, module: 'purchasing' },
      { id: 'supplierBalances', name: t.reports.supplierBalances, nameAr: t.reports.supplierBalances, description: t.reports.supplierBalancesDesc, descriptionAr: t.reports.supplierBalancesDesc, icon: <DollarSign size={20} />, module: 'purchasing' },
    ],
    inventory: [
      { id: 'stockReport', name: t.reports.stockReport, nameAr: t.reports.stockReport, description: t.reports.stockReportDesc, descriptionAr: t.reports.stockReportDesc, icon: <Package size={20} />, module: 'inventory' },
      { id: 'lowStock', name: t.reports.lowStock, nameAr: t.reports.lowStock, description: t.reports.lowStockDesc, descriptionAr: t.reports.lowStockDesc, icon: <TrendingUp size={20} />, module: 'inventory' },
      { id: 'outOfStock', name: t.reports.outOfStock, nameAr: t.reports.outOfStock, description: t.reports.outOfStockDesc, descriptionAr: t.reports.outOfStockDesc, icon: <Package size={20} />, module: 'inventory' },
      { id: 'stockMovements', name: t.reports.stockMovements, nameAr: t.reports.stockMovements, description: t.reports.stockMovementsDesc, descriptionAr: t.reports.stockMovementsDesc, icon: <ArrowLeftRight size={20} />, module: 'inventory' },
      { id: 'stockValuation', name: t.reports.stockValuation, nameAr: t.reports.stockValuation, description: t.reports.stockValuationDesc, descriptionAr: t.reports.stockValuationDesc, icon: <DollarSign size={20} />, module: 'inventory' },
    ],
    finance: [
      { id: 'expenseReport', name: t.reports.expenseReport, nameAr: t.reports.expenseReport, description: t.reports.expenseReportDesc, descriptionAr: t.reports.expenseReportDesc, icon: <CreditCard size={20} />, module: 'finance' },
      { id: 'revenueReport', name: t.reports.revenueReport, nameAr: t.reports.revenueReport, description: t.reports.revenueReportDesc, descriptionAr: t.reports.revenueReportDesc, icon: <Banknote size={20} />, module: 'finance' },
      { id: 'profitLoss', name: t.reports.profitLoss, nameAr: t.reports.profitLoss, description: t.reports.profitLossDesc, descriptionAr: t.reports.profitLossDesc, icon: <TrendingUp size={20} />, module: 'finance' },
      { id: 'treasuryBalance', name: t.reports.treasuryBalance, nameAr: t.reports.treasuryBalance, description: t.reports.treasuryBalanceDesc, descriptionAr: t.reports.treasuryBalanceDesc, icon: <Wallet size={20} />, module: 'finance' },
      { id: 'bankBalance', name: t.reports.bankBalance, nameAr: t.reports.bankBalance, description: t.reports.bankBalanceDesc, descriptionAr: t.reports.bankBalanceDesc, icon: <Building2 size={20} />, module: 'finance' },
      { id: 'treasuryTransactions', name: t.reports.treasuryTransactions, nameAr: t.reports.treasuryTransactions, description: t.reports.treasuryTransactionsDesc, descriptionAr: t.reports.treasuryTransactionsDesc, icon: <ArrowLeftRight size={20} />, module: 'finance' },
      { id: 'bankTransactions', name: t.reports.bankTransactions, nameAr: t.reports.bankTransactions, description: t.reports.bankTransactionsDesc, descriptionAr: t.reports.bankTransactionsDesc, icon: <ArrowLeftRight size={20} />, module: 'finance' },
    ],
    crm: [
      { id: 'customerList', name: t.reports.customerList, nameAr: t.reports.customerList, description: t.reports.customerListDesc, descriptionAr: t.reports.customerListDesc, icon: <Users size={20} />, module: 'crm' },
      { id: 'topCustomers', name: t.reports.topCustomers, nameAr: t.reports.topCustomers, description: t.reports.topCustomersDesc, descriptionAr: t.reports.topCustomersDesc, icon: <TrendingUp size={20} />, module: 'crm' },
      { id: 'customerBalances', name: t.reports.customerBalances, nameAr: t.reports.customerBalances, description: t.reports.customerBalancesDesc, descriptionAr: t.reports.customerBalancesDesc, icon: <DollarSign size={20} />, module: 'crm' },
    ],
    hr: [
      { id: 'employeeList', name: t.reports.employeeList, nameAr: t.reports.employeeList, description: t.reports.employeeListDesc, descriptionAr: t.reports.employeeListDesc, icon: <Users size={20} />, module: 'hr' },
      { id: 'employeeByDept', name: t.reports.employeeByDept, nameAr: t.reports.employeeByDept, description: t.reports.employeeByDeptDesc, descriptionAr: t.reports.employeeByDeptDesc, icon: <Building2 size={20} />, module: 'hr' },
    ],
  };

  // Get report data and render table based on selected report
  const getReportData = () => {
    switch (selectedReport) {
      // POS Reports
      case 'posShifts':
        return {
          headers: [t.date, t.shift, t.branch, t.opening, t.closing, t.totalSales, t.status],
          rows: posShifts.map((shift: any) => [
            format(new Date(shift.opened_at), 'yyyy-MM-dd HH:mm'),
            shift.shift_number,
            language === 'ar' ? shift.branches?.name_ar || shift.branches?.name || '-' : shift.branches?.name || '-',
            Number(shift.opening_amount || 0).toLocaleString(),
            Number(shift.closing_amount || 0).toLocaleString(),
            Number(shift.total_sales || 0).toLocaleString(),
            shift.status
          ]),
          total: posShifts.reduce((sum, s: any) => sum + Number(s.total_sales || 0), 0)
        };
      case 'posSales':
        return {
          headers: [t.date, t.invoiceNo, t.customer, t.amount, t.status],
          rows: salesData.map((sale: any) => [
            format(new Date(sale.sale_date), 'yyyy-MM-dd HH:mm'),
            sale.invoice_number,
            language === 'ar' ? sale.customers?.name_ar || sale.customers?.name || '-' : sale.customers?.name || '-',
            Number(sale.total_amount).toLocaleString(),
            sale.status || 'completed'
          ]),
          total: salesData.reduce((sum, s: any) => sum + Number(s.total_amount), 0)
        };
      case 'posReturns':
        return {
          headers: [t.date, t.invoiceNo, t.customer, t.amount, t.status],
          rows: posReturns.map((ret: any) => [
            format(new Date(ret.return_date), 'yyyy-MM-dd'),
            ret.return_number,
            language === 'ar' ? ret.customers?.name_ar || ret.customers?.name || '-' : ret.customers?.name || '-',
            Number(ret.total_amount).toLocaleString(),
            ret.status
          ]),
          total: posReturns.reduce((sum, r: any) => sum + Number(r.total_amount), 0)
        };

      // Sales Reports
      case 'salesInvoices':
        return {
          headers: [t.date, t.invoiceNo, t.customer, t.salesman, t.amount, t.paid, t.remaining, t.status],
          rows: salesInvoices.map((inv: any) => [
            inv.invoice_date,
            inv.invoice_number,
            language === 'ar' ? inv.customers?.name_ar || inv.customers?.name : inv.customers?.name || '-',
            language === 'ar' ? inv.salesmen?.name_ar || inv.salesmen?.name || '-' : inv.salesmen?.name || '-',
            Number(inv.total_amount).toLocaleString(),
            Number(inv.paid_amount || 0).toLocaleString(),
            Number(inv.remaining_amount || 0).toLocaleString(),
            inv.payment_status || inv.status
          ]),
          total: salesInvoices.reduce((sum, i: any) => sum + Number(i.total_amount), 0)
        };
      case 'salesByCustomer':
        const customerSales = salesInvoices.reduce((acc: any, inv: any) => {
          const name = language === 'ar' ? inv.customers?.name_ar || inv.customers?.name : inv.customers?.name || 'Unknown';
          if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
          acc[name].count++;
          acc[name].total += Number(inv.total_amount);
          return acc;
        }, {});
        return {
          headers: [t.customer, language === 'ar' ? 'عدد الفواتير' : 'Invoices', t.amount],
          rows: Object.values(customerSales).map((c: any) => [c.name, c.count, c.total.toLocaleString()]),
          total: salesInvoices.reduce((sum, i: any) => sum + Number(i.total_amount), 0)
        };
      case 'salesBySalesman':
        const salesmanSales = salesInvoices.reduce((acc: any, inv: any) => {
          const name = language === 'ar' ? inv.salesmen?.name_ar || inv.salesmen?.name || '-' : inv.salesmen?.name || '-';
          if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
          acc[name].count++;
          acc[name].total += Number(inv.total_amount);
          return acc;
        }, {});
        return {
          headers: [t.salesman, language === 'ar' ? 'عدد الفواتير' : 'Invoices', t.amount],
          rows: Object.values(salesmanSales).map((s: any) => [s.name, s.count, s.total.toLocaleString()]),
          total: salesInvoices.reduce((sum, i: any) => sum + Number(i.total_amount), 0)
        };
      case 'salesReturns':
        return {
          headers: [t.date, t.invoiceNo, t.customer, t.amount, t.status],
          rows: salesReturns.map((ret: any) => [
            ret.return_date,
            ret.return_number,
            language === 'ar' ? ret.customers?.name_ar || ret.customers?.name || '-' : ret.customers?.name || '-',
            Number(ret.total_amount).toLocaleString(),
            ret.status
          ]),
          total: salesReturns.reduce((sum, r: any) => sum + Number(r.total_amount), 0)
        };
      case 'unpaidInvoices':
        const unpaid = salesInvoices.filter((inv: any) => Number(inv.remaining_amount || 0) > 0);
        return {
          headers: [t.date, t.invoiceNo, t.customer, t.amount, t.paid, t.remaining],
          rows: unpaid.map((inv: any) => [
            inv.invoice_date,
            inv.invoice_number,
            language === 'ar' ? inv.customers?.name_ar || inv.customers?.name : inv.customers?.name || '-',
            Number(inv.total_amount).toLocaleString(),
            Number(inv.paid_amount || 0).toLocaleString(),
            Number(inv.remaining_amount || 0).toLocaleString()
          ]),
          total: unpaid.reduce((sum, i: any) => sum + Number(i.remaining_amount || 0), 0)
        };

      // Purchase Reports
      case 'purchaseInvoices':
        return {
          headers: [t.date, t.invoiceNo, t.supplier, t.amount, t.paid, t.remaining, t.status],
          rows: purchaseInvoices.map((inv: any) => [
            inv.invoice_date,
            inv.invoice_number,
            language === 'ar' ? inv.suppliers?.name_ar || inv.suppliers?.name : inv.suppliers?.name || '-',
            Number(inv.total_amount).toLocaleString(),
            Number(inv.paid_amount || 0).toLocaleString(),
            Number(inv.remaining_amount || 0).toLocaleString(),
            inv.payment_status
          ]),
          total: purchaseInvoices.reduce((sum, i: any) => sum + Number(i.total_amount), 0)
        };
      case 'purchaseBySupplier':
        const supplierPurchases = purchaseInvoices.reduce((acc: any, inv: any) => {
          const name = language === 'ar' ? inv.suppliers?.name_ar || inv.suppliers?.name : inv.suppliers?.name || 'Unknown';
          if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
          acc[name].count++;
          acc[name].total += Number(inv.total_amount);
          return acc;
        }, {});
        return {
          headers: [t.supplier, language === 'ar' ? 'عدد الفواتير' : 'Invoices', t.amount],
          rows: Object.values(supplierPurchases).map((s: any) => [s.name, s.count, s.total.toLocaleString()]),
          total: purchaseInvoices.reduce((sum, i: any) => sum + Number(i.total_amount), 0)
        };
      case 'purchaseReturns':
        return {
          headers: [t.date, t.invoiceNo, t.supplier, t.amount, t.status],
          rows: purchaseReturns.map((ret: any) => [
            ret.return_date,
            ret.return_number,
            language === 'ar' ? ret.suppliers?.name_ar || ret.suppliers?.name || '-' : ret.suppliers?.name || '-',
            Number(ret.total_amount).toLocaleString(),
            ret.status
          ]),
          total: purchaseReturns.reduce((sum, r: any) => sum + Number(r.total_amount), 0)
        };
      case 'supplierBalances':
        const supplierBal = purchaseInvoices.reduce((acc: any, inv: any) => {
          const name = language === 'ar' ? inv.suppliers?.name_ar || inv.suppliers?.name : inv.suppliers?.name || 'Unknown';
          if (!acc[name]) acc[name] = { name, total: 0, paid: 0, remaining: 0 };
          acc[name].total += Number(inv.total_amount);
          acc[name].paid += Number(inv.paid_amount || 0);
          acc[name].remaining += Number(inv.remaining_amount || 0);
          return acc;
        }, {});
        return {
          headers: [t.supplier, t.amount, t.paid, t.remaining],
          rows: Object.values(supplierBal).map((s: any) => [s.name, s.total.toLocaleString(), s.paid.toLocaleString(), s.remaining.toLocaleString()]),
          total: Object.values(supplierBal).reduce((sum: number, s: any) => sum + s.remaining, 0)
        };

      // Inventory Reports
      case 'stockReport':
        return {
          headers: [t.sku, t.product, t.category, t.stock, t.minStock, t.cost, t.value],
          rows: products.map((p: any) => [
            p.sku,
            language === 'ar' ? p.name_ar || p.name : p.name,
            language === 'ar' ? p.categories?.name_ar || p.categories?.name || '-' : p.categories?.name || '-',
            p.stock,
            p.min_stock || 5,
            Number(p.cost || 0).toLocaleString(),
            (p.stock * (p.cost || 0)).toLocaleString()
          ]),
          total: products.reduce((sum, p: any) => sum + (p.stock * (p.cost || 0)), 0)
        };
      case 'lowStock':
        const lowStockItems = products.filter((p: any) => p.stock > 0 && p.stock <= (p.min_stock || 5));
        return {
          headers: [t.sku, t.product, t.stock, t.minStock],
          rows: lowStockItems.map((p: any) => [
            p.sku,
            language === 'ar' ? p.name_ar || p.name : p.name,
            p.stock,
            p.min_stock || 5
          ]),
          total: lowStockItems.length
        };
      case 'outOfStock':
        const outOfStockItems = products.filter((p: any) => p.stock === 0);
        return {
          headers: [t.sku, t.product, t.category],
          rows: outOfStockItems.map((p: any) => [
            p.sku,
            language === 'ar' ? p.name_ar || p.name : p.name,
            language === 'ar' ? p.categories?.name_ar || p.categories?.name || '-' : p.categories?.name || '-'
          ]),
          total: outOfStockItems.length
        };
      case 'stockMovements':
        return {
          headers: [t.date, t.product, t.movement, t.quantity, t.warehouse],
          rows: inventoryMovements.map((m: any) => [
            format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
            language === 'ar' ? m.products?.name_ar || m.products?.name : m.products?.name || '-',
            m.movement_type,
            m.quantity,
            language === 'ar' ? m.warehouses?.name_ar || m.warehouses?.name || '-' : m.warehouses?.name || '-'
          ]),
          total: inventoryMovements.length
        };
      case 'stockValuation':
        const byCategory = products.reduce((acc: any, p: any) => {
          const cat = language === 'ar' ? p.categories?.name_ar || p.categories?.name || 'غير مصنف' : p.categories?.name || 'Uncategorized';
          if (!acc[cat]) acc[cat] = { category: cat, count: 0, stock: 0, value: 0 };
          acc[cat].count++;
          acc[cat].stock += p.stock;
          acc[cat].value += p.stock * (p.cost || 0);
          return acc;
        }, {});
        return {
          headers: [t.category, language === 'ar' ? 'عدد المنتجات' : 'Products', t.stock, t.value],
          rows: Object.values(byCategory).map((c: any) => [c.category, c.count, c.stock, c.value.toLocaleString()]),
          total: products.reduce((sum, p: any) => sum + (p.stock * (p.cost || 0)), 0)
        };

      // Finance Reports
      case 'expenseReport':
        return {
          headers: [t.date, t.category, t.description, t.amount],
          rows: expenses.map((e: any) => [
            e.expense_date,
            e.category,
            e.description || '-',
            Number(e.amount).toLocaleString()
          ]),
          total: expenses.reduce((sum, e: any) => sum + Number(e.amount), 0)
        };
      case 'revenueReport':
        return {
          headers: [t.date, t.category, t.description, t.amount],
          rows: revenues.map((r: any) => [
            r.revenue_date,
            r.category,
            r.description || '-',
            Number(r.amount).toLocaleString()
          ]),
          total: revenues.reduce((sum, r: any) => sum + Number(r.amount), 0)
        };
      case 'profitLoss':
        const totalRev = revenues.reduce((sum, r: any) => sum + Number(r.amount), 0);
        const totalExp = expenses.reduce((sum, e: any) => sum + Number(e.amount), 0);
        const totalSales = salesData.reduce((sum, s: any) => sum + Number(s.total_amount), 0);
        return {
          headers: [language === 'ar' ? 'البند' : 'Item', t.amount],
          rows: [
            [language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales', totalSales.toLocaleString()],
            [language === 'ar' ? 'إجمالي الإيرادات الأخرى' : 'Other Revenues', totalRev.toLocaleString()],
            [language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses', `(${totalExp.toLocaleString()})`],
            [language === 'ar' ? 'صافي الربح' : 'Net Profit', (totalSales + totalRev - totalExp).toLocaleString()]
          ],
          total: totalSales + totalRev - totalExp
        };
      case 'treasuryBalance':
        return {
          headers: [t.name, t.branch, t.balance],
          rows: treasuries.map((tr: any) => [
            language === 'ar' ? tr.name_ar || tr.name : tr.name,
            language === 'ar' ? tr.branches?.name_ar || tr.branches?.name || '-' : tr.branches?.name || '-',
            Number(tr.balance || 0).toLocaleString()
          ]),
          total: treasuries.reduce((sum, t: any) => sum + Number(t.balance || 0), 0)
        };
      case 'bankBalance':
        return {
          headers: [t.name, t.branch, t.balance],
          rows: banks.map((b: any) => [
            language === 'ar' ? b.name_ar || b.name : b.name,
            language === 'ar' ? b.branches?.name_ar || b.branches?.name || '-' : b.branches?.name || '-',
            Number(b.balance || 0).toLocaleString()
          ]),
          total: banks.reduce((sum, b: any) => sum + Number(b.balance || 0), 0)
        };
      case 'treasuryTransactions':
        return {
          headers: [t.date, t.name, t.type, t.amount, t.balance, t.description],
          rows: treasuryTransactions.map((tx: any) => [
            format(new Date(tx.transaction_date), 'yyyy-MM-dd HH:mm'),
            language === 'ar' ? tx.treasuries?.name_ar || tx.treasuries?.name : tx.treasuries?.name || '-',
            tx.transaction_type,
            Number(tx.amount).toLocaleString(),
            Number(tx.balance_after || 0).toLocaleString(),
            tx.description || '-'
          ]),
          total: treasuryTransactions.length
        };
      case 'bankTransactions':
        return {
          headers: [t.date, t.name, t.type, t.amount, t.balance, t.description],
          rows: bankTransactions.map((tx: any) => [
            format(new Date(tx.transaction_date), 'yyyy-MM-dd HH:mm'),
            language === 'ar' ? tx.banks?.name_ar || tx.banks?.name : tx.banks?.name || '-',
            tx.transaction_type,
            Number(tx.amount).toLocaleString(),
            Number(tx.balance_after || 0).toLocaleString(),
            tx.description || '-'
          ]),
          total: bankTransactions.length
        };

      // CRM Reports
      case 'customerList':
        return {
          headers: [t.name, t.phone, t.email, language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'],
          rows: customers.map((c: any) => [
            language === 'ar' ? c.name_ar || c.name : c.name,
            c.phone || '-',
            c.email || '-',
            Number(c.total_purchases || 0).toLocaleString()
          ]),
          total: customers.length
        };
      case 'topCustomers':
        const sorted = [...customers].sort((a: any, b: any) => Number(b.total_purchases || 0) - Number(a.total_purchases || 0)).slice(0, 20);
        return {
          headers: [t.name, t.phone, language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'],
          rows: sorted.map((c: any) => [
            language === 'ar' ? c.name_ar || c.name : c.name,
            c.phone || '-',
            Number(c.total_purchases || 0).toLocaleString()
          ]),
          total: sorted.reduce((sum, c: any) => sum + Number(c.total_purchases || 0), 0)
        };
      case 'customerBalances':
        const customerBal = salesInvoices.reduce((acc: any, inv: any) => {
          const name = language === 'ar' ? inv.customers?.name_ar || inv.customers?.name : inv.customers?.name || 'Unknown';
          if (!acc[name]) acc[name] = { name, total: 0, paid: 0, remaining: 0 };
          acc[name].total += Number(inv.total_amount);
          acc[name].paid += Number(inv.paid_amount || 0);
          acc[name].remaining += Number(inv.remaining_amount || 0);
          return acc;
        }, {});
        const balances = Object.values(customerBal).filter((c: any) => c.remaining > 0);
        return {
          headers: [t.customer, t.amount, t.paid, t.remaining],
          rows: balances.map((c: any) => [c.name, c.total.toLocaleString(), c.paid.toLocaleString(), c.remaining.toLocaleString()]),
          total: balances.reduce((sum: number, c: any) => sum + c.remaining, 0)
        };

      // HR Reports
      case 'employeeList':
        return {
          headers: [language === 'ar' ? 'الكود' : 'Code', t.name, t.department, t.position, t.phone],
          rows: employees.map((e: any) => [
            e.employee_code,
            language === 'ar' ? e.name_ar || e.name : e.name,
            e.department || '-',
            e.position || '-',
            e.phone || '-'
          ]),
          total: employees.length
        };
      case 'employeeByDept':
        const byDept = employees.reduce((acc: any, e: any) => {
          const dept = e.department || (language === 'ar' ? 'بدون قسم' : 'No Department');
          if (!acc[dept]) acc[dept] = { department: dept, count: 0 };
          acc[dept].count++;
          return acc;
        }, {});
        return {
          headers: [t.department, language === 'ar' ? 'عدد الموظفين' : 'Employees'],
          rows: Object.values(byDept).map((d: any) => [d.department, d.count]),
          total: employees.length
        };

      default:
        return { headers: [], rows: [], total: 0 };
    }
  };

  const handlePrint = () => {
    const reportData = getReportData();
    const reportDef = reportsByModule[activeModule]?.find(r => r.id === selectedReport);
    
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
          <title>${reportDef?.name || 'Report'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; direction: ${direction}; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: ${direction === 'rtl' ? 'right' : 'left'}; }
            th { background: #f5f5f5; font-weight: bold; }
            .total { font-weight: bold; background: #f9f9f9; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>${reportDef?.name || 'Report'}</h1>
          <div class="subtitle">${t.dateFrom}: ${dateFrom} - ${t.dateTo}: ${dateTo}</div>
          <table>
            <thead>
              <tr>${reportData.headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${reportData.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
              <tr class="total">
                <td colspan="${reportData.headers.length - 1}">${t.total}</td>
                <td>${typeof reportData.total === 'number' ? reportData.total.toLocaleString() : reportData.total}</td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportExcel = () => {
    const reportData = getReportData();
    const reportDef = reportsByModule[activeModule]?.find(r => r.id === selectedReport);
    
    const ws = XLSX.utils.aoa_to_sheet([
      reportData.headers,
      ...reportData.rows,
      [t.total, ...Array(reportData.headers.length - 2).fill(''), reportData.total]
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportDef?.name || 'Report');
    XLSX.writeFile(wb, `${selectedReport}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const currentReports = reportsByModule[activeModule] || [];
  const reportData = selectedReport ? getReportData() : null;

  return (
    <div className="space-y-4" dir={direction}>
      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px] h-9"
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px] h-9"
              />
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-muted-foreground" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder={t.allBranches} />
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

            <div className="flex items-center gap-2">
              <Warehouse size={16} className="text-muted-foreground" />
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder={t.allWarehouses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allWarehouses}</SelectItem>
                  {warehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {language === 'ar' ? w.name_ar || w.name : w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder={t.allUsers} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allUsers}</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {language === 'ar' ? u.full_name_ar || u.full_name : u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar - Reports List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {/* Module Tabs */}
            <div className="flex flex-wrap gap-1 mb-3 p-1 bg-muted/50 rounded-lg">
              {modules.map((mod) => (
                <Button
                  key={mod.id}
                  variant={activeModule === mod.id ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => { setActiveModule(mod.id); setSelectedReport(null); }}
                >
                  {mod.icon}
                  <span className="hidden xl:inline">{mod.label}</span>
                </Button>
              ))}
            </div>

            {/* Reports List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {currentReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`w-full p-3 rounded-lg text-start transition-colors ${
                      selectedReport === report.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={selectedReport === report.id ? 'text-primary-foreground' : 'text-muted-foreground'}>
                        {report.icon}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{report.name}</p>
                        <p className={`text-xs ${selectedReport === report.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content - Report Preview */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {selectedReport 
                  ? reportsByModule[activeModule]?.find(r => r.id === selectedReport)?.name 
                  : t.selectReport}
              </CardTitle>
              {selectedReport && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t.dateFrom}: {dateFrom} - {t.dateTo}: {dateTo}
                </p>
              )}
            </div>
            {selectedReport && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer size={16} className="me-1.5" />
                  {t.print}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel}>
                  <FileSpreadsheet size={16} className="me-1.5" />
                  {t.exportExcel}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent ref={printRef}>
            {!selectedReport ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <ClipboardList size={48} className="mb-3 opacity-50" />
                <p>{t.selectReport}</p>
              </div>
            ) : reportData && reportData.rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Package size={48} className="mb-3 opacity-50" />
                <p>{t.noData}</p>
              </div>
            ) : reportData && (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reportData.headers.map((header, i) => (
                        <TableHead key={i} className="font-semibold">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.rows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={reportData.headers.length - 1}>{t.total}</TableCell>
                      <TableCell>
                        {typeof reportData.total === 'number' ? reportData.total.toLocaleString() : reportData.total}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReadyReports;
