/**
 * Wertverlust-Berechnung für Fahrzeuge im Carsharing-System
 * 
 * Berechnet den zukünftigen Wertverlust eines Fahrzeugs ab heutigem Zeitpunkt
 * auf Basis des aktuellen Restwerts, des Kilometerstands und der erwarteten
 * Restlebensdauer (in Jahren und Kilometern).
 */

export interface WertverlustInput {
  /** Kalenderjahr, in dem die Berechnung durchgeführt wird */
  aktuellesJahr: number;
  /** Baujahr des Fahrzeugs */
  baujahr: number;
  /** Aktuell geschätzter Marktwert des Fahrzeugs in Euro */
  restwert: number;
  /** Erwartete Gesamtlaufleistung (in km) am wirtschaftlichen Lebensende */
  erwarteteKmEndOfLife: number;
  /** Erwartetes Alter (in Jahren) am wirtschaftlichen Lebensende */
  erwarteteJahreEndOfLife: number;
  /** Erwartete Jahresfahrleistung (ab jetzt) in km/Jahr */
  geschaetzteKmProJahr: number;
  /** Aktueller Kilometerstand des Fahrzeugs */
  kilometerstand: number;
}

export interface WertverlustOutput {
  /** Aktuelles Fahrzeugalter in Jahren */
  alter: number;
  /** Restlebensdauer basierend auf Altersgrenze */
  jahreRestAlter: number;
  /** Verbleibende km bis zur erwarteten End-of-Life-Laufleistung */
  kmRest: number;
  /** Restlebensdauer in Jahren, abgeleitet aus verbleibenden km */
  jahreRestKm: number;
  /** Effektive Restlebensdauer in Jahren */
  jahreRest: number;
  /** Zukünftiger Wertverlust ab jetzt (= restwert) */
  wertverlustRest: number;
  /** Linear verteilter jährlicher Wertverlust */
  wertverlustProJahr: number;
  /** Monatlicher Wertverlust */
  wertverlustProMonat: number;
  /** Erwartete Restkilometer während der Restlebensdauer */
  kmRestEffektiv: number;
  /** Wertverlust je zusätzlich gefahrenem Kilometer */
  wertverlustProKm: number;
}

export class WertverlustError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WertverlustError';
  }
}

/**
 * Berechnet den Wertverlust eines Fahrzeugs gemäß der Spezifikation.
 * 
 * @param input - Die Eingabeparameter für die Berechnung
 * @returns Die berechneten Wertverlust-Kennzahlen
 * @throws WertverlustError wenn geschaetzteKmProJahr <= 0
 */
export function berechneWertverlust(input: WertverlustInput): WertverlustOutput {
  const {
    aktuellesJahr,
    baujahr,
    restwert,
    erwarteteKmEndOfLife,
    erwarteteJahreEndOfLife,
    geschaetzteKmProJahr,
    kilometerstand,
  } = input;

  // Validierung
  if (geschaetzteKmProJahr <= 0) {
    throw new WertverlustError('geschaetzteKmProJahr muss > 0 sein');
  }
  if (restwert < 0) {
    throw new WertverlustError('restwert darf nicht negativ sein');
  }
  if (kilometerstand < 0) {
    throw new WertverlustError('kilometerstand darf nicht negativ sein');
  }
  if (erwarteteKmEndOfLife <= 0) {
    throw new WertverlustError('erwarteteKmEndOfLife muss > 0 sein');
  }
  if (erwarteteJahreEndOfLife <= 0) {
    throw new WertverlustError('erwarteteJahreEndOfLife muss > 0 sein');
  }
  if (aktuellesJahr < baujahr) {
    throw new WertverlustError('aktuellesJahr darf nicht vor baujahr liegen');
  }

  // Abgeleitete Werte berechnen
  const alter = aktuellesJahr - baujahr;
  
  // Jahre_rest_alter: Restlebensdauer basierend auf Altersgrenze
  const jahreRestAlter = Math.max(0, erwarteteJahreEndOfLife - alter);
  
  // km_rest: Verbleibende km bis End-of-Life
  const kmRest = Math.max(0, erwarteteKmEndOfLife - kilometerstand);
  
  // Jahre_rest_km: Restlebensdauer basierend auf km
  const jahreRestKm = kmRest / geschaetzteKmProJahr;
  
  // Jahre_rest: Effektive Restlebensdauer (das limitierende Kriterium)
  let jahreRest: number;
  if (jahreRestAlter === 0 || jahreRestKm === 0) {
    jahreRest = 0;
  } else {
    jahreRest = Math.min(jahreRestAlter, jahreRestKm);
  }
  
  // Wertverlust_rest: Zukünftiger Wertverlust = aktueller Restwert
  const wertverlustRest = restwert;
  
  // Wertverlust_pro_Jahr: Linear verteilt über Restlebensdauer
  const wertverlustProJahr = jahreRest > 0 ? wertverlustRest / jahreRest : 0;
  
  // Wertverlust_pro_Monat
  const wertverlustProMonat = wertverlustProJahr / 12;
  
  // km_rest_effektiv: Erwartete Restkilometer während der Restlebensdauer
  const kmRestEffektiv = geschaetzteKmProJahr * jahreRest;
  
  // Wertverlust_pro_km
  const wertverlustProKm = kmRestEffektiv > 0 ? wertverlustRest / kmRestEffektiv : 0;

  return {
    alter,
    jahreRestAlter,
    kmRest,
    jahreRestKm,
    jahreRest,
    wertverlustRest,
    wertverlustProJahr,
    wertverlustProMonat,
    kmRestEffektiv,
    wertverlustProKm,
  };
}

/**
 * Berechnet den Wertverlust für einen bestimmten Zeitraum.
 * 
 * @param input - Die Eingabeparameter für die Berechnung
 * @param monate - Anzahl der Monate für die Berechnung (default: 1)
 * @returns Der Wertverlust für den angegebenen Zeitraum in Euro
 */
export function berechneWertverlustFuerZeitraum(
  input: WertverlustInput,
  monate: number = 1
): number {
  const result = berechneWertverlust(input);
  return result.wertverlustProMonat * monate;
}

/**
 * Berechnet den Wertverlust für ein Jahr.
 * 
 * @param input - Die Eingabeparameter für die Berechnung
 * @returns Der jährliche Wertverlust in Euro
 */
export function berechneWertverlustProJahr(input: WertverlustInput): number {
  const result = berechneWertverlust(input);
  return result.wertverlustProJahr;
}

/**
 * Berechnet den Wertverlust für einen Monat.
 * 
 * @param input - Die Eingabeparameter für die Berechnung
 * @returns Der monatliche Wertverlust in Euro
 */
export function berechneWertverlustProMonat(input: WertverlustInput): number {
  const result = berechneWertverlust(input);
  return result.wertverlustProMonat;
}
