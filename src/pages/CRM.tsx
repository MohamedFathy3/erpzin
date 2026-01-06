import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Users, 
  Star, 
  ShoppingBag,
  Phone,
  Mail,
  Award,
  TrendingUp
} from 'lucide-react';

const CRM = () => {
  const { language, direction } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const translations = {
    en: {
      title: 'Customer Management',
      newCustomer: 'New Customer',
      search: 'Search customers...',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      loyaltyPoints: 'Loyalty Points',
      totalPurchases: 'Total Purchases',
      actions: 'Actions',
      totalCustomers: 'Total Customers',
      activeCustomers: 'Active Customers',
      totalPoints: 'Total Points',
      avgPurchase: 'Avg Purchase',
      address: 'Address',
      notes: 'Notes'
    },
    ar: {
      title: 'إدارة العملاء',
      newCustomer: 'عميل جديد',
      search: 'بحث عن العملاء...',
      name: 'الاسم',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      loyaltyPoints: 'نقاط الولاء',
      totalPurchases: 'إجمالي المشتريات',
      actions: 'الإجراءات',
      totalCustomers: 'إجمالي العملاء',
      activeCustomers: 'العملاء النشطين',
      totalPoints: 'إجمالي النقاط',
      avgPurchase: 'متوسط الشراء',
      address: 'العنوان',
      notes: 'ملاحظات'
    }
  };

  const t = translations[language];

  const totalPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
  const totalPurchases = customers.reduce((sum, c) => sum + Number(c.total_purchases || 0), 0);

  const stats = [
    { 
      label: t.totalCustomers, 
      value: customers.length, 
      icon: <Users className="text-primary" size={24} />,
      color: 'bg-primary/10' 
    },
    { 
      label: t.activeCustomers, 
      value: customers.filter(c => Number(c.total_purchases) > 0).length, 
      icon: <TrendingUp className="text-accent" size={24} />,
      color: 'bg-accent/10' 
    },
    { 
      label: t.totalPoints, 
      value: totalPoints.toLocaleString(), 
      icon: <Award className="text-warning" size={24} />,
      color: 'bg-warning/10' 
    },
    { 
      label: t.totalPurchases, 
      value: `${totalPurchases.toLocaleString()} YER`, 
      icon: <ShoppingBag className="text-info" size={24} />,
      color: 'bg-info/10' 
    }
  ];

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLoyaltyTier = (points: number) => {
    if (points >= 500) return { label: language === 'ar' ? 'ذهبي' : 'Gold', color: 'bg-yellow-500' };
    if (points >= 200) return { label: language === 'ar' ? 'فضي' : 'Silver', color: 'bg-gray-400' };
    return { label: language === 'ar' ? 'برونزي' : 'Bronze', color: 'bg-orange-400' };
  };

  return (
    <MainLayout activeItem="crm">
      <div className="space-y-6" dir={direction}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gradient-success">
                <Plus size={18} className="me-2" />
                {t.newCustomer}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.newCustomer}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t.name}</Label>
                  <Input placeholder={t.name} />
                </div>
                <div className="space-y-2">
                  <Label>{t.phone}</Label>
                  <Input placeholder={t.phone} />
                </div>
                <div className="space-y-2">
                  <Label>{t.email}</Label>
                  <Input placeholder={t.email} type="email" />
                </div>
                <div className="space-y-2">
                  <Label>{t.address}</Label>
                  <Input placeholder={t.address} />
                </div>
                <Button className="w-full gradient-success">{t.newCustomer}</Button>
              </div>
            </DialogContent>
          </Dialog>
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

        {/* Customers Table */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder={t.search} 
                className="ps-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.name}</TableHead>
                  <TableHead>{t.phone}</TableHead>
                  <TableHead>{t.email}</TableHead>
                  <TableHead>{t.loyaltyPoints}</TableHead>
                  <TableHead>{t.totalPurchases}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {language === 'ar' ? 'لا يوجد عملاء' : 'No customers yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const tier = getLoyaltyTier(customer.loyalty_points || 0);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold">
                                {(language === 'ar' ? customer.name_ar || customer.name : customer.name).charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {language === 'ar' ? customer.name_ar || customer.name : customer.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell dir="ltr">{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Star size={16} className="text-warning fill-warning" />
                            <span>{customer.loyalty_points || 0}</span>
                            <Badge className={`${tier.color} text-white text-xs`}>
                              {tier.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{Number(customer.total_purchases || 0).toLocaleString()} YER</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CRM;
