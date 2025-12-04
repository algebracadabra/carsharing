// ============================================
// Enums (matching Prisma schema)
// ============================================

export type UserRole = 'USER' | 'ADMIN';

export type FahrzeugStatus = 'VERFUEGBAR' | 'IN_WARTUNG' | 'AUSSER_BETRIEB' | 'NUR_NOTFALL';

export type BuchungStatus = 'GEPLANT' | 'LAUFEND' | 'ABGESCHLOSSEN' | 'STORNIERT';

export type FahrtStatus = 'GESTARTET' | 'ABGESCHLOSSEN';

export type ZahlungStatus = 'AUSSTEHEND' | 'BESTAETIGT';

export type ZahlungsArt = 'BAR' | 'TANKEN' | 'PFLEGE' | 'WARTUNG' | 'REPARATUR';

// ============================================
// Base Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Fahrzeug {
  id: string;
  name: string;
  foto: string | null;
  kilometerstand: number;
  kilometerpauschale: number;
  treibstoffKosten: number;
  fixkosten: number;
  wartungsReparaturKosten: number;
  halterId: string;
  schluesselablageort: string;
  status: FahrzeugStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Buchung {
  id: string;
  fahrzeugId: string;
  userId: string;
  startZeit: Date;
  endZeit: Date;
  status: BuchungStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Fahrt {
  id: string;
  buchungId: string;
  fahrzeugId: string;
  fahrerId: string;
  startKilometer: number;
  endKilometer: number | null;
  gefahreneKm: number | null;
  kosten: number | null;
  status: FahrtStatus;
  bemerkungen: string | null;
  kilometerKonflikt: boolean;
  konfliktGeloest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Zahlung {
  id: string;
  fahrerId: string;
  fahrzeugId: string;
  betrag: number;
  zahlungsart: ZahlungsArt;
  beleg: string | null;
  bestaetigung_fahrer: boolean;
  bestaetigung_halter: boolean;
  status: ZahlungStatus;
  beschreibung: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Types with Relations (for API responses)
// ============================================

export interface FahrzeugWithHalter extends Fahrzeug {
  halter: Pick<User, 'id' | 'name' | 'email'>;
}

export interface BuchungWithRelations extends Buchung {
  fahrzeug: Fahrzeug;
  user: Pick<User, 'id' | 'name' | 'email'>;
  fahrt?: Fahrt | null;
}

export interface FahrtWithRelations extends Fahrt {
  fahrzeug: Fahrzeug;
  fahrer: Pick<User, 'id' | 'name' | 'email'>;
  buchung: Buchung;
}

export interface ZahlungWithRelations extends Zahlung {
  fahrer: Pick<User, 'id' | 'name' | 'email'>;
  fahrzeug: Fahrzeug;
}

// ============================================
// Session User Type
// ============================================

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}

// ============================================
// Status Display Helpers
// ============================================

export const FAHRZEUG_STATUS_LABELS: Record<FahrzeugStatus, string> = {
  VERFUEGBAR: 'Verfügbar',
  IN_WARTUNG: 'In Wartung',
  AUSSER_BETRIEB: 'Außer Betrieb',
  NUR_NOTFALL: 'Notfallfahrzeug',
};

export const BUCHUNG_STATUS_LABELS: Record<BuchungStatus, string> = {
  GEPLANT: 'Geplant',
  LAUFEND: 'Laufend',
  ABGESCHLOSSEN: 'Abgeschlossen',
  STORNIERT: 'Storniert',
};

export const FAHRT_STATUS_LABELS: Record<FahrtStatus, string> = {
  GESTARTET: 'Gestartet',
  ABGESCHLOSSEN: 'Abgeschlossen',
};

export const ZAHLUNG_STATUS_LABELS: Record<ZahlungStatus, string> = {
  AUSSTEHEND: 'Ausstehend',
  BESTAETIGT: 'Bestätigt',
};