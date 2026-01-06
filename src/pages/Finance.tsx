import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Receipt,
  TrendingUp,
  Building2,
  FileText,
  FolderTree,
  Wallet
} from 'lucide-react';
import FinanceDashboard from '@/components/finance/FinanceDashboard';
import ExpenseManager from '@/components/finance/ExpenseManager';
import RevenueManager from '@/components/finance/RevenueManager';
import AccountsPayable from '@/components/finance/AccountsPayable';
import ChartOfAccounts from '@/components/finance/ChartOfAccounts';
import TreasuryBankManager from '@/components/finance/TreasuryBankManager';

const Finance = () => {
  const { language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'revenues', label: language === 'ar' ? 'الإيرادات' : 'Revenues', icon: TrendingUp },
    { id: 'expenses', label: language === 'ar' ? 'المصروفات' : 'Expenses', icon: Receipt },
    { id: 'treasury', label: language === 'ar' ? 'الخزائن والبنوك' : 'Treasury & Banks', icon: Wallet },
    { id: 'accounts', label: language === 'ar' ? 'شجرة الحسابات' : 'Chart of Accounts', icon: FolderTree },
    { id: 'payables', label: language === 'ar' ? 'الذمم الدائنة' : 'Payables', icon: Building2 }
  ];

  return (
    <MainLayout activeItem="finance">
      <div className="space-y-6" dir={direction}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'الإدارة المالية' : 'Financial Management'}
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon size={16} />
                <span className="hidden lg:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

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
