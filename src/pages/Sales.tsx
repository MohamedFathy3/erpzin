import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/layout/MainLayout";
import SalesInvoiceList from "@/components/sales/SalesInvoiceList";
import SalesReturns from "@/components/sales/SalesReturns";
import POSTransactionsList from "@/components/pos/POSTransactionsList";
import { FileText, RotateCcw, Receipt } from "lucide-react";

const Sales = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("pos-invoices");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'ar' ? 'إدارة المبيعات' : 'Sales Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'فواتير المبيعات والمرتجعات'
              : 'Sales invoices and returns'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="pos-invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'فواتير نقطة البيع' : 'POS Invoices'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="returns" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'المرتجعات' : 'Returns'}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos-invoices" className="mt-6">
            <POSTransactionsList />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <SalesInvoiceList />
          </TabsContent>

          <TabsContent value="returns" className="mt-6">
            <SalesReturns />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Sales;
