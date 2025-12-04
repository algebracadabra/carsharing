'use client';

import { cn } from '@/lib/utils';
import {
  FahrzeugStatus,
  BuchungStatus,
  FahrtStatus,
  ZahlungStatus,
  FAHRZEUG_STATUS_LABELS,
  BUCHUNG_STATUS_LABELS,
  FAHRT_STATUS_LABELS,
  ZAHLUNG_STATUS_LABELS,
} from '@/lib/types';

// ============================================
// Status Badge Styles
// ============================================

const FAHRZEUG_STATUS_STYLES: Record<FahrzeugStatus, string> = {
  VERFUEGBAR: 'bg-green-100 text-green-700',
  IN_WARTUNG: 'bg-yellow-100 text-yellow-700',
  AUSSER_BETRIEB: 'bg-red-100 text-red-700',
};

const BUCHUNG_STATUS_STYLES: Record<BuchungStatus, string> = {
  GEPLANT: 'bg-blue-100 text-blue-700',
  LAUFEND: 'bg-purple-100 text-purple-700',
  ABGESCHLOSSEN: 'bg-green-100 text-green-700',
  STORNIERT: 'bg-red-100 text-red-700',
};

const FAHRT_STATUS_STYLES: Record<FahrtStatus, string> = {
  GESTARTET: 'bg-green-100 text-green-700',
  ABGESCHLOSSEN: 'bg-blue-100 text-blue-700',
};

const ZAHLUNG_STATUS_STYLES: Record<ZahlungStatus, string> = {
  AUSSTEHEND: 'bg-yellow-100 text-yellow-700',
  BESTAETIGT: 'bg-green-100 text-green-700',
};

// ============================================
// Base Badge Component
// ============================================

interface BaseBadgeProps {
  label: string;
  className?: string;
}

function BaseBadge({ label, className }: BaseBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full',
        className
      )}
    >
      {label}
    </span>
  );
}

// ============================================
// Typed Status Badges
// ============================================

interface FahrzeugStatusBadgeProps {
  status: FahrzeugStatus;
  className?: string;
}

export function FahrzeugStatusBadge({ status, className }: FahrzeugStatusBadgeProps) {
  return (
    <BaseBadge
      label={FAHRZEUG_STATUS_LABELS[status]}
      className={cn(FAHRZEUG_STATUS_STYLES[status], className)}
    />
  );
}

interface BuchungStatusBadgeProps {
  status: BuchungStatus;
  className?: string;
}

export function BuchungStatusBadge({ status, className }: BuchungStatusBadgeProps) {
  return (
    <BaseBadge
      label={BUCHUNG_STATUS_LABELS[status]}
      className={cn(BUCHUNG_STATUS_STYLES[status], className)}
    />
  );
}

interface FahrtStatusBadgeProps {
  status: FahrtStatus;
  className?: string;
}

export function FahrtStatusBadge({ status, className }: FahrtStatusBadgeProps) {
  return (
    <BaseBadge
      label={FAHRT_STATUS_LABELS[status]}
      className={cn(FAHRT_STATUS_STYLES[status], className)}
    />
  );
}

interface ZahlungStatusBadgeProps {
  status: ZahlungStatus;
  className?: string;
}

export function ZahlungStatusBadge({ status, className }: ZahlungStatusBadgeProps) {
  return (
    <BaseBadge
      label={ZAHLUNG_STATUS_LABELS[status]}
      className={cn(ZAHLUNG_STATUS_STYLES[status], className)}
    />
  );
}
