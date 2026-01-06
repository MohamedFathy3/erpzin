import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import MainLayout from "@/components/layout/MainLayout";
import SalesInvoiceForm from "@/components/sales/SalesInvoiceForm";
import SalesInvoiceList from "@/components/sales/SalesInvoiceList";
import SalesReturns from "@/components/sales/SalesReturns";
import InvoiceSearch from "@/components/sales/InvoiceSearch";
import SalesmenManager from "@/components/sales/SalesmenManager";
import { FileText, RotateCcw, Search, Users } from "lucide-react";

const Sales = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("invoices");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {language === 'ar' ? 'إدارة المبيعات' : 'Sales Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'فواتير المبيعات، المرتجعات، والبحث المتقدم'
              : 'Sales invoices, returns, and advanced search'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
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
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'البحث المتقدم' : 'Advanced Search'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="salesmen" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'المندوبين' : 'Salesmen'}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-6">
            <SalesInvoiceList />
          </TabsContent>

          <TabsContent value="returns" className="mt-6">
            <SalesReturns />
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <InvoiceSearch />
          </TabsContent>

          <TabsContent value="salesmen" className="mt-6">
            <SalesmenManager />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Sales;
