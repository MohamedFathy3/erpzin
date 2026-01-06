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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Users, 
  Clock, 
  DollarSign,
  Calendar,
  UserCheck,
  UserX,
  Briefcase,
  Building
} from 'lucide-react';

const HR = () => {
  const { language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('employees');

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
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

  const translations = {
    en: {
      title: 'HR & Payroll',
      employees: 'Employees',
      attendance: 'Attendance',
      payroll: 'Payroll',
      newEmployee: 'New Employee',
      search: 'Search...',
      code: 'Code',
      name: 'Name',
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
      leave: 'On Leave'
    },
    ar: {
      title: 'الموارد البشرية والرواتب',
      employees: 'الموظفين',
      attendance: 'الحضور',
      payroll: 'الرواتب',
      newEmployee: 'موظف جديد',
      search: 'بحث...',
      code: 'الكود',
      name: 'الاسم',
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
      leave: 'إجازة'
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
      label: t.totalSalaries, 
      value: `${totalSalaries.toLocaleString()} YER`, 
      icon: <DollarSign className="text-warning" size={24} />,
      color: 'bg-warning/10' 
    },
    { 
      label: t.presentToday, 
      value: presentToday, 
      icon: <Clock className="text-info" size={24} />,
      color: 'bg-info/10' 
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

  const departments = [
    { value: 'sales', label: language === 'ar' ? 'المبيعات' : 'Sales' },
    { value: 'finance', label: language === 'ar' ? 'المالية' : 'Finance' },
    { value: 'operations', label: language === 'ar' ? 'العمليات' : 'Operations' },
    { value: 'hr', label: language === 'ar' ? 'الموارد البشرية' : 'HR' }
  ];

  return (
    <MainLayout activeItem="hr">
      <div className="space-y-6" dir={direction}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <Dialog>
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
                    <Input placeholder="EMP004" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.name}</Label>
                    <Input placeholder={t.name} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.position}</Label>
                    <Input placeholder={t.position} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.department}</Label>
                    <Input placeholder={t.department} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.phone}</Label>
                    <Input placeholder={t.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.salary}</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                </div>
                <Button className="w-full gradient-success">{t.newEmployee}</Button>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="employees">{t.employees}</TabsTrigger>
            <TabsTrigger value="attendance">{t.attendance}</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-4">
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

          <TabsContent value="attendance" className="mt-4">
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="relative max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input placeholder={t.search} className="ps-10" />
                  </div>
                  <Button variant="outline">
                    <Calendar size={18} className="me-2" />
                    {language === 'ar' ? 'اليوم' : 'Today'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.code}</TableHead>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.checkIn}</TableHead>
                      <TableHead>{t.checkOut}</TableHead>
                      <TableHead>{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد سجلات حضور' : 'No attendance records yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono">{record.employees?.employee_code}</TableCell>
                          <TableCell>
                            {language === 'ar' 
                              ? record.employees?.name_ar || record.employees?.name 
                              : record.employees?.name}
                          </TableCell>
                          <TableCell>{new Date(record.date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}</TableCell>
                          <TableCell>{record.check_in || '-'}</TableCell>
                          <TableCell>{record.check_out || '-'}</TableCell>
                          <TableCell>{getAttendanceStatus(record.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default HR;
