import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import { Building2, Phone, Mail, Globe, FileText } from 'lucide-react';

interface BranchData {
  id: string;
  name: string;
  name_ar: string | null;
  address?: string | null;
  phone?: string | null;
}

interface CompanyHeaderProps {
  showBranch?: boolean;
  branchId?: string | null;
  variant?: 'full' | 'compact' | 'print';
  className?: string;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  showBranch = true,
  branchId,
  variant = 'full',
  className = ''
}) => {
  const { language } = useLanguage();
  const { currentBranch, userBranch } = useApp();

  // Fetch company settings
  const { data: company } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch branch details if branchId is provided
  const { data: branch } = useQuery({
    queryKey: ['branch-details', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!branchId && showBranch
  });

  // Use the passed branch, or user's branch, or current branch
  const displayBranch: BranchData | null = branch || (userBranch as BranchData) || (currentBranch as BranchData);
  const companyName = language === 'ar' ? company?.name_ar || company?.name : company?.name;
  const branchName = displayBranch 
    ? (language === 'ar' ? displayBranch.name_ar || displayBranch.name : displayBranch.name)
    : null;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {company?.logo_icon_url && (
          <img 
            src={company.logo_icon_url} 
            alt="Logo" 
            className="h-10 w-10 object-contain"
          />
        )}
        <div>
          <h3 className="font-bold text-foreground">{companyName}</h3>
          {showBranch && branchName && (
            <p className="text-xs text-muted-foreground">{branchName}</p>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'print') {
    return (
      <div className={`text-center border-b-2 border-foreground pb-4 mb-4 ${className}`}>
        {company?.logo_url && (
          <img 
            src={company.logo_url} 
            alt="Company Logo" 
            className="h-16 mx-auto mb-3 object-contain"
          />
        )}
        <h1 className="text-2xl font-bold">{companyName}</h1>
        {showBranch && branchName && (
          <p className="text-base font-medium text-muted-foreground mt-1">
            {language === 'ar' ? 'فرع:' : 'Branch:'} {branchName}
          </p>
        )}
        {displayBranch?.address && (
          <p className="text-sm text-muted-foreground">{displayBranch.address}</p>
        )}
        {!displayBranch?.address && company?.address && (
          <p className="text-sm text-muted-foreground">{company.address}</p>
        )}
        <div className="flex justify-center gap-4 mt-2 text-sm text-muted-foreground">
          {(displayBranch?.phone || company?.phone) && (
            <span>{displayBranch?.phone || company?.phone}</span>
          )}
          {company?.email && (
            <span>{company.email}</span>
          )}
        </div>
        {company?.tax_number && (
          <p className="text-sm mt-1">
            {language === 'ar' ? 'الرقم الضريبي:' : 'Tax #:'} {company.tax_number}
          </p>
        )}
        {company?.commercial_register && (
          <p className="text-sm">
            {language === 'ar' ? 'السجل التجاري:' : 'CR #:'} {company.commercial_register}
          </p>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`flex items-start gap-4 border-b pb-4 mb-4 ${className}`}>
      {/* Logo */}
      <div className="flex-shrink-0">
        {company?.logo_url ? (
          <img 
            src={company.logo_url} 
            alt="Company Logo" 
            className="h-20 w-auto object-contain"
          />
        ) : company?.logo_icon_url ? (
          <img 
            src={company.logo_icon_url} 
            alt="Logo" 
            className="h-16 w-16 object-contain"
          />
        ) : (
          <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        )}
      </div>

      {/* Company Info */}
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-foreground">{companyName}</h2>
        {showBranch && branchName && (
          <p className="text-base font-medium text-primary mt-0.5">
            {language === 'ar' ? 'فرع:' : 'Branch:'} {branchName}
          </p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2 text-sm text-muted-foreground">
          {(displayBranch?.address || company?.address) && (
            <div className="flex items-center gap-1.5">
              <Building2 size={14} />
              <span>{displayBranch?.address || company?.address}</span>
            </div>
          )}
          {(displayBranch?.phone || company?.phone) && (
            <div className="flex items-center gap-1.5">
              <Phone size={14} />
              <span>{displayBranch?.phone || company?.phone}</span>
            </div>
          )}
          {company?.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={14} />
              <span>{company.email}</span>
            </div>
          )}
          {company?.website && (
            <div className="flex items-center gap-1.5">
              <Globe size={14} />
              <span>{company.website}</span>
            </div>
          )}
        </div>

        {/* Tax & Commercial Register */}
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          {company?.tax_number && (
            <div className="flex items-center gap-1">
              <FileText size={12} />
              <span>{language === 'ar' ? 'الرقم الضريبي:' : 'Tax #:'} {company.tax_number}</span>
            </div>
          )}
          {company?.commercial_register && (
            <div className="flex items-center gap-1">
              <FileText size={12} />
              <span>{language === 'ar' ? 'السجل التجاري:' : 'CR #:'} {company.commercial_register}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyHeader;
