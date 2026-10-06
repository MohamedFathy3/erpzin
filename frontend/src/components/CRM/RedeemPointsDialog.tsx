// components/CRM/RedeemPointsDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Gift, Star } from 'lucide-react';
import { Customer } from '@/types/loyalty';
import { LoyaltyService } from '@/services/LoyaltyService.service';

interface RedeemPointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  loyaltyService: LoyaltyService;
  onRedeem: (points: number) => void;
  isLoading: boolean;
  translations: any;
}

export const RedeemPointsDialog: React.FC<RedeemPointsDialogProps> = ({
  open,
  onOpenChange,
  customer,
  loyaltyService,
  onRedeem,
  isLoading,
  translations
}) => {
  const [redeemAmount, setRedeemAmount] = useState('');

  if (!customer) return null;

  const tier = loyaltyService.getTier(customer.point || 0);
  const maxPoints = customer.point || 0;
  const pointsToRedeem = Number(redeemAmount);
  const discountValue = pointsToRedeem * (loyaltyService as any).settings?.point_value || 0;

  const handleRedeem = () => {
    if (pointsToRedeem > 0 && pointsToRedeem <= maxPoints) {
      onRedeem(pointsToRedeem);
      setRedeemAmount('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift size={20} className="text-primary" />
            {translations.redeemPoints}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium mb-2">
              {translations.customer}: {customer.name}
            </p>
          </div>

          {/* Available Points */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <span>{translations.availablePoints}</span>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-warning fill-warning" />
              <span className="text-xl font-bold">{maxPoints}</span>
              <Badge className={`${tier.color} text-white`}>
                {tier.label}
              </Badge>
            </div>
          </div>

          {/* Points to Redeem Input */}
          <div className="space-y-2">
            <Label>{translations.pointsToRedeem}</Label>
            <Input
              type="number"
              placeholder="0"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              max={maxPoints}
              min="1"
            />
            
            {redeemAmount && pointsToRedeem > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-success">
                  {translations.discountValue || 'Discount value'}: {discountValue.toFixed(1)}%
                </p>
                {pointsToRedeem > maxPoints && (
                  <p className="text-sm text-destructive">
                    {translations.insufficientPoints || 'Insufficient points!'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {translations.cancel}
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleRedeem}
              disabled={
                !redeemAmount ||
                pointsToRedeem < 1 ||
                pointsToRedeem > maxPoints ||
                isLoading
              }
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin me-2" />
                  {translations.redeeming || 'Redeeming...'}
                </>
              ) : (
                translations.redeemPoints
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};