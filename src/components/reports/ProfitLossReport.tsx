import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  ShoppingCart,
  Package,
  Download,
  Printer,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Receipt,
  Landmark
} from 'lucide-react';
import { format, subMonths, subQuarters, subYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

// ==================== Types ====================
interface SalesInvoice {
  id: number;
  invoice_number: string;
  total_amount: string;
  created_at: string;
}

interface SalesInvoiceResponse {
  data: SalesInvoice[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  total_amount: string;
  invoice_date: string;
}

interface PurchaseInvoiceResponse {
  data: PurchaseInvoice[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Finance {
  id: number;
  category: string;
  amount: string;
  description: string;
  date: string;
  payment_method: string;
  payment_method_arabic: string;
}

interface FinanceResponse {
  data: Finance[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
  count: number;
}

const ProfitLossReport: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [period, setPeriod] = useState('month');
  const [compareWith, setCompareWith] = useState('previous');

  // ==================== Date Range Functions ====================
  const getPeriodRange = (periodType: string, offset: number = 0) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (periodType) {
      case 'month':
        start = startOfMonth(subMonths(now, offset));
        end = endOfMonth(subMonths(now, offset));
        break;
      case 'quarter':
        start = startOfQuarter(subQuarters(now, offset));
        end = endOfQuarter(subQuarters(now, offset));
        break;
      case 'year':
        start = startOfYear(subYears(now, offset));
        end = endOfYear(subYears(now, offset));
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { 
      start: format(start, 'yyyy-MM-dd'), 
      end: format(end, 'yyyy-MM-dd') 
    };
  };

  const currentPeriod = getPeriodRange(period, 0);
  const previousPeriod = getPeriodRange(period, 1);

  // ==================== Fetch Current Period Sales ====================
  const { data: currentSales = [], isLoading: loadingCurrentSales } = useQuery<SalesInvoice[]>({
    queryKey: ['current-sales', period],
    queryFn: async () => {
      try {
        const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
          date_from: `${currentPeriod.start} 00:00:00`,
          date_to: `${currentPeriod.end} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching current sales:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Previous Period Sales ====================
  const { data: previousSales = [] } = useQuery<SalesInvoice[]>({
    queryKey: ['previous-sales', period],
    queryFn: async () => {
      try {
        const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
          date_from: `${previousPeriod.start} 00:00:00`,
          date_to: `${previousPeriod.end} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching previous sales:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Current Period Purchases ====================
  const { data: currentPurchases = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ['current-purchases', period],
    queryFn: async () => {
      try {
        const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
          date_from: `${currentPeriod.start} 00:00:00`,
          date_to: `${currentPeriod.end} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching current purchases:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Previous Period Purchases ====================
  const { data: previousPurchases = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ['previous-purchases', period],
    queryFn: async () => {
      try {
        const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
          date_from: `${previousPeriod.start} 00:00:00`,
          date_to: `${previousPeriod.end} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching previous purchases:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Current Period Finances ====================
  const { data: currentFinances = [] } = useQuery<Finance[]>({
    queryKey: ['current-finances', period],
    queryFn: async () => {
      try {
        const response = await api.post<FinanceResponse>('/finance/index', {
          date_from: currentPeriod.start,
          date_to: currentPeriod.end
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching current finances:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Previous Period Finances ====================
  const { data: previousFinances = [] } = useQuery<Finance[]>({
    queryKey: ['previous-finances', period],
    queryFn: async () => {
      try {
        const response = await api.post<FinanceResponse>('/finance/index', {
          date_from: previousPeriod.start,
          date_to: previousPeriod.end
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching previous finances:', error);
        return [];
      }
    }
  });

  // ==================== Calculate Current Period Totals ====================
  const totals = useMemo(() => {
    // Sales
    const totalSales = currentSales.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    
    // Purchases (Cost of Goods Sold)
    const totalPurchases = currentPurchases.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    
    // Expenses and Revenues from Finance
    const totalExpenses = currentFinances
      .filter(f => f.category === 'expense' || Number(f.amount) < 0)
      .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);
    
    const totalRevenues = currentFinances
      .filter(f => f.category === 'revenue' || Number(f.amount) > 0)
      .reduce((sum, f) => sum + Number(f.amount), 0);

    // Calculate derived values
    const grossProfit = totalSales - totalPurchases;
    const operatingExpenses = totalExpenses;
    const operatingIncome = grossProfit - operatingExpenses;
    const otherIncome = totalRevenues;
    const netIncome = operatingIncome + otherIncome;
    
    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const netProfitMargin = totalSales > 0 ? (netIncome / totalSales) * 100 : 0;

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      totalRevenues,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      otherIncome,
      netIncome,
      grossProfitMargin,
      netProfitMargin
    };
  }, [currentSales, currentPurchases, currentFinances]);

  // ==================== Calculate Previous Period Totals ====================
  const previousTotals = useMemo(() => {
    const prevSales = previousSales.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const prevPurchases = previousPurchases.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const prevExpenses = previousFinances
      .filter(f => f.category === 'expense' || Number(f.amount) < 0)
      .reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0);
    const prevRevenues = previousFinances
      .filter(f => f.category === 'revenue' || Number(f.amount) > 0)
      .reduce((sum, f) => sum + Number(f.amount), 0);

    const prevNetIncome = (prevSales - prevPurchases) - prevExpenses + prevRevenues;

    return {
      sales: prevSales,
      netIncome: prevNetIncome
    };
  }, [previousSales, previousPurchases, previousFinances]);

  // ==================== Calculate Changes ====================
  const changes = useMemo(() => {
    const salesChange = previousTotals.sales > 0 
      ? ((totals.totalSales - previousTotals.sales) / previousTotals.sales) * 100 
      : 0;
    
    const profitChange = previousTotals.netIncome !== 0 
      ? ((totals.netIncome - previousTotals.netIncome) / Math.abs(previousTotals.netIncome)) * 100 
      : 0;

    return { salesChange, profitChange };
  }, [totals, previousTotals]);

  // ==================== Expenses by Category ====================
  const expensesByCategory = useMemo<ExpenseCategory[]>(() => {
    const categoryMap = new Map<string, { value: number; count: number }>();

    currentFinances
      .filter(f => f.category === 'expense' || Number(f.amount) < 0)
      .forEach(f => {
        const category = f.category;
        const amount = Math.abs(Number(f.amount));
        
        const existing = categoryMap.get(category);
        if (existing) {
          existing.value += amount;
          existing.count += 1;
        } else {
          categoryMap.set(category, { value: amount, count: 1 });
        }
      });

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, value: data.value, count: data.count }))
      .sort((a, b) => b.value - a.value);
  }, [currentFinances]);

  // ==================== Export to Excel ====================
  const handleExport = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['تقرير الأرباح والخسائر', 'Profit & Loss Report'],
        ['الفترة', `${currentPeriod.start} إلى ${currentPeriod.end}`],
        [''],
        ['البند', 'القيمة', 'مقارنة بالفترة السابقة'],
        ['المبيعات', totals.totalSales, `${changes.salesChange.toFixed(1)}%`],
        ['تكلفة البضاعة المباعة', totals.totalPurchases, ''],
        ['مجمل الربح', totals.grossProfit, ''],
        ['المصروفات التشغيلية', totals.operatingExpenses, ''],
        ['الدخل التشغيلي', totals.operatingIncome, ''],
        ['إيرادات أخرى', totals.otherIncome, ''],
        ['صافي الدخل', totals.netIncome, `${changes.profitChange.toFixed(1)}%`],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Expenses Breakdown Sheet
      const expensesData = [
        ['الفئة', 'المبلغ', 'عدد المعاملات'],
        ...expensesByCategory.map(e => [e.name, e.value, e.count])
      ];
      const expensesWs = XLSX.utils.aoa_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(wb, expensesWs, 'Expenses');

      XLSX.writeFile(wb, `profit_loss_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(language === 'ar' ? 'حدث خطأ في التصدير' : 'Export failed');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (printWindow) {
      const direction = language === 'ar' ? 'rtl' : 'ltr';
      
      printWindow.document.write(`
        <html>
        <head>
          <title>${t.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; direction: ${direction}; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            h2 { font-size: 18px; margin: 20px 0 10px; }
            .period { color: #666; font-size: 14px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 10px; text-align: ${direction === 'rtl' ? 'right' : 'left'}; border-bottom: 1px solid #ddd; }
            th { background: #f5f5f5; font-weight: bold; }
            .total { font-weight: bold; background: #f9f9f9; }
            .profit { color: green; }
            .loss { color: red; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>${t.title}</h1>
          <div class="period">
            ${format(new Date(currentPeriod.start), 'MMM d, yyyy')} - ${format(new Date(currentPeriod.end), 'MMM d, yyyy')}
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <h3>${t.sales}</h3>
              <p style="font-size: 20px; font-weight: bold;">${formatCurrency(totals.totalSales)}</p>
            </div>
            <div class="summary-card">
              <h3>${t.grossProfit}</h3>
              <p style="font-size: 20px; font-weight: bold;">${formatCurrency(totals.grossProfit)}</p>
            </div>
            <div class="summary-card">
              <h3>${t.operatingExpenses}</h3>
              <p style="font-size: 20px; font-weight: bold;">${formatCurrency(totals.operatingExpenses)}</p>
            </div>
            <div class="summary-card">
              <h3>${t.netIncome}</h3>
              <p style="font-size: 20px; font-weight: bold; ${totals.netIncome >= 0 ? 'color: green;' : 'color: red;'}">
                ${formatCurrency(totals.netIncome)}
              </p>
            </div>
          </div>

          <h2>${t.title}</h2>
          <table>
            <tr>
              <th>${language === 'ar' ? 'البند' : 'Item'}</th>
              <th>${language === 'ar' ? 'القيمة' : 'Amount'}</th>
            </tr>
            <tr><td colspan="2"><strong>${t.revenue}</strong></td></tr>
            <tr><td style="padding-left: 30px;">${t.sales}</td><td>${formatCurrency(totals.totalSales)}</td></tr>
            <tr><td style="padding-left: 30px;">${t.otherIncome}</td><td>${formatCurrency(totals.otherIncome)}</td></tr>
            <tr class="total"><td>${t.revenue} ${language === 'ar' ? 'الإجمالي' : 'Total'}</td><td>${formatCurrency(totals.totalSales + totals.otherIncome)}</td></tr>
            
            <tr><td colspan="2"><strong>${t.costOfGoods}</strong></td></tr>
            <tr><td style="padding-left: 30px;">${t.costOfGoods}</td><td>${formatCurrency(totals.totalPurchases)}</td></tr>
            
            <tr class="total"><td>${t.grossProfit}</td><td>${formatCurrency(totals.grossProfit)}</td></tr>
            
            <tr><td colspan="2"><strong>${t.operatingExpenses}</strong></td></tr>
            ${expensesByCategory.map(e => `
              <tr><td style="padding-left: 30px;">${e.name}</td><td>${formatCurrency(e.value)}</td></tr>
            `).join('')}
            <tr class="total"><td>${t.operatingExpenses} ${language === 'ar' ? 'الإجمالي' : 'Total'}</td><td>${formatCurrency(totals.operatingExpenses)}</td></tr>
            
            <tr class="total"><td>${t.netIncome}</td><td class="${totals.netIncome >= 0 ? 'profit' : 'loss'}">${formatCurrency(totals.netIncome)}</td></tr>
          </table>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // ==================== Translations ====================
  const t = {
    title: language === 'ar' ? 'تقرير الأرباح والخسائر' : 'Profit & Loss Report',
    description: language === 'ar' ? 'تحليل مالي شامل' : 'Comprehensive financial analysis',
    period: language === 'ar' ? 'الفترة' : 'Period',
    month: language === 'ar' ? 'شهر' : 'Month',
    quarter: language === 'ar' ? 'ربع سنة' : 'Quarter',
    year: language === 'ar' ? 'سنة' : 'Year',
    revenue: language === 'ar' ? 'الإيرادات' : 'Revenue',
    sales: language === 'ar' ? 'المبيعات' : 'Sales',
    otherIncome: language === 'ar' ? 'إيرادات أخرى' : 'Other Income',
    costOfGoods: language === 'ar' ? 'تكلفة البضاعة المباعة' : 'Cost of Goods Sold',
    grossProfit: language === 'ar' ? 'مجمل الربح' : 'Gross Profit',
    operatingExpenses: language === 'ar' ? 'المصروفات التشغيلية' : 'Operating Expenses',
    operatingIncome: language === 'ar' ? 'الدخل التشغيلي' : 'Operating Income',
    netIncome: language === 'ar' ? 'صافي الدخل' : 'Net Income',
    grossMargin: language === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Margin',
    netMargin: language === 'ar' ? 'هامش صافي الربح' : 'Net Margin',
    vsLastPeriod: language === 'ar' ? 'مقارنة بالفترة السابقة' : 'vs last period',
    expenseBreakdown: language === 'ar' ? 'تفصيل المصروفات' : 'Expense Breakdown',
    print: language === 'ar' ? 'طباعة' : 'Print',
    export: language === 'ar' ? 'تصدير' : 'Export',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    noData: language === 'ar' ? 'لا توجد بيانات' : 'No data',
  };

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--warning))',
    'hsl(199, 89%, 48%)',
    'hsl(280, 60%, 50%)',
    'hsl(330, 70%, 50%)'
  ];

  const isLoading = loadingCurrentSales;

  const LineItem = ({ 
    label, 
    value, 
    indent = 0, 
    isBold = false, 
    isTotal = false,
    change
  }: { 
    label: string; 
    value: number; 
    indent?: number; 
    isBold?: boolean;
    isTotal?: boolean;
    change?: number;
  }) => (
    <div className={cn(
      "flex items-center justify-between py-2",
      isTotal && "border-t-2 border-border pt-3 mt-2"
    )}>
      <span 
        className={cn(
          "text-sm",
          isBold && "font-semibold",
          !isBold && !isTotal && "text-muted-foreground"
        )}
        style={{ marginInlineStart: `${indent * 16}px` }}
      >
        {label}
      </span>
      <div className="flex items-center gap-3">
        {change !== undefined && (
          <Badge 
            variant={change > 0 ? 'default' : change < 0 ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {change > 0 ? <ArrowUpRight size={12} /> : change < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {Math.abs(change).toFixed(1)}%
          </Badge>
        )}
        <span className={cn(
          "font-mono",
          isBold && "font-bold text-lg",
          value < 0 && "text-destructive"
        )}>
          {formatCurrency(value)}
        </span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar size={16} className="me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t.month}</SelectItem>
              <SelectItem value="quarter">{t.quarter}</SelectItem>
              <SelectItem value="year">{t.year}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} className="me-2" />
            {t.print}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="me-2" />
            {t.export}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.sales}</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalSales)}</p>
              </div>
              <div className="p-3 bg-primary/20 rounded-full">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {changes.salesChange >= 0 ? (
                <Badge variant="secondary" className="bg-success/20 text-success">
                  <ArrowUpRight size={12} className="me-1" />
                  {changes.salesChange.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-destructive/20 text-destructive">
                  <ArrowDownRight size={12} className="me-1" />
                  {Math.abs(changes.salesChange).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{t.vsLastPeriod}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.grossProfit}</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.grossProfit)}</p>
              </div>
              <div className="p-3 bg-accent/20 rounded-full">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={totals.grossProfitMargin} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{t.grossMargin}: {totals.grossProfitMargin.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.operatingExpenses}</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.operatingExpenses)}</p>
              </div>
              <div className="p-3 bg-warning/20 rounded-full">
                <CreditCard className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-gradient-to-br border",
          totals.netIncome >= 0 
            ? "from-success/10 to-success/5 border-success/20" 
            : "from-destructive/10 to-destructive/5 border-destructive/20"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.netIncome}</p>
                <p className={cn("text-2xl font-bold", totals.netIncome < 0 && "text-destructive")}>
                  {formatCurrency(totals.netIncome)}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                totals.netIncome >= 0 ? "bg-success/20" : "bg-destructive/20"
              )}>
                <Wallet className={cn("h-6 w-6", totals.netIncome >= 0 ? "text-success" : "text-destructive")} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {changes.profitChange >= 0 ? (
                <Badge variant="secondary" className="bg-success/20 text-success">
                  <ArrowUpRight size={12} className="me-1" />
                  {changes.profitChange.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-destructive/20 text-destructive">
                  <ArrowDownRight size={12} className="me-1" />
                  {Math.abs(changes.profitChange).toFixed(1)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{t.vsLastPeriod}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t.title}</CardTitle>
            <CardDescription>
              {format(new Date(currentPeriod.start), 'MMM d, yyyy', { locale: language === 'ar' ? ar : undefined })} - {format(new Date(currentPeriod.end), 'MMM d, yyyy', { locale: language === 'ar' ? ar : undefined })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Revenue Section */}
            <div className="font-semibold text-lg mb-2">{t.revenue}</div>
            <LineItem label={t.sales} value={totals.totalSales} indent={1} change={changes.salesChange} />
            <LineItem label={t.otherIncome} value={totals.otherIncome} indent={1} />
            <LineItem label={`${t.revenue} ${language === 'ar' ? 'الإجمالي' : 'Total'}`} value={totals.totalSales + totals.otherIncome} isBold isTotal />

            <Separator className="my-4" />

            {/* Cost of Goods Sold */}
            <LineItem label={t.costOfGoods} value={-totals.totalPurchases} />
            <LineItem label={t.grossProfit} value={totals.grossProfit} isBold isTotal />

            <Separator className="my-4" />

            {/* Operating Expenses */}
            <div className="font-semibold text-lg mb-2">{t.operatingExpenses}</div>
            {expensesByCategory.slice(0, 5).map((expense, index) => (
              <LineItem key={index} label={expense.name} value={-expense.value} indent={1} />
            ))}
            {expensesByCategory.length > 5 && (
              <LineItem 
                label={language === 'ar' ? 'مصروفات أخرى' : 'Other Expenses'} 
                value={-expensesByCategory.slice(5).reduce((sum, e) => sum + e.value, 0)} 
                indent={1} 
              />
            )}
            <LineItem label={`${t.operatingExpenses} ${language === 'ar' ? 'الإجمالي' : 'Total'}`} value={-totals.operatingExpenses} isBold isTotal />

            <Separator className="my-4" />

            {/* Net Income */}
            <LineItem label={t.netIncome} value={totals.netIncome} isBold isTotal change={changes.profitChange} />
          </CardContent>
        </Card>

        {/* Expense Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.expenseBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto">
                  {expensesByCategory.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate max-w-[150px]">{expense.name}</span>
                      </div>
                      <span className="font-mono text-xs">{formatCurrency(expense.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t.noData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfitLossReport;