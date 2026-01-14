import React, { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  MoreVertical,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Layers,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  User,
  Briefcase,
  Home,
  Save,
  TrendingUp,
  FileText,
  Package,
  Wallet,
  Calendar,
  Warehouse,
  Lock,
  Palette
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
  warehouse_id: string | null;
  username: string | null;
  preferred_language: string | null;
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

interface WarehouseType {
  id: string;
  name: string;
  name_ar: string | null;
}

interface Permission {
  id: string;
  module: string;
  module_ar: string;
  action: string;
  description: string | null;
  description_ar: string | null;
  is_active: boolean;
  sort_order: number;
}

interface RolePermission {
  id: string;
  role: AppRole;
  permission_id: string;
}

interface CustomRole {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  color: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

const UsersPermissions = () => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<AppRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [pendingPermissionChanges, setPendingPermissionChanges] = useState<Record<string, boolean>>({});
  const [editForm, setEditForm] = useState({
    full_name: '',
    full_name_ar: '',
    phone: '',
    email: '',
    username: '',
    is_active: true,
    branch_id: '',
    warehouse_id: '',
    role: 'viewer' as AppRole,
    preferred_language: 'ar' as 'ar' | 'en',
    new_password: ''
  });
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    full_name_ar: '',
    phone: '',
    branch_id: '',
    warehouse_id: '',
    role: 'viewer' as AppRole,
    preferred_language: 'ar' as 'ar' | 'en'
  });
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    color: '#6366f1',
    icon: 'Shield'
  });
  const [editRoleForm, setEditRoleForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    color: '#6366f1',
    icon: 'Shield'
  });

  const translations = {
    en: {
      title: 'Users & Permissions',
      subtitle: 'Manage system users, roles, and access control',
      users: 'Users',
      roles: 'Roles',
      permissions: 'Permissions Matrix',
      addUser: 'Add User',
      addRole: 'Add Role',
      editUser: 'Edit User',
      editRole: 'Edit Role',
      userName: 'Full Name',
      userNameAr: 'Full Name (Arabic)',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      branch: 'Branch',
      warehouse: 'Warehouse',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save Changes',
      savePermissions: 'Save Permissions',
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
      noUsers: 'No users found',
      roleUpdated: 'Role updated successfully',
      userUpdated: 'User updated successfully',
      userAdded: 'User added successfully',
      roleAdded: 'Role added successfully',
      permissionsSaved: 'Permissions saved successfully',
      selectBranch: 'Select Branch',
      selectWarehouse: 'Select Warehouse',
      allBranches: 'All Branches',
      allWarehouses: 'All Warehouses',
      allRoles: 'All Roles',
      allStatus: 'All Status',
      search: 'Search users...',
      totalUsers: 'Total Users',
      activeUsers: 'Active Users',
      inactiveUsers: 'Inactive Users',
      recentlyAdded: 'Recently Added',
      module: 'Module',
      view: 'View',
      create: 'Create',
      edit: 'Edit',
      deleteAction: 'Delete',
      export: 'Export',
      import: 'Import',
      approve: 'Approve',
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
      unsavedChanges: 'You have unsaved changes',
      discardChanges: 'Discard',
      selectRole: 'Select role to edit permissions',
      roleName: 'Role Name',
      roleNameAr: 'Role Name (Arabic)',
      roleDescription: 'Description',
      roleDescriptionAr: 'Description (Arabic)',
      roleColor: 'Color',
      roleIcon: 'Icon',
      systemRole: 'System Role',
      customRole: 'Custom Role',
      cannotDeleteSystemRole: 'Cannot delete system roles',
      roleDeleted: 'Role deleted successfully',
      loginWithUsername: 'Login with username and password',
      createUserNote: 'Create a user with username and password for direct login'
    },
    ar: {
      title: 'المستخدمين والصلاحيات',
      subtitle: 'إدارة مستخدمي النظام والأدوار والتحكم في الوصول',
      users: 'المستخدمين',
      roles: 'الأدوار',
      permissions: 'مصفوفة الصلاحيات',
      addUser: 'إضافة مستخدم',
      addRole: 'إضافة دور',
      editUser: 'تعديل مستخدم',
      editRole: 'تعديل دور',
      userName: 'الاسم الكامل',
      userNameAr: 'الاسم بالعربية',
      username: 'اسم المستخدم',
      password: 'كلمة المرور',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      role: 'الدور',
      branch: 'الفرع',
      warehouse: 'المخزن',
      status: 'الحالة',
      active: 'نشط',
      inactive: 'غير نشط',
      save: 'حفظ التغييرات',
      savePermissions: 'حفظ الصلاحيات',
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
      noUsers: 'لا يوجد مستخدمين',
      roleUpdated: 'تم تحديث الدور بنجاح',
      userUpdated: 'تم تحديث المستخدم بنجاح',
      userAdded: 'تم إضافة المستخدم بنجاح',
      roleAdded: 'تم إضافة الدور بنجاح',
      permissionsSaved: 'تم حفظ الصلاحيات بنجاح',
      selectBranch: 'اختر الفرع',
      selectWarehouse: 'اختر المخزن',
      allBranches: 'جميع الفروع',
      allWarehouses: 'جميع المخازن',
      allRoles: 'جميع الأدوار',
      allStatus: 'جميع الحالات',
      search: 'بحث عن المستخدمين...',
      totalUsers: 'إجمالي المستخدمين',
      activeUsers: 'المستخدمين النشطين',
      inactiveUsers: 'المستخدمين غير النشطين',
      recentlyAdded: 'المضافين حديثاً',
      module: 'الموديول',
      view: 'عرض',
      create: 'إنشاء',
      edit: 'تعديل',
      deleteAction: 'حذف',
      export: 'تصدير',
      import: 'استيراد',
      approve: 'موافقة',
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
      unsavedChanges: 'لديك تغييرات غير محفوظة',
      discardChanges: 'تجاهل',
      selectRole: 'اختر دور لتعديل الصلاحيات',
      roleName: 'اسم الدور',
      roleNameAr: 'اسم الدور بالعربية',
      roleDescription: 'الوصف',
      roleDescriptionAr: 'الوصف بالعربية',
      roleColor: 'اللون',
      roleIcon: 'الأيقونة',
      systemRole: 'دور نظامي',
      customRole: 'دور مخصص',
      cannotDeleteSystemRole: 'لا يمكن حذف الأدوار النظامية',
      roleDeleted: 'تم حذف الدور بنجاح',
      loginWithUsername: 'الدخول باسم المستخدم وكلمة المرور',
      createUserNote: 'إنشاء مستخدم باسم مستخدم وكلمة مرور للدخول المباشر'
    }
  };

  const t = translations[language];

  const iconOptions = [
    'Shield', 'Crown', 'Eye', 'ShoppingCart', 'User', 'Users', 'Key', 'Lock',
    'Package', 'TrendingUp', 'FileText', 'Wallet', 'Briefcase', 'Home', 'Settings'
  ];

  const colorOptions = [
    '#f59e0b', '#3b82f6', '#10b981', '#64748b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
  ];

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

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, name_ar');
      if (error) throw error;
      return data as WarehouseType[];
    }
  });

  // Fetch custom roles
  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CustomRole[];
    }
  });

  // Fetch permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Permission[];
    }
  });

  // Fetch role permissions
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      if (error) throw error;
      return data as RolePermission[];
    }
  });

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, [permissions]);

  // Check if role has permission
  const hasRolePermission = (role: AppRole, permissionId: string): boolean => {
    const key = `${role}-${permissionId}`;
    if (pendingPermissionChanges.hasOwnProperty(key)) {
      return pendingPermissionChanges[key];
    }
    return rolePermissions.some(rp => rp.role === role && rp.permission_id === permissionId);
  };

  // Toggle permission in pending changes
  const togglePermission = (role: AppRole, permissionId: string) => {
    const key = `${role}-${permissionId}`;
    const currentValue = hasRolePermission(role, permissionId);
    setPendingPermissionChanges(prev => ({
      ...prev,
      [key]: !currentValue
    }));
  };

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      const changes = Object.entries(pendingPermissionChanges);
      for (const [key, shouldHave] of changes) {
        const [role, permissionId] = key.split('-');
        const existing = rolePermissions.find(rp => rp.role === role && rp.permission_id === permissionId);
        
        if (shouldHave && !existing) {
          await supabase.from('role_permissions').insert({ role: role as AppRole, permission_id: permissionId });
        } else if (!shouldHave && existing) {
          await supabase.from('role_permissions').delete().eq('id', existing.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setPendingPermissionChanges({});
      toast({ title: t.permissionsSaved });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في حفظ الصلاحيات' : 'Error saving permissions', variant: 'destructive' });
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
        .maybeSingle();

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
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: t.roleUpdated });
    },
    onError: (error: any) => {
      toast({ title: error.message || (language === 'ar' ? 'خطأ في تحديث الدور' : 'Error updating role'), variant: 'destructive' });
    }
  });

  // Update user password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { userId, newPassword }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully' });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: 'destructive' });
    }
  });

  // Add custom role mutation
  const addRoleMutation = useMutation({
    mutationFn: async (data: typeof newRoleForm) => {
      const { error } = await supabase
        .from('custom_roles')
        .insert({
          name: data.name,
          name_ar: data.name_ar || null,
          description: data.description || null,
          description_ar: data.description_ar || null,
          color: data.color,
          icon: data.icon,
          is_system: false
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast({ title: t.roleAdded });
      setIsAddRoleDialogOpen(false);
      setNewRoleForm({ name: '', name_ar: '', description: '', description_ar: '', color: '#6366f1', icon: 'Shield' });
    },
    onError: (error: any) => {
      toast({ title: error.message || (language === 'ar' ? 'خطأ في إضافة الدور' : 'Error adding role'), variant: 'destructive' });
    }
  });

  // Update custom role mutation
  const updateCustomRoleMutation = useMutation({
    mutationFn: async ({ roleId, data }: { roleId: string; data: typeof editRoleForm }) => {
      const { error } = await supabase
        .from('custom_roles')
        .update({
          name: data.name,
          name_ar: data.name_ar || null,
          description: data.description || null,
          description_ar: data.description_ar || null,
          color: data.color,
          icon: data.icon
        })
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast({ title: t.roleUpdated });
      setIsEditRoleDialogOpen(false);
      setSelectedRole(null);
    },
    onError: (error: any) => {
      toast({ title: error.message || (language === 'ar' ? 'خطأ في تحديث الدور' : 'Error updating role'), variant: 'destructive' });
    }
  });

  // Delete custom role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast({ title: t.roleDeleted });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في حذف الدور' : 'Error deleting role', variant: 'destructive' });
    }
  });

  // Add user mutation (creates auth user with username as email)
  const addUserMutation = useMutation({
    mutationFn: async (data: typeof newUserForm) => {
      // Create fake email from username for Supabase auth
      const fakeEmail = `${data.username}@injaz.local`;
      
      // Sign up new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            full_name_ar: data.full_name_ar
          }
        }
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          full_name: data.full_name,
          full_name_ar: data.full_name_ar || null,
          phone: data.phone || null,
          branch_id: data.branch_id || null,
          warehouse_id: data.warehouse_id || null,
          preferred_language: data.preferred_language || 'ar'
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // Update role if not viewer
      if (data.role !== 'viewer') {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: data.role })
          .eq('user_id', authData.user.id);
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({ title: t.userAdded });
      setIsAddUserDialogOpen(false);
      setNewUserForm({ username: '', password: '', full_name: '', full_name_ar: '', phone: '', branch_id: '', warehouse_id: '', role: 'viewer', preferred_language: 'ar' });
    },
    onError: (error: any) => {
      toast({ title: error.message || (language === 'ar' ? 'خطأ في إضافة المستخدم' : 'Error adding user'), variant: 'destructive' });
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
    const customRole = customRoles.find(r => r.name === role);
    if (customRole) {
      return {
        icon: getIconComponent(customRole.icon),
        color: `text-[${customRole.color}]`,
        bgColor: `bg-[${customRole.color}]/10`,
        borderColor: `border-[${customRole.color}]/30`,
        gradient: `from-[${customRole.color}]/20 to-[${customRole.color}]/5`,
        rawColor: customRole.color
      };
    }
    
    const configs = {
      admin: { icon: Crown, color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', gradient: 'from-amber-500/20 to-amber-500/5', rawColor: '#f59e0b' },
      moderator: { icon: Shield, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', gradient: 'from-blue-500/20 to-blue-500/5', rawColor: '#3b82f6' },
      cashier: { icon: ShoppingCart, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', gradient: 'from-emerald-500/20 to-emerald-500/5', rawColor: '#10b981' },
      viewer: { icon: Eye, color: 'text-slate-500', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', gradient: 'from-slate-500/20 to-slate-500/5', rawColor: '#64748b' }
    };
    return configs[role] || configs.viewer;
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Shield, Crown, Eye, ShoppingCart, User, Users, Key, Lock,
      Package, TrendingUp, FileText, Wallet, Briefcase, Home, Settings: SettingsIcon
    };
    return icons[iconName] || Shield;
  };

  const getModuleIcon = (module: string) => {
    const icons: Record<string, any> = {
      dashboard: Home, inventory: Package, pos: ShoppingCart, sales: TrendingUp,
      purchasing: Briefcase, crm: Users, hr: UserCheck, finance: Wallet,
      reports: FileText, settings: SettingsIcon
    };
    return icons[module] || Layers;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      view: { en: 'View', ar: 'عرض' },
      create: { en: 'Create', ar: 'إنشاء' },
      edit: { en: 'Edit', ar: 'تعديل' },
      delete: { en: 'Delete', ar: 'حذف' },
      export: { en: 'Export', ar: 'تصدير' },
      import: { en: 'Import', ar: 'استيراد' },
      approve: { en: 'Approve', ar: 'موافقة' }
    };
    return language === 'ar' ? labels[action]?.ar || action : labels[action]?.en || action;
  };

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      full_name_ar: user.full_name_ar || '',
      phone: user.phone || '',
      email: user.email || '',
      username: user.username || '',
      is_active: user.is_active ?? true,
      branch_id: user.branch_id || '',
      warehouse_id: user.warehouse_id || '',
      role: getUserRole(user.id),
      preferred_language: (user.preferred_language as 'ar' | 'en') || 'ar',
      new_password: ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;
    
    // Update profile data
    updateUserMutation.mutate({
      userId: selectedUser.id,
      data: {
        full_name: editForm.full_name,
        full_name_ar: editForm.full_name_ar || null,
        phone: editForm.phone || null,
        username: editForm.username || null,
        is_active: editForm.is_active,
        branch_id: editForm.branch_id || null,
        warehouse_id: editForm.warehouse_id || null,
        preferred_language: editForm.preferred_language
      }
    });
    
    // Update role if changed
    if (editForm.role !== getUserRole(selectedUser.id)) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: editForm.role });
    }
    
    // Update password if provided
    if (editForm.new_password && editForm.new_password.length >= 6) {
      updatePasswordMutation.mutate({ userId: selectedUser.id, newPassword: editForm.new_password });
    }
  };

  const handleEditRole = (role: CustomRole) => {
    setSelectedRole(role);
    setEditRoleForm({
      name: role.name,
      name_ar: role.name_ar || '',
      description: role.description || '',
      description_ar: role.description_ar || '',
      color: role.color,
      icon: role.icon
    });
    setIsEditRoleDialogOpen(true);
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

  const getWarehouseName = (warehouseId: string | null) => {
    if (!warehouseId) return t.allWarehouses;
    const wh = warehouses.find(w => w.id === warehouseId);
    if (!wh) return '-';
    return language === 'ar' ? wh.name_ar || wh.name : wh.name;
  };

  // Filter users
  const filteredProfiles = profiles.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name_ar?.includes(searchQuery) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
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

  const hasPendingChanges = Object.keys(pendingPermissionChanges).length > 0;

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
      <Card className="card-elevated hover:shadow-lg transition-all overflow-hidden">
        <div className="h-2" style={{ background: `linear-gradient(to right, ${roleConfig.rawColor}33, ${roleConfig.rawColor}11)` }} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2 border-background shadow-md">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback style={{ backgroundColor: `${roleConfig.rawColor}20`, color: roleConfig.rawColor }} className="font-semibold">
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
              {user.username && (
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" style={{ backgroundColor: `${roleConfig.rawColor}15`, color: roleConfig.rawColor, borderColor: `${roleConfig.rawColor}40` }} className="text-xs">
                  <RoleIcon size={12} className="me-1" />
                  {t[role] || role}
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
              <Button size="sm" className="gap-2" onClick={() => setIsAddUserDialogOpen(true)}>
                <Plus size={16} />
                {t.addUser}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t.totalUsers} value={totalUsers} icon={Users} color="bg-primary/10 text-primary" />
        <StatCard label={t.activeUsers} value={activeUsers} icon={UserCheck} color="bg-accent/10 text-accent" />
        <StatCard label={t.inactiveUsers} value={inactiveUsers} icon={UserX} color="bg-muted text-muted-foreground" />
        <StatCard label={t.recentlyAdded} value={recentUsers} icon={Calendar} color="bg-warning/10 text-warning" trend={language === 'ar' ? 'هذا الأسبوع' : 'This week'} />
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
            {hasPendingChanges && <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">!</Badge>}
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
                  <Input placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9 bg-background" />
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
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode('grid')}>
                    <LayoutGrid size={14} />
                  </Button>
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode('list')}>
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
                        <TableHead>{t.username}</TableHead>
                        <TableHead>{t.role}</TableHead>
                        <TableHead>{t.branch}</TableHead>
                        <TableHead>{t.warehouse}</TableHead>
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
                                  <AvatarFallback style={{ backgroundColor: `${roleConfig.rawColor}20`, color: roleConfig.rawColor }} className="text-xs font-semibold">
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
                            <TableCell className="text-muted-foreground">
                              {user.username ? `@${user.username}` : user.email || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" style={{ backgroundColor: `${roleConfig.rawColor}15`, color: roleConfig.rawColor, borderColor: `${roleConfig.rawColor}40` }}>
                                <RoleIcon size={12} className="me-1" />
                                {t[role] || role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Building2 size={14} className="text-muted-foreground" />
                                {getBranchName(user.branch_id)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Warehouse size={14} className="text-muted-foreground" />
                                {getWarehouseName(user.warehouse_id)}
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
        <TabsContent value="roles" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddRoleDialogOpen(true)} className="gap-2">
              <Plus size={16} />
              {t.addRole}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customRoles.map((role) => {
              const RoleIcon = getIconComponent(role.icon);
              const count = profiles.filter(p => getUserRole(p.id) === role.name).length;
              const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;

              return (
                <Card key={role.id} className="card-elevated overflow-hidden">
                  <div className="h-1" style={{ background: `linear-gradient(to right, ${role.color}33, ${role.color}11)` }} />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl" style={{ backgroundColor: `${role.color}15` }}>
                        <RoleIcon style={{ color: role.color }} size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">
                            {language === 'ar' ? role.name_ar || role.name : role.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-lg px-3">{count}</Badge>
                            {!role.is_system && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditRole(role)}>
                                  <Edit size={14} />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteRoleMutation.mutate(role.id)}>
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {language === 'ar' ? role.description_ar || role.description : role.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {role.is_system ? (
                            <Badge variant="outline" className="text-xs">{t.systemRole}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t.customRole}</Badge>
                          )}
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{language === 'ar' ? 'نسبة المستخدمين' : 'User percentage'}</span>
                            <span>{percentage.toFixed(0)}%</span>
                          </div>
                          <Progress value={percentage} className="h-1.5" style={{ '--progress-color': role.color } as any} />
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key size={20} className="text-primary" />
                    {t.permissions}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تعديل الصلاحيات التفصيلية لكل دور' : 'Edit detailed permissions for each role'}
                  </CardDescription>
                </div>
                {hasPendingChanges && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-warning border-warning">
                      {t.unsavedChanges}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setPendingPermissionChanges({})}>
                      {t.discardChanges}
                    </Button>
                    <Button size="sm" onClick={() => savePermissionsMutation.mutate()} disabled={savePermissionsMutation.isPending}>
                      <Save size={14} className="me-1" />
                      {t.savePermissions}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[250px]">{t.module}</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Crown size={14} className="text-amber-500" />
                          {t.admin}
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Shield size={14} className="text-blue-500" />
                          {t.moderator}
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ShoppingCart size={14} className="text-emerald-500" />
                          {t.cashier}
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye size={14} className="text-slate-500" />
                          {t.viewer}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                      const ModuleIcon = getModuleIcon(module);
                      const isExpanded = expandedModules.includes(module);
                      const moduleName = language === 'ar' ? modulePermissions[0]?.module_ar : module;

                      return (
                        <React.Fragment key={module}>
                          <TableRow 
                            className="bg-muted/10 cursor-pointer hover:bg-muted/30"
                            onClick={() => setExpandedModules(prev => 
                              prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]
                            )}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <ModuleIcon size={16} className="text-primary" />
                                <span className="font-semibold">{moduleName}</span>
                                <Badge variant="secondary" className="text-xs">{modulePermissions.length}</Badge>
                              </div>
                            </TableCell>
                            {(['admin', 'moderator', 'cashier', 'viewer'] as AppRole[]).map((role) => {
                              const hasAll = modulePermissions.every(p => hasRolePermission(role, p.id));
                              const hasSome = modulePermissions.some(p => hasRolePermission(role, p.id));
                              return (
                                <TableCell key={role} className="text-center">
                                  {hasAll ? (
                                    <CheckCircle2 size={16} className="mx-auto text-accent" />
                                  ) : hasSome ? (
                                    <div className="mx-auto w-4 h-4 rounded-full border-2 border-accent bg-accent/30" />
                                  ) : (
                                    <XCircle size={16} className="mx-auto text-muted-foreground/30" />
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                          {isExpanded && modulePermissions.map((permission) => (
                            <TableRow key={permission.id} className="hover:bg-muted/20">
                              <TableCell className="ps-12">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{getActionLabel(permission.action)}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({language === 'ar' ? permission.description_ar : permission.description})
                                  </span>
                                </div>
                              </TableCell>
                              {(['admin', 'moderator', 'cashier', 'viewer'] as AppRole[]).map((role) => {
                                const checked = hasRolePermission(role, permission.id);
                                const isChanged = pendingPermissionChanges.hasOwnProperty(`${role}-${permission.id}`);
                                return (
                                  <TableCell key={role} className="text-center">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => togglePermission(role, permission.id)}
                                      disabled={role === 'admin'}
                                      className={isChanged ? 'border-warning' : ''}
                                    />
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </React.Fragment>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.editUser}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.userName}</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t.userNameAr}</Label>
                <Input value={editForm.full_name_ar} onChange={(e) => setEditForm(prev => ({ ...prev, full_name_ar: e.target.value }))} dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.username}</Label>
                <Input value={editForm.username} onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))} placeholder="username" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input value={editForm.email} disabled className="bg-muted" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.phone}</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'كلمة مرور جديدة' : 'New Password'}</Label>
                <Input 
                  type="password" 
                  value={editForm.new_password} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, new_password: e.target.value }))} 
                  placeholder={language === 'ar' ? 'اتركها فارغة للإبقاء على الحالية' : 'Leave empty to keep current'}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.role}</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm(prev => ({ ...prev, role: v as AppRole }))}>
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
                <Select value={editForm.branch_id || 'all'} onValueChange={(v) => setEditForm(prev => ({ ...prev, branch_id: v === 'all' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectBranch} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBranches}</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.warehouse}</Label>
              <Select value={editForm.warehouse_id || 'all'} onValueChange={(v) => setEditForm(prev => ({ ...prev, warehouse_id: v === 'all' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectWarehouse} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allWarehouses}</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {language === 'ar' ? wh.name_ar || wh.name : wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اللغة الافتراضية' : 'Default Language'}</Label>
                <Select value={editForm.preferred_language} onValueChange={(v: 'ar' | 'en') => setEditForm(prev => ({ ...prev, preferred_language: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية 🇾🇪</SelectItem>
                    <SelectItem value="en">English 🇺🇸</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm(prev => ({ ...prev, is_active: v }))} />
                <Label>{editForm.is_active ? t.active : t.inactive}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleSaveUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? '...' : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User size={20} />
              {t.addUser}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Lock size={14} />
                {t.createUserNote}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.username} *</Label>
                <Input 
                  value={newUserForm.username} 
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, username: e.target.value }))} 
                  placeholder="username"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.password} *</Label>
                <Input 
                  type="password"
                  value={newUserForm.password} 
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))} 
                  placeholder="••••••"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.userName}</Label>
                <Input 
                  value={newUserForm.full_name} 
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.userNameAr}</Label>
                <Input 
                  value={newUserForm.full_name_ar} 
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name_ar: e.target.value }))} 
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.phone}</Label>
              <Input 
                value={newUserForm.phone} 
                onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))} 
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.role}</Label>
                <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm(prev => ({ ...prev, role: v as AppRole }))}>
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
                <Select value={newUserForm.branch_id || 'all'} onValueChange={(v) => setNewUserForm(prev => ({ ...prev, branch_id: v === 'all' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectBranch} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBranches}</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.warehouse}</Label>
              <Select value={newUserForm.warehouse_id || 'all'} onValueChange={(v) => setNewUserForm(prev => ({ ...prev, warehouse_id: v === 'all' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectWarehouse} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allWarehouses}</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {language === 'ar' ? wh.name_ar || wh.name : wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اللغة الافتراضية' : 'Default Language'}</Label>
              <Select value={newUserForm.preferred_language} onValueChange={(v: 'ar' | 'en') => setNewUserForm(prev => ({ ...prev, preferred_language: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية 🇾🇪</SelectItem>
                  <SelectItem value="en">English 🇺🇸</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>{t.cancel}</Button>
            <Button 
              onClick={() => addUserMutation.mutate(newUserForm)} 
              disabled={addUserMutation.isPending || !newUserForm.username || !newUserForm.password}
            >
              {addUserMutation.isPending ? '...' : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={20} />
              {t.addRole}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.roleName} *</Label>
                <Input 
                  value={newRoleForm.name} 
                  onChange={(e) => setNewRoleForm(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="sales_manager"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.roleNameAr}</Label>
                <Input 
                  value={newRoleForm.name_ar} 
                  onChange={(e) => setNewRoleForm(prev => ({ ...prev, name_ar: e.target.value }))} 
                  placeholder="مدير المبيعات"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.roleDescription}</Label>
                <Input 
                  value={newRoleForm.description} 
                  onChange={(e) => setNewRoleForm(prev => ({ ...prev, description: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.roleDescriptionAr}</Label>
                <Input 
                  value={newRoleForm.description_ar} 
                  onChange={(e) => setNewRoleForm(prev => ({ ...prev, description_ar: e.target.value }))} 
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette size={14} />
                  {t.roleColor}
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${newRoleForm.color === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewRoleForm(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.roleIcon}</Label>
                <Select value={newRoleForm.icon} onValueChange={(v) => setNewRoleForm(prev => ({ ...prev, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon) => {
                      const IconComp = getIconComponent(icon);
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            <IconComp size={16} />
                            {icon}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoleDialogOpen(false)}>{t.cancel}</Button>
            <Button 
              onClick={() => addRoleMutation.mutate(newRoleForm)} 
              disabled={addRoleMutation.isPending || !newRoleForm.name}
            >
              {addRoleMutation.isPending ? '...' : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={20} />
              {t.editRole}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.roleName} *</Label>
                <Input 
                  value={editRoleForm.name} 
                  onChange={(e) => setEditRoleForm(prev => ({ ...prev, name: e.target.value }))} 
                  disabled={selectedRole?.is_system}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.roleNameAr}</Label>
                <Input 
                  value={editRoleForm.name_ar} 
                  onChange={(e) => setEditRoleForm(prev => ({ ...prev, name_ar: e.target.value }))} 
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.roleDescription}</Label>
                <Input 
                  value={editRoleForm.description} 
                  onChange={(e) => setEditRoleForm(prev => ({ ...prev, description: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.roleDescriptionAr}</Label>
                <Input 
                  value={editRoleForm.description_ar} 
                  onChange={(e) => setEditRoleForm(prev => ({ ...prev, description_ar: e.target.value }))} 
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette size={14} />
                  {t.roleColor}
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${editRoleForm.color === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditRoleForm(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.roleIcon}</Label>
                <Select value={editRoleForm.icon} onValueChange={(v) => setEditRoleForm(prev => ({ ...prev, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((icon) => {
                      const IconComp = getIconComponent(icon);
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            <IconComp size={16} />
                            {icon}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRoleDialogOpen(false)}>{t.cancel}</Button>
            <Button 
              onClick={() => selectedRole && updateCustomRoleMutation.mutate({ roleId: selectedRole.id, data: editRoleForm })} 
              disabled={updateCustomRoleMutation.isPending || !editRoleForm.name}
            >
              {updateCustomRoleMutation.isPending ? '...' : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPermissions;
