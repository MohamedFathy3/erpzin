import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Truck, 
  Package, 
  FileText, 
  Building2,
  Phone,
  Mail,
  User
} from 'lucide-react';

const Purchasing = () => {
  const { language, direction } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch purchase orders
  const { data: purchaseOrders = [] } = useQuery({
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; labelAr: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pending', labelAr: 'قيد الانتظار', variant: 'secondary' },
      approved: { label: 'Approved', labelAr: 'معتمد', variant: 'default' },
      received: { label: 'Received', labelAr: 'مستلم', variant: 'outline' },
      cancelled: { label: 'Cancelled', labelAr: 'ملغي', variant: 'destructive' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant}>
        {language === 'ar' ? config.labelAr : config.label}
      </Badge>
    );
  };

  const translations = {
    en: {
      title: 'Purchasing Management',
      orders: 'Purchase Orders',
      suppliers: 'Suppliers',
      newOrder: 'New Order',
      newSupplier: 'New Supplier',
      search: 'Search...',
      orderNumber: 'Order #',
      supplier: 'Supplier',
      amount: 'Amount',
      status: 'Status',
      date: 'Date',
      actions: 'Actions',
      name: 'Name',
      contact: 'Contact',
      phone: 'Phone',
      email: 'Email',
      totalOrders: 'Total Orders',
      pendingOrders: 'Pending',
      totalAmount: 'Total Amount',
      suppliersCount: 'Suppliers'
    },
    ar: {
      title: 'إدارة المشتريات',
      orders: 'أوامر الشراء',
      suppliers: 'الموردين',
      newOrder: 'طلب جديد',
      newSupplier: 'مورد جديد',
      search: 'بحث...',
      orderNumber: 'رقم الطلب',
      supplier: 'المورد',
      amount: 'المبلغ',
      status: 'الحالة',
      date: 'التاريخ',
      actions: 'الإجراءات',
      name: 'الاسم',
      contact: 'جهة الاتصال',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      totalOrders: 'إجمالي الطلبات',
      pendingOrders: 'قيد الانتظار',
      totalAmount: 'إجمالي المبلغ',
      suppliersCount: 'الموردين'
    }
  };

  const t = translations[language];

  const stats = [
    { 
      label: t.totalOrders, 
      value: purchaseOrders.length, 
      icon: <FileText className="text-primary" size={24} />,
      color: 'bg-primary/10' 
    },
    { 
      label: t.pendingOrders, 
      value: purchaseOrders.filter(o => o.status === 'pending').length, 
      icon: <Package className="text-warning" size={24} />,
      color: 'bg-warning/10' 
    },
    { 
      label: t.totalAmount, 
      value: `${purchaseOrders.reduce((sum, o) => sum + Number(o.total_amount), 0).toLocaleString()} YER`, 
      icon: <Truck className="text-accent" size={24} />,
      color: 'bg-accent/10' 
    },
    { 
      label: t.suppliersCount, 
      value: suppliers.length, 
      icon: <Building2 className="text-info" size={24} />,
      color: 'bg-info/10' 
    }
  ];

  return (
    <MainLayout activeItem="purchasing">
      <div className="space-y-6" dir={direction}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gradient-success">
                  <Plus size={18} className="me-2" />
                  {t.newOrder}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.newOrder}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t.supplier}</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder={t.supplier} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {language === 'ar' ? s.name_ar || s.name : s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.amount}</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <Button className="w-full gradient-success">{t.newOrder}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="orders">{t.orders}</TabsTrigger>
            <TabsTrigger value="suppliers">{t.suppliers}</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      placeholder={t.search} 
                      className="ps-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.orderNumber}</TableHead>
                      <TableHead>{t.supplier}</TableHead>
                      <TableHead>{t.amount}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.date}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد طلبات شراء' : 'No purchase orders yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>
                            {language === 'ar' 
                              ? order.suppliers?.name_ar || order.suppliers?.name 
                              : order.suppliers?.name}
                          </TableCell>
                          <TableCell>{Number(order.total_amount).toLocaleString()} YER</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>{new Date(order.order_date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      placeholder={t.search} 
                      className="ps-10"
                    />
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus size={18} className="me-2" />
                        {t.newSupplier}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.newSupplier}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t.name}</Label>
                          <Input placeholder={t.name} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.contact}</Label>
                          <Input placeholder={t.contact} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.phone}</Label>
                          <Input placeholder={t.phone} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t.email}</Label>
                          <Input placeholder={t.email} type="email" />
                        </div>
                        <Button className="w-full gradient-success">{t.newSupplier}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {suppliers.map((supplier) => (
                    <Card key={supplier.id} className="border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="text-primary" size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {language === 'ar' ? supplier.name_ar || supplier.name : supplier.name}
                            </h3>
                            {supplier.contact_person && (
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <User size={14} />
                                <span>{supplier.contact_person}</span>
                              </div>
                            )}
                            {supplier.phone && (
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Phone size={14} />
                                <span dir="ltr">{supplier.phone}</span>
                              </div>
                            )}
                            {supplier.email && (
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Mail size={14} />
                                <span className="truncate">{supplier.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Purchasing;
