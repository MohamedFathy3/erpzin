import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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
  Settings as SettingsIcon
} from 'lucide-react';

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
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
      description: 'Manage system users and their access permissions',
      users: 'Users',
      permissions: 'Permissions',
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
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      actions: 'Actions',
      admin: 'Administrator',
      moderator: 'Moderator',
      cashier: 'Cashier',
      viewer: 'Viewer',
      adminDesc: 'Full system access',
      moderatorDesc: 'Manage inventory and sales',
      cashierDesc: 'POS operations only',
      viewerDesc: 'View-only access',
      lastActive: 'Last Active',
      createdAt: 'Created',
      noUsers: 'No users found',
      roleUpdated: 'Role updated successfully',
      userUpdated: 'User updated successfully',
      confirmDelete: 'Are you sure you want to delete this user?',
      selectBranch: 'Select Branch',
      allBranches: 'All Branches',
      permissionsMatrix: 'Permissions Matrix',
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
      settings: 'Settings'
    },
    ar: {
      title: 'المستخدمين والصلاحيات',
      description: 'إدارة مستخدمي النظام وصلاحيات الوصول',
      users: 'المستخدمين',
      permissions: 'الصلاحيات',
      addUser: 'إضافة مستخدم',
      editUser: 'تعديل مستخدم',
      userName: 'الاسم الكامل',
      userNameAr: 'الاسم الكامل (بالعربية)',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      role: 'الدور',
      branch: 'الفرع',
      status: 'الحالة',
      active: 'نشط',
      inactive: 'غير نشط',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      actions: 'الإجراءات',
      admin: 'مدير النظام',
      moderator: 'مشرف',
      cashier: 'كاشير',
      viewer: 'مشاهد',
      adminDesc: 'صلاحيات كاملة',
      moderatorDesc: 'إدارة المخزون والمبيعات',
      cashierDesc: 'عمليات نقطة البيع فقط',
      viewerDesc: 'صلاحية المشاهدة فقط',
      lastActive: 'آخر نشاط',
      createdAt: 'تاريخ الإنشاء',
      noUsers: 'لا يوجد مستخدمين',
      roleUpdated: 'تم تحديث الدور بنجاح',
      userUpdated: 'تم تحديث المستخدم بنجاح',
      confirmDelete: 'هل أنت متأكد من حذف هذا المستخدم؟',
      selectBranch: 'اختر الفرع',
      allBranches: 'جميع الفروع',
      permissionsMatrix: 'مصفوفة الصلاحيات',
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
      settings: 'الإعدادات'
    }
  };

  const t = translations[language];

  // Fetch profiles
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
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
    onError: (error) => {
      toast({ title: language === 'ar' ? 'خطأ في التحديث' : 'Update failed', variant: 'destructive' });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First check if role exists
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
    onError: (error) => {
      toast({ title: language === 'ar' ? 'خطأ في تحديث الدور' : 'Role update failed', variant: 'destructive' });
    }
  });

  const getUserRole = (userId: string): AppRole => {
    const userRole = userRoles.find(r => r.user_id === userId);
    return userRole?.role || 'viewer';
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin': return <Crown className="text-yellow-500" size={16} />;
      case 'moderator': return <Shield className="text-blue-500" size={16} />;
      case 'cashier': return <ShoppingCart className="text-green-500" size={16} />;
      case 'viewer': return <Eye className="text-gray-500" size={16} />;
    }
  };

  const getRoleBadgeClass = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'moderator': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'cashier': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'viewer': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
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

    // Update role separately
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

  // Permissions matrix data
  const modules = [
    { key: 'dashboard', icon: SettingsIcon },
    { key: 'inventory', icon: Building2 },
    { key: 'pos', icon: ShoppingCart },
    { key: 'crm', icon: Users },
    { key: 'hr', icon: UserCheck },
    { key: 'finance', icon: Key },
    { key: 'reports', icon: Eye },
    { key: 'settings', icon: Shield }
  ];

  const permissionsMatrix: Record<string, Record<AppRole, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
    dashboard: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: false, edit: false, delete: false }, cashier: { view: true, create: false, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    inventory: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: true, delete: false }, cashier: { view: true, create: false, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    pos: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: true, delete: true }, cashier: { view: true, create: true, edit: true, delete: false }, viewer: { view: false, create: false, edit: false, delete: false } },
    crm: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: true, delete: false }, cashier: { view: true, create: true, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    hr: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: false, create: false, edit: false, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: false, create: false, edit: false, delete: false } },
    finance: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: false, edit: false, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: false, create: false, edit: false, delete: false } },
    reports: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: true, create: true, edit: false, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: true, create: false, edit: false, delete: false } },
    settings: { admin: { view: true, create: true, edit: true, delete: true }, moderator: { view: false, create: false, edit: false, delete: false }, cashier: { view: false, create: false, edit: false, delete: false }, viewer: { view: false, create: false, edit: false, delete: false } }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="text-primary" size={20} />
              </div>
              <div>
                <CardTitle>{t.title}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['admin', 'moderator', 'cashier', 'viewer'] as AppRole[]).map((role) => {
          const count = profiles.filter(p => getUserRole(p.id) === role).length;
          return (
            <Card key={role} className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getRoleBadgeClass(role)}`}>
                    {getRoleIcon(role)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{t[role]}</p>
                    <p className="text-xs text-muted-foreground">{t[`${role}Desc` as keyof typeof t]}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3">
                    {count}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            {t.users}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProfiles ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.noUsers}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.userName}</TableHead>
                  <TableHead>{t.email}</TableHead>
                  <TableHead>{t.role}</TableHead>
                  <TableHead>{t.branch}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((user) => {
                  const role = getUserRole(user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
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
                        <Badge variant="outline" className={getRoleBadgeClass(role)}>
                          <span className="flex items-center gap-1">
                            {getRoleIcon(role)}
                            {t[role]}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getBranchName(user.branch_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? t.active : t.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                          <Edit size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} />
            {t.permissionsMatrix}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.module}</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Crown className="text-yellow-500" size={14} />
                      {t.admin}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Shield className="text-blue-500" size={14} />
                      {t.moderator}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ShoppingCart className="text-green-500" size={14} />
                      {t.cashier}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="text-gray-500" size={14} />
                      {t.viewer}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => {
                  const perms = permissionsMatrix[module.key];
                  const ModuleIcon = module.icon;
                  return (
                    <TableRow key={module.key}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ModuleIcon size={16} className="text-muted-foreground" />
                          {t[module.key as keyof typeof t]}
                        </div>
                      </TableCell>
                      {(['admin', 'moderator', 'cashier', 'viewer'] as AppRole[]).map((role) => (
                        <TableCell key={role} className="text-center">
                          <div className="flex justify-center gap-1">
                            {perms[role].view && <Badge variant="outline" className="text-xs px-1">V</Badge>}
                            {perms[role].create && <Badge variant="outline" className="text-xs px-1 bg-green-500/10">C</Badge>}
                            {perms[role].edit && <Badge variant="outline" className="text-xs px-1 bg-blue-500/10">E</Badge>}
                            {perms[role].delete && <Badge variant="outline" className="text-xs px-1 bg-red-500/10">D</Badge>}
                            {!perms[role].view && !perms[role].create && !perms[role].edit && !perms[role].delete && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <span><Badge variant="outline" className="text-xs px-1">V</Badge> = {t.view}</span>
            <span><Badge variant="outline" className="text-xs px-1 bg-green-500/10">C</Badge> = {t.create}</span>
            <span><Badge variant="outline" className="text-xs px-1 bg-blue-500/10">E</Badge> = {t.edit}</span>
            <span><Badge variant="outline" className="text-xs px-1 bg-red-500/10">D</Badge> = {t.delete}</span>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.editUser}</DialogTitle>
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

            <div className="space-y-2">
              <Label>{t.role}</Label>
              <Select value={editForm.role} onValueChange={(val: AppRole) => setEditForm({ ...editForm, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Crown className="text-yellow-500" size={14} />
                      {t.admin}
                    </span>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <span className="flex items-center gap-2">
                      <Shield className="text-blue-500" size={14} />
                      {t.moderator}
                    </span>
                  </SelectItem>
                  <SelectItem value="cashier">
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="text-green-500" size={14} />
                      {t.cashier}
                    </span>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <span className="flex items-center gap-2">
                      <Eye className="text-gray-500" size={14} />
                      {t.viewer}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.branch}</Label>
              <Select value={editForm.branch_id || 'all'} onValueChange={(val) => setEditForm({ ...editForm, branch_id: val === 'all' ? '' : val })}>
                <SelectTrigger>
                  <SelectValue />
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

            <div className="flex items-center justify-between">
              <Label>{t.status}</Label>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                />
                <span className="text-sm">
                  {editForm.is_active ? t.active : t.inactive}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.cancel}</Button>
            </DialogClose>
            <Button className="gradient-success" onClick={handleSaveUser}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPermissions;
