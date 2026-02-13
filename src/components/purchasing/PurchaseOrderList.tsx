import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, MoreVertical, Eye, Edit2, FileText, Truck, CheckCircle, XCircle, Clock, FileDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import PurchaseOrderForm from './PurchaseOrderForm';
import PurchaseOrderDetails from './PurchaseOrderDetails';
import api from '@/lib/api';

interface PurchaseOrderListProps {
  onSave?: () => void;
}

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({ onSave }) => {

  interface PurchaseOrder {
    id: string;
    order_number: string;
    supplier: {
      id: number;
      name: string;
    };
    expected_delivery: string | null;
    total_amount: string;
    notes: string;
    status: string;
    supplier_id: string;
    expected_date: string;
    items: {
      product_id: number;
      product_name: string;
      quantity: number;
      unit_cost: string;
      total: string;
    }[];
    created_at: string;
  }

  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllOrders, setShowAllOrders] = useState(false);

  // Fetch purchase orders with pagination
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['purchase_orders', currentPage, showAllOrders],
    queryFn: async () => {
      const requestBody: { page?: number; per_page?: number } = {};

      if (!showAllOrders) {
        requestBody.page = currentPage;
        requestBody.per_page = 10; // Default page size
      } else {
        requestBody.per_page = 10000; // Large number to get all items
      }
      const response = await api.post('/purchases-invoices/index', requestBody);
      return response.data;
    }
  });

  const orders = ordersResponse?.data ?? [];
  const paginationMeta = ordersResponse?.meta;

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: { status: string; received_date?: string } = { status };
      if (status === 'received') {
        updateData.received_date = new Date().toISOString();
      }

      const { error } = await supabase.from('purchase_orders').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    },
    onError: () => {
      toast.error(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    }
  });

  // Filter orders
  // Filter orders safely
  const filteredOrders = orders.filter(order => {
    const orderNumber = (order.order_number || '').toLowerCase().trim();
    const supplierName = (order.supplier?.name || '').toLowerCase().trim();
    const status = (order.status || 'pending').toLowerCase().trim(); // default pending
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      search === '' || orderNumber.includes(search) || supplierName.includes(search);

    const matchesStatus =
      statusFilter === 'all' || status === statusFilter.toLowerCase().trim();

    return matchesSearch && matchesStatus;
  });






  const getStatusBadge = (status: 'pending' | 'approved' | 'sent' | 'received' | 'cancelled'): JSX.Element => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', label: language === 'ar' ? 'معلق' : 'Pending', icon: <Clock size={14} /> },
      approved: { variant: 'default', label: language === 'ar' ? 'معتمد' : 'Approved', icon: <CheckCircle size={14} /> },
      sent: { variant: 'outline', label: language === 'ar' ? 'مرسل' : 'Sent', icon: <Truck size={14} /> },
      received: { variant: 'default', label: language === 'ar' ? 'مستلم' : 'Received', icon: <CheckCircle size={14} /> },
      cancelled: { variant: 'destructive', label: language === 'ar' ? 'ملغي' : 'Cancelled', icon: <XCircle size={14} /> }
    };
    const { variant, label, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        {icon} {label}
      </Badge>
    );
  };

  const handleEdit = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowOrderForm(true);
  };

  const handleView = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
              <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
              <SelectItem value="approved">{language === 'ar' ? 'معتمد' : 'Approved'}</SelectItem>
              <SelectItem value="sent">{language === 'ar' ? 'مرسل' : 'Sent'}</SelectItem>
              <SelectItem value="received">{language === 'ar' ? 'مستلم' : 'Received'}</SelectItem>
              <SelectItem value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setSelectedOrder(null); setShowOrderForm(true); }}>
          <Plus size={16} className="me-2" />
          {language === 'ar' ? 'أمر شراء جديد' : 'New Order'}
        </Button>
      </div>

      {/* Orders Table */}
      <Card className="shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'رقم الأمر' : 'Order #'}</TableHead>
                <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{language === 'ar' ? 'التاريخ المتوقع' : 'Expected'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد أوامر شراء' : 'No purchase orders'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order: PurchaseOrder) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleView(order)}>
                    <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.supplier?.name}</TableCell>
                    <TableCell className="font-medium">{Number(order.total_amount).toLocaleString()} YER</TableCell>
                    <TableCell>
                      {order.expected_delivery ? formatDate(order.expected_delivery) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status as 'pending' | 'approved' | 'sent' | 'received' | 'cancelled')}</TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(order)}>
                            <Eye size={16} className="me-2" />
                            {language === 'ar' ? 'عرض' : 'View'}
                          </DropdownMenuItem>
                          {order.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(order)}>
                                <Edit2 size={16} className="me-2" />
                                {language === 'ar' ? 'تعديل' : 'Edit'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id.toString(), status: 'approved' })}>
                                <CheckCircle size={16} className="me-2" />
                                {language === 'ar' ? 'اعتماد' : 'Approve'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id.toString(), status: 'cancelled' })} className="text-destructive">
                                <XCircle size={16} className="me-2" />
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.status === 'approved' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id.toString(), status: 'sent' })}>
                              <Truck size={16} className="me-2" />
                              {language === 'ar' ? 'تم الإرسال' : 'Mark as Sent'}
                            </DropdownMenuItem>
                          )}
                          {order.status === 'sent' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id.toString(), status: 'received' })}>
                              <CheckCircle size={16} className="me-2" />
                              {language === 'ar' ? 'تم الاستلام' : 'Mark as Received'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {(paginationMeta && paginationMeta.last_page > 1) || showAllOrders ? (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {showAllOrders ? (
                language === 'ar'
                  ? `عرض جميع الأوامر (${paginationMeta?.total || 0})`
                  : `Showing all orders (${paginationMeta?.total || 0})`
              ) : (
                language === 'ar'
                  ? `عرض ${paginationMeta?.from} إلى ${paginationMeta?.to} من ${paginationMeta?.total} أمر`
                  : `Showing ${paginationMeta?.from} to ${paginationMeta?.to} of ${paginationMeta?.total} orders`
              )}
            </div>
            {!showAllOrders && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAllOrders(true);
                  setCurrentPage(1);
                }}
                disabled={isLoading}
              >
                {language === 'ar' ? 'عرض الكل' : 'Show All'}
              </Button>
            )}
            {showAllOrders && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAllOrders(false);
                  setCurrentPage(1);
                }}
                disabled={isLoading}
              >
                {language === 'ar' ? 'عرض بالصفحات' : 'Paginate'}
              </Button>
            )}
          </div>
          {!showAllOrders && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                {language === 'ar' ? 'السابق' : 'Previous'}
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, paginationMeta?.last_page || 1) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min((paginationMeta?.last_page || 1) - 4, currentPage - 2)) + i;
                  if (pageNum > (paginationMeta?.last_page || 1)) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(paginationMeta?.last_page || 1, prev + 1))}
                disabled={currentPage === (paginationMeta?.last_page || 1) || isLoading}
              >
                {language === 'ar' ? 'التالي' : 'Next'}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/* Modals */}
      <PurchaseOrderForm
        isOpen={showOrderForm}
        onClose={() => { setShowOrderForm(false); setSelectedOrder(null); }}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
          setCurrentPage(1); // Reset to first page after save
          onSave?.(); // Call parent's onSave if provided
        }}
        editOrder={selectedOrder}
      />

      <PurchaseOrderDetails
        isOpen={showOrderDetails}
        onClose={() => { setShowOrderDetails(false); setSelectedOrder(null); }}
        order={selectedOrder}
        onEdit={() => { setShowOrderDetails(false); setShowOrderForm(true); }}
      />
    </div>
  );
};

export default PurchaseOrderList;