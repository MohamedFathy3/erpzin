import React from 'react';
import { cn } from '@/lib/utils';

interface POSShortcutBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  shortcut: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  variant?: 'light' | 'dark' | 'primary';
  size?: 'sm' | 'md';
}

const POSShortcutBadge = React.forwardRef<HTMLSpanElement, POSShortcutBadgeProps>(
  ({ shortcut, position = 'top-right', variant = 'dark', size = 'sm', className, ...props }, ref) => {
    const positionClasses = {
      'top-right': 'absolute -top-1 -end-1',
      'top-left': 'absolute -top-1 -start-1',
      'bottom-right': 'absolute -bottom-1 -end-1',
      'bottom-left': 'absolute -bottom-1 -start-1',
      'inline': 'ms-1.5',
    };

    const variantClasses = {
      light: 'bg-white/20 text-white/90 border-white/30',
      dark: 'bg-black/40 text-white/90 border-white/20',
      primary: 'bg-primary/20 text-primary border-primary/30',
    };

    const sizeClasses = {
      sm: 'text-[9px] px-1 py-0.5 min-w-[18px]',
      md: 'text-[10px] px-1.5 py-0.5 min-w-[22px]',
    };

    return (
      <span 
        ref={ref}
        className={cn(
          'font-mono font-semibold rounded border backdrop-blur-sm text-center leading-tight z-10',
          positionClasses[position],
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {shortcut}
      </span>
    );
  }
);
POSShortcutBadge.displayName = 'POSShortcutBadge';

export default POSShortcutBadge;
