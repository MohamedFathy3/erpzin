import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  language?: 'ar' | 'en';
  className?: string;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder,
  language = 'en',
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedDate = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Format as YYYY-MM-DD for consistent storage
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange(formattedDate);
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  const formatDisplayDate = () => {
    if (!value) return placeholder || (language === 'ar' ? 'اختر التاريخ' : 'Pick a date');
    try {
      // Display as DD/MM/YYYY
      return format(new Date(value), 'dd/MM/yyyy');
    } catch {
      return value;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-sm font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="me-2 h-4 w-4" />
          {formatDisplayDate()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
