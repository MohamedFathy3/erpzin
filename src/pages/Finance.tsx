import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Receipt,
  TrendingUp,
  Building2,
  FolderTree,
  Wallet
} from 'lucide-react';
import FinanceDashboard from '@/components/finance/FinanceDashboard';
import ExpenseManager from '@/components/finance/ExpenseManager';
import RevenueManager from '@/components/finance/RevenueManager';
import AccountsPayable from '@/components/finance/AccountsPayable';
import ChartOfAccounts from '@/components/finance/ChartOfAccounts';
import TreasuryBankManager from '@/components/finance/TreasuryBankManager';
import AdvancedFilter, { FilterField, FilterValues } from '@/components/ui/advanced-filter';

const Finance = () => {
  const { language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [financeFilters, setFinanceFilters] = useState<FilterValues>({});

  const tabs = [
    { id: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'revenues', label: language === 'ar' ? 'الإيرادات' : 'Revenues', icon: TrendingUp },
    { id: 'expenses', label: language === 'ar' ? 'المصروفات' : 'Expenses', icon: Receipt },
    { id: 'treasury', label: language === 'ar' ? 'الخزائن والبنوك' : 'Treasury & Banks', icon: Wallet },
    { id: 'accounts', label: language === 'ar' ? 'شجرة الحسابات' : 'Chart of Accounts', icon: FolderTree },
    { id: 'payables', label: language === 'ar' ? 'الذمم الدائنة' : 'Payables', icon: Building2 }
  ];

  // Finance filter fields based on active tab
  const getFilterFields = (): FilterField[] => {
    if (activeTab === 'revenues' || activeTab === 'expenses') {
      return [
        { key: 'search', label: 'Search', labelAr: 'بحث', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
        { key: 'category', label: 'Category', labelAr: 'التصنيف', type: 'select', options: [
          { value: 'sales', label: 'Sales', labelAr: 'مبيعات' },
          { value: 'services', label: 'Services', labelAr: 'خدمات' },
          { value: 'other', label: 'Other', labelAr: 'أخرى' },
        ]},
        { key: 'payment_method', label: 'Payment Method', labelAr: 'طريقة الدفع', type: 'select', options: [
          { value: 'cash', label: 'Cash', labelAr: 'نقدي' },
          { value: 'bank', label: 'Bank', labelAr: 'بنك' },
          { value: 'card', label: 'Card', labelAr: 'بطاقة' },
        ]},
        { key: 'date', label: 'Date', labelAr: 'التاريخ', type: 'dateRange' },
        { key: 'amount', label: 'Amount', labelAr: 'المبلغ', type: 'numberRange' },
      ];
    }
    if (activeTab === 'treasury') {
      return [
        { key: 'search', label: 'Bank/Account', labelAr: 'البنك/الحساب', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
        { key: 'transaction_type', label: 'Transaction Type', labelAr: 'نوع العملية', type: 'select', options: [
          { value: 'deposit', label: 'Deposit', labelAr: 'إيداع' },
          { value: 'withdrawal', label: 'Withdrawal', labelAr: 'سحب' },
          { value: 'transfer', label: 'Transfer', labelAr: 'تحويل' },
        ]},
        { key: 'date', label: 'Date', labelAr: 'التاريخ', type: 'dateRange' },
      ];
    }
    if (activeTab === 'payables') {
      return [
        { key: 'search', label: 'Supplier', labelAr: 'المورد', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
        { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'select', options: [
          { value: 'pending', label: 'Pending', labelAr: 'معلق' },
          { value: 'overdue', label: 'Overdue', labelAr: 'متأخر' },
          { value: 'paid', label: 'Paid', labelAr: 'مدفوع' },
        ]},
        { key: 'due_date', label: 'Due Date', labelAr: 'تاريخ الاستحقاق', type: 'dateRange' },
        { key: 'amount', label: 'Amount', labelAr: 'المبلغ', type: 'numberRange' },
      ];
    }
    return [];
  };

  const showFilter = ['revenues', 'expenses', 'treasury', 'payables'].includes(activeTab);

  return (
    <MainLayout activeItem="finance">
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'الإدارة المالية' : 'Financial Management'}
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setFinanceFilters({}); }}>
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon size={16} />
                <span className="hidden lg:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {showFilter && (
            <div className="mt-4">
              <AdvancedFilter
                fields={getFilterFields()}
                values={financeFilters}
                onChange={setFinanceFilters}
                onReset={() => setFinanceFilters({})}
                language={language}
              />
            </div>
          )}

          <TabsContent value="dashboard" className="mt-6">
            <FinanceDashboard language={language} />
          </TabsContent>

          <TabsContent value="revenues" className="mt-6">
            <RevenueManager language={language} />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <ExpenseManager language={language} />
          </TabsContent>

          <TabsContent value="treasury" className="mt-6">
            <TreasuryBankManager language={language} />
          </TabsContent>

          <TabsContent value="accounts" className="mt-6">
            <ChartOfAccounts language={language} />
          </TabsContent>

          <TabsContent value="payables" className="mt-6">
            <AccountsPayable language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Finance;
