import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Eye, FileText, Package, Building2, Calendar, DollarSign, Printer } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import AdvancedFilter, { FilterField, FilterValues } from "@/components/ui/advanced-filter";
import { toast } from "@/components/ui/use-toast";
import { useReactToPrint } from "react-to-print";
import PurchaseReturnPrintTemplate from "./PurchaseReturnPrintTemplate";
import { purchaseReturnService } from '@/services/purchaseReturnService';
import type {
  PurchaseReturn,
  ReturnItem,
  PurchaseReturnsResponse
} from '@/types/PurcheasRetuern';

interface PrintItem {
  product: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

const transformItems = (items: ReturnItem[]): PrintItem[] =>
  items.map(item => ({
    product: item.product_name || 'غير معروف',
    quantity: item.quantity || 0,
    unit_price: item.price?.toString() || '0',
    total_price: ((item.quantity || 0) * (item.price || 0)).toString()
  }));

const PurchaseReturnsList = () => {
  const { language } = useLanguage();
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `مرتجع-${selectedReturn?.return_number}`,
    onAfterPrint: () => setShowPrint(false),
  });

  const handlePrintClick = useCallback(() => {
    if (!selectedReturn) return;
    setShowPrint(true);
    setTimeout(() => handlePrint(), 100);
  }, [selectedReturn, handlePrint]);

  // Filter fields
  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Return/Invoice',
      labelAr: 'المرتجع/الفاتورة',
      type: 'text',
      placeholder: 'Search...',
      placeholderAr: 'بحث...'
    },
    {
      key: 'date',
      label: 'Date',
      labelAr: 'التاريخ',
      type: 'dateRange'
    },
    {
      key: 'amount_min',
      label: 'Min Amount',
      labelAr: 'الحد الأدنى للمبلغ',
      type: 'number',
      placeholder: '0',
      placeholderAr: '0'
    },
    {
      key: 'amount_max',
      label: 'Max Amount',
      labelAr: 'الحد الأقصى للمبلغ',
      type: 'number',
      placeholder: '999999',
      placeholderAr: '999999'
    }
  ];

  const { data: returnsResponse, isLoading, refetch } = useQuery({
    queryKey: ['purchase-returns', filterValues],
    queryFn: () => purchaseReturnService.getPurchaseReturns(filterValues),
  });

  const returns = returnsResponse?.data || [];
  const paginationMeta = returnsResponse?.meta;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy/MM/dd', {
        locale: language === 'ar' ? ar : undefined
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: string) => Number(amount).toLocaleString();

  const transformedItems = selectedReturn ? transformItems(selectedReturn.items) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full">
          <AdvancedFilter
            fields={filterFields}
            values={filterValues}
            onChange={setFilterValues}
            onReset={() => setFilterValues({})}
            language={language as 'ar' | 'en'}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {language === 'ar' ? 'مرتجعات المشتريات' : 'Purchase Returns'}
            <Badge variant="secondary">{returns.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{language === 'ar' ? 'رقم المرتجع' : 'Return #'}</TableHead>
                  <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                  <TableHead>{language === 'ar' ? 'عدد الأصناف' : 'Items'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'عرض' : 'View'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد مرتجعات' : 'No returns found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((ret, index) => (
                    <TableRow key={ret.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-mono font-medium">{ret.return_number}</TableCell>
                      <TableCell className="font-mono">{ret.invoice_number}</TableCell>
                      <TableCell className="text-center">{ret.items?.length || 0}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatAmount(ret.total_amount)} YER
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ret.reason || '-'}
                      </TableCell>
                      <TableCell>{formatDate(ret.created_at)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedReturn(ret);
                            setShowDetails(true);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {paginationMeta && paginationMeta.total > 0 && (
            <div className="flex items-center justify-end mt-4">
              <div className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? `إجمالي ${paginationMeta.total} مرتجع`
                  : `Total ${paginationMeta.total} returns`
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'تفاصيل المرتجع' : 'Return Details'}
                <span className="font-mono text-muted-foreground">#{selectedReturn?.return_number}</span>
              </DialogTitle>
              {selectedReturn && (
                <Button variant="outline" size="sm" onClick={handlePrintClick} className="gap-2">
                  <Printer size={16} />
                  {language === 'ar' ? 'طباعة' : 'Print'}
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}
                    </div>
                    <div className="font-mono font-medium text-lg">
                      {selectedReturn.invoice_number}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {language === 'ar' ? 'الإجمالي' : 'Total'}
                    </div>
                    <div className="font-bold text-lg text-primary">
                      {formatAmount(selectedReturn.total_amount)} YER
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {language === 'ar' ? 'عدد الأصناف' : 'Items'}
                    </div>
                    <div className="font-medium text-lg">
                      {selectedReturn.items.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {language === 'ar' ? 'التاريخ' : 'Date'}
                    </div>
                    <div className="font-medium text-lg">
                      {formatDate(selectedReturn.created_at)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedReturn.reason && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">
                    {language === 'ar' ? 'السبب' : 'Reason'}
                  </div>
                  <div>{selectedReturn.reason}</div>
                </div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {language === 'ar' ? 'الأصناف المرتجعة' : 'Returned Items'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                          <TableHead className="text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                          <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transformedItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{item.product}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatAmount(item.unit_price)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatAmount(item.total_price)} YER
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end mt-4">
                    <div className="w-64 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">
                          {language === 'ar' ? 'الإجمالي:' : 'Total:'}
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {formatAmount(selectedReturn.total_amount)} YER
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showPrint && selectedReturn && (
        <div style={{ display: 'none' }}>
          <PurchaseReturnPrintTemplate
            ref={printRef}
            returnData={{
              return_number: selectedReturn.return_number,
              invoice_number: selectedReturn.invoice_number,
              date: selectedReturn.created_at,
              items: transformedItems,
              total_amount: selectedReturn.total_amount,
              reason: selectedReturn.reason,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PurchaseReturnsList;

