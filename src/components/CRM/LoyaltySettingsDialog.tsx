// components/CRM/LoyaltySettingsDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { LoyaltySettings } from '@/types/loyalty';

interface LoyaltySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: LoyaltySettings;
  onSave: (settings: LoyaltySettings) => void;
  isLoading: boolean;
  translations: any;
}

export const LoyaltySettingsDialog: React.FC<LoyaltySettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  onSave,
  isLoading,
  translations
}) => {
  const [localSettings, setLocalSettings] = useState<LoyaltySettings>(settings);
  const [originalSettings, setOriginalSettings] = useState<LoyaltySettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
    setOriginalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(localSettings);
  };

  const handleCancel = () => {
    setLocalSettings(originalSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={20} />
            {settings.id ? translations.editSettings || 'Edit Settings' : translations.createSettings || 'Create Settings'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{translations.pointsPerCurrency}</Label>
            <Input
              type="number"
              min="1"
              value={localSettings.points}
              onChange={(e) => setLocalSettings({ ...localSettings, points: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              {translations.pointsPerCurrencyHint || 'Amount in YER per 1 point'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>{translations.pointsValuePercent}</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={localSettings.point_value}
              onChange={(e) => setLocalSettings({ ...localSettings, point_value: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              {translations.pointsValuePercentHint || 'Discount percentage per point'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>{translations.thresholds}</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{translations.silver}</Label>
                <Input
                  type="number"
                  min="0"
                  value={localSettings.silver}
                  onChange={(e) => setLocalSettings({ ...localSettings, silver: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{translations.gold}</Label>
                <Input
                  type="number"
                  min="0"
                  value={localSettings.gold}
                  onChange={(e) => setLocalSettings({ ...localSettings, gold: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{translations.platinum}</Label>
                <Input
                  type="number"
                  min="0"
                  value={localSettings.platinum}
                  onChange={(e) => setLocalSettings({ ...localSettings, platinum: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              {translations.cancel}
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin me-2" />
                  {translations.saving || 'Saving...'}
                </>
              ) : (
                translations.save
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};