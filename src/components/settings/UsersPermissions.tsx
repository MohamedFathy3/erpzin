import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Users, 
  Briefcase,
  Plus, 
  Edit, 
  Trash2, 
  Search,
  RefreshCw,
  Download,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  User,
  Mail,
  Phone,
  DollarSign,
  Hash,
  Shield,
  Eye,
  EyeOff,
  MoreVertical,
  X,
  Filter
} from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';

// ========== واجهات البيانات ==========
interface Employee {
  id: number;
  employee_code: string;
  name: string;
  position: string;
  department?: string | null;
  role: string;
  phone: string;
  email: string;
  salary: string;
  created_at: string;
}

interface ApiResponse<T> {
  result: string;
  data: T[];
  message: string;
  status: number;
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    from: number;
    to: number;
  };
  links?: any;
}

interface ApiRole {
  id: number;
  name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface EmployeeFormData {
  employee_code: string;
  name: string;
  position: string;
  role_id: number | '';
  phone: string;
  email: string;
  password?: string;
  salary: number | '';
}

const Employees = () => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();

  // ========== حالات الواجهة ==========
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // حالات الدايلوجات
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // حالات الفلاتر
  const [filters, setFilters] = useState({
    search: '',
    role: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(filters.search, 500);

  // حالات الفورم
  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_code: '',
    name: '',
    position: '',
    role_id: '',
    phone: '',
    email: '',
    password: '',
    salary: '',
  });

