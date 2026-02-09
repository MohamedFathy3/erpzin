import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdvancedFilter, { FilterField, FilterValues } from '@/components/ui/advanced-filter';
import {
  Plus,
  Users,
  Star,
  ShoppingBag,
  Award,
  TrendingUp,
  Crown,
  Gift,
  Settings,
  Percent
} from 'lucide-react';
import api from '@/lib/api';

interface LoyaltySettings {
  pointsPerCurrency: number;
  pointsValuePercent: number;
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
}

const CRM = () => {
  const { language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('customers');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showLoyaltySettings, setShowLoyaltySettings] = useState(false);
  const [showRedeemPoints, setShowRedeemPoints] = useState<string | null>(null);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [customerFilters, setCustomerFilters] = useState<FilterValues>({});
  const queryClient = useQueryClient();

  // New customer form state
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    name_ar: '',
    phone: '',
    email: '',
    address: ''
  });


  const loyaltyId = 37;
  const updateLoyaltySettingsMutation = useMutation({
    mutationFn: async (settings: {
      points: number;
      point_value: number;
      silver: number;
      gold: number;
      platinum: number;
    }) => {
      const response = await api.patch(
        `/loyalty-points/${loyaltyId}`,
        settings
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success(
        language === 'ar'
          ? 'تم تحديث إعدادات الولاء بنجاح'
          : 'Loyalty settings updated successfully'
      );
      setOriginalSettings(loyaltySettings); // 👈 مهم
    },
    onError: () => {
      toast.error(
        language === 'ar'
          ? 'حدث خطأ أثناء التحديث'
          : 'Error updating loyalty settings'
      );
    }
  });
  const { data: loyaltySettingsData, isLoading, isError } = useQuery({
    queryKey: ['loyalty-settings', loyaltyId],
    queryFn: async () => {
      const response = await api.get(`/loyalty-points/${loyaltyId}`);
      return response.data.data;
    },
  });



  // Loyalty settings state
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    pointsPerCurrency: 1000,
    pointsValuePercent: 1,
    bronzeThreshold: 0,
    silverThreshold: 200,
    goldThreshold: 500,
    platinumThreshold: 1000
  });

  // Store original settings for cancel/reset
  const [originalSettings, setOriginalSettings] = useState<LoyaltySettings>({
    pointsPerCurrency: 1000,
    pointsValuePercent: 1,
    bronzeThreshold: 0,
    silverThreshold: 200,
    goldThreshold: 500,
    platinumThreshold: 1000
  });

  // Update state when data is fetched
  // useEffect(() => {
  //   if (loyaltySettingsData) {
  //     const newSettings = {
  //       pointsPerCurrency: Number(loyaltySettingsData.points) || 1000,
  //       pointsValuePercent: Number(loyaltySettingsData.point_value) || 1,
  //       bronzeThreshold: 0,
  //       silverThreshold: Number(loyaltySettingsData.silver) || 200,
  //       goldThreshold: Number(loyaltySettingsData.gold) || 500,
  //       platinumThreshold: Number(loyaltySettingsData.platinum) || 1000
  //     };
  //     setLoyaltySettings(newSettings);
  //     setOriginalSettings(newSettings);
  //   }
  // }, [loyaltySettingsData]);




  useEffect(() => {
    if (!loyaltySettingsData) return;

    const newSettings: LoyaltySettings = {
      pointsPerCurrency: Number(loyaltySettingsData.points) || 0,
      pointsValuePercent: Number(loyaltySettingsData.point_value) || 0,
      bronzeThreshold: 0,
      silverThreshold: Number(loyaltySettingsData.silver) || 0,
      goldThreshold: Number(loyaltySettingsData.gold) || 0,
      platinumThreshold: Number(loyaltySettingsData.platinum) || 0,
    };

    setLoyaltySettings(newSettings);
    setOriginalSettings(newSettings);
  }, [loyaltySettingsData]);





  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await api.post('/customer/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });

        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب التصنيفات' : 'Error fetching customer');
        return [];
      }
    },
  });

  const translations = {
    en: {
      title: 'Customers & Loyalty',
      newCustomer: 'New Customer',
      search: 'Search customers...',
      name: 'Name',
      nameAr: 'Name (Arabic)',
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
      notes: 'Notes',
      customers: 'Customers',
      loyaltyProgram: 'Loyalty Program',
      redeemPoints: 'Redeem Points',
      addPoints: 'Add Points',
      pointsHistory: 'Points History',
      tier: 'Tier',
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
      platinum: 'Platinum',
      loyaltySettings: 'Loyalty Settings',
      pointsPerCurrency: 'Points per 1000 YER',
      pointsValuePercent: 'Point Value (%)',
      thresholds: 'Tier Thresholds',
      save: 'Save',
      cancel: 'Cancel',
      add: 'Add',
      pointsToRedeem: 'Points to Redeem',
      availablePoints: 'Available Points',
      earnedPoints: 'Earned Points',
      redeemedPoints: 'Redeemed Points',
      currentTier: 'Current Tier'
    },
    ar: {
      title: 'العملاء والولاء',
      newCustomer: 'عميل جديد',
      search: 'بحث عن العملاء...',
      name: 'الاسم',
      nameAr: 'الاسم بالعربي',
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
      notes: 'ملاحظات',
      customers: 'العملاء',
      loyaltyProgram: 'برنامج الولاء',
      redeemPoints: 'استبدال النقاط',
      addPoints: 'إضافة نقاط',
      pointsHistory: 'سجل النقاط',
      tier: 'المستوى',
      bronze: 'برونزي',
      silver: 'فضي',
      gold: 'ذهبي',
      platinum: 'بلاتيني',
      loyaltySettings: 'إعدادات الولاء',
      pointsPerCurrency: 'نقاط لكل 1000 ريال',
      pointsValuePercent: 'قيمة النقطة (%)',
      thresholds: 'حدود المستويات',
      save: 'حفظ',
      cancel: 'إلغاء',
      add: 'إضافة',
      pointsToRedeem: 'نقاط للاستبدال',
      availablePoints: 'النقاط المتاحة',
      earnedPoints: 'النقاط المكتسبة',
      redeemedPoints: 'النقاط المستبدلة',
      currentTier: 'المستوى الحالي'
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
      icon: <Crown className="text-warning" size={24} />,
      color: 'bg-warning/10'
    },
    {
      label: t.totalPurchases,
      value: `${totalPurchases.toLocaleString()} YER`,
      icon: <ShoppingBag className="text-info" size={24} />,
      color: 'bg-info/10'
    }
  ];

  // Customer filter fields
  const customerFilterFields: FilterField[] = [
    { key: 'search', label: 'Name/Phone/Email', labelAr: 'الاسم/الهاتف/البريد', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
    { key: 'address', label: 'Address', labelAr: 'العنوان', type: 'text', placeholder: 'Filter by address...', placeholderAr: 'البحث بالعنوان...' },
    {
      key: 'tier', label: 'Loyalty Tier', labelAr: 'مستوى الولاء', type: 'select', options: [
        { value: 'bronze', label: 'Bronze', labelAr: 'برونزي' },
        { value: 'silver', label: 'Silver', labelAr: 'فضي' },
        { value: 'gold', label: 'Gold', labelAr: 'ذهبي' },
        { value: 'platinum', label: 'Platinum', labelAr: 'بلاتيني' },
      ]
    },
    { key: 'points', label: 'Points', labelAr: 'النقاط', type: 'numberRange' },
    { key: 'purchases', label: 'Total Purchases', labelAr: 'إجمالي المشتريات', type: 'numberRange' },
  ];

  const filteredCustomers = customers.filter(c => {
    // Apply advanced filters
    if (customerFilters.search) {
      const search = customerFilters.search.toLowerCase();
      if (!c.name.toLowerCase().includes(search) &&
        !c.phone?.includes(search) &&
        !c.email?.toLowerCase().includes(search) &&
        !c.name_ar?.includes(search) &&
        !c.address?.toLowerCase().includes(search)) return false;
    }
    if (customerFilters.address) {
      const addressFilter = customerFilters.address.toLowerCase();
      if (!c.address?.toLowerCase().includes(addressFilter)) return false;
    }
    if (customerFilters.tier && customerFilters.tier !== 'all') {
      const tier = getLoyaltyTier(c.loyalty_points || 0);
      const tierMap: Record<string, string> = { 'Bronze': 'bronze', 'Silver': 'silver', 'Gold': 'gold', 'Platinum': 'platinum', 'برونزي': 'bronze', 'فضي': 'silver', 'ذهبي': 'gold', 'بلاتيني': 'platinum' };
      if (tierMap[tier.label] !== customerFilters.tier) return false;
    }
    if (customerFilters.points_min && (c.loyalty_points || 0) < Number(customerFilters.points_min)) return false;
    if (customerFilters.points_max && (c.loyalty_points || 0) > Number(customerFilters.points_max)) return false;
    if (customerFilters.purchases_min && Number(c.total_purchases || 0) < Number(customerFilters.purchases_min)) return false;
    if (customerFilters.purchases_max && Number(c.total_purchases || 0) > Number(customerFilters.purchases_max)) return false;
    return true;
  });

  const getLoyaltyTier = (points: number) => {
    if (points >= loyaltySettings.platinumThreshold) return {
      label: language === 'ar' ? 'بلاتيني' : 'Platinum',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      icon: <Crown size={14} />
    };
    if (points >= loyaltySettings.goldThreshold) return {
      label: language === 'ar' ? 'ذهبي' : 'Gold',
      color: 'bg-gradient-to-r from-yellow-400 to-amber-500',
      icon: <Star size={14} />
    };
    if (points >= loyaltySettings.silverThreshold) return {
      label: language === 'ar' ? 'فضي' : 'Silver',
      color: 'bg-gradient-to-r from-gray-300 to-gray-400',
      icon: <Award size={14} />
    };
    return {
      label: language === 'ar' ? 'برونزي' : 'Bronze',
      color: 'bg-gradient-to-r from-orange-300 to-orange-400',
      icon: <Gift size={14} />
    };
  };

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: newCustomer.name,
          name_ar: newCustomer.name_ar || null,
          phone: newCustomer.phone || null,
          email: newCustomer.email || null,
          address: newCustomer.address || null,
          loyalty_points: 0,
          total_purchases: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إضافة العميل بنجاح' : 'Customer added successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowAddCustomer(false);
      setNewCustomer({ name: '', name_ar: '', phone: '', email: '', address: '' });
    },
    onError: () => {
      toast.error(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    }
  });

  // Redeem points mutation
  const redeemPointsMutation = useMutation({
    mutationFn: async ({ customerId, points }: { customerId: string; points: number }) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Customer not found');
      if ((customer.loyalty_points || 0) < points) throw new Error('Insufficient points');

      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: (customer.loyalty_points || 0) - points })
        .eq('id', customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم استبدال النقاط بنجاح' : 'Points redeemed successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowRedeemPoints(null);
      setRedeemAmount('');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Save loyalty settings mutation
  const saveLoyaltySettingsMutation = useMutation({
    mutationFn: async (settings: { points: number; point_value: number; silver: number; gold: number; platinum: number }) => {
      const response = await api.post('/loyalty-points', settings);
      return response.data;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم حفظ إعدادات الولاء بنجاح' : 'Loyalty settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['loyalty-settings'] });
      setShowLoyaltySettings(false);
    },
    onError: (error: any) => {
      toast.error(language === 'ar' ? 'خطأ في حفظ الإعدادات' : 'Error saving settings');
      console.error('Save error:', error);
    }
  });

  return (
    <MainLayout activeItem="crm">
      <div className="space-y-6" dir={direction}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Crown className="text-warning" size={28} />
            <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLoyaltySettings(true)}
            >
              <Settings size={18} className="me-2" />
              {t.loyaltySettings}
            </Button>
            <Button className="gradient-success" onClick={() => setShowAddCustomer(true)}>
              <Plus size={18} className="me-2" />
              {t.newCustomer}
            </Button>
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
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users size={16} />
              {t.customers}
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Crown size={16} />
              {t.loyaltyProgram}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="mt-4">
            {/* Customers Table */}
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <AdvancedFilter
                  fields={customerFilterFields}
                  values={customerFilters}
                  onChange={setCustomerFilters}
                  onReset={() => setCustomerFilters({})}
                  language={language}
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.phone}</TableHead>
                      <TableHead>{t.address}</TableHead>
                      <TableHead>{t.email}</TableHead>
                      <TableHead>{t.loyaltyPoints}</TableHead>
                      <TableHead>{t.totalPurchases}</TableHead>
                      <TableHead>{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                            <TableCell dir="ltr">{customer.address || '-'}</TableCell>
                            <TableCell>{customer.email || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Star size={16} className="text-warning fill-warning" />
                                <span className="font-semibold">{customer.loyalty_points || 0}</span>
                                <Badge className={`${tier.color} text-white text-xs flex items-center gap-1`}>
                                  {tier.icon}
                                  {tier.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{Number(customer.total_purchases || 0).toLocaleString()} YER</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRedeemPoints(customer.id)}
                              >
                                <Gift size={14} className="me-1" />
                                {t.redeemPoints}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loyalty" className="mt-4">
            {/* Loyalty Program Overview */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="text-warning" />
                    {language === 'ar' ? 'مستويات الولاء' : 'Loyalty Tiers'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: t.bronze, threshold: loyaltySettings.bronzeThreshold, color: 'from-orange-300 to-orange-400', icon: <Gift /> },
                    { name: t.silver, threshold: loyaltySettings.silverThreshold, color: 'from-gray-300 to-gray-400', icon: <Award /> },
                    { name: t.gold, threshold: loyaltySettings.goldThreshold, color: 'from-yellow-400 to-amber-500', icon: <Star /> },
                    { name: t.platinum, threshold: loyaltySettings.platinumThreshold, color: 'from-purple-500 to-pink-500', icon: <Crown /> }
                  ].map((tier, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${tier.color} flex items-center justify-center text-white`}>
                          {tier.icon}
                        </div>
                        <span className="font-medium">{tier.name}</span>
                      </div>
                      <span className="text-muted-foreground">{tier.threshold}+ {language === 'ar' ? 'نقطة' : 'points'}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="text-primary" />
                    {language === 'ar' ? 'قواعد النقاط' : 'Points Rules'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-lg font-semibold text-primary">
                      {language === 'ar'
                        ? `نقطة واحدة لكل ${loyaltySettings.pointsPerCurrency} ريال`
                        : `1 point per ${loyaltySettings.pointsPerCurrency} YER`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'ar' ? 'عند كل عملية شراء' : 'On every purchase'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-lg font-semibold text-success">
                      {language === 'ar'
                        ? `${loyaltySettings.pointsValuePercent}% خصم لكل نقطة`
                        : `${loyaltySettings.pointsValuePercent}% discount per point`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'ar' ? 'عند الاستبدال' : 'When redeeming'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 text-warning">
                      <Star className="fill-warning" size={20} />
                      <span className="font-semibold">
                        {language === 'ar' ? 'مزايا المستوى الذهبي' : 'Gold Tier Benefits'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'ar' ? 'خصم إضافي 5% على جميع المشتريات' : 'Extra 5% discount on all purchases'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Customer Dialog */}
        <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.newCustomer}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.name} *</Label>
                  <Input
                    placeholder={t.name}
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.nameAr}</Label>
                  <Input
                    placeholder={t.nameAr}
                    value={newCustomer.name_ar}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name_ar: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.phone}</Label>
                <Input
                  placeholder={t.phone}
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input
                  placeholder={t.email}
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.address}</Label>
                <Input
                  placeholder={t.address}
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
              </div>
              <Button
                className="w-full gradient-success"
                onClick={() => addCustomerMutation.mutate()}
                disabled={!newCustomer.name || addCustomerMutation.isPending}
              >
                {t.add}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Loyalty Settings Dialog */}
        <Dialog open={showLoyaltySettings} onOpenChange={setShowLoyaltySettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings size={20} />
                {t.loyaltySettings}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t.pointsPerCurrency}</Label>
                <Input
                  type="number"
                  value={loyaltySettings.pointsPerCurrency}
                  onChange={(e) => setLoyaltySettings({ ...loyaltySettings, pointsPerCurrency: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.pointsValuePercent}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={loyaltySettings.pointsValuePercent}
                  onChange={(e) => setLoyaltySettings({ ...loyaltySettings, pointsValuePercent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.thresholds}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.silver}</Label>
                    <Input
                      type="number"
                      value={loyaltySettings.silverThreshold}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, silverThreshold: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.gold}</Label>
                    <Input
                      type="number"
                      value={loyaltySettings.goldThreshold}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, goldThreshold: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t.platinum}</Label>
                    <Input
                      type="number"
                      value={loyaltySettings.platinumThreshold}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, platinumThreshold: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoyaltySettings(originalSettings);
                    setShowLoyaltySettings(false);
                  }}
                  className="flex-1"
                >
                  {t.cancel}
                </Button>
                <Button
                  className="flex-1 gradient-success"
                  onClick={() =>
                    updateLoyaltySettingsMutation.mutate({
                      points: loyaltySettings.pointsPerCurrency,
                      point_value: loyaltySettings.pointsValuePercent,
                      silver: loyaltySettings.silverThreshold,
                      gold: loyaltySettings.goldThreshold,
                      platinum: loyaltySettings.platinumThreshold
                    })
                  }
                  disabled={updateLoyaltySettingsMutation.isPending}
                >
                  {t.save}
                </Button>

              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Redeem Points Dialog */}
        <Dialog open={!!showRedeemPoints} onOpenChange={() => setShowRedeemPoints(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift size={20} className="text-primary" />
                {t.redeemPoints}
              </DialogTitle>
            </DialogHeader>
            {showRedeemPoints && (() => {
              const customer = customers.find(c => c.id === showRedeemPoints);
              if (!customer) return null;
              const tier = getLoyaltyTier(customer.loyalty_points || 0);
              return (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span>{t.availablePoints}</span>
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-warning fill-warning" />
                      <span className="text-xl font-bold">{customer.loyalty_points || 0}</span>
                      <Badge className={`${tier.color} text-white`}>{tier.label}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.pointsToRedeem}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      max={customer.loyalty_points || 0}
                    />
                    {redeemAmount && (
                      <p className="text-sm text-muted-foreground">
                        = {(Number(redeemAmount) * loyaltySettings.pointsValuePercent).toFixed(0)}% {language === 'ar' ? 'خصم' : 'discount'}
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full gradient-success"
                    onClick={() => redeemPointsMutation.mutate({
                      customerId: showRedeemPoints,
                      points: Number(redeemAmount)
                    })}
                    disabled={!redeemAmount || Number(redeemAmount) > (customer.loyalty_points || 0) || redeemPointsMutation.isPending}
                  >
                    {t.redeemPoints}
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CRM;