import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Printer, 
  FileText, 
  Receipt, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Eye,
  Settings,
  Layout,
  Type,
  Image,
  QrCode,
  Barcode,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Hash,
  DollarSign,
  User,
  Package,
  RefreshCw,
  Check,
  X,
  Palette,
  Monitor,
  Smartphone,
  FileBarChart
} from 'lucide-react';

// Types
interface PrinterConfig {
  id: string;
  name: string;
  name_ar: string | null;
  printer_type: 'thermal' | 'a4' | 'label';
  connection_type: 'usb' | 'network' | 'bluetooth';
  ip_address: string | null;
  port: number | null;
  paper_width: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface DocumentTemplate {
  id: string;
  document_type: string;
  template_name: string;
  template_name_ar: string | null;
  paper_size: 'thermal' | 'a4' | 'a5' | 'custom';
  orientation: 'portrait' | 'landscape';
  show_logo: boolean;
  show_company_info: boolean;
  show_qr_code: boolean;
  show_barcode: boolean;
  header_text: string | null;
  footer_text: string | null;
  font_size: number;
  is_default: boolean;
  is_active: boolean;
  printer_id: string | null;
  created_at: string;
}

interface PrinterAssignment {
  id: string;
  document_type: string;
  printer_id: string;
  copies: number;
  auto_print: boolean;
  created_at: string;
}

const PrintingSettings = () => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('printers');
  const [isAddPrinterOpen, setIsAddPrinterOpen] = useState(false);
  const [isEditPrinterOpen, setIsEditPrinterOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterConfig | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  // Form states
  const [printerForm, setPrinterForm] = useState({
    name: '',
    name_ar: '',
    printer_type: 'thermal' as 'thermal' | 'a4' | 'label',
    connection_type: 'usb' as 'usb' | 'network' | 'bluetooth',
    ip_address: '',
    port: 9100,
    paper_width: 80,
    is_default: false,
    is_active: true
  });

  const [templateForm, setTemplateForm] = useState({
    document_type: 'pos_receipt',
    template_name: '',
    template_name_ar: '',
    paper_size: 'thermal' as 'thermal' | 'a4' | 'a5' | 'custom',
    orientation: 'portrait' as 'portrait' | 'landscape',
    show_logo: true,
    show_company_info: true,
    show_qr_code: false,
    show_barcode: true,
    header_text: '',
    footer_text: '',
    font_size: 12,
    is_default: true,
    is_active: true,
    printer_id: ''
  });

  const translations = {
    en: {
      title: 'Printing & Documents',
      subtitle: 'Configure printers, invoice designs and document templates',
      printers: 'Printers',
      templates: 'Document Templates',
      assignments: 'Printer Assignments',
      addPrinter: 'Add Printer',
      editPrinter: 'Edit Printer',
      addTemplate: 'Add Template',
      editTemplate: 'Edit Template',
      printerName: 'Printer Name',
      printerNameAr: 'Printer Name (Arabic)',
      printerType: 'Printer Type',
      connectionType: 'Connection Type',
      ipAddress: 'IP Address',
      port: 'Port',
      paperWidth: 'Paper Width (mm)',
      isDefault: 'Default Printer',
      isActive: 'Active',
      thermal: 'Thermal Receipt',
      a4: 'A4 Printer',
      label: 'Label Printer',
      usb: 'USB',
      network: 'Network',
      bluetooth: 'Bluetooth',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      testPrint: 'Test Print',
      documentType: 'Document Type',
      templateName: 'Template Name',
      paperSize: 'Paper Size',
      orientation: 'Orientation',
      portrait: 'Portrait',
      landscape: 'Landscape',
      showLogo: 'Show Logo',
      showCompanyInfo: 'Show Company Info',
      showQrCode: 'Show QR Code',
      showBarcode: 'Show Barcode',
      headerText: 'Header Text',
      footerText: 'Footer Text',
      fontSize: 'Font Size',
      preview: 'Preview',
      pos_receipt: 'POS Receipt',
      sales_invoice: 'Sales Invoice',
      purchase_invoice: 'Purchase Invoice',
      sales_return: 'Sales Return',
      purchase_return: 'Purchase Return',
      quotation: 'Quotation',
      delivery_note: 'Delivery Note',
      inventory_report: 'Inventory Report',
      financial_report: 'Financial Report',
      barcode_label: 'Barcode Label',
      noPrinters: 'No printers configured',
      noTemplates: 'No templates configured',
      copies: 'Copies',
      autoPrint: 'Auto Print',
      assignPrinter: 'Assign Printer',
      printerAdded: 'Printer added successfully',
      printerUpdated: 'Printer updated successfully',
      printerDeleted: 'Printer deleted successfully',
      templateAdded: 'Template added successfully',
      templateUpdated: 'Template updated successfully',
      templateDeleted: 'Template deleted successfully'
    },
    ar: {
      title: 'الطباعة والمستندات',
      subtitle: 'تهيئة الطابعات وتصميم الفواتير وقوالب المستندات',
      printers: 'الطابعات',
      templates: 'قوالب المستندات',
      assignments: 'تعيينات الطابعات',
      addPrinter: 'إضافة طابعة',
      editPrinter: 'تعديل طابعة',
      addTemplate: 'إضافة قالب',
      editTemplate: 'تعديل قالب',
      printerName: 'اسم الطابعة',
      printerNameAr: 'اسم الطابعة (بالعربية)',
      printerType: 'نوع الطابعة',
      connectionType: 'نوع الاتصال',
      ipAddress: 'عنوان IP',
      port: 'المنفذ',
      paperWidth: 'عرض الورق (مم)',
      isDefault: 'طابعة افتراضية',
      isActive: 'نشطة',
      thermal: 'طابعة حرارية',
      a4: 'طابعة A4',
      label: 'طابعة ملصقات',
      usb: 'USB',
      network: 'شبكة',
      bluetooth: 'بلوتوث',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      testPrint: 'طباعة تجريبية',
      documentType: 'نوع المستند',
      templateName: 'اسم القالب',
      paperSize: 'حجم الورق',
      orientation: 'الاتجاه',
      portrait: 'عمودي',
      landscape: 'أفقي',
      showLogo: 'عرض الشعار',
      showCompanyInfo: 'عرض معلومات الشركة',
      showQrCode: 'عرض رمز QR',
      showBarcode: 'عرض الباركود',
      headerText: 'نص الترويسة',
      footerText: 'نص التذييل',
      fontSize: 'حجم الخط',
      preview: 'معاينة',
      pos_receipt: 'إيصال نقطة البيع',
      sales_invoice: 'فاتورة مبيعات',
      purchase_invoice: 'فاتورة مشتريات',
      sales_return: 'مرتجع مبيعات',
      purchase_return: 'مرتجع مشتريات',
      quotation: 'عرض سعر',
      delivery_note: 'إذن تسليم',
      inventory_report: 'تقرير مخزون',
      financial_report: 'تقرير مالي',
      barcode_label: 'ملصق باركود',
      noPrinters: 'لا توجد طابعات مضافة',
      noTemplates: 'لا توجد قوالب مضافة',
      copies: 'عدد النسخ',
      autoPrint: 'طباعة تلقائية',
      assignPrinter: 'تعيين طابعة',
      printerAdded: 'تمت إضافة الطابعة بنجاح',
      printerUpdated: 'تم تحديث الطابعة بنجاح',
      printerDeleted: 'تم حذف الطابعة بنجاح',
      templateAdded: 'تمت إضافة القالب بنجاح',
      templateUpdated: 'تم تحديث القالب بنجاح',
      templateDeleted: 'تم حذف القالب بنجاح'
    }
  };

  const t = translations[language];

  // Document types
  const documentTypes = [
    { value: 'pos_receipt', icon: Receipt },
    { value: 'sales_invoice', icon: FileText },
    { value: 'purchase_invoice', icon: FileText },
    { value: 'sales_return', icon: FileText },
    { value: 'purchase_return', icon: FileText },
    { value: 'quotation', icon: FileText },
    { value: 'delivery_note', icon: Package },
    { value: 'inventory_report', icon: FileBarChart },
    { value: 'financial_report', icon: FileBarChart },
    { value: 'barcode_label', icon: Barcode }
  ];

  // Mock data for printers (in real app, this would be stored in Supabase)
  const [printers, setPrinters] = useState<PrinterConfig[]>([
    {
      id: '1',
      name: 'Main POS Printer',
      name_ar: 'طابعة نقطة البيع الرئيسية',
      printer_type: 'thermal',
      connection_type: 'usb',
      ip_address: null,
      port: null,
      paper_width: 80,
      is_default: true,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'A4 Invoice Printer',
      name_ar: 'طابعة الفواتير A4',
      printer_type: 'a4',
      connection_type: 'network',
      ip_address: '192.168.1.100',
      port: 9100,
      paper_width: 210,
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]);

  // Mock data for templates
  const [templates, setTemplates] = useState<DocumentTemplate[]>([
    {
      id: '1',
      document_type: 'pos_receipt',
      template_name: 'Standard Receipt',
      template_name_ar: 'الإيصال الافتراضي',
      paper_size: 'thermal',
      orientation: 'portrait',
      show_logo: true,
      show_company_info: true,
      show_qr_code: true,
      show_barcode: true,
      header_text: 'شكراً لتسوقكم معنا',
      footer_text: 'نتمنى لكم يوماً سعيداً',
      font_size: 12,
      is_default: true,
      is_active: true,
      printer_id: '1',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      document_type: 'sales_invoice',
      template_name: 'Standard Invoice',
      template_name_ar: 'الفاتورة الافتراضية',
      paper_size: 'a4',
      orientation: 'portrait',
      show_logo: true,
      show_company_info: true,
      show_qr_code: true,
      show_barcode: false,
      header_text: null,
      footer_text: 'الأسعار شاملة الضريبة',
      font_size: 11,
      is_default: true,
      is_active: true,
      printer_id: '2',
      created_at: new Date().toISOString()
    }
  ]);

  // Printer assignments
  const [assignments, setAssignments] = useState<PrinterAssignment[]>([
    { id: '1', document_type: 'pos_receipt', printer_id: '1', copies: 1, auto_print: true, created_at: new Date().toISOString() },
    { id: '2', document_type: 'sales_invoice', printer_id: '2', copies: 2, auto_print: false, created_at: new Date().toISOString() }
  ]);

  // Handlers
  const handleAddPrinter = () => {
    const newPrinter: PrinterConfig = {
      id: Date.now().toString(),
      name: printerForm.name,
      name_ar: printerForm.name_ar || null,
      printer_type: printerForm.printer_type,
      connection_type: printerForm.connection_type,
      ip_address: printerForm.ip_address || null,
      port: printerForm.port || null,
      paper_width: printerForm.paper_width,
      is_default: printerForm.is_default,
      is_active: printerForm.is_active,
      created_at: new Date().toISOString()
    };
    setPrinters(prev => [...prev, newPrinter]);
    setIsAddPrinterOpen(false);
    resetPrinterForm();
    toast({ title: t.printerAdded });
  };

  const handleEditPrinter = () => {
    if (!selectedPrinter) return;
    setPrinters(prev => prev.map(p => 
      p.id === selectedPrinter.id 
        ? { ...p, ...printerForm, name_ar: printerForm.name_ar || null, ip_address: printerForm.ip_address || null, port: printerForm.port || null }
        : p
    ));
    setIsEditPrinterOpen(false);
    setSelectedPrinter(null);
    toast({ title: t.printerUpdated });
  };

  const handleDeletePrinter = (id: string) => {
    setPrinters(prev => prev.filter(p => p.id !== id));
    toast({ title: t.printerDeleted });
  };

  const handleAddTemplate = () => {
    const newTemplate: DocumentTemplate = {
      id: Date.now().toString(),
      document_type: templateForm.document_type,
      template_name: templateForm.template_name,
      template_name_ar: templateForm.template_name_ar || null,
      paper_size: templateForm.paper_size,
      orientation: templateForm.orientation,
      show_logo: templateForm.show_logo,
      show_company_info: templateForm.show_company_info,
      show_qr_code: templateForm.show_qr_code,
      show_barcode: templateForm.show_barcode,
      header_text: templateForm.header_text || null,
      footer_text: templateForm.footer_text || null,
      font_size: templateForm.font_size,
      is_default: templateForm.is_default,
      is_active: templateForm.is_active,
      printer_id: templateForm.printer_id || null,
      created_at: new Date().toISOString()
    };
    setTemplates(prev => [...prev, newTemplate]);
    setIsAddTemplateOpen(false);
    resetTemplateForm();
    toast({ title: t.templateAdded });
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;
    setTemplates(prev => prev.map(temp => 
      temp.id === selectedTemplate.id 
        ? { ...temp, ...templateForm, template_name_ar: templateForm.template_name_ar || null, header_text: templateForm.header_text || null, footer_text: templateForm.footer_text || null, printer_id: templateForm.printer_id || null }
        : temp
    ));
    setIsEditTemplateOpen(false);
    setSelectedTemplate(null);
    toast({ title: t.templateUpdated });
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(temp => temp.id !== id));
    toast({ title: t.templateDeleted });
  };

  const openEditPrinter = (printer: PrinterConfig) => {
    setSelectedPrinter(printer);
    setPrinterForm({
      name: printer.name,
      name_ar: printer.name_ar || '',
      printer_type: printer.printer_type,
      connection_type: printer.connection_type,
      ip_address: printer.ip_address || '',
      port: printer.port || 9100,
      paper_width: printer.paper_width,
      is_default: printer.is_default,
      is_active: printer.is_active
    });
    setIsEditPrinterOpen(true);
  };

  const openEditTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      document_type: template.document_type,
      template_name: template.template_name,
      template_name_ar: template.template_name_ar || '',
      paper_size: template.paper_size,
      orientation: template.orientation,
      show_logo: template.show_logo,
      show_company_info: template.show_company_info,
      show_qr_code: template.show_qr_code,
      show_barcode: template.show_barcode,
      header_text: template.header_text || '',
      footer_text: template.footer_text || '',
      font_size: template.font_size,
      is_default: template.is_default,
      is_active: template.is_active,
      printer_id: template.printer_id || ''
    });
    setIsEditTemplateOpen(true);
  };

  const resetPrinterForm = () => {
    setPrinterForm({
      name: '',
      name_ar: '',
      printer_type: 'thermal',
      connection_type: 'usb',
      ip_address: '',
      port: 9100,
      paper_width: 80,
      is_default: false,
      is_active: true
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      document_type: 'pos_receipt',
      template_name: '',
      template_name_ar: '',
      paper_size: 'thermal',
      orientation: 'portrait',
      show_logo: true,
      show_company_info: true,
      show_qr_code: false,
      show_barcode: true,
      header_text: '',
      footer_text: '',
      font_size: 12,
      is_default: true,
      is_active: true,
      printer_id: ''
    });
  };

  const updateAssignment = (docType: string, field: string, value: any) => {
    setAssignments(prev => {
      const existing = prev.find(a => a.document_type === docType);
      if (existing) {
        return prev.map(a => a.document_type === docType ? { ...a, [field]: value } : a);
      } else {
        return [...prev, {
          id: Date.now().toString(),
          document_type: docType,
          printer_id: field === 'printer_id' ? value : '',
          copies: field === 'copies' ? value : 1,
          auto_print: field === 'auto_print' ? value : false,
          created_at: new Date().toISOString()
        }];
      }
    });
  };

  const getAssignment = (docType: string) => {
    return assignments.find(a => a.document_type === docType);
  };

  const getPrinterName = (printerId: string | null) => {
    if (!printerId) return '-';
    const printer = printers.find(p => p.id === printerId);
    return printer ? (language === 'ar' ? printer.name_ar || printer.name : printer.name) : '-';
  };

  const getPrinterTypeIcon = (type: string) => {
    switch (type) {
      case 'thermal': return Receipt;
      case 'a4': return FileText;
      case 'label': return Barcode;
      default: return Printer;
    }
  };

  // Render printer form
  const renderPrinterForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.printerName}</Label>
          <Input 
            value={printerForm.name} 
            onChange={(e) => setPrinterForm(prev => ({ ...prev, name: e.target.value }))} 
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label>{t.printerNameAr}</Label>
          <Input 
            value={printerForm.name_ar} 
            onChange={(e) => setPrinterForm(prev => ({ ...prev, name_ar: e.target.value }))} 
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.printerType}</Label>
          <Select value={printerForm.printer_type} onValueChange={(v: any) => setPrinterForm(prev => ({ ...prev, printer_type: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thermal">{t.thermal}</SelectItem>
              <SelectItem value="a4">{t.a4}</SelectItem>
              <SelectItem value="label">{t.label}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.connectionType}</Label>
          <Select value={printerForm.connection_type} onValueChange={(v: any) => setPrinterForm(prev => ({ ...prev, connection_type: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usb">{t.usb}</SelectItem>
              <SelectItem value="network">{t.network}</SelectItem>
              <SelectItem value="bluetooth">{t.bluetooth}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {printerForm.connection_type === 'network' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t.ipAddress}</Label>
            <Input 
              value={printerForm.ip_address} 
              onChange={(e) => setPrinterForm(prev => ({ ...prev, ip_address: e.target.value }))} 
              placeholder="192.168.1.100"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.port}</Label>
            <Input 
              type="number"
              value={printerForm.port} 
              onChange={(e) => setPrinterForm(prev => ({ ...prev, port: parseInt(e.target.value) }))} 
              dir="ltr"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t.paperWidth}</Label>
        <Select value={printerForm.paper_width.toString()} onValueChange={(v) => setPrinterForm(prev => ({ ...prev, paper_width: parseInt(v) }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="58">58mm</SelectItem>
            <SelectItem value="80">80mm</SelectItem>
            <SelectItem value="210">A4 (210mm)</SelectItem>
            <SelectItem value="100">100mm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch 
            checked={printerForm.is_default} 
            onCheckedChange={(v) => setPrinterForm(prev => ({ ...prev, is_default: v }))} 
          />
          <Label>{t.isDefault}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={printerForm.is_active} 
            onCheckedChange={(v) => setPrinterForm(prev => ({ ...prev, is_active: v }))} 
          />
          <Label>{t.isActive}</Label>
        </div>
      </div>
    </div>
  );

  // Render template form
  const renderTemplateForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.templateName}</Label>
          <Input 
            value={templateForm.template_name} 
            onChange={(e) => setTemplateForm(prev => ({ ...prev, template_name: e.target.value }))} 
          />
        </div>
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'اسم القالب (بالعربية)' : 'Template Name (Arabic)'}</Label>
          <Input 
            value={templateForm.template_name_ar} 
            onChange={(e) => setTemplateForm(prev => ({ ...prev, template_name_ar: e.target.value }))} 
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.documentType}</Label>
          <Select value={templateForm.document_type} onValueChange={(v) => setTemplateForm(prev => ({ ...prev, document_type: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map(doc => (
                <SelectItem key={doc.value} value={doc.value}>
                  {t[doc.value as keyof typeof t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.assignPrinter}</Label>
          <Select value={templateForm.printer_id || 'none'} onValueChange={(v) => setTemplateForm(prev => ({ ...prev, printer_id: v === 'none' ? '' : v }))}>
            <SelectTrigger>
              <SelectValue placeholder={language === 'ar' ? 'اختر طابعة' : 'Select printer'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{language === 'ar' ? 'بدون تعيين' : 'No assignment'}</SelectItem>
              {printers.filter(p => p.is_active).map(printer => (
                <SelectItem key={printer.id} value={printer.id}>
                  {language === 'ar' ? printer.name_ar || printer.name : printer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.paperSize}</Label>
          <Select value={templateForm.paper_size} onValueChange={(v: any) => setTemplateForm(prev => ({ ...prev, paper_size: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thermal">{language === 'ar' ? 'حراري (80مم)' : 'Thermal (80mm)'}</SelectItem>
              <SelectItem value="a4">A4</SelectItem>
              <SelectItem value="a5">A5</SelectItem>
              <SelectItem value="custom">{language === 'ar' ? 'مخصص' : 'Custom'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.orientation}</Label>
          <Select value={templateForm.orientation} onValueChange={(v: any) => setTemplateForm(prev => ({ ...prev, orientation: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">{t.portrait}</SelectItem>
              <SelectItem value="landscape">{t.landscape}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.fontSize}</Label>
        <Select value={templateForm.font_size.toString()} onValueChange={(v) => setTemplateForm(prev => ({ ...prev, font_size: parseInt(v) }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8">8pt</SelectItem>
            <SelectItem value="10">10pt</SelectItem>
            <SelectItem value="11">11pt</SelectItem>
            <SelectItem value="12">12pt</SelectItem>
            <SelectItem value="14">14pt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Switch 
            checked={templateForm.show_logo} 
            onCheckedChange={(v) => setTemplateForm(prev => ({ ...prev, show_logo: v }))} 
          />
          <Label className="flex items-center gap-2"><Image size={16} /> {t.showLogo}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={templateForm.show_company_info} 
            onCheckedChange={(v) => setTemplateForm(prev => ({ ...prev, show_company_info: v }))} 
          />
          <Label className="flex items-center gap-2"><Building2 size={16} /> {t.showCompanyInfo}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={templateForm.show_qr_code} 
            onCheckedChange={(v) => setTemplateForm(prev => ({ ...prev, show_qr_code: v }))} 
          />
          <Label className="flex items-center gap-2"><QrCode size={16} /> {t.showQrCode}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={templateForm.show_barcode} 
            onCheckedChange={(v) => setTemplateForm(prev => ({ ...prev, show_barcode: v }))} 
          />
          <Label className="flex items-center gap-2"><Barcode size={16} /> {t.showBarcode}</Label>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>{t.headerText}</Label>
        <Textarea 
          value={templateForm.header_text} 
          onChange={(e) => setTemplateForm(prev => ({ ...prev, header_text: e.target.value }))} 
          placeholder={language === 'ar' ? 'نص يظهر في أعلى المستند' : 'Text to display at the top of the document'}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>{t.footerText}</Label>
        <Textarea 
          value={templateForm.footer_text} 
          onChange={(e) => setTemplateForm(prev => ({ ...prev, footer_text: e.target.value }))} 
          placeholder={language === 'ar' ? 'نص يظهر في أسفل المستند' : 'Text to display at the bottom of the document'}
          rows={2}
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch 
            checked={templateForm.is_default} 
            onCheckedChange={(v) => setTemplateForm(prev => ({ ...prev, is_default: v }))} 
          />
          <Label>{language === 'ar' ? 'القالب الافتراضي' : 'Default Template'}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={templateForm.is_active} 
            onCheckedChange={(v) => setTemplateForm(prev => ({ ...prev, is_active: v }))} 
          />
          <Label>{t.isActive}</Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <Card className="card-elevated border-0 bg-gradient-to-br from-primary/5 to-primary/0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Printer className="text-primary" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start p-1 bg-muted/50">
          <TabsTrigger value="printers" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Printer size={16} />
            {t.printers}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layout size={16} />
            {t.templates}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings size={16} />
            {t.assignments}
          </TabsTrigger>
        </TabsList>

        {/* Printers Tab */}
        <TabsContent value="printers" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t.printers}</CardTitle>
                <CardDescription>{language === 'ar' ? 'إدارة الطابعات المتصلة بالنظام' : 'Manage connected printers'}</CardDescription>
              </div>
              <Button onClick={() => { resetPrinterForm(); setIsAddPrinterOpen(true); }} className="gap-2">
                <Plus size={16} />
                {t.addPrinter}
              </Button>
            </CardHeader>
            <CardContent>
              {printers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Printer size={48} className="mx-auto mb-4 opacity-30" />
                  <p>{t.noPrinters}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {printers.map((printer) => {
                    const TypeIcon = getPrinterTypeIcon(printer.printer_type);
                    return (
                      <Card key={printer.id} className={`relative ${!printer.is_active && 'opacity-60'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <TypeIcon size={20} className="text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{language === 'ar' ? printer.name_ar || printer.name : printer.name}</h3>
                                <p className="text-xs text-muted-foreground">{t[printer.printer_type as keyof typeof t]}</p>
                              </div>
                            </div>
                            {printer.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                {language === 'ar' ? 'افتراضي' : 'Default'}
                              </Badge>
                            )}
                          </div>

                          <Separator className="my-3" />

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t.connectionType}:</span>
                              <span>{t[printer.connection_type as keyof typeof t]}</span>
                            </div>
                            {printer.connection_type === 'network' && printer.ip_address && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{t.ipAddress}:</span>
                                <span dir="ltr">{printer.ip_address}:{printer.port}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t.paperWidth}:</span>
                              <span>{printer.paper_width}mm</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 mt-4">
                            <Button variant="outline" size="sm" onClick={() => openEditPrinter(printer)}>
                              <Edit size={14} />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeletePrinter(printer.id)}>
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t.templates}</CardTitle>
                <CardDescription>{language === 'ar' ? 'تصميم وإدارة قوالب المستندات والفواتير' : 'Design and manage document and invoice templates'}</CardDescription>
              </div>
              <Button onClick={() => { resetTemplateForm(); setIsAddTemplateOpen(true); }} className="gap-2">
                <Plus size={16} />
                {t.addTemplate}
              </Button>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>{t.noTemplates}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => {
                    const docType = documentTypes.find(d => d.value === template.document_type);
                    const DocIcon = docType?.icon || FileText;
                    return (
                      <Card key={template.id} className={`relative ${!template.is_active && 'opacity-60'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-accent/10">
                                <DocIcon size={20} className="text-accent" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{language === 'ar' ? template.template_name_ar || template.template_name : template.template_name}</h3>
                                <p className="text-xs text-muted-foreground">{t[template.document_type as keyof typeof t]}</p>
                              </div>
                            </div>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                {language === 'ar' ? 'افتراضي' : 'Default'}
                              </Badge>
                            )}
                          </div>

                          <Separator className="my-3" />

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t.paperSize}:</span>
                              <span>{template.paper_size.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t.assignPrinter}:</span>
                              <span>{getPrinterName(template.printer_id)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {template.show_logo && <Badge variant="outline" className="text-xs"><Image size={10} className="me-1" /> {language === 'ar' ? 'شعار' : 'Logo'}</Badge>}
                              {template.show_qr_code && <Badge variant="outline" className="text-xs"><QrCode size={10} className="me-1" /> QR</Badge>}
                              {template.show_barcode && <Badge variant="outline" className="text-xs"><Barcode size={10} className="me-1" /> {language === 'ar' ? 'باركود' : 'Barcode'}</Badge>}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 mt-4">
                            <Button variant="outline" size="sm">
                              <Eye size={14} />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditTemplate(template)}>
                              <Edit size={14} />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.assignments}</CardTitle>
              <CardDescription>{language === 'ar' ? 'ربط أنواع المستندات بالطابعات المناسبة' : 'Link document types to appropriate printers'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.documentType}</TableHead>
                    <TableHead>{t.assignPrinter}</TableHead>
                    <TableHead className="text-center">{t.copies}</TableHead>
                    <TableHead className="text-center">{t.autoPrint}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentTypes.map((docType) => {
                    const assignment = getAssignment(docType.value);
                    const DocIcon = docType.icon;
                    return (
                      <TableRow key={docType.value}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DocIcon size={16} className="text-muted-foreground" />
                            <span>{t[docType.value as keyof typeof t]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={assignment?.printer_id || 'none'} 
                            onValueChange={(v) => updateAssignment(docType.value, 'printer_id', v === 'none' ? '' : v)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder={language === 'ar' ? 'اختر طابعة' : 'Select printer'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{language === 'ar' ? 'بدون تعيين' : 'No assignment'}</SelectItem>
                              {printers.filter(p => p.is_active).map(printer => (
                                <SelectItem key={printer.id} value={printer.id}>
                                  {language === 'ar' ? printer.name_ar || printer.name : printer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input 
                            type="number" 
                            min={1} 
                            max={10}
                            value={assignment?.copies || 1} 
                            onChange={(e) => updateAssignment(docType.value, 'copies', parseInt(e.target.value) || 1)}
                            className="w-20 text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={assignment?.auto_print || false}
                            onCheckedChange={(v) => updateAssignment(docType.value, 'auto_print', v)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Printer Dialog */}
      <Dialog open={isAddPrinterOpen} onOpenChange={setIsAddPrinterOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.addPrinter}</DialogTitle>
          </DialogHeader>
          {renderPrinterForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPrinterOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleAddPrinter} disabled={!printerForm.name}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Printer Dialog */}
      <Dialog open={isEditPrinterOpen} onOpenChange={setIsEditPrinterOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.editPrinter}</DialogTitle>
          </DialogHeader>
          {renderPrinterForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPrinterOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleEditPrinter}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Template Dialog */}
      <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.addTemplate}</DialogTitle>
          </DialogHeader>
          {renderTemplateForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTemplateOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleAddTemplate} disabled={!templateForm.template_name}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.editTemplate}</DialogTitle>
          </DialogHeader>
          {renderTemplateForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTemplateOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleEditTemplate}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrintingSettings;