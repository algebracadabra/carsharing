import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Formatiert Zahlen mit Tausenderpunkten (deutsches Format)
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return value.toLocaleString('de-DE');
}

// Formatiert Währungsbeträge (2 Dezimalstellen, deutsches Format)
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0,00';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================
// Date Formatting Utilities
// ============================================

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};

// Formatiert ein Datum im deutschen Format (TT.MM.JJJJ)
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', DATE_OPTIONS);
}

// Formatiert eine Uhrzeit im deutschen Format (HH:MM)
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('de-DE', TIME_OPTIONS);
}

// Formatiert Datum und Uhrzeit (TT.MM.JJJJ HH:MM)
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('de-DE', { ...DATE_OPTIONS, ...TIME_OPTIONS });
}

// ============================================
// User Display Utilities
// ============================================

interface UserLike {
  name?: string | null;
  email?: string;
  isActive?: boolean;
}

// Gibt den Anzeigenamen eines Users zurück, oder "Inaktives Mitglied" wenn deaktiviert
export function getUserDisplayName(user: UserLike | null | undefined): string {
  if (!user) return 'Unbekannt';
  if (user.isActive === false) return 'Inaktives Mitglied';
  return user.name || user.email || 'Unbekannt';
}