// ============================================
// Enums (matching Prisma schema)
// ============================================

export type UserRole = 'USER' | 'ADMIN';

export type FahrzeugStatus = 'VERFUEGBAR' | 'IN_WARTUNG' | 'AUSSER_BETRIEB' | 'NUR_NOTFALL';

export type BuchungStatus = 'GEPLANT' | 'LAUFEND' | 'ABGESCHLOSSEN' | 'STORNIERT';

export type FahrtStatus = 'GESTARTET' | 'ABGESCHLOSSEN';

export type ZahlungStatus = 'AUSSTEHEND' | 'BESTAETIGT';

export type ZahlungsArt = 'BAR' | 'TANKEN' | 'PFLEGE' | 'WARTUNG' | 'REPARATUR';

export type WartungsIntervallTyp = 'KILOMETER' | 'WOCHEN' | 'MONATE' | 'JAEHRLICH';

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
  // Lebenszyklus-Felder (nur Admin editierbar)
  baujahr: number | null;
  restwert: number | null;
  erwarteteKmEndOfLife: number | null;
  erwarteteJahreEndOfLife: number | null;
  geschaetzteKmProJahr: number | null;
  // Steckbrief-Felder
  versicherungsart: string | null;
  kraftstoffart: string | null;
  aktuelleReifen: string | null;
  naechsterOelwechsel: string | null;
  reinigungszyklus: string | null;
  motoroelTyp: string | null;
  kuehlerFrostschutzTyp: string | null;
  anzahlSitze: number | null;
  anhaengerkupplung: boolean;
  kindersitz: boolean;
  defekte: string | null;
  naechsterTuev: string | null;
  macken: string | null;
  sonstigeHinweise: string | null;
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

export interface WartungsIntervall {
  id: string;
  fahrzeugId: string;
  name: string;
  beschreibung: string | null;
  intervallTyp: WartungsIntervallTyp;
  intervallWert: number;
  monatImJahr: number | null;
  aktiv: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WartungsTask {
  id: string;
  fahrzeugId: string;
  wartungsIntervallId: string | null;
  titel: string;
  beschreibung: string | null;
  faelligAm: Date | null;
  faelligBeiKm: number | null;
  erledigt: boolean;
  erledigtAm: Date | null;
  erledigtVonId: string | null;
  zugewiesenAnId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WartungsIntervallWithTasks extends WartungsIntervall {
  tasks: WartungsTask[];
}

export interface WartungsTaskWithRelations extends WartungsTask {
  fahrzeug: Pick<Fahrzeug, 'id' | 'name' | 'foto' | 'kilometerstand'>;
  wartungsIntervall: Pick<WartungsIntervall, 'id' | 'name'> | null;
  erledigtVon: Pick<User, 'id' | 'name'> | null;
  zugewiesenAn: Pick<User, 'id' | 'name'> | null;
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

export const WARTUNGS_INTERVALL_TYP_LABELS: Record<WartungsIntervallTyp, string> = {
  KILOMETER: 'Kilometer',
  WOCHEN: 'Wochen',
  MONATE: 'Monate',
  JAEHRLICH: 'Jährlich',
};

export const MONAT_LABELS: Record<number, string> = {
  1: 'Januar',
  2: 'Februar',
  3: 'März',
  4: 'April',
  5: 'Mai',
  6: 'Juni',
  7: 'Juli',
  8: 'August',
  9: 'September',
  10: 'Oktober',
  11: 'November',
  12: 'Dezember',
};