import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').replace(
      /^(........)(....)(....)(....)(............)$/,
      '$1-$2-$3-$4-$5',
    );
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
