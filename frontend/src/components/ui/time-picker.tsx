import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  language?: 'ar' | 'en';
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder,
  language = 'en',
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Parse current value
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '', minute: '', period: 'AM' };
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return {
      hour: hour12.toString().padStart(2, '0'),
      minute: (minutes || 0).toString().padStart(2, '0'),
      period
    };
  };

  const { hour, minute, period } = parseTime(value || '');

  const handleTimeChange = (newHour: string, newMinute: string, newPeriod: string) => {
    if (!newHour || !newMinute) return;
    
    let hour24 = parseInt(newHour);
    if (newPeriod === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (newPeriod === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    const timeStr = `${hour24.toString().padStart(2, '0')}:${newMinute}`;
    onChange(timeStr);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const formatDisplayTime = () => {
    if (!value) return placeholder || (language === 'ar' ? 'اختر الوقت' : 'Select time');
    const periodLabel = period === 'AM' 
      ? (language === 'ar' ? 'ص' : 'AM')
      : (language === 'ar' ? 'م' : 'PM');
    return `${hour}:${minute} ${periodLabel}`;
  };

  const t = {
    hour: language === 'ar' ? 'الساعة' : 'Hour',
    minute: language === 'ar' ? 'الدقيقة' : 'Minute',
    period: language === 'ar' ? 'الفترة' : 'Period',
    am: language === 'ar' ? 'صباحاً' : 'AM',
    pm: language === 'ar' ? 'مساءاً' : 'PM',
    clear: language === 'ar' ? 'مسح' : 'Clear',
    done: language === 'ar' ? 'تم' : 'Done',
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-sm font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="me-2 h-4 w-4" />
          {formatDisplayTime()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Hour */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t.hour}</label>
              <Select
                value={hour || '12'}
                onValueChange={(h) => handleTimeChange(h, minute || '00', period || 'AM')}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {hours.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Minute */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t.minute}</label>
              <Select
                value={minute || '00'}
                onValueChange={(m) => handleTimeChange(hour || '12', m, period || 'AM')}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {minutes.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AM/PM */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t.period}</label>
              <Select
                value={period || 'AM'}
                onValueChange={(p) => handleTimeChange(hour || '12', minute || '00', p)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">{t.am}</SelectItem>
                  <SelectItem value="PM">{t.pm}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              {t.clear}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              {t.done}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimePicker;
