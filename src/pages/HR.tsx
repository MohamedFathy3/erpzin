import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import AdvancedFilter, { FilterValues } from '@/components/ui/advanced-filter';
import AttendanceManager from '@/components/hr/AttendanceManager';
import { 
  Plus, 
  Search, 
  Users, 
  DollarSign,
  UserCheck,
  Truck,
  Building,
  Phone,
  Briefcase,
  Loader2,
  RefreshCw,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import SalesmenManager from "@/components/sales/SalesmenManager";
import api from '@/lib/api';

const HR = () => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('employees');
  const [employeeFilters, setEmployeeFilters] = useState<FilterValues>({});
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // States for delivery person CRUD
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [currentDeliveryId, setCurrentDeliveryId] = useState<string | null>(null);
  
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
    vehicle_number: '',
    is_active: true
  });

  // Fetch employees
  const { 
    data: employees = [], 
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees 
  } = useQuery({
    queryKey: ['employees', activeTab, employeeFilters],
    queryFn: async () => {
      try {
        const response = await api.post('/employee/index', {
          filters: employeeFilters,
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ Error fetching employees:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب الموظفين' : 'Error fetching employees',
          description: error.response?.data?.message || error.message,
          variant: 'destructive'
        });
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
  });

  // Fetch delivery persons
  const { 
    data: deliveryPersons = [], 
    isLoading: deliveryLoading,
    error: deliveryError,
    refetch: refetchDelivery 
  } = useQuery({
    queryKey: ['delivery-persons', activeTab],
    queryFn: async () => {
      try {
        const response = await api.post('/delevery-man/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ Error fetching delivery persons:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب مندوبي التوصيل' : 'Error fetching delivery persons',
          description: error.response?.data?.message || error.message,
          variant: 'destructive'
        });
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    enabled: activeTab === 'delivery' || activeTab === 'employees',
  });

  // Fetch attendance
  const { 
    data: attendance = [], 
    isLoading: attendanceLoading,
    error: attendanceError 
  } = useQuery({
    queryKey: ['attendance', activeTab],
    queryFn: async () => {
      try {
        const response = await api.post('/attendance/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 50,
          paginate: false,
             with: ['employee']
        });
        
        return response.data.data || [];
      } catch (error: any) {
        console.error('❌ Error fetching attendance:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    enabled: activeTab === 'attendance',
  });

  // دالة لتحديث جميع البيانات
  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchEmployees(),
        refetchDelivery(),
      ]);
      
      toast({
        title: language === 'ar' ? 'تم تحديث البيانات' : 'Data refreshed',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: typeof newEmployee) => {
      const response = await api.patch('/employee', {
        employee_code: employee.employee_code,
        name: employee.name,
        name_ar: employee.name_ar || null,
        position: employee.position || null,
        department: employee.department || null,
        phone: employee.phone || null,
        email: employee.email || null,
        salary: employee.salary ? parseFloat(employee.salary) : 0,
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.refetchQueries({ queryKey: ['employees'] });
      
      setShowEmployeeDialog(false);
      setNewEmployee({
        employee_code: '',
        name: '',
        name_ar: '',
        position: '',
        department: '',
        phone: '',
        email: '',
        salary: '',
      });

      toast({
        title: language === 'ar'
          ? 'تم إضافة الموظف بنجاح'
          : 'Employee added successfully',
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  // Add delivery person mutation
  const addDeliveryMutation = useMutation({
    mutationFn: async (delivery: typeof newDelivery) => {
      const response = await api.post('/delevery-man', {
        name: delivery.name,
        name_ar: delivery.name_ar || null,
        phone: delivery.phone || null,
        vehicle_type: delivery.vehicle_type || null,
        vehicle_number: delivery.vehicle_number || null,
        is_active: delivery.is_active
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-persons'] });
      queryClient.refetchQueries({ queryKey: ['delivery-persons'] });
      
      setShowDeliveryDialog(false);
      resetDeliveryForm();
      setIsEditingDelivery(false);
      setCurrentDeliveryId(null);

      toast({
        title: language === 'ar'
          ? 'تم إضافة مندوب التوصيل بنجاح'
          : 'Delivery person added successfully',
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  // Update delivery person mutation
  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof newDelivery }) => {
      const response = await api.patch(`/delevery-man/${id}`, {
        name: data.name,
        name_ar: data.name_ar || null,
        phone: data.phone || null,
        vehicle_type: data.vehicle_type || null,
        vehicle_number: data.vehicle_number || null,
        is_active: data.is_active
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-persons'] });
      queryClient.refetchQueries({ queryKey: ['delivery-persons'] });
      
      setShowDeliveryDialog(false);
      resetDeliveryForm();
      setIsEditingDelivery(false);
      setCurrentDeliveryId(null);

      toast({
        title: language === 'ar'
          ? 'تم تحديث مندوب التوصيل بنجاح'
          : 'Delivery person updated successfully',
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  // Delete delivery person mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete('/employee/delete', {
        data: {
          items: [id]
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.refetchQueries({ queryKey: ['employees'] });
      
      toast({
        title: language === 'ar'
          ? 'تم حذف الموظف بنجاح'
          : 'Employee deleted successfully',
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });


  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof newEmployee }) => {
      const response = await api.patch(`/employee/${id}`, {
        employee_code: data.employee_code || null,
        name: data.name,
        name_ar: data.name_ar || null,
        position: data.position || null,
        department: data.department || null,
        phone: data.phone || null,
        email: data.email || null,
        salary: data.salary ? parseFloat(data.salary) : 0
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.refetchQueries({ queryKey: ['employees'] });
      
      setShowDeliveryDialog(false);
      resetDeliveryForm();
      setIsEditingDelivery(false);
      setCurrentDeliveryId(null);

      toast({
        title: language === 'ar'
          ? 'تم تحديث الموظف بنجاح'
          : 'Employee updated successfully',
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  // Delete delivery person mutation
  const deleteDeliveryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete('/delevery-man/delete', {
        data: {
          items: [id]
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-persons'] });
      queryClient.refetchQueries({ queryKey: ['delivery-persons'] });
      
      toast({
        title: language === 'ar'
          ? 'تم حذف مندوب التوصيل بنجاح'
          : 'Delivery person deleted successfully',
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
        description: error.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  // دالة لتفريغ نموذج مندوب التوصيل
  const resetDeliveryForm = () => {
    setNewDelivery({
      name: '',
      name_ar: '',
      phone: '',
      vehicle_type: '',
      vehicle_number: '',
      is_active: true
    });
  };

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

  const handleEditEmployee = (employee: any) => {
    setNewEmployee({
      employee_code: employee.employee_code || '',
      name: employee.name || '',
      name_ar: employee.name_ar || '',
      position: employee.position || '',
      department: employee.department || '',
      phone: employee.phone || '',
      email: employee.email || '',
      salary: employee.salary || ''
    });
    setShowEmployeeDialog(true);
  };

  const handleDeleteEmployee = (id: string, name: string) => {
    const confirmMessage = language === 'ar' 
      ? `هل أنت متأكد من حذف الموظف "${name}"؟`
      : `Are you sure you want to delete employee "${name}"?`;
    
    if (window.confirm(confirmMessage)) {
      deleteEmployeeMutation.mutate(id);
    }
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

  const handleUpdateDelivery = () => {
    if (!newDelivery.name) {
      toast({ 
        title: language === 'ar' ? 'الاسم مطلوب' : 'Name is required', 
        variant: 'destructive' 
      });
      return;
    }
    if (!currentDeliveryId) {
      toast({ 
        title: language === 'ar' ? 'خطأ في معرف المناسب' : 'Invalid ID', 
        variant: 'destructive' 
      });
      return;
    }
    updateDeliveryMutation.mutate({ id: currentDeliveryId, data: newDelivery });
  };

  const handleEditDelivery = (person: any) => {
    setIsEditingDelivery(true);
    setCurrentDeliveryId(person.id);
    setNewDelivery({
      name: person.name || '',
      name_ar: person.name_ar || '',
      phone: person.phone || '',
      vehicle_type: person.vehicle_type || '',
      vehicle_number: person.vehicle_number || '',
      is_active: person.is_active ?? true
    });
    setShowDeliveryDialog(true);
  };

const mergedAttendance = attendance.map((att: any) => {
  const employee = employees.find((emp: any) => emp.id === att.employee_id);
  return {
    ...att,
    name: employee?.name || '',
    name_ar: employee?.name_ar || '',
    employee_code: employee?.employee_code || ''
  };
});


  const handleDeleteDelivery = (id: string, name: string) => {
    const confirmMessage = language === 'ar' 
      ? `هل أنت متأكد من حذف مندوب التوصيل "${name}"؟`
      : `Are you sure you want to delete delivery person "${name}"?`;
    
    if (window.confirm(confirmMessage)) {
      deleteDeliveryMutation.mutate(id);
    }
  };

  const handleViewDeliveryDetails = (person: any) => {
    // يمكنك إضافة مودال لعرض التفاصيل إذا أردت
    toast({
      title: language === 'ar' ? 'تفاصيل مندوب التوصيل' : 'Delivery Person Details',
      description: JSON.stringify({
        name: person.name,
        name_ar: person.name_ar,
        phone: person.phone,
        vehicle_type: person.vehicle_type,
        vehicle_number: person.vehicle_number,
        status: person.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')
      }, null, 2)
    });
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter((employee: any) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      employee.employee_code?.toLowerCase().includes(searchLower) ||
      employee.name?.toLowerCase().includes(searchLower) ||
      employee.name_ar?.toLowerCase().includes(searchLower) ||
      employee.position?.toLowerCase().includes(searchLower) ||
      employee.department?.toLowerCase().includes(searchLower) ||
      employee.phone?.toLowerCase().includes(searchLower)
    );
  });

  // Filter delivery persons based on search
  const filteredDeliveryPersons = deliveryPersons.filter((person: any) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      person.name?.toLowerCase().includes(searchLower) ||
      person.name_ar?.toLowerCase().includes(searchLower) ||
      person.phone?.toLowerCase().includes(searchLower) ||
      person.vehicle_number?.toLowerCase().includes(searchLower)
    );
  });

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
      editDelivery: 'Edit Delivery Person',
      search: 'Search by name, code, phone...',
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
      add: 'Add',
      edit: 'Edit',
      update: 'Update',
      delete: 'Delete',
      view: 'View',
      loading: 'Loading...',
      noData: 'No data found',
      refresh: 'Refresh Data',
      error: 'Error loading data',
      actions: 'Actions',
      confirmDelete: 'Confirm Delete',
      deleteConfirmation: 'Are you sure you want to delete this delivery person?',
      save: 'Save',
      cancel: 'Cancel'
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
      editDelivery: 'تعديل مندوب التوصيل',
      search: 'بحث بالاسم، الكود، الهاتف...',
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
      add: 'إضافة',
      edit: 'تعديل',
      update: 'تحديث',
      delete: 'حذف',
      view: 'عرض',
      loading: 'جاري التحميل...',
      noData: 'لا توجد بيانات',
      refresh: 'تحديث البيانات',
      error: 'خطأ في تحميل البيانات',
      actions: 'الإجراءات',
      confirmDelete: 'تأكيد الحذف',
      deleteConfirmation: 'هل أنت متأكد من حذف مندوب التوصيل هذا؟',
      save: 'حفظ',
      cancel: 'إلغاء'
    }
  };

  const t = translations[language];

  // Calculate stats safely
  const totalSalaries = employees
    .filter((e: any) => e.is_active === true)
    .reduce((sum: number, e: any) => {
      const salary = parseFloat(e.salary) || 0;
      return sum + salary;
    }, 0);

  const stats = [
    { 
      label: t.totalEmployees, 
      value: employees.length, 
      icon: <Users className="text-primary" size={24} />,
      color: 'bg-primary/10',
      loading: employeesLoading
    },
    { 
      label: t.activeEmployees, 
      value: employees.filter((e: any) => e.is_active === true).length, 
      icon: <UserCheck className="text-accent" size={24} />,
      color: 'bg-accent/10',
      loading: employeesLoading
    },
    { 
      label: t.deliveryPersons, 
      value: deliveryPersons.filter((d: any) => d.is_active === true).length, 
      icon: <Truck className="text-success" size={24} />,
      color: 'bg-success/10',
      loading: deliveryLoading
    },
    { 
      label: t.totalSalaries, 
      value: `${totalSalaries.toLocaleString()} YER`, 
      icon: <DollarSign className="text-warning" size={24} />,
      color: 'bg-warning/10',
      loading: employeesLoading
    }
  ];

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
            <Button 
              variant="outline" 
              onClick={refreshAllData}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>
            
            {/* Delivery Person Dialog */}
            <Dialog open={showDeliveryDialog} onOpenChange={(open) => {
              setShowDeliveryDialog(open);
              if (!open) {
                resetDeliveryForm();
                setIsEditingDelivery(false);
                setCurrentDeliveryId(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Truck size={18} className="me-2" />
                  {t.newDelivery}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {isEditingDelivery ? t.editDelivery : t.newDelivery}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.name} *</Label>
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
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={newDelivery.is_active}
                      onChange={(e) => setNewDelivery(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      {newDelivery.is_active ? t.active : t.inactive}
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowDeliveryDialog(false);
                    resetDeliveryForm();
                    setIsEditingDelivery(false);
                    setCurrentDeliveryId(null);
                  }}>
                    {t.cancel}
                  </Button>
                  <Button 
                    onClick={isEditingDelivery ? handleUpdateDelivery : handleAddDelivery}
                    disabled={isEditingDelivery ? updateDeliveryMutation.isPending : addDeliveryMutation.isPending}
                    className="gradient-success"
                  >
                    {(isEditingDelivery ? updateDeliveryMutation.isPending : addDeliveryMutation.isPending) ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {isEditingDelivery ? t.update : t.add}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Employee Dialog */}
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
                      <Label>{t.code} *</Label>
                      <Input 
                        value={newEmployee.employee_code}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, employee_code: e.target.value }))}
                        placeholder="EMP004" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.name} *</Label>
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
                    {addEmployeeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
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
                    {stat.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{t.loading}</span>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    )}
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
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      placeholder={t.search} 
                      className="ps-10" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <AdvancedFilter
                    fields={[
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
                    onReset={() => {
                      setEmployeeFilters({});
                      setSearchTerm('');
                    }}
                    language={language}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {employeesLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ms-2">{t.loading}</span>
                  </div>
                ) : employeesError ? (
                  <div className="text-center py-12">
                    <div className="text-red-500 font-medium">{t.error}</div>
                    <Button 
                      variant="outline" 
                      onClick={() => refetchEmployees()} 
                      className="mt-4"
                    >
                      <RefreshCw className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
                    </Button>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchTerm || Object.keys(employeeFilters).length > 0 
                      ? t.noData 
                      : language === 'ar' ? 'لا يوجد موظفين' : 'No employees yet'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.code}</TableHead>
                        <TableHead>{t.name}</TableHead>
                        <TableHead>{t.position}</TableHead>
                        <TableHead>{t.department}</TableHead>
                        <TableHead>{t.salary}</TableHead>
                                <TableHead>{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee: any) => (
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
                          <TableCell>{parseFloat(employee.salary || 0).toLocaleString()} YER</TableCell>
                          {/* <TableCell>
                            <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                              {employee.is_active ? t.active : t.inactive}
                            </Badge>
                          </TableCell> */}
                             <TableCell>
                            <div className="flex items-center gap-1">

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditEmployee(employee)}
                                title={t.edit}
                                disabled={updateEmployeeMutation.isPending || deleteEmployeeMutation.isPending}
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEmployee(employee.id, employee.name_ar || employee.name)}
                                title={t.delete}
                                disabled={updateEmployeeMutation.isPending || deleteEmployeeMutation.isPending}
                              >
                                {deleteEmployeeMutation.isPending && deleteEmployeeMutation.variables === employee.id ? (
                                  <Loader2 size={14} className="animate-spin text-destructive" />
                                ) : (
                                  <Trash2 size={14} className="text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
                  <Input 
                    placeholder={t.search} 
                    className="ps-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {deliveryLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ms-2">{t.loading}</span>
                  </div>
                ) : deliveryError ? (
                  <div className="text-center py-12">
                    <div className="text-red-500 font-medium">{t.error}</div>
                    <Button 
                      variant="outline" 
                      onClick={() => refetchDelivery()} 
                      className="mt-4"
                    >
                      <RefreshCw className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
                    </Button>
                  </div>
                ) : filteredDeliveryPersons.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchTerm 
                      ? t.noData 
                      : language === 'ar' ? 'لا يوجد مناديب توصيل' : 'No delivery persons yet'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.name}</TableHead>
                        <TableHead>{t.phone}</TableHead>
                        <TableHead>{t.vehicleType}</TableHead>
                        <TableHead>{t.vehicleNumber}</TableHead>
                        {/* <TableHead>{t.status}</TableHead> */}
                        <TableHead>{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveryPersons.map((person: any) => (
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
                          {/* <TableCell>
                            <Badge variant={person.is_active ? 'default' : 'secondary'}>
                              {person.is_active ? t.active : t.inactive}
                            </Badge>
                          </TableCell> */}
                          <TableCell>
                            <div className="flex items-center gap-1">

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditDelivery(person)}
                                title={t.edit}
                                disabled={updateDeliveryMutation.isPending || deleteDeliveryMutation.isPending}
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDelivery(person.id, person.name_ar || person.name)}
                                title={t.delete}
                                disabled={updateDeliveryMutation.isPending || deleteDeliveryMutation.isPending}
                              >
                                {deleteDeliveryMutation.isPending && deleteDeliveryMutation.variables === person.id ? (
                                  <Loader2 size={14} className="animate-spin text-destructive" />
                                ) : (
                                  <Trash2 size={14} className="text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            <AttendanceManager employees={employees} attendance={mergedAttendance} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default HR;