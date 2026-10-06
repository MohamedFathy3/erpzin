// services/LoyaltyService.ts
import { LoyaltySettings, Tier } from '@/types/loyalty';
import { Crown, Star, Award, Gift } from 'lucide-react';
import React from 'react';

export class LoyaltyService {
  constructor(
    private settings: LoyaltySettings,
    private language: string = 'en'
  ) {}

  getTier(points: number): {
    name: string;
    label: string;
    threshold: number;
    color: string;
    icon: React.ReactElement;
  } {
    if (points >= this.settings.platinum) {
      return {
        name: 'Platinum',
        label: this.getTranslation('platinum'),
        threshold: this.settings.platinum,
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        icon: React.createElement(Crown, { size: 14 })
      };
    }
    if (points >= this.settings.gold) {
      return {
        name: 'Gold',
        label: this.getTranslation('gold'),
        threshold: this.settings.gold,
        color: 'bg-gradient-to-r from-yellow-400 to-amber-500',
        icon: React.createElement(Star, { size: 14 })
      };
    }
    if (points >= this.settings.silver) {
      return {
        name: 'Silver',
        label: this.getTranslation('silver'),
        threshold: this.settings.silver,
        color: 'bg-gradient-to-r from-gray-300 to-gray-400',
        icon: React.createElement(Award, { size: 14 })
      };
    }
    return {
      name: 'Bronze',
      label: this.getTranslation('bronze'),
      threshold: 0,
      color: 'bg-gradient-to-r from-orange-300 to-orange-400',
      icon: React.createElement(Gift, { size: 14 })
    };
  }

  calculatePointsValue(points: number): number {
    return points * this.settings.point_value;
  }

  getAllTiers(): Array<{
    name: string;
    label: string;
    threshold: number;
    color: string;
    icon: React.ReactElement;
  }> {
    return [
      this.getTier(0),
      this.getTier(this.settings.silver),
      this.getTier(this.settings.gold),
      this.getTier(this.settings.platinum)
    ];
  }

  private getTranslation(tier: string): string {
    const translations: Record<string, { ar: string; en: string }> = {
      bronze: { en: 'Bronze', ar: 'برونزي' },
      silver: { en: 'Silver', ar: 'فضي' },
      gold: { en: 'Gold', ar: 'ذهبي' },
      platinum: { en: 'Platinum', ar: 'بلاتيني' }
    };
    return translations[tier]?.[this.language as keyof typeof translations.bronze] || translations[tier]?.en || tier;
  }
}