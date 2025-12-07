/**
 * Kilometerpauschalen-Empfehlung
 * 
 * Berechnet eine empfohlene Kilometerpauschale basierend auf den tatsächlichen
 * Kosten des Fahrzeugs. Die Empfehlung wird der aktuellen Pauschale gegenübergestellt,
 * ohne diese zu überschreiben.
 */

import { berechneWertverlust, WertverlustInput } from './kalkulation';

export interface KilometerpauschaleEmpfehlungInput {
  // Aktuelle Fahrzeugdaten
  kilometerpauschale: number;        // Aktuelle Pauschale in €/km
  kilometerstand: number;            // Aktueller Kilometerstand
  
  // Kostendaten (aus Zahlungen aggregiert)
  // TANKEN → treibstoffKosten
  treibstoffKosten: number;          // Gesamte Treibstoffkosten in € (Zahlungsart: TANKEN)
  // PFLEGE, WARTUNG, REPARATUR → wartungsReparaturKosten
  wartungsReparaturKosten: number;   // Gesamte Wartungs-/Reparaturkosten in € (Zahlungsart: PFLEGE, WARTUNG, REPARATUR)
  // Versicherung + Steuer + Wertverlust → Fixkosten
  versicherungJaehrlich: number;     // Jährliche Versicherungskosten in €
  steuerJaehrlich: number;           // Jährliche KFZ-Steuer in €
  
  // Für Wertverlust-Berechnung (optional) - Wertverlust fließt in Fixkosten ein
  baujahr?: number;
  restwert?: number;
  erwarteteKmEndOfLife?: number;
  erwarteteJahreEndOfLife?: number;
  geschaetzteKmProJahr?: number;
  
  // Zeitraum für Berechnung
  gefahreneKmImZeitraum: number;     // Gefahrene km im Betrachtungszeitraum
  zeitraumMonate: number;            // Betrachtungszeitraum in Monaten
}

/**
 * Kostenkategorien-Zuordnung:
 * 
 * | Zahlungsart/Quelle        | Kostenkategorie      |
 * |---------------------------|----------------------|
 * | TANKEN                    | Treibstoffkosten     |
 * | PFLEGE, WARTUNG, REPARATUR| Wartung & Reparatur  |
 * | versicherungJaehrlich     | Fixkosten            |
 * | steuerJaehrlich           | Fixkosten            |
 * | Wertverlust (berechnet)   | Fixkosten            |
 */

export interface KilometerpauschaleEmpfehlungOutput {
  // Empfohlene Pauschale
  empfohlenePauschale: number;       // Empfohlene Pauschale in €/km
  
  // Aktuelle Pauschale zum Vergleich
  aktuellePauschale: number;         // Aktuelle Pauschale in €/km
  
  // Differenz
  differenz: number;                 // Differenz in €/km (positiv = Erhöhung empfohlen)
  differenzProzent: number;          // Differenz in %
  
  // Empfehlung
  empfehlung: 'erhoehen' | 'senken' | 'beibehalten';
  
  // Aufschlüsselung der Kosten pro km
  kostenProKm: {
    treibstoff: number;              // Treibstoffkosten pro km
    fixkosten: number;               // Anteilige Fixkosten pro km
    wartungReparatur: number;        // Wartungs-/Reparaturkosten pro km
    wertverlust: number;             // Wertverlust pro km (falls berechenbar)
    gesamt: number;                  // Gesamtkosten pro km
  };
  
  // Einnahmenprognose (für tap & hold)
  einnahmenPrognose: {
    zeitraumMonate: number;
    mitAktuellerPauschale: number;   // Erwartete Einnahmen mit aktueller Pauschale
    mitEmpfohlenerPauschale: number; // Erwartete Einnahmen mit empfohlener Pauschale
    unterschied: number;             // Differenz (positiv = mehr Einnahmen)
  };
  
  // Vollständigkeit der Daten
  wertverlustVerfuegbar: boolean;    // Ob Wertverlust berechnet werden konnte
}

/**
 * Berechnet die empfohlene Kilometerpauschale basierend auf den tatsächlichen Kosten.
 * 
 * Die Empfehlung setzt sich zusammen aus:
 * 1. Treibstoffkosten pro km
 * 2. Anteilige Fixkosten pro km (basierend auf geschätzter Jahresfahrleistung)
 * 3. Wartungs-/Reparaturkosten pro km
 * 4. Wertverlust pro km (falls Lebenszyklus-Daten vorhanden)
 * 
 * @param input - Die Eingabeparameter für die Berechnung
 * @returns Die berechnete Empfehlung mit Aufschlüsselung
 */
