// components/CRM/StatsCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, Crown, ShoppingBag } from 'lucide-react';

interface StatsCardProps {
  stat: {
    label: string;
    value: string | number;
    icon: string;
    color: string;
  };
}

const iconMap = {
  Users: Users,
  TrendingUp: TrendingUp,
  Crown: Crown,
  ShoppingBag: ShoppingBag
};

export const StatsCard: React.FC<StatsCardProps> = ({ stat }) => {
  const IconComponent = iconMap[stat.icon as keyof typeof iconMap] || Users;
  
  return (
    <Card className="card-elevated">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${stat.color}`}>
            <IconComponent className="text-primary" size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};