  // ========== جلب بيانات الموظفين ==========
  const { 
    data: employeesResponse, 
    isLoading: employeesLoading,
    refetch: refetchEmployees
  } = useQuery<ApiResponse<Employee>>({
    queryKey: ['employees', debouncedSearch, filters.role],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: true
        };

        // إضافة فلتر البحث لو موجود
        const filterConditions: any = {};
        if (debouncedSearch) {
          filterConditions.name = debouncedSearch;
        }
        if (filters.role) {
          filterConditions.role = filters.role;
        }

        if (Object.keys(filterConditions).length > 0) {
          payload.filters = filterConditions;
        }

        console.log('📦 Fetching employees with payload:', payload);

        const response = await api.post<ApiResponse<Employee>>('/employee/index', payload);
        
        if (response.data.result === 'Success') {
          return response.data;
        }
        
        throw new Error(response.data.message || 'Failed to fetch employees');
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب الموظفين' : 'Error fetching employees');
        throw error;
      }
    }
  });

  // ========== جلب أدوار API ==========
  const { 
    data: rolesResponse, 
    isLoading: rolesLoading 
  } = useQuery<ApiResponse<ApiRole>>({
    queryKey: ['api-roles-employees'],
    queryFn: async () => {
      try {
        const payload = {
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        };

        const response = await api.post<ApiResponse<ApiRole>>('/role/index', payload);
        
        if (response.data.result === 'Success') {
          return response.data;
        }
        
        throw new Error(response.data.message || 'Failed to fetch roles');
      } catch (error) {
        console.error('Error fetching roles:', error);
        return { data: [] } as ApiResponse<ApiRole>;
      }
    }
  });

  // استخراج البيانات
  const employees = employeesResponse?.data || [];
  const roles = rolesResponse?.data || [];
  const paginationMeta = employeesResponse?.meta;

  // ========== إضافة موظف ==========
  const addEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const response = await api.post('/employee/store', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(language === 'ar' ? 'تم إضافة الموظف بنجاح' : 'Employee added successfully');
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || (language === 'ar' ? 'خطأ في إضافة الموظف' : 'Error adding employee'));
    }
  });

  // ========== تحديث موظف ==========
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EmployeeFormData> }) => {
      const response = await api.post(`/employee/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(language === 'ar' ? 'تم تحديث الموظف بنجاح' : 'Employee updated successfully');
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || (language === 'ar' ? 'خطأ في تحديث الموظف' : 'Error updating employee'));
    }
  });

  // ========== حذف موظف ==========
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/employee/delete/${id}`, {
        data: { items: [id] }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(language === 'ar' ? 'تم حذف الموظف بنجاح' : 'Employee deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || (language === 'ar' ? 'خطأ في حذف الموظف' : 'Error deleting employee'));
    }
  });

  // ========== دوال المساعدة ==========
  const resetForm = () => {
    setFormData({
      employee_code: '',
      name: '',
      position: '',
      role_id: '',
      phone: '',
      email: '',
      password: '',
      salary: '',
    });
    setShowPassword(false);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    
    // البحث عن الـ role_id المناسب
    const role = roles.find(r => r.name === employee.role);
    
    setFormData({
      employee_code: employee.employee_code,
      name: employee.name,
      position: employee.position,
      role_id: role?.id || '',
      phone: employee.phone,
      email: employee.email,
      password: '',
      salary: parseFloat(employee.salary) || '',
    });
    
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    resetForm();
    
    // توليد كود موظف تلقائي (مثال)
    const lastCode = employees.length > 0 
      ? employees[0].employee_code 
      : 'EMP-0000';
    const lastNumber = parseInt(lastCode.split('-')[1] || '0');
    const newCode = `EMP-${String(lastNumber + 1).padStart(4, '0')}`;
    
    setFormData(prev => ({
      ...prev,
      employee_code: newCode
    }));
    
    setIsAddDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ========== الترجمات ==========
  const t = {
    en: {
      title: 'Employees',
      subtitle: 'Manage employees and their roles',
      addEmployee: 'Add Employee',
      editEmployee: 'Edit Employee',
      employeeCode: 'Employee Code',
      name: 'Name',
      position: 'Position',
      role: 'Role',
      phone: 'Phone',
      email: 'Email',
      salary: 'Salary',
      password: 'Password',
      actions: 'Actions',
      search: 'Search employees...',
      filter: 'Filter',
      clearFilters: 'Clear Filters',
      close: 'Close',
      save: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete',
      noEmployees: 'No employees found',
      totalEmployees: 'Total Employees',
      withSalary: 'With Salary',
      avgSalary: 'Avg Salary',
      export: 'Export',
      refresh: 'Refresh',
      showPassword: 'Show Password',
      hidePassword: 'Hide Password',
      roleId: 'Role ID',
      selectRole: 'Select Role',
      employeeCodeAuto: 'Auto-generated',
      from: 'from',
      to: 'to',
      of: 'of'
    },
    ar: {
      title: 'الموظفين',
      subtitle: 'إدارة الموظفين والأدوار',
      addEmployee: 'إضافة موظف',
      editEmployee: 'تعديل موظف',
      employeeCode: 'كود الموظف',
      name: 'الاسم',
      position: 'الوظيفة',
      role: 'الدور',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      salary: 'الراتب',
      password: 'كلمة المرور',
      actions: 'الإجراءات',
      search: 'بحث عن موظف...',
      filter: 'فلتر',
      clearFilters: 'مسح الفلاتر',
      close: 'إغلاق',
      save: 'حفظ التغييرات',
      cancel: 'إلغاء',
      delete: 'حذف',
      noEmployees: 'لا يوجد موظفين',
      totalEmployees: 'إجمالي الموظفين',
      withSalary: 'براتب',
      avgSalary: 'متوسط الراتب',
      export: 'تصدير',
      refresh: 'تحديث',
      showPassword: 'إظهار كلمة المرور',
      hidePassword: 'إخفاء كلمة المرور',
      roleId: 'معرف الدور',
      selectRole: 'اختر الدور',
      employeeCodeAuto: 'تلقائي',
      from: 'من',
      to: 'إلى',
      of: 'من'
    }
  }[language];

  // ========== إحصائيات ==========
  const stats = useMemo(() => {
    const total = employees.length;
    const withSalary = employees.filter(e => parseFloat(e.salary) > 0).length;
    const avgSalary = total > 0 
      ? employees.reduce((sum, e) => sum + parseFloat(e.salary), 0) / total 
      : 0;
    
    return { total, withSalary, avgSalary };
  }, [employees]);

  // ========== التصفية المحلية (كمكمل) ==========
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    
    const query = searchQuery.toLowerCase();
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(query) ||
      emp.employee_code.toLowerCase().includes(query) ||
      emp.position.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.phone.includes(query)
    );
  }, [employees, searchQuery]);

  // ========== العرض ==========
  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <Card className="border-0 bg-gradient-to-br from-primary/5 to-primary/0">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Briefcase className="text-primary" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => refetchEmployees()}>
                <RefreshCw size={16} />
                {t.refresh}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download size={16} />
                {t.export}
              </Button>
              <Button size="sm" className="gap-2" onClick={handleAdd}>
                <Plus size={16} />
                {t.addEmployee}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="text-primary" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.totalEmployees}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <DollarSign className="text-accent" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.withSalary}</p>
                <p className="text-2xl font-bold">{stats.withSalary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Briefcase className="text-warning" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.avgSalary}</p>
                <p className="text-2xl font-bold">
                  {stats.avgSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-primary/10' : ''}
          >
            <Filter size={16} />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-background">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 w-7 p-0" 
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 w-7 p-0" 
              onClick={() => setViewMode('list')}
            >
              <List size={14} />
            </Button>
          </div>
          
          {paginationMeta && (
            <Badge variant="outline" className="text-xs">
              {paginationMeta.from} - {paginationMeta.to} {t.of} {paginationMeta.total}
            </Badge>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <Filter size={16} />
                {t.filter}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setFilters({ search: '', role: '' });
                  setShowFilters(false);
                }} 
                className="h-8 gap-1"
              >
                <X size={14} />
                {t.close}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{t.role}</Label>
                <Select 
                  value={filters.role} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectRole} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'ar' ? 'كل الأدوار' : 'All Roles'}</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFilters({ search: '', role: '' })}
                >
                  {t.clearFilters}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Display */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground">{t.noEmployees}</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((employee) => {
            // اختيار أيقونة ولون حسب الدور
            const roleLower = employee.role?.toLowerCase() || '';
            let iconColor = '#64748b';
            let IconComponent = Briefcase;
            
            if (roleLower.includes('admin')) {
              iconColor = '#f59e0b';
              IconComponent = Shield;
            } else if (roleLower.includes('manager') || roleLower.includes('مدير')) {
              iconColor = '#3b82f6';
              IconComponent = Users;
            } else if (roleLower.includes('eng')) {
              iconColor = '#10b981';
              IconComponent = Briefcase;
            } else if (roleLower.includes('account')) {
              iconColor = '#8b5cf6';
              IconComponent = DollarSign;
            }

            return (
              <Card key={employee.id} className="hover:shadow-lg transition-all overflow-hidden">
                <div className="h-1" style={{ background: `linear-gradient(to right, ${iconColor}33, ${iconColor}11)` }} />
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                      <AvatarFallback style={{ backgroundColor: `${iconColor}20`, color: iconColor }} className="font-semibold">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">{employee.name}</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(employee)}
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{employee.position}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" style={{ backgroundColor: `${iconColor}15`, color: iconColor, borderColor: `${iconColor}40` }} className="text-xs">
                          <IconComponent size={12} className="me-1" />
                          {employee.role}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {employee.employee_code}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail size={14} />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone size={14} />
                      <span dir="ltr">{employee.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-accent font-semibold">
                      <DollarSign size={14} />
                      <span>{parseFloat(employee.salary).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[80px]">{t.employeeCode}</TableHead>
                    <TableHead>{t.name}</TableHead>
                    <TableHead>{t.position}</TableHead>
                    <TableHead>{t.role}</TableHead>
                    <TableHead>{t.phone}</TableHead>
                    <TableHead>{t.email}</TableHead>
                    <TableHead className="text-right">{t.salary}</TableHead>
                    <TableHead className="text-center w-[100px]">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">
                        {employee.employee_code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {employee.role}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr">{employee.phone}</TableCell>
                      <TableCell className="text-xs">{employee.email}</TableCell>
                      <TableCell className="text-right font-semibold text-accent">
                        {parseFloat(employee.salary).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الموظف؟' : 'Are you sure you want to delete this employee?')) {
                                deleteEmployeeMutation.mutate(employee.id);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={20} />
              {t.addEmployee}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.employeeCode}</Label>
                <Input 
                  value={formData.employee_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_code: e.target.value }))}
                  placeholder="EMP-0001"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">{t.employeeCodeAuto}</p>
              </div>
              
              <div className="space-y-2">
                <Label>{t.name} *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ahmed Abdullah"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.position}</Label>
                <Input 
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Software Engineer"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.role}</Label>
                <Select 
                  value={formData.role_id.toString()} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, role_id: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectRole} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.phone}</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01012345678"
                  dir="ltr"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="ahmed@email.com"
                  dir="ltr"
                  type="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.password} *</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t.salary}</Label>
                <Input 
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value ? parseFloat(e.target.value) : '' }))}
                  placeholder="15000"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => addEmployeeMutation.mutate(formData)}
              disabled={addEmployeeMutation.isPending || !formData.name || !formData.password}
            >
              {addEmployeeMutation.isPending ? (
                <RefreshCw className="animate-spin me-2" size={16} />
              ) : null}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={20} />
              {t.editEmployee}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.employeeCode}</Label>
                <Input 
                  value={formData.employee_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_code: e.target.value }))}
                  dir="ltr"
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.name} *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.position}</Label>
                <Input 
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.role}</Label>
                <Select 
                  value={formData.role_id.toString()} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, role_id: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectRole} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.phone}</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  dir="ltr"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  dir="ltr"
                  type="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.password}</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={language === 'ar' ? 'اتركه فارغاً للإبقاء على الحالية' : 'Leave empty to keep current'}
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t.salary}</Label>
                <Input 
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value ? parseFloat(e.target.value) : '' }))}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => selectedEmployee && updateEmployeeMutation.mutate({ 
                id: selectedEmployee.id, 
                data: formData 
              })}
              disabled={updateEmployeeMutation.isPending || !formData.name}
            >
              {updateEmployeeMutation.isPending ? (
                <RefreshCw className="animate-spin me-2" size={16} />
              ) : null}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;