export function berechneKilometerpauschaleEmpfehlung(
  input: KilometerpauschaleEmpfehlungInput
): KilometerpauschaleEmpfehlungOutput {
  const {
    kilometerpauschale,
    kilometerstand,
    treibstoffKosten,
    wartungsReparaturKosten,
    versicherungJaehrlich,
    steuerJaehrlich,
    baujahr,
    restwert,
    erwarteteKmEndOfLife,
    erwarteteJahreEndOfLife,
    geschaetzteKmProJahr,
    gefahreneKmImZeitraum,
    zeitraumMonate,
  } = input;

  // Validierung
  if (gefahreneKmImZeitraum <= 0) {
    throw new Error('gefahreneKmImZeitraum muss > 0 sein');
  }
  if (zeitraumMonate <= 0) {
    throw new Error('zeitraumMonate muss > 0 sein');
  }

  // 1. Treibstoffkosten pro km
  const treibstoffProKm = gefahreneKmImZeitraum > 0 
    ? treibstoffKosten / gefahreneKmImZeitraum 
    : 0;

  // 2. Fixkosten pro km (Versicherung + Steuer, Wertverlust wird separat berechnet)
  // Fixkosten werden auf die geschätzte Jahresfahrleistung umgelegt
  // Falls nicht vorhanden, nutzen wir die tatsächliche Fahrleistung hochgerechnet
  const jahresKm = geschaetzteKmProJahr || (gefahreneKmImZeitraum / zeitraumMonate * 12);
  const fixkostenProJahr = versicherungJaehrlich + steuerJaehrlich;
  const fixkostenProKm = jahresKm > 0 ? fixkostenProJahr / jahresKm : 0;

  // 3. Wartungs-/Reparaturkosten pro km
  const wartungProKm = gefahreneKmImZeitraum > 0 
    ? wartungsReparaturKosten / gefahreneKmImZeitraum 
    : 0;

  // 4. Wertverlust pro km (falls Lebenszyklus-Daten vorhanden)
  let wertverlustProKm = 0;
  let wertverlustVerfuegbar = false;

  if (
    baujahr !== undefined &&
    restwert !== undefined &&
    erwarteteKmEndOfLife !== undefined &&
    erwarteteJahreEndOfLife !== undefined &&
    geschaetzteKmProJahr !== undefined &&
    geschaetzteKmProJahr > 0
  ) {
    try {
      const wertverlustInput: WertverlustInput = {
        aktuellesJahr: new Date().getFullYear(),
        baujahr,
        restwert,
        erwarteteKmEndOfLife,
        erwarteteJahreEndOfLife,
        geschaetzteKmProJahr,
        kilometerstand,
      };
      const wertverlustResult = berechneWertverlust(wertverlustInput);
      wertverlustProKm = wertverlustResult.wertverlustProKm;
      wertverlustVerfuegbar = true;
    } catch (error) {
      // Wertverlust konnte nicht berechnet werden - ignorieren
      wertverlustVerfuegbar = false;
    }
  }

  // Gesamtkosten pro km
  const gesamtKostenProKm = treibstoffProKm + fixkostenProKm + wartungProKm + wertverlustProKm;

  // Empfohlene Pauschale (auf 2 Dezimalstellen gerundet)
  const empfohlenePauschale = Math.round(gesamtKostenProKm * 100) / 100;

  // Differenz zur aktuellen Pauschale
  const differenz = empfohlenePauschale - kilometerpauschale;
  const differenzProzent = kilometerpauschale > 0 
    ? (differenz / kilometerpauschale) * 100 
    : 0;

  // Empfehlung bestimmen (Toleranz von 5%)
  let empfehlung: 'erhoehen' | 'senken' | 'beibehalten';
  if (differenzProzent > 5) {
    empfehlung = 'erhoehen';
  } else if (differenzProzent < -5) {
    empfehlung = 'senken';
  } else {
    empfehlung = 'beibehalten';
  }

  // Einnahmenprognose für den gleichen Zeitraum
  const erwarteteKmPrognose = gefahreneKmImZeitraum; // Annahme: gleiche Fahrleistung
  const einnahmenAktuell = erwarteteKmPrognose * kilometerpauschale;
  const einnahmenEmpfohlen = erwarteteKmPrognose * empfohlenePauschale;

  return {
    empfohlenePauschale,
    aktuellePauschale: kilometerpauschale,
    differenz: Math.round(differenz * 100) / 100,
    differenzProzent: Math.round(differenzProzent * 10) / 10,
    empfehlung,
    kostenProKm: {
      treibstoff: Math.round(treibstoffProKm * 1000) / 1000,
      fixkosten: Math.round(fixkostenProKm * 1000) / 1000,
      wartungReparatur: Math.round(wartungProKm * 1000) / 1000,
      wertverlust: Math.round(wertverlustProKm * 1000) / 1000,
      gesamt: Math.round(gesamtKostenProKm * 1000) / 1000,
    },
    einnahmenPrognose: {
      zeitraumMonate,
      mitAktuellerPauschale: Math.round(einnahmenAktuell * 100) / 100,
      mitEmpfohlenerPauschale: Math.round(einnahmenEmpfohlen * 100) / 100,
      unterschied: Math.round((einnahmenEmpfohlen - einnahmenAktuell) * 100) / 100,
    },
    wertverlustVerfuegbar,
  };
}

/**
 * Formatiert die Empfehlung als lesbaren Text
 */
export function formatEmpfehlung(output: KilometerpauschaleEmpfehlungOutput): string {
  const { empfehlung, differenz, differenzProzent, empfohlenePauschale } = output;
  
  switch (empfehlung) {
    case 'erhoehen':
      return `Erhöhung um ${Math.abs(differenz).toFixed(2)} €/km (+${differenzProzent.toFixed(1)}%) auf ${empfohlenePauschale.toFixed(2)} €/km empfohlen`;
    case 'senken':
      return `Senkung um ${Math.abs(differenz).toFixed(2)} €/km (${differenzProzent.toFixed(1)}%) auf ${empfohlenePauschale.toFixed(2)} €/km möglich`;
    case 'beibehalten':
      return `Aktuelle Pauschale ist angemessen`;
  }
}
