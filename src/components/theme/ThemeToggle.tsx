import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'fusion-x-theme';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', isDark);
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    setDark(next);
  };

  return <Button type="button" variant="outline" size={compact ? 'icon' : 'sm'} onClick={toggle} aria-label={dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'} className={compact ? 'h-9 w-9' : 'gap-2'}>
    {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    {!compact && <span>{dark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>}
  </Button>;
}
