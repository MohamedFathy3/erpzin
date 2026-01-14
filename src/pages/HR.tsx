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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AdvancedFilter, { FilterField, FilterValues } from '@/components/ui/advanced-filter';
import AttendanceManager from '@/components/hr/AttendanceManager';
import { 
  Plus, 
  Search, 
  Users, 
  Clock, 
  DollarSign,
  Calendar,
  UserCheck,
  Truck,
  Building,
  Phone,
  Briefcase
} from 'lucide-react';
import SalesmenManager from "@/components/sales/SalesmenManager";

const HR = () => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('employees');
  const [employeeFilters, setEmployeeFilters] = useState<FilterValues>({});
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employee_code: '',
    name: '',
    name_ar: '',
    position: '',
    department: '',
    phone: '',
    email: '',
    salary: ''
  });
  const [newDelivery, setNewDelivery] = useState({
    name: '',
    name_ar: '',
    phone: '',
    vehicle_type: '',
    vehicle_number: ''
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch delivery persons
  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ['delivery-persons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_persons')
        .select('*, employees(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch attendance
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, employees(name, name_ar, employee_code)')
        .order('date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Add employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: typeof newEmployee) => {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          employee_code: employee.employee_code,
          name: employee.name,
          name_ar: employee.name_ar || null,
          position: employee.position || null,
          department: employee.department || null,
          phone: employee.phone || null,
          email: employee.email || null,
          salary: employee.salary ? parseFloat(employee.salary) : 0
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowEmployeeDialog(false);
      setNewEmployee({ employee_code: '', name: '', name_ar: '', position: '', department: '', phone: '', email: '', salary: '' });
      toast({ title: language === 'ar' ? 'تم إضافة الموظف بنجاح' : 'Employee added successfully' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'Error occurred', variant: 'destructive' });
    }
  });

  // Add delivery person mutation
  const addDeliveryMutation = useMutation({
    mutationFn: async (delivery: typeof newDelivery) => {
      const { data, error } = await supabase
        .from('delivery_persons')
        .insert({
          name: delivery.name,
          name_ar: delivery.name_ar || null,
          phone: delivery.phone || null,
          vehicle_type: delivery.vehicle_type || null,
          vehicle_number: delivery.vehicle_number || null
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-persons'] });
      setShowDeliveryDialog(false);
      setNewDelivery({ name: '', name_ar: '', phone: '', vehicle_type: '', vehicle_number: '' });
      toast({ title: language === 'ar' ? 'تم إضافة مندوب التوصيل بنجاح' : 'Delivery person added successfully' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'Error occurred', variant: 'destructive' });
    }
  });

  const handleAddEmployee = () => {
    if (!newEmployee.employee_code || !newEmployee.name) {
      toast({ 
        title: language === 'ar' ? 'الكود والاسم مطلوبان' : 'Code and name are required', 
        variant: 'destructive' 
      });
      return;
    }
    addEmployeeMutation.mutate(newEmployee);
  };

  const handleAddDelivery = () => {
    if (!newDelivery.name) {
      toast({ 
        title: language === 'ar' ? 'الاسم مطلوب' : 'Name is required', 
        variant: 'destructive' 
      });
      return;
    }
    addDeliveryMutation.mutate(newDelivery);
  };

  const translations = {
    en: {
      title: 'HR & Payroll',
      employees: 'Employees',
      deliveryPersons: 'Delivery Persons',
      salesReps: 'Sales Representatives',
      attendance: 'Attendance',
      payroll: 'Payroll',
      newEmployee: 'New Employee',
      newDelivery: 'New Delivery Person',
      search: 'Search...',
      code: 'Code',
      name: 'Name',
      nameAr: 'Name (Arabic)',
      position: 'Position',
      department: 'Department',
      salary: 'Salary',
      status: 'Status',
      date: 'Date',
      checkIn: 'Check In',
      checkOut: 'Check Out',
      totalEmployees: 'Total Employees',
      activeEmployees: 'Active',
      totalSalaries: 'Total Salaries',
      presentToday: 'Present Today',
      phone: 'Phone',
      email: 'Email',
      hireDate: 'Hire Date',
      active: 'Active',
      inactive: 'Inactive',
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      leave: 'On Leave',
      vehicleType: 'Vehicle Type',
      vehicleNumber: 'Vehicle Number',
      motorcycle: 'Motorcycle',
      car: 'Car',
      bicycle: 'Bicycle',
      available: 'Available',
      unavailable: 'Unavailable',
      add: 'Add'
    },
    ar: {
      title: 'الموارد البشرية والرواتب',
      employees: 'الموظفين',
      deliveryPersons: 'مناديب التوصيل',
      salesReps: 'مندوبين المبيعات',
      attendance: 'الحضور',
      payroll: 'الرواتب',
      newEmployee: 'موظف جديد',
      newDelivery: 'مندوب توصيل جديد',
      search: 'بحث...',
      code: 'الكود',
      name: 'الاسم',
      nameAr: 'الاسم (عربي)',
      position: 'المنصب',
      department: 'القسم',
      salary: 'الراتب',
      status: 'الحالة',
      date: 'التاريخ',
      checkIn: 'الحضور',
      checkOut: 'الانصراف',
      totalEmployees: 'إجمالي الموظفين',
      activeEmployees: 'نشط',
      totalSalaries: 'إجمالي الرواتب',
      presentToday: 'حاضرين اليوم',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      hireDate: 'تاريخ التعيين',
      active: 'نشط',
      inactive: 'غير نشط',
      present: 'حاضر',
      absent: 'غائب',
      late: 'متأخر',
      leave: 'إجازة',
      vehicleType: 'نوع المركبة',
      vehicleNumber: 'رقم المركبة',
      motorcycle: 'دراجة نارية',
      car: 'سيارة',
      bicycle: 'دراجة هوائية',
      available: 'متاح',
      unavailable: 'غير متاح',
      add: 'إضافة'
    }
  };

  const t = translations[language];

  const totalSalaries = employees.filter(e => e.is_active).reduce((sum, e) => sum + Number(e.salary || 0), 0);
  const today = new Date().toISOString().split('T')[0];
  const presentToday = attendance.filter(a => a.date === today && a.status === 'present').length;

  const stats = [
    { 
      label: t.totalEmployees, 
      value: employees.length, 
      icon: <Users className="text-primary" size={24} />,
      color: 'bg-primary/10' 
    },
    { 
      label: t.activeEmployees, 
      value: employees.filter(e => e.is_active).length, 
      icon: <UserCheck className="text-accent" size={24} />,
      color: 'bg-accent/10' 
    },
    { 
      label: t.deliveryPersons, 
      value: deliveryPersons.filter(d => d.is_active).length, 
      icon: <Truck className="text-success" size={24} />,
      color: 'bg-success/10' 
    },
    { 
      label: t.totalSalaries, 
      value: `${totalSalaries.toLocaleString()} YER`, 
      icon: <DollarSign className="text-warning" size={24} />,
      color: 'bg-warning/10' 
    }
  ];

  const getAttendanceStatus = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      present: { label: t.present, variant: 'default' },
      absent: { label: t.absent, variant: 'destructive' },
      late: { label: t.late, variant: 'secondary' },
      leave: { label: t.leave, variant: 'outline' }
    };
    const c = config[status] || config.present;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const vehicleTypes = [
    { value: 'motorcycle', label: t.motorcycle },
    { value: 'car', label: t.car },
    { value: 'bicycle', label: t.bicycle }
  ];

  return (
    <MainLayout activeItem="hr">
      <div className="space-y-6" dir={direction}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <div className="flex gap-2">
            <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Truck size={18} className="me-2" />
                  {t.newDelivery}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t.newDelivery}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.name}</Label>
                      <Input 
                        value={newDelivery.name}
                        onChange={(e) => setNewDelivery(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Name" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.nameAr}</Label>
                      <Input 
                        value={newDelivery.name_ar}
                        onChange={(e) => setNewDelivery(prev => ({ ...prev, name_ar: e.target.value }))}
                        placeholder="الاسم" 
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.phone}</Label>
                    <Input 
                      value={newDelivery.phone}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="777123456" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.vehicleType}</Label>
                      <Select 
                        value={newDelivery.vehicle_type}
                        onValueChange={(value) => setNewDelivery(prev => ({ ...prev, vehicle_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t.vehicleType} />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.vehicleNumber}</Label>
                      <Input 
                        value={newDelivery.vehicle_number}
                        onChange={(e) => setNewDelivery(prev => ({ ...prev, vehicle_number: e.target.value }))}
                        placeholder="ABC-123" 
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddDelivery}
                    disabled={addDeliveryMutation.isPending}
                    className="w-full gradient-success"
                  >
                    {addDeliveryMutation.isPending ? '...' : t.add}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
              <DialogTrigger asChild>
                <Button className="gradient-success">
                  <Plus size={18} className="me-2" />
                  {t.newEmployee}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t.newEmployee}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.code}</Label>
                      <Input 
                        value={newEmployee.employee_code}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, employee_code: e.target.value }))}
                        placeholder="EMP004" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.name}</Label>
                      <Input 
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t.name} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.nameAr}</Label>
                    <Input 
                      value={newEmployee.name_ar}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, name_ar: e.target.value }))}
                      placeholder="الاسم بالعربي" 
                      dir="rtl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.position}</Label>
                      <Input 
                        value={newEmployee.position}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                        placeholder={t.position} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.department}</Label>
                      <Input 
                        value={newEmployee.department}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, department: e.target.value }))}
                        placeholder={t.department} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.phone}</Label>
                      <Input 
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder={t.phone} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.salary}</Label>
                      <Input 
                        type="number" 
                        value={newEmployee.salary}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, salary: e.target.value }))}
                        placeholder="0" 
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddEmployee}
                    disabled={addEmployeeMutation.isPending}
                    className="w-full gradient-success"
                  >
                    {addEmployeeMutation.isPending ? '...' : t.add}
                  </Button>
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
            <TabsTrigger value="employees">{t.employees}</TabsTrigger>
            <TabsTrigger value="salesreps" className="flex items-center gap-2">
              <Briefcase size={16} />
              {t.salesReps}
            </TabsTrigger>
            <TabsTrigger value="delivery">{t.deliveryPersons}</TabsTrigger>
            <TabsTrigger value="attendance">{t.attendance}</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-4">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <AdvancedFilter
                  fields={[
                    { key: 'search', label: 'Name/Code', labelAr: 'الاسم/الكود', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
                    { key: 'department', label: 'Department', labelAr: 'القسم', type: 'text' },
                    { key: 'position', label: 'Position', labelAr: 'المنصب', type: 'text' },
                    { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'select', options: [
                      { value: 'active', label: 'Active', labelAr: 'نشط' },
                      { value: 'inactive', label: 'Inactive', labelAr: 'غير نشط' },
                    ]},
                    { key: 'salary', label: 'Salary', labelAr: 'الراتب', type: 'numberRange' },
                  ]}
                  values={employeeFilters}
                  onChange={setEmployeeFilters}
                  onReset={() => setEmployeeFilters({})}
                  language={language}
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.code}</TableHead>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.position}</TableHead>
                      <TableHead>{t.department}</TableHead>
                      <TableHead>{t.salary}</TableHead>
                      <TableHead>{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا يوجد موظفين' : 'No employees yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-mono">{employee.employee_code}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {(language === 'ar' ? employee.name_ar || employee.name : employee.name).charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {language === 'ar' ? employee.name_ar || employee.name : employee.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{employee.position || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building size={14} className="text-muted-foreground" />
                              {employee.department || '-'}
                            </div>
                          </TableCell>
                          <TableCell>{Number(employee.salary || 0).toLocaleString()} YER</TableCell>
                          <TableCell>
                            <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                              {employee.is_active ? t.active : t.inactive}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salesreps" className="mt-4">
            <SalesmenManager />
          </TabsContent>

          <TabsContent value="delivery" className="mt-4">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="relative max-w-sm">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input placeholder={t.search} className="ps-10" />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.phone}</TableHead>
                      <TableHead>{t.vehicleType}</TableHead>
                      <TableHead>{t.vehicleNumber}</TableHead>
                      <TableHead>{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryPersons.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا يوجد مناديب توصيل' : 'No delivery persons yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      deliveryPersons.map((person) => (
                        <TableRow key={person.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-success/10 text-success text-sm">
                                  <Truck size={16} />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {language === 'ar' ? person.name_ar || person.name : person.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone size={14} className="text-muted-foreground" />
                              {person.phone || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {person.vehicle_type 
                              ? vehicleTypes.find(v => v.value === person.vehicle_type)?.label || person.vehicle_type
                              : '-'
                            }
                          </TableCell>
                          <TableCell>{person.vehicle_number || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={person.is_available ? 'default' : 'secondary'}>
                              {person.is_available ? t.available : t.unavailable}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            <AttendanceManager employees={employees} attendance={attendance} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default HR;
