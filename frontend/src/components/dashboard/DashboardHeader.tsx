// components/dashboard/DashboardHeader.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { formatDateLong } from '@/lib/utils';

interface DashboardHeaderProps {
  greeting: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ greeting }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { currentBranch } = useApp();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}، <span className="text-primary">{user?.email?.split('@')[0] || 'User'}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {currentBranch 
            ? `${language === 'ar' ? 'فرع' : 'Branch'}: ${language === 'ar' && currentBranch.name_ar ? currentBranch.name_ar : currentBranch.name}`
            : (language === 'ar' ? 'جميع الفروع' : 'All Branches')
          }
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm text-muted-foreground">
          {formatDateLong(new Date(), language)}
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;