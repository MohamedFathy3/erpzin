import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Receipt,
  Building2,
  FileText
} from 'lucide-react';
import FinanceDashboard from '@/components/finance/FinanceDashboard';
import ExpenseManager from '@/components/finance/ExpenseManager';
import AccountsPayable from '@/components/finance/AccountsPayable';
import FinancialReports from '@/components/finance/FinancialReports';

const Finance = () => {
  const { language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: language === 'ar' ? 'المصروفات' : 'Expenses', icon: Receipt },
    { id: 'payables', label: language === 'ar' ? 'الذمم الدائنة' : 'Accounts Payable', icon: Building2 },
    { id: 'reports', label: language === 'ar' ? 'التقارير المالية' : 'Financial Reports', icon: FileText }
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
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <FinanceDashboard language={language} />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <ExpenseManager language={language} />
          </TabsContent>

          <TabsContent value="payables" className="mt-6">
            <AccountsPayable language={language} />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <FinancialReports language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Finance;
