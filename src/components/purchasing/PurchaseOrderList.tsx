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
import PurchaseOrderForm from './PurchaseOrderForm';
import PurchaseOrderDetails from './PurchaseOrderDetails';

const PurchaseOrderList: React.FC = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Fetch purchase orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
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
  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = searchTerm === '' ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.suppliers?.name_ar?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
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

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setShowOrderForm(true);
  };

  const handleView = (order: any) => {
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
                filteredOrders.map((order: any) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleView(order)}>
                    <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                    <TableCell>{language === 'ar' ? order.suppliers?.name_ar || order.suppliers?.name : order.suppliers?.name}</TableCell>
                    <TableCell className="font-medium">{Number(order.total_amount).toLocaleString()} YER</TableCell>
                    <TableCell>
                      {order.expected_date 
                        ? new Date(order.expected_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{new Date(order.order_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</TableCell>
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
                              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'approved' })}>
                                <CheckCircle size={16} className="me-2" />
                                {language === 'ar' ? 'اعتماد' : 'Approve'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'cancelled' })} className="text-destructive">
                                <XCircle size={16} className="me-2" />
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.status === 'approved' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'sent' })}>
                              <Truck size={16} className="me-2" />
                              {language === 'ar' ? 'تم الإرسال' : 'Mark as Sent'}
                            </DropdownMenuItem>
                          )}
                          {order.status === 'sent' && (
                            <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'received' })}>
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

      {/* Modals */}
      <PurchaseOrderForm
        isOpen={showOrderForm}
        onClose={() => { setShowOrderForm(false); setSelectedOrder(null); }}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['purchase_orders'] })}
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