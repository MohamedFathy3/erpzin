import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Key,
  Building2,
  Crown,
  Eye,
  ShoppingCart,
  Settings as SettingsIcon,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Layers,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  User,
  Briefcase,
  Home
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type AppRole = 'admin' | 'moderator' | 'cashier' | 'viewer';

interface Profile {
  id: string;
  full_name: string | null;
  full_name_ar: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  branch_id: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
  name_ar: string | null;
}

const UsersPermissions = () => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<AppRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [editForm, setEditForm] = useState({
    full_name: '',
    full_name_ar: '',
    phone: '',
    is_active: true,
    branch_id: '',
    role: 'viewer' as AppRole
  });

  const translations = {
    en: {
      title: 'Users & Permissions',
      subtitle: 'Manage system users, roles, and access control',
      users: 'Users',
      roles: 'Roles',
      permissions: 'Permissions Matrix',
      activity: 'Activity Log',
      addUser: 'Add User',
      editUser: 'Edit User',
      userName: 'Full Name',
      userNameAr: 'Full Name (Arabic)',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      branch: 'Branch',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete',
      actions: 'Actions',
      admin: 'Administrator',
      moderator: 'Moderator',
      cashier: 'Cashier',
      viewer: 'Viewer',
      adminDesc: 'Full system access with all permissions',
      moderatorDesc: 'Manage inventory, sales, and reports',
      cashierDesc: 'POS operations and basic access',
      viewerDesc: 'Read-only access to view data',
      lastActive: 'Last Active',
      createdAt: 'Member Since',
      noUsers: 'No users found',
      roleUpdated: 'Role updated successfully',
      userUpdated: 'User updated successfully',
      confirmDelete: 'Are you sure you want to delete this user?',
      selectBranch: 'Select Branch',
      allBranches: 'All Branches',
      allRoles: 'All Roles',
      allStatus: 'All Status',
      search: 'Search users...',
      totalUsers: 'Total Users',
      activeUsers: 'Active Users',
      inactiveUsers: 'Inactive Users',
      recentlyAdded: 'Recently Added',
      // Permissions
      module: 'Module',
      view: 'View',
      create: 'Create',
      edit: 'Edit',
      dashboard: 'Dashboard',
      inventory: 'Inventory',
      pos: 'Point of Sale',
      crm: 'CRM',
      hr: 'HR',
      finance: 'Finance',
      reports: 'Reports',
      settings: 'Settings',
      sales: 'Sales',
      purchasing: 'Purchasing',
      // Role descriptions
      rolePermissions: 'Role Permissions',
      accessLevel: 'Access Level',
      fullAccess: 'Full Access',
      limitedAccess: 'Limited Access',
      noAccess: 'No Access'
    },
    ar: {
      title: 'المستخدمين والصلاحيات',
      subtitle: 'إدارة مستخدمي النظام والأدوار والتحكم في الوصول',
      users: 'المستخدمين',
      roles: 'الأدوار',
      permissions: 'مصفوفة الصلاحيات',
      activity: 'سجل النشاط',
      addUser: 'إضافة مستخدم',
      editUser: 'تعديل مستخدم',
      userName: 'الاسم الكامل',
      userNameAr: 'الاسم بالعربية',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      role: 'الدور',
      branch: 'الفرع',
      status: 'الحالة',
      active: 'نشط',
      inactive: 'غير نشط',
      save: 'حفظ التغييرات',
      cancel: 'إلغاء',
      delete: 'حذف',
      actions: 'الإجراءات',
      admin: 'مدير النظام',
      moderator: 'مشرف',
      cashier: 'كاشير',
      viewer: 'مشاهد',
      adminDesc: 'صلاحيات كاملة للوصول إلى جميع الميزات',
      moderatorDesc: 'إدارة المخزون والمبيعات والتقارير',
      cashierDesc: 'عمليات نقطة البيع والوصول الأساسي',
      viewerDesc: 'صلاحية القراءة فقط لعرض البيانات',
      lastActive: 'آخر نشاط',
      createdAt: 'عضو منذ',
      noUsers: 'لا يوجد مستخدمين',
      roleUpdated: 'تم تحديث الدور بنجاح',
      userUpdated: 'تم تحديث المستخدم بنجاح',
      confirmDelete: 'هل أنت متأكد من حذف هذا المستخدم؟',
      selectBranch: 'اختر الفرع',
      allBranches: 'جميع الفروع',
      allRoles: 'جميع الأدوار',
      allStatus: 'جميع الحالات',
      search: 'بحث عن المستخدمين...',
      totalUsers: 'إجمالي المستخدمين',
      activeUsers: 'المستخدمين النشطين',
      inactiveUsers: 'المستخدمين غير النشطين',
      recentlyAdded: 'المضافين حديثاً',
      // Permissions
      module: 'الموديول',
      view: 'عرض',
      create: 'إنشاء',
      edit: 'تعديل',
      dashboard: 'لوحة التحكم',
      inventory: 'المخزون',
      pos: 'نقطة البيع',
      crm: 'العملاء',
      hr: 'الموارد البشرية',
      finance: 'المالية',
      reports: 'التقارير',
      settings: 'الإعدادات',
      sales: 'المبيعات',
      purchasing: 'المشتريات',
      // Role descriptions
      rolePermissions: 'صلاحيات الدور',
      accessLevel: 'مستوى الوصول',
      fullAccess: 'وصول كامل',
      limitedAccess: 'وصول محدود',
      noAccess: 'بدون وصول'
    }
  };

  const t = translations[language];

  // Fetch profiles
  const { data: profiles = [], isLoading: loadingProfiles, refetch: refetchProfiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    }
  });

  // Fetch user roles
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');
      if (error) throw error;
      return data as UserRole[];
    }
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar');
      if (error) throw error;
      return data as Branch[];
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<Profile> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: t.userUpdated });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في التحديث' : 'Update failed', variant: 'destructive' });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({ title: t.roleUpdated });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في تحديث الدور' : 'Role update failed', variant: 'destructive' });
    }
  });

  // Toggle user status
  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: language === 'ar' ? 'تم تحديث الحالة' : 'Status updated' });
    }
  });

  const getUserRole = (userId: string): AppRole => {
    const userRole = userRoles.find(r => r.user_id === userId);
    return userRole?.role || 'viewer';
  };

  const getRoleConfig = (role: AppRole) => {
    const configs = {
      admin: {
        icon: Crown,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        gradient: 'from-amber-500/20 to-amber-500/5'
      },
      moderator: {
        icon: Shield,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        gradient: 'from-blue-500/20 to-blue-500/5'
      },
      cashier: {
        icon: ShoppingCart,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        gradient: 'from-emerald-500/20 to-emerald-500/5'
      },
      viewer: {
        icon: Eye,
        color: 'text-slate-500',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/30',
        gradient: 'from-slate-500/20 to-slate-500/5'
      }
    };
    return configs[role];
  };

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      full_name_ar: user.full_name_ar || '',
      phone: user.phone || '',
      is_active: user.is_active ?? true,
      branch_id: user.branch_id || '',
      role: getUserRole(user.id)
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;

    updateUserMutation.mutate({
      userId: selectedUser.id,
      data: {
        full_name: editForm.full_name,
        full_name_ar: editForm.full_name_ar,
        phone: editForm.phone,
        is_active: editForm.is_active,
        branch_id: editForm.branch_id || null
      }
    });

    if (editForm.role !== getUserRole(selectedUser.id)) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: editForm.role });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return t.allBranches;
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return '-';
    return language === 'ar' ? branch.name_ar || branch.name : branch.name;
  };

  // Filter users
  const filteredProfiles = profiles.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name_ar?.includes(searchQuery) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || getUserRole(user.id) === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Stats
  const totalUsers = profiles.length;
  const activeUsers = profiles.filter(p => p.is_active).length;
  const inactiveUsers = profiles.filter(p => !p.is_active).length;
  const recentUsers = profiles.filter(p => {
    const created = new Date(p.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created >= weekAgo;
  }).length;

  // Permissions matrix
  const modules = [
    { key: 'dashboard', icon: Home, label: t.dashboard },
    { key: 'inventory', icon: Layers, label: t.inventory },
    { key: 'pos', icon: ShoppingCart, label: t.pos },
    { key: 'sales', icon: Briefcase, label: t.sales },
    { key: 'purchasing', icon: ShoppingCart, label: t.purchasing },
    { key: 'crm', icon: Users, label: t.crm },
    { key: 'hr', icon: UserCheck, label: t.hr },
    { key: 'finance', icon: Key, label: t.finance },
    { key: 'reports', icon: Activity, label: t.reports },
    { key: 'settings', icon: SettingsIcon, label: t.settings }
  ];

  const permissionsMatrix: Record<string, Record<AppRole, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
    dashboard: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: false, edit: false, delete: false }, cashier: { view: true, create: false, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    inventory: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: true, delete: false }, cashier: { view: true, create: false, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    pos: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: true, delete: true }, cashier: { view: true, create: true, edit: true, delete: false }, viewer: { view: false, create: false, edit: false, delete: false } },
    sales: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: true, delete: false }, cashier: { view: true, create: true, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    purchasing: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: true, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    crm: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: true, delete: false }, cashier: { view: true, create: true, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    hr: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: false, create: false, edit: false, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: false, create: false, edit: false, delete: false } },
    finance: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: false, edit: false, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: false, create: false, edit: false, delete: false } },
    reports: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: false, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    settings: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: false, create: false, edit: false, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: false, create: false, edit: false, delete: false } }
  };

  // Stat Card Component
  const StatCard = ({ label, value, icon: Icon, color, trend }: { label: string; value: number; icon: any; color: string; trend?: string }) => (
    <Card className="card-elevated hover:shadow-lg transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && <p className="text-xs text-accent">{trend}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon size={22} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // User Card Component (for grid view)
  const UserCard = ({ user }: { user: Profile }) => {
    const role = getUserRole(user.id);
    const roleConfig = getRoleConfig(role);
    const RoleIcon = roleConfig.icon;

    return (
      <Card className={`card-elevated hover:shadow-lg transition-all overflow-hidden`}>
        <div className={`h-2 bg-gradient-to-r ${roleConfig.gradient}`} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2 border-background shadow-md">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className={`${roleConfig.bgColor} ${roleConfig.color} font-semibold`}>
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">
                  {language === 'ar' ? user.full_name_ar || user.full_name : user.full_name}
                </p>
                {user.is_active ? (
                  <CheckCircle2 size={14} className="text-accent shrink-0" />
                ) : (
                  <XCircle size={14} className="text-muted-foreground shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={`${roleConfig.bgColor} ${roleConfig.color} ${roleConfig.borderColor} text-xs`}>
                  <RoleIcon size={12} className="me-1" />
                  {t[role]}
                </Badge>
              </div>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 size={12} />
              <span className="truncate">{getBranchName(user.branch_id)}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditUser(user)}>
              <Edit size={14} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <Card className="card-elevated border-0 bg-gradient-to-br from-primary/5 to-primary/0">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="text-primary" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <p className="text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => refetchProfiles()}>
                <RefreshCw size={16} />
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download size={16} />
                {language === 'ar' ? 'تصدير' : 'Export'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t.totalUsers}
          value={totalUsers}
          icon={Users}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label={t.activeUsers}
          value={activeUsers}
          icon={UserCheck}
          color="bg-accent/10 text-accent"
        />
        <StatCard
          label={t.inactiveUsers}
          value={inactiveUsers}
          icon={UserX}
          color="bg-muted text-muted-foreground"
        />
        <StatCard
          label={t.recentlyAdded}
          value={recentUsers}
          icon={Calendar}
          color="bg-warning/10 text-warning"
          trend={language === 'ar' ? 'هذا الأسبوع' : 'This week'}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start p-1 bg-muted/50 overflow-x-auto">
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users size={16} />
            {t.users}
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield size={16} />
            {t.roles}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Key size={16} />
            {t.permissions}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6 space-y-4">
          {/* Filters */}
          <Card className="border-0 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9 bg-background"
                  />
                </div>
                <Select value={filterRole} onValueChange={(v) => setFilterRole(v as AppRole | 'all')}>
                  <SelectTrigger className="w-[150px] bg-background">
                    <SelectValue placeholder={t.allRoles} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allRoles}</SelectItem>
                    <SelectItem value="admin">{t.admin}</SelectItem>
                    <SelectItem value="moderator">{t.moderator}</SelectItem>
                    <SelectItem value="cashier">{t.cashier}</SelectItem>
                    <SelectItem value="viewer">{t.viewer}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'active' | 'inactive')}>
                  <SelectTrigger className="w-[130px] bg-background">
                    <SelectValue placeholder={t.allStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatus}</SelectItem>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                  </SelectContent>
                </Select>
                <Separator orientation="vertical" className="h-8" />
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
              </div>
            </CardContent>
          </Card>

          {/* Users Display */}
          {loadingProfiles ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <Users className="mx-auto text-muted-foreground mb-4" size={48} />
                <p className="text-muted-foreground">{t.noUsers}</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProfiles.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          ) : (
            <Card className="card-elevated">
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[300px]">{t.userName}</TableHead>
                        <TableHead>{t.email}</TableHead>
                        <TableHead>{t.role}</TableHead>
                        <TableHead>{t.branch}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead className="text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfiles.map((user) => {
                        const role = getUserRole(user.id);
                        const roleConfig = getRoleConfig(role);
                        const RoleIcon = roleConfig.icon;
                        
                        return (
                          <TableRow key={user.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className={`${roleConfig.bgColor} ${roleConfig.color} text-xs font-semibold`}>
                                    {getInitials(user.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {language === 'ar' ? user.full_name_ar || user.full_name : user.full_name}
                                  </p>
                                  {user.phone && (
                                    <p className="text-xs text-muted-foreground" dir="ltr">{user.phone}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${roleConfig.bgColor} ${roleConfig.color} ${roleConfig.borderColor}`}>
                                <RoleIcon size={12} className="me-1" />
                                {t[role]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 size={14} className="text-muted-foreground" />
                                {getBranchName(user.branch_id)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={user.is_active ?? true}
                                  onCheckedChange={(checked) => toggleUserStatus.mutate({ userId: user.id, isActive: checked })}
                                />
                                <span className={`text-xs ${user.is_active ? 'text-accent' : 'text-muted-foreground'}`}>
                                  {user.is_active ? t.active : t.inactive}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditUser(user)}>
                                <Edit size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['admin', 'moderator', 'cashier', 'viewer'] as AppRole[]).map((role) => {
              const config = getRoleConfig(role);
              const RoleIcon = config.icon;
              const count = profiles.filter(p => getUserRole(p.id) === role).length;
              const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;

              return (
                <Card key={role} className={`card-elevated overflow-hidden`}>
                  <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${config.bgColor}`}>
                        <RoleIcon className={config.color} size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">{t[role]}</h3>
                          <Badge variant="secondary" className="text-lg px-3">{count}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{t[`${role}Desc` as keyof typeof t]}</p>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{language === 'ar' ? 'نسبة المستخدمين' : 'User percentage'}</span>
                            <span>{percentage.toFixed(0)}%</span>
                          </div>
                          <Progress value={percentage} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key size={20} className="text-primary" />
                {t.permissions}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'الصلاحيات التفصيلية لكل دور' : 'Detailed permissions for each role'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[200px]">{t.module}</TableHead>
                      <TableHead className="text-center" colSpan={4}>
                        <div className="flex items-center justify-center gap-1">
                          <Crown size={14} className="text-amber-500" />
                          {t.admin}
                        </div>
                      </TableHead>
                      <TableHead className="text-center" colSpan={4}>
                        <div className="flex items-center justify-center gap-1">
                          <Shield size={14} className="text-blue-500" />
                          {t.moderator}
                        </div>
                      </TableHead>
                      <TableHead className="text-center" colSpan={4}>
                        <div className="flex items-center justify-center gap-1">
                          <ShoppingCart size={14} className="text-emerald-500" />
                          {t.cashier}
                        </div>
                      </TableHead>
                      <TableHead className="text-center" colSpan={4}>
                        <div className="flex items-center justify-center gap-1">
                          <Eye size={14} className="text-slate-500" />
                          {t.viewer}
                        </div>
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-muted/10">
                      <TableHead></TableHead>
                      {['admin', 'moderator', 'cashier', 'viewer'].map((role) => (
                        <React.Fragment key={role}>
                          <TableHead className="text-center text-xs px-1">👁</TableHead>
                          <TableHead className="text-center text-xs px-1">➕</TableHead>
                          <TableHead className="text-center text-xs px-1">✏️</TableHead>
                          <TableHead className="text-center text-xs px-1">🗑️</TableHead>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map((module) => {
                      const ModuleIcon = module.icon;
                      return (
                        <TableRow key={module.key}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ModuleIcon size={16} className="text-muted-foreground" />
                              <span className="font-medium">{module.label}</span>
                            </div>
                          </TableCell>
                          {(['admin', 'moderator', 'cashier', 'viewer'] as AppRole[]).map((role) => {
                            const perms = permissionsMatrix[module.key]?.[role] || { view: false, create: false, edit: false, delete: false };
                            return (
                              <React.Fragment key={role}>
                                <TableCell className="text-center">
                                  {perms.view ? <CheckCircle2 size={14} className="mx-auto text-accent" /> : <XCircle size={14} className="mx-auto text-muted-foreground/30" />}
                                </TableCell>
                                <TableCell className="text-center">
                                  {perms.create ? <CheckCircle2 size={14} className="mx-auto text-accent" /> : <XCircle size={14} className="mx-auto text-muted-foreground/30" />}
                                </TableCell>
                                <TableCell className="text-center">
                                  {perms.edit ? <CheckCircle2 size={14} className="mx-auto text-accent" /> : <XCircle size={14} className="mx-auto text-muted-foreground/30" />}
                                </TableCell>
                                <TableCell className="text-center">
                                  {perms.delete ? <CheckCircle2 size={14} className="mx-auto text-accent" /> : <XCircle size={14} className="mx-auto text-muted-foreground/30" />}
                                </TableCell>
                              </React.Fragment>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit size={18} className="text-primary" />
              {t.editUser}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.userName}</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.userNameAr}</Label>
                <Input
                  value={editForm.full_name_ar}
                  onChange={(e) => setEditForm({ ...editForm, full_name_ar: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.phone}</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.role}</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as AppRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t.admin}</SelectItem>
                    <SelectItem value="moderator">{t.moderator}</SelectItem>
                    <SelectItem value="cashier">{t.cashier}</SelectItem>
                    <SelectItem value="viewer">{t.viewer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.branch}</Label>
                <Select value={editForm.branch_id || 'none'} onValueChange={(v) => setEditForm({ ...editForm, branch_id: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectBranch} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.allBranches}</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                {editForm.is_active ? <Unlock size={16} className="text-accent" /> : <Lock size={16} className="text-muted-foreground" />}
                <Label className="cursor-pointer">{t.status}</Label>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${editForm.is_active ? 'text-accent' : 'text-muted-foreground'}`}>
                  {editForm.is_active ? t.active : t.inactive}
                </span>
                <Switch
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSaveUser} disabled={updateUserMutation.isPending}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPermissions;
