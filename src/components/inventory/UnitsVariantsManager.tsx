import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Trash2, Layers, Ruler, Pencil, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Unit {
  id: number;
  name: string;
  type_unit: string;
  code: string;
  position: string;
  createdAt: string;
  updatedAt: string;
}

interface Color {
  id: number;
  name: string;
  code: string;
  hex_code: string;
  createdAt: string;
  updatedAt: string;
}

// Custom hooks for units
const useUnits = () => {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      try {
        const response = await api.post('/unit/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching units:', error);
        toast.error('Error fetching units');
        return [];
      }
    }
  });
};

const useAddUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code: string; type_unit?: string; position?: string }) => {
      const response = await api.post('/unit', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    }
  });
};

const useUpdateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string; code: string; type_unit?: string; position?: string }) => {
      const response = await api.put(`/unit/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    }
  });
};

const useDeleteUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/unit/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    }
  });
};

// Custom hooks for colors
const useColors = () => {
  return useQuery({
    queryKey: ['colors'],
    queryFn: async () => {
      try {
        const response = await api.post('/color/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching colors:', error);
        toast.error('Error fetching colors');
        return [];
      }
    }
  });
};

const useAddColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code: string; hex_code?: string }) => {
      const response = await api.post('/color', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    }
  });
};

const useUpdateColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string; code: string; hex_code?: string }) => {
      const response = await api.put(`/color/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    }
  });
};

const useDeleteColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/color/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    }
  });
};

const UnitsVariantsManager: React.FC = () => {
  const { language } = useLanguage();
  const { data: units = [], isLoading: unitsLoading, refetch: refetchUnits } = useUnits();
  const { data: colors = [], isLoading: colorsLoading, refetch: refetchColors } = useColors();
  
  const addUnit = useAddUnit();
  const addColor = useAddColor();
  const updateUnit = useUpdateUnit();
  const updateColor = useUpdateColor();
  const deleteUnit = useDeleteUnit();
  const deleteColor = useDeleteColor();
  
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  
  const [newUnit, setNewUnit] = useState({ 
    name: '', 
    name_ar: '', 
    code: '', 
    position: '1', 
    type_unit: 'size' 
  });
  const [newColor, setNewColor] = useState({ 
    name: '', 
    name_ar: '', 
    code: '', 
    hex_code: '#3B82F6' 
  });

  const resetUnitForm = () => {
    setNewUnit({ 
      name: '', 
      name_ar: '', 
      code: '', 
      position: '1', 
      type_unit: 'size' 
    });
    setEditingUnit(null);
  };

  const resetColorForm = () => {
    setNewColor({ 
      name: '', 
      name_ar: '', 
      code: '', 
      hex_code: '#3B82F6' 
    });
    setEditingColor(null);
  };

  const openUnitDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setNewUnit({
        name: unit.name,
        name_ar: unit.name,
        code: unit.code,
        position: unit.position || '1',
        type_unit: unit.type_unit || 'size'
      });
    } else {
      resetUnitForm();
    }
    setUnitDialogOpen(true);
  };

  const openColorDialog = (color?: Color) => {
    if (color) {
      setEditingColor(color);
      setNewColor({
        name: color.name,
        name_ar: color.name,
        code: color.code,
        hex_code: color.hex_code || '#3B82F6'
      });
    } else {
      resetColorForm();
    }
    setColorDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!newUnit.name.trim() || !newUnit.code.trim()) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    
    try {
      const unitData = {
        name: newUnit.name.trim(),
        code: newUnit.code.trim().toUpperCase(),
        type_unit: newUnit.type_unit,
        position: newUnit.position
      };

      if (editingUnit) {
        await updateUnit.mutateAsync({
          id: editingUnit.id,
          ...unitData
        });
        toast.success(language === 'ar' ? 'تم تحديث الوحدة بنجاح' : 'Unit updated successfully');
      } else {
        await addUnit.mutateAsync(unitData);
        toast.success(language === 'ar' ? 'تم إضافة الوحدة بنجاح' : 'Unit added successfully');
      }
      
      resetUnitForm();
      setUnitDialogOpen(false);
      refetchUnits();
    } catch (error: any) {
      console.error('Error saving unit:', error);
      const errorMessage = error.response?.data?.message || 
        (language === 'ar' ? 'حدث خطأ أثناء حفظ الوحدة' : 'Error saving unit');
      toast.error(errorMessage);
    }
  };

  const handleSaveColor = async () => {
    if (!newColor.name.trim() || !newColor.code.trim()) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    
    try {
      const colorData = {
        name: newColor.name.trim(),
        code: newColor.code.trim().toUpperCase(),
        hex_code: newColor.hex_code
      };

      if (editingColor) {
        await updateColor.mutateAsync({
          id: editingColor.id,
          ...colorData
        });
        toast.success(language === 'ar' ? 'تم تحديث اللون بنجاح' : 'Color updated successfully');
      } else {
        await addColor.mutateAsync(colorData);
        toast.success(language === 'ar' ? 'تم إضافة اللون بنجاح' : 'Color added successfully');
      }
      
      resetColorForm();
      setColorDialogOpen(false);
      refetchColors();
    } catch (error: any) {
      console.error('Error saving color:', error);
      const errorMessage = error.response?.data?.message || 
        (language === 'ar' ? 'حدث خطأ أثناء حفظ اللون' : 'Error saving color');
      toast.error(errorMessage);
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الوحدة؟' : 'Are you sure you want to delete this unit?')) {
      try {
        await deleteUnit.mutateAsync(id);
        toast.success(language === 'ar' ? 'تم حذف الوحدة' : 'Unit deleted');
        refetchUnits();
      } catch (error: any) {
        console.error('Error deleting unit:', error);
        const errorMessage = error.response?.data?.message || 
          (language === 'ar' ? 'حدث خطأ أثناء حذف الوحدة' : 'Error deleting unit');
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteColor = async (id: number) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا اللون؟' : 'Are you sure you want to delete this color?')) {
      try {
        await deleteColor.mutateAsync(id);
        toast.success(language === 'ar' ? 'تم حذف اللون' : 'Color deleted');
        refetchColors();
      } catch (error: any) {
        console.error('Error deleting color:', error);
        const errorMessage = error.response?.data?.message || 
          (language === 'ar' ? 'حدث خطأ أثناء حذف اللون' : 'Error deleting color');
        toast.error(errorMessage);
      }
    }
  };

  const unitTypes = [
    { value: 'size', label: 'Size', labelAr: 'مقاس' },
    { value: 'weight', label: 'Weight', labelAr: 'وزن' },
    { value: 'volume', label: 'Volume', labelAr: 'حجم' },
    { value: 'length', label: 'Length', labelAr: 'طول' },
    { value: 'quantity', label: 'Quantity', labelAr: 'كمية' },
    { value: 'code', label: 'Code', labelAr: 'كود' },
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="units" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Scale size={16} />
            {language === 'ar' ? 'الوحدات' : 'Units'}
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Layers size={16} />
            {language === 'ar' ? 'الألوان' : 'Colors'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale size={20} />
                {language === 'ar' ? 'إدارة الوحدات' : 'Units Management'}
              </CardTitle>
              <Button size="sm" className="gap-2" onClick={() => openUnitDialog()}>
                <Plus size={16} />
                {language === 'ar' ? 'إضافة وحدة' : 'Add Unit'}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'ar' 
                  ? 'أضف وحدات مختلفة مثل: المقاسات (S, M, L, XL)، الأوزان (كجم، جرام)، الأحجام (لتر، مل)، وغيرها' 
                  : 'Add different units like: Sizes (S, M, L, XL), Weights (kg, g), Volumes (L, ml), and more'}
              </p>
              
              {unitsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : units.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد وحدات. أضف وحدة جديدة للبدء.' : 'No units. Add a new unit to get started.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-4 bg-card rounded-lg border border-border group hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono bg-primary/10">
                              {unit.code}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {unit.type_unit}
                            </Badge>
                          </div>
                          <span className="font-medium mt-1">
                            {unit.name}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {language === 'ar' ? 'الترتيب:' : 'Order:'} {unit.position}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openUnitDialog(unit)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteUnit(unit.id)}
                          disabled={deleteUnit.isPending}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers size={20} />
                {language === 'ar' ? 'إدارة الألوان' : 'Colors Management'}
              </CardTitle>
              <Button size="sm" className="gap-2" onClick={() => openColorDialog()}>
                <Plus size={16} />
                {language === 'ar' ? 'إضافة لون' : 'Add Color'}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'ar' 
                  ? 'أضف ألوان مختلفة للمنتجات والمواد' 
                  : 'Add different colors for products and materials'}
              </p>
              
              {colorsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : colors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد ألوان. أضف لون جديد للبدء.' : 'No colors. Add a new color to get started.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {colors.map((color) => (
                    <div
                      key={color.id}
                      className="flex items-center justify-between p-4 bg-card rounded-lg border border-border group hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full border-2 border-border shadow-sm"
                          style={{ backgroundColor: color.hex_code || '#3B82F6' }}
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {color.code}
                            </Badge>
                          </div>
                          <span className="font-medium mt-1">
                            {color.name}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1 font-mono">
                            {color.hex_code}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openColorDialog(color)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteColor(color.id)}
                          disabled={deleteColor.isPending}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={(open) => { 
        setUnitDialogOpen(open); 
        if (!open) resetUnitForm(); 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUnit 
                ? (language === 'ar' ? 'تعديل الوحدة' : 'Edit Unit')
                : (language === 'ar' ? 'إضافة وحدة جديدة' : 'Add New Unit')
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}</Label>
              <Select 
                value={newUnit.type_unit} 
                onValueChange={(value) => setNewUnit({ ...newUnit, type_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {language === 'ar' ? type.labelAr : type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>{language === 'ar' ? 'اسم الوحدة' : 'Unit Name'} *</Label>
              <Input
                value={newUnit.name}
                onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                placeholder={language === 'ar' ? 'مثل: وسط، 500 جرام، 1 لتر...' : 'e.g., Medium, 500g, 1L...'}
              />
            </div>
            
            <div>
              <Label>{language === 'ar' ? 'كود الوحدة' : 'Unit Code'} *</Label>
              <Input
                value={newUnit.code}
                onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                placeholder={language === 'ar' ? 'مثل: M، 500G، 1L...' : 'e.g., M, 500G, 1L...'}
                maxLength={10}
              />
            </div>
            
            <div>
              <Label>{language === 'ar' ? 'الترتيب' : 'Position'}</Label>
              <Input
                type="number"
                min="1"
                value={newUnit.position}
                onChange={(e) => setNewUnit({ ...newUnit, position: e.target.value })}
                placeholder="1"
              />
            </div>
            
            <Button 
              onClick={handleSaveUnit} 
              className="w-full" 
              disabled={addUnit.isPending || updateUnit.isPending}
            >
              {(addUnit.isPending || updateUnit.isPending)
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Color Dialog */}
      <Dialog open={colorDialogOpen} onOpenChange={(open) => { 
        setColorDialogOpen(open); 
        if (!open) resetColorForm(); 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingColor 
                ? (language === 'ar' ? 'تعديل اللون' : 'Edit Color')
                : (language === 'ar' ? 'إضافة لون جديد' : 'Add New Color')
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{language === 'ar' ? 'اسم اللون' : 'Color Name'} *</Label>
              <Input
                value={newColor.name}
                onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                placeholder={language === 'ar' ? 'مثل: أزرق، أحمر، أخضر...' : 'e.g., Blue, Red, Green...'}
              />
            </div>
            
            <div>
              <Label>{language === 'ar' ? 'كود اللون' : 'Color Code'} *</Label>
              <Input
                value={newColor.code}
                onChange={(e) => setNewColor({ ...newColor, code: e.target.value })}
                placeholder={language === 'ar' ? 'مثل: BLU، RED، GRN...' : 'e.g., BLU, RED, GRN...'}
                maxLength={10}
              />
            </div>
            
            <div>
              <Label>{language === 'ar' ? 'اللون التمييزي' : 'Display Color'}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={newColor.hex_code}
                  onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={newColor.hex_code}
                  onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                  placeholder="#3B82F6"
                  className="font-mono flex-1"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSaveColor} 
              className="w-full" 
              disabled={addColor.isPending || updateColor.isPending}
            >
              {(addColor.isPending || updateColor.isPending)
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnitsVariantsManager;