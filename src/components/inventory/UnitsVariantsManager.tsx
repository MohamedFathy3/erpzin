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
import {
  useSizes,
  useColors,
  useAddSize,
  useAddColor,
  useUpdateSize,
  useUpdateColor,
  useDeleteSize,
  useDeleteColor,
  Size,
  Color,
} from '@/hooks/useVariantData';

// Unit types for categorization
const unitTypes = [
  { value: 'size', label: 'Size', labelAr: 'مقاس' },
  { value: 'weight', label: 'Weight', labelAr: 'وزن' },
  { value: 'volume', label: 'Volume', labelAr: 'حجم' },
  { value: 'length', label: 'Length', labelAr: 'طول' },
  { value: 'quantity', label: 'Quantity', labelAr: 'كمية' },
  { value: 'custom', label: 'Custom', labelAr: 'مخصص' },
];

const UnitsVariantsManager: React.FC = () => {
  const { language } = useLanguage();
  const { data: units = [], isLoading: unitsLoading } = useSizes();
  const { data: variants = [], isLoading: variantsLoading } = useColors();
  
  const addUnit = useAddSize();
  const addVariant = useAddColor();
  const updateUnit = useUpdateSize();
  const updateVariant = useUpdateColor();
  const deleteUnit = useDeleteSize();
  const deleteVariant = useDeleteColor();
  
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Size | null>(null);
  const [editingVariant, setEditingVariant] = useState<Color | null>(null);
  
  const [newUnit, setNewUnit] = useState({ name: '', name_ar: '', code: '', sort_order: 0, unit_type: 'size' });
  const [newVariant, setNewVariant] = useState({ name: '', name_ar: '', code: '', hex_code: '#3B82F6' });

  const resetUnitForm = () => {
    setNewUnit({ name: '', name_ar: '', code: '', sort_order: 0, unit_type: 'size' });
    setEditingUnit(null);
  };

  const resetVariantForm = () => {
    setNewVariant({ name: '', name_ar: '', code: '', hex_code: '#3B82F6' });
    setEditingVariant(null);
  };

  const openUnitDialog = (unit?: Size) => {
    if (unit) {
      setEditingUnit(unit);
      setNewUnit({
        name: unit.name,
        name_ar: unit.name_ar || '',
        code: unit.code,
        sort_order: unit.sort_order || 0,
        unit_type: 'size'
      });
    } else {
      resetUnitForm();
    }
    setUnitDialogOpen(true);
  };

  const openVariantDialog = (variant?: Color) => {
    if (variant) {
      setEditingVariant(variant);
      setNewVariant({
        name: variant.name,
        name_ar: variant.name_ar || '',
        code: variant.code,
        hex_code: variant.hex_code || '#3B82F6'
      });
    } else {
      resetVariantForm();
    }
    setVariantDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!newUnit.name || !newUnit.code) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    
    try {
      if (editingUnit) {
        await updateUnit.mutateAsync({
          id: editingUnit.id,
          name: newUnit.name,
          name_ar: newUnit.name_ar || null,
          code: newUnit.code.toUpperCase(),
          sort_order: newUnit.sort_order,
        });
        toast.success(language === 'ar' ? 'تم تحديث الوحدة بنجاح' : 'Unit updated successfully');
      } else {
        await addUnit.mutateAsync({
          name: newUnit.name,
          name_ar: newUnit.name_ar || null,
          code: newUnit.code.toUpperCase(),
          sort_order: newUnit.sort_order,
          is_active: true
        });
        toast.success(language === 'ar' ? 'تم إضافة الوحدة بنجاح' : 'Unit added successfully');
      }
      resetUnitForm();
      setUnitDialogOpen(false);
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    }
  };

  const handleSaveVariant = async () => {
    if (!newVariant.name || !newVariant.code) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    
    try {
      if (editingVariant) {
        await updateVariant.mutateAsync({
          id: editingVariant.id,
          name: newVariant.name,
          name_ar: newVariant.name_ar || null,
          code: newVariant.code.toUpperCase(),
          hex_code: newVariant.hex_code,
        });
        toast.success(language === 'ar' ? 'تم تحديث المتغير بنجاح' : 'Variant updated successfully');
      } else {
        await addVariant.mutateAsync({
          name: newVariant.name,
          name_ar: newVariant.name_ar || null,
          code: newVariant.code.toUpperCase(),
          hex_code: newVariant.hex_code,
          is_active: true
        });
        toast.success(language === 'ar' ? 'تم إضافة المتغير بنجاح' : 'Variant added successfully');
      }
      resetVariantForm();
      setVariantDialogOpen(false);
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    }
  };

  const handleDeleteUnit = async (id: string) => {
    try {
      await deleteUnit.mutateAsync(id);
      toast.success(language === 'ar' ? 'تم حذف الوحدة' : 'Unit deleted');
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting');
    }
  };

  const handleDeleteVariant = async (id: string) => {
    try {
      await deleteVariant.mutateAsync(id);
      toast.success(language === 'ar' ? 'تم حذف المتغير' : 'Variant deleted');
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting');
    }
  };

  const getUnitTypeIcon = (type: string) => {
    switch (type) {
      case 'weight': return <Scale size={14} />;
      case 'length': return <Ruler size={14} />;
      default: return <Layers size={14} />;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="units" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Scale size={16} />
            {language === 'ar' ? 'الوحدات' : 'Units'}
          </TabsTrigger>
          <TabsTrigger value="variants" className="flex items-center gap-2">
            <Layers size={16} />
            {language === 'ar' ? 'المتغيرات' : 'Variants'}
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
                <div className="flex flex-wrap gap-3">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border border-border group hover:border-primary/50 transition-colors"
                    >
                      <Badge variant="outline" className="font-mono bg-primary/10">
                        {unit.code}
                      </Badge>
                      <span className="font-medium">
                        {language === 'ar' ? unit.name_ar || unit.name : unit.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openUnitDialog(unit)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleDeleteUnit(unit.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers size={20} />
                {language === 'ar' ? 'إدارة المتغيرات' : 'Variants Management'}
              </CardTitle>
              <Button size="sm" className="gap-2" onClick={() => openVariantDialog()}>
                <Plus size={16} />
                {language === 'ar' ? 'إضافة متغير' : 'Add Variant'}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'ar' 
                  ? 'أضف متغيرات مختلفة مثل: الألوان، النكهات، المواد، وأي خصائص أخرى للمنتج' 
                  : 'Add different variants like: Colors, Flavors, Materials, and any other product attributes'}
              </p>
              {variantsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : variants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد متغيرات. أضف متغير جديد للبدء.' : 'No variants. Add a new variant to get started.'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border border-border group hover:border-primary/50 transition-colors"
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-border shadow-sm"
                        style={{ backgroundColor: variant.hex_code || '#3B82F6' }}
                      />
                      <Badge variant="outline" className="font-mono">
                        {variant.code}
                      </Badge>
                      <span className="font-medium">
                        {language === 'ar' ? variant.name_ar || variant.name : variant.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openVariantDialog(variant)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleDeleteVariant(variant.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={(open) => { setUnitDialogOpen(open); if (!open) resetUnitForm(); }}>
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
              <Select value={newUnit.unit_type} onValueChange={(value) => setNewUnit({ ...newUnit, unit_type: value })}>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                <Input
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  placeholder="Medium, 500g, 1L..."
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input
                  value={newUnit.name_ar}
                  onChange={(e) => setNewUnit({ ...newUnit, name_ar: e.target.value })}
                  placeholder="وسط، 500 جرام، 1 لتر..."
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الرمز' : 'Code'}</Label>
                <Input
                  value={newUnit.code}
                  onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                  placeholder="M, 500G, 1L..."
                  maxLength={10}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الترتيب' : 'Sort Order'}</Label>
                <Input
                  type="number"
                  value={newUnit.sort_order}
                  onChange={(e) => setNewUnit({ ...newUnit, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <Button onClick={handleSaveUnit} className="w-full" disabled={addUnit.isPending || updateUnit.isPending}>
              {(addUnit.isPending || updateUnit.isPending)
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={(open) => { setVariantDialogOpen(open); if (!open) resetVariantForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariant 
                ? (language === 'ar' ? 'تعديل المتغير' : 'Edit Variant')
                : (language === 'ar' ? 'إضافة متغير جديد' : 'Add New Variant')
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                <Input
                  value={newVariant.name}
                  onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                  placeholder="Blue, Vanilla, Cotton..."
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input
                  value={newVariant.name_ar}
                  onChange={(e) => setNewVariant({ ...newVariant, name_ar: e.target.value })}
                  placeholder="أزرق، فانيليا، قطن..."
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الرمز' : 'Code'}</Label>
                <Input
                  value={newVariant.code}
                  onChange={(e) => setNewVariant({ ...newVariant, code: e.target.value })}
                  placeholder="BLU, VAN, COT..."
                  maxLength={10}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'اللون التمييزي' : 'Display Color'}</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newVariant.hex_code}
                    onChange={(e) => setNewVariant({ ...newVariant, hex_code: e.target.value })}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={newVariant.hex_code}
                    onChange={(e) => setNewVariant({ ...newVariant, hex_code: e.target.value })}
                    placeholder="#3B82F6"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleSaveVariant} className="w-full" disabled={addVariant.isPending || updateVariant.isPending}>
              {(addVariant.isPending || updateVariant.isPending)
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
