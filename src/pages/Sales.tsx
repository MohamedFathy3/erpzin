import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/layout/MainLayout";
import SalesInvoiceList from "@/components/sales/SalesInvoiceList";
import SalesReturns from "@/components/sales/SalesReturns";
import Shift from "@/components/sales/shift";
import POSTransactionsList from "@/components/pos/POSTransactionsList";
import { FileText, RotateCcw, Receipt } from "lucide-react";
import { ModuleHeader, ModuleTabs } from "@/components/layout/ModuleHeader";

const Sales = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("pos-invoices");

  return (
    <MainLayout>
      <div className="space-y-5">
        <ModuleHeader
          eyebrow={language === 'ar' ? 'دورة المبيعات' : 'Sales cycle'}
          title={language === 'ar' ? 'إدارة المبيعات' : 'Sales management'}
          description={language === 'ar' ? 'كل الفواتير والمرتجعات والورديات في مساحة عمل واحدة.' : 'Invoices, returns and shifts in one focused workspace.'}
          icon={<Receipt className="h-5 w-5" />}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ModuleTabs value={activeTab} onChange={setActiveTab} tabs={[
            { value: 'pos-invoices', label: language === 'ar' ? 'فواتير نقطة البيع' : 'POS invoices', icon: <Receipt className="h-4 w-4" /> },
            { value: 'invoices', label: language === 'ar' ? 'فواتير المبيعات' : 'Sales invoices', icon: <FileText className="h-4 w-4" /> },
            { value: 'returns', label: language === 'ar' ? 'المرتجعات' : 'Returns', icon: <RotateCcw className="h-4 w-4" /> },
            { value: 'shift', label: language === 'ar' ? 'الورديات' : 'Shifts', icon: <Receipt className="h-4 w-4" /> },
          ]} />
          <TabsContent value="pos-invoices" className="mt-6">
            <POSTransactionsList />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <SalesInvoiceList />
          </TabsContent>

          <TabsContent value="returns" className="mt-6">
            <SalesReturns />
          </TabsContent>
          <TabsContent value="shift" className="mt-6">
            <Shift />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Sales;
