// components/CRM/CustomerTable.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Gift } from 'lucide-react';
import { Customer } from '@/types/loyalty';
import { LoyaltyService } from '@/services/LoyaltyService.service';
import { LoyaltySettings } from '@/types/loyalty';

interface CustomerTableProps {
  customers: Customer[];
  loyaltyService: LoyaltyService;
  language: string;
  onRedeemPoints: (customerId: string) => void;
  isLoading: boolean;
  translations: any;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  loyaltyService,
  language,
  onRedeemPoints,
  isLoading,
  translations
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{translations.noCustomers}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{translations.name}</TableHead>
            <TableHead>{translations.phone}</TableHead>
            <TableHead>{translations.address}</TableHead>
            <TableHead>{translations.email}</TableHead>
            <TableHead>{translations.loyaltyPoints}</TableHead>
            <TableHead>{translations.totalPurchases}</TableHead>
            <TableHead className="text-end">{translations.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const tier = loyaltyService.getTier(customer.point || 0);
            return (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {(language === 'ar' ? customer.name_ar || customer.name : customer.name).charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {language === 'ar' ? customer.name_ar || customer.name : customer.name}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell dir="ltr">{customer.phone || '-'}</TableCell>
                <TableCell dir="ltr">{customer.address || '-'}</TableCell>
                <TableCell>{customer.email || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-warning fill-warning" />
                    <span className="font-semibold">{customer.point || 0}</span>
                    <Badge className={`${tier.color} text-white text-xs flex items-center gap-1`}>
                      {tier.icon}
                      {tier.label}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {Number(customer.last_paid_amount || 0).toLocaleString()} YER
                </TableCell>
                <TableCell className="text-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRedeemPoints(customer.id)}
                    disabled={!customer.point || customer.point < 1}
                    className="gap-1"
                  >
                    <Gift size={14} />
                    {translations.redeemPoints}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};