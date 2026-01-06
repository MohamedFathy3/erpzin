import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Trash2, Palette, Ruler } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useSizes,
  useColors,
  useAddSize,
  useAddColor,
  useDeleteSize,
  useDeleteColor,
} from '@/hooks/useVariantData';

const SizeColorManager: React.FC = () => {
  const { language } = useLanguage();
  const { data: sizes = [], isLoading: sizesLoading } = useSizes();
  const { data: colors = [], isLoading: colorsLoading } = useColors();
  
  const addSize = useAddSize();
  const addColor = useAddColor();
  const deleteSize = useDeleteSize();
  const deleteColor = useDeleteColor();
  
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  
  const [newSize, setNewSize] = useState({ name: '', name_ar: '', code: '', sort_order: 0 });
  const [newColor, setNewColor] = useState({ name: '', name_ar: '', code: '', hex_code: '#000000' });

  const handleAddSize = async () => {
    if (!newSize.name || !newSize.code) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    
    try {
      await addSize.mutateAsync({
        name: newSize.name,
        name_ar: newSize.name_ar || null,
        code: newSize.code.toUpperCase(),
        sort_order: newSize.sort_order,
        is_active: true
      });
      toast.success(language === 'ar' ? 'تم إضافة المقاس بنجاح' : 'Size added successfully');
      setNewSize({ name: '', name_ar: '', code: '', sort_order: 0 });
      setSizeDialogOpen(false);
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ أثناء إضافة المقاس' : 'Error adding size');
    }
  };

  const handleAddColor = async () => {
    if (!newColor.name || !newColor.code) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    
    try {
      await addColor.mutateAsync({
        name: newColor.name,
        name_ar: newColor.name_ar || null,
        code: newColor.code.toUpperCase(),
        hex_code: newColor.hex_code,
        is_active: true
      });
      toast.success(language === 'ar' ? 'تم إضافة اللون بنجاح' : 'Color added successfully');
      setNewColor({ name: '', name_ar: '', code: '', hex_code: '#000000' });
      setColorDialogOpen(false);
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ أثناء إضافة اللون' : 'Error adding color');
    }
  };

  const handleDeleteSize = async (id: string) => {
    try {
      await deleteSize.mutateAsync(id);
      toast.success(language === 'ar' ? 'تم حذف المقاس' : 'Size deleted');
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting');
    }
  };

  const handleDeleteColor = async (id: string) => {
    try {
      await deleteColor.mutateAsync(id);
      toast.success(language === 'ar' ? 'تم حذف اللون' : 'Color deleted');
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting');
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="sizes" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="sizes" className="flex items-center gap-2">
            <Ruler size={16} />
            {language === 'ar' ? 'المقاسات' : 'Sizes'}
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette size={16} />
            {language === 'ar' ? 'الألوان' : 'Colors'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sizes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ruler size={20} />
                {language === 'ar' ? 'إدارة المقاسات' : 'Size Management'}
              </CardTitle>
              <Dialog open={sizeDialogOpen} onOpenChange={setSizeDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus size={16} />
                    {language === 'ar' ? 'إضافة مقاس' : 'Add Size'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {language === 'ar' ? 'إضافة مقاس جديد' : 'Add New Size'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                        <Input
                          value={newSize.name}
                          onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
                          placeholder="Medium"
                        />
                      </div>
                      <div>
                        <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                        <Input
                          value={newSize.name_ar}
                          onChange={(e) => setNewSize({ ...newSize, name_ar: e.target.value })}
                          placeholder="وسط"
                          dir="rtl"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{language === 'ar' ? 'الرمز' : 'Code'}</Label>
                        <Input
                          value={newSize.code}
                          onChange={(e) => setNewSize({ ...newSize, code: e.target.value })}
                          placeholder="M"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label>{language === 'ar' ? 'الترتيب' : 'Sort Order'}</Label>
                        <Input
                          type="number"
                          value={newSize.sort_order}
                          onChange={(e) => setNewSize({ ...newSize, sort_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddSize} className="w-full" disabled={addSize.isPending}>
                      {addSize.isPending 
                        ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...')
                        : (language === 'ar' ? 'إضافة' : 'Add')
                      }
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {sizesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {sizes.map((size) => (
                    <div
                      key={size.id}
                      className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border border-border group"
                    >
                      <Badge variant="outline" className="font-mono">
                        {size.code}
                      </Badge>
                      <span className="font-medium">
                        {language === 'ar' ? size.name_ar || size.name : size.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSize(size.id)}
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

        <TabsContent value="colors" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Palette size={20} />
                {language === 'ar' ? 'إدارة الألوان' : 'Color Management'}
              </CardTitle>
              <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus size={16} />
                    {language === 'ar' ? 'إضافة لون' : 'Add Color'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {language === 'ar' ? 'إضافة لون جديد' : 'Add New Color'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                        <Input
                          value={newColor.name}
                          onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                          placeholder="Blue"
                        />
                      </div>
                      <div>
                        <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                        <Input
                          value={newColor.name_ar}
                          onChange={(e) => setNewColor({ ...newColor, name_ar: e.target.value })}
                          placeholder="أزرق"
                          dir="rtl"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{language === 'ar' ? 'الرمز' : 'Code'}</Label>
                        <Input
                          value={newColor.code}
                          onChange={(e) => setNewColor({ ...newColor, code: e.target.value })}
                          placeholder="BLU"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label>{language === 'ar' ? 'اللون' : 'Color'}</Label>
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
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleAddColor} className="w-full" disabled={addColor.isPending}>
                      {addColor.isPending 
                        ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...')
                        : (language === 'ar' ? 'إضافة' : 'Add')
                      }
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {colorsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => (
                    <div
                      key={color.id}
                      className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg border border-border group"
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-border"
                        style={{ backgroundColor: color.hex_code || '#000' }}
                      />
                      <Badge variant="outline" className="font-mono">
                        {color.code}
                      </Badge>
                      <span className="font-medium">
                        {language === 'ar' ? color.name_ar || color.name : color.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleDeleteColor(color.id)}
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
    </div>
  );
};

export default SizeColorManager;
