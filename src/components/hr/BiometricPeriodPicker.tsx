import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { periodForSelection, type BiometricPeriod, type BiometricPeriodPreset } from '@/components/hr/BiometricPeriodUtils';

export default function BiometricPeriodPicker({
  value,
  onChange,
}: {
  value: BiometricPeriod;
  onChange: (period: BiometricPeriod) => void;
}) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const presets: Array<{ id: BiometricPeriodPreset; label: string }> = [
    { id: 'day', label: ar ? 'يوم' : 'Day' },
    { id: 'month', label: ar ? 'هذا الشهر' : 'This month' },
    { id: 'year', label: ar ? 'هذه السنة' : 'This year' },
    { id: 'custom', label: ar ? 'مخصص' : 'Custom' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 text-sm font-medium"><CalendarDays size={16} />{ar ? 'الفترة' : 'Period'}</span>
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant={value.preset === preset.id ? 'default' : 'outline'}
            onClick={() => onChange(periodForSelection(preset.id, value))}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="biometric-period-start">{ar ? 'من' : 'From'}</Label><Input id="biometric-period-start" type="date" value={value.start} onChange={(event) => onChange({ ...value, start: event.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="biometric-period-end">{ar ? 'إلى' : 'To'}</Label><Input id="biometric-period-end" type="date" value={value.end} onChange={(event) => onChange({ ...value, end: event.target.value })} /></div>
        </div>
      )}
      <p className="text-xs text-muted-foreground" dir="auto">
        {ar ? 'الفترة المحددة:' : 'Selected range:'} {value.start} {ar ? 'إلى' : 'to'} {value.end}
      </p>
    </div>
  );
}
