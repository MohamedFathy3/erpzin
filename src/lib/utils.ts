import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to DD/MM/YYYY format
 * @param date - Date string or Date object
 * @param includeTime - Whether to include time (HH:mm)
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | null | undefined, includeTime: boolean = false): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return format(d, includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}

/**
 * Format date with full weekday and month names
 * @param date - Date string or Date object
 * @param language - 'ar' or 'en'
 * @returns Formatted date string with weekday
 */
export function formatDateLong(date: string | Date, language: 'ar' | 'en' = 'en'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return '-';
  }
}
