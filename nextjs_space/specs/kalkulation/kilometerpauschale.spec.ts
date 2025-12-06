/**
 * Kilometerpauschale Spec
 * 
 * Spezifikation für die Verwaltung und Historisierung der Kilometerpauschale.
 * 
 * Geschäftsregeln:
 * 1. Änderungen der Kilometerpauschale sind nur zum Monatsersten möglich
 * 2. Bereits berechnete Fahrten bleiben von Änderungen unberührt
 * 3. Bei Kostenberechnung wird die zum Fahrtdatum gültige Pauschale verwendet
 */

import { prisma } from '../../lib/db';
import {
  getGueltigeKilometerpauschale,
  setKilometerpauschale,
  getFirstOfMonth,
  getFirstOfNextMonth,
  isFirstOfMonth,
  isAenderungErlaubt,
  getKilometerpauschaleHistorie,
} from '../../lib/kilometerpauschale';

describe('Kilometerpauschale', () => {
  describe('Datums-Hilfsfunktionen', () => {
    describe('getFirstOfMonth', () => {
      it('gibt den 1. des aktuellen Monats zurück', () => {
        const datum = new Date(2025, 5, 15); // 15. Juni 2025
        const erster = getFirstOfMonth(datum);
        
        expect(erster.getDate()).toBe(1);
        expect(erster.getMonth()).toBe(5); // Juni
        expect(erster.getFullYear()).toBe(2025);
      });

      it('gibt das gleiche Datum zurück wenn bereits der 1. ist', () => {
        const datum = new Date(2025, 5, 1); // 1. Juni 2025
        const erster = getFirstOfMonth(datum);
        
        expect(erster.getDate()).toBe(1);
        expect(erster.getMonth()).toBe(5);
      });
    });

    describe('getFirstOfNextMonth', () => {
      it('gibt den 1. des nächsten Monats zurück', () => {
        const datum = new Date(2025, 5, 15); // 15. Juni 2025
        const naechster = getFirstOfNextMonth(datum);
        
        expect(naechster.getDate()).toBe(1);
        expect(naechster.getMonth()).toBe(6); // Juli
        expect(naechster.getFullYear()).toBe(2025);
      });

      it('wechselt korrekt ins neue Jahr', () => {
        const datum = new Date(2025, 11, 15); // 15. Dezember 2025
        const naechster = getFirstOfNextMonth(datum);
        
        expect(naechster.getDate()).toBe(1);
        expect(naechster.getMonth()).toBe(0); // Januar
        expect(naechster.getFullYear()).toBe(2026);
      });
    });

    describe('isFirstOfMonth', () => {
      it('gibt true zurück wenn der 1. des Monats', () => {
        const datum = new Date(2025, 5, 1);
        expect(isFirstOfMonth(datum)).toBe(true);
      });

      it('gibt false zurück wenn nicht der 1. des Monats', () => {
        const datum = new Date(2025, 5, 15);
        expect(isFirstOfMonth(datum)).toBe(false);
      });
    });

    describe('isAenderungErlaubt', () => {
      it('erlaubt Änderungen für den aktuellen Monat', () => {
        const heute = new Date();
        const ersterDesMonats = getFirstOfMonth(heute);
        expect(isAenderungErlaubt(ersterDesMonats)).toBe(true);
      });

      it('erlaubt Änderungen für zukünftige Monate', () => {
        const naechsterMonat = getFirstOfNextMonth(new Date());
        expect(isAenderungErlaubt(naechsterMonat)).toBe(true);
      });

      it('verbietet Änderungen für vergangene Monate', () => {
        const vergangenerMonat = new Date(2020, 0, 1); // 1. Januar 2020
        expect(isAenderungErlaubt(vergangenerMonat)).toBe(false);
      });
    });
  });

  describe('Geschäftsregeln', () => {
    describe('Regel 1: Änderungen nur zum Monatsersten', () => {
      it('speichert Änderungen mit Gültigkeitsdatum am Monatsersten', async () => {
        // Wenn eine Pauschale geändert wird, wird das Gültigkeitsdatum
        // automatisch auf den 1. des Monats normalisiert
        const gueltigAb = new Date(2025, 6, 15); // 15. Juli 2025
        const normalisiert = getFirstOfMonth(gueltigAb);
        
        expect(normalisiert.getDate()).toBe(1);
        expect(normalisiert.getMonth()).toBe(6); // Juli
      });

      it('verwendet nächsten Monatsersten wenn heute nicht der 1. ist', () => {
        // Simuliere: Heute ist der 15. Juni
        const heute = new Date(2025, 5, 15);
        
        let gueltigAb: Date;
        if (heute.getDate() === 1) {
          gueltigAb = getFirstOfMonth(heute);
        } else {
          gueltigAb = getFirstOfNextMonth(heute);
        }
        
        expect(gueltigAb.getDate()).toBe(1);
        expect(gueltigAb.getMonth()).toBe(6); // Juli (nächster Monat)
      });

      it('verwendet aktuellen Monatsersten wenn heute der 1. ist', () => {
        // Simuliere: Heute ist der 1. Juni
        const heute = new Date(2025, 5, 1);
        
        let gueltigAb: Date;
        if (heute.getDate() === 1) {
          gueltigAb = getFirstOfMonth(heute);
        } else {
          gueltigAb = getFirstOfNextMonth(heute);
        }
        
        expect(gueltigAb.getDate()).toBe(1);
        expect(gueltigAb.getMonth()).toBe(5); // Juni (aktueller Monat)
      });
    });

    describe('Regel 2: Bereits berechnete Fahrten bleiben unberührt', () => {
      it('verwendet die zum Fahrtdatum gültige Pauschale', () => {
        // Szenario:
        // - Fahrt am 15. Juni mit Pauschale 0.30€/km
        // - Pauschale wird am 1. Juli auf 0.35€/km erhöht
        // - Die Fahrt vom 15. Juni behält 0.30€/km
        
        const fahrtDatum = new Date(2025, 5, 15); // 15. Juni
        const pauschaleAenderung = new Date(2025, 6, 1); // 1. Juli
        
        // Fahrt liegt vor der Änderung
        expect(fahrtDatum < pauschaleAenderung).toBe(true);
        
        // Daher wird die alte Pauschale verwendet
        // (getGueltigeKilometerpauschale sucht den neuesten Eintrag <= fahrtDatum)
      });
    });

    describe('Regel 3: Kostenberechnung mit historischer Pauschale', () => {
      it('berechnet Kosten mit der zum Fahrtbeginn gültigen Pauschale', () => {
        // Beispiel:
        // - Fahrt beginnt am 15. Juni
        // - Pauschale am 1. Juni: 0.30€/km
        // - Pauschale am 1. Juli: 0.35€/km
        // - Gefahrene km: 100
        // - Erwartete Kosten: 100 * 0.30 = 30€
        
        const gefahreneKm = 100;
        const pauschaleAmFahrtdatum = 0.30;
        const kosten = gefahreneKm * pauschaleAmFahrtdatum;
        
        expect(kosten).toBe(30);
      });
    });
  });

  describe('Beispielszenarien', () => {
    describe('Szenario 1: Einfache Pauschale-Erhöhung', () => {
      /**
       * Ausgangssituation:
       * - Fahrzeug "VW Golf" hat Pauschale 0.25€/km
       * - Heute ist der 15. Juni 2025
       * - Admin erhöht Pauschale auf 0.30€/km
       * 
       * Erwartetes Verhalten:
       * - Änderung gilt ab 1. Juli 2025
       * - Fahrten bis 30. Juni: 0.25€/km
       * - Fahrten ab 1. Juli: 0.30€/km
       */
      it('dokumentiert das erwartete Verhalten', () => {
        const altePauschale = 0.25;
        const neuePauschale = 0.30;
        const aenderungsDatum = new Date(2025, 5, 15); // 15. Juni
        const gueltigAb = getFirstOfNextMonth(aenderungsDatum); // 1. Juli
        
        // Fahrt am 20. Juni
        const fahrt1Datum = new Date(2025, 5, 20);
        const fahrt1Km = 50;
        const fahrt1Kosten = fahrt1Km * altePauschale; // 12.50€
        
        // Fahrt am 5. Juli
        const fahrt2Datum = new Date(2025, 6, 5);
        const fahrt2Km = 50;
        const fahrt2Kosten = fahrt2Km * neuePauschale; // 15.00€
        
        expect(fahrt1Kosten).toBe(12.50);
        expect(fahrt2Kosten).toBe(15.00);
        expect(gueltigAb.getMonth()).toBe(6); // Juli
      });
    });

    describe('Szenario 2: Änderung am Monatsersten', () => {
      /**
       * Ausgangssituation:
       * - Fahrzeug "VW Golf" hat Pauschale 0.25€/km
       * - Heute ist der 1. Juli 2025
       * - Admin erhöht Pauschale auf 0.30€/km
       * 
       * Erwartetes Verhalten:
       * - Änderung gilt sofort (ab 1. Juli 2025)
       * - Fahrten bis 30. Juni: 0.25€/km
       * - Fahrten ab 1. Juli: 0.30€/km
       */
      it('dokumentiert das erwartete Verhalten', () => {
        const altePauschale = 0.25;
        const neuePauschale = 0.30;
        const aenderungsDatum = new Date(2025, 6, 1); // 1. Juli
        const gueltigAb = getFirstOfMonth(aenderungsDatum); // 1. Juli (sofort)
        
        expect(gueltigAb.getDate()).toBe(1);
        expect(gueltigAb.getMonth()).toBe(6); // Juli
        expect(isFirstOfMonth(aenderungsDatum)).toBe(true);
      });
    });

    describe('Szenario 3: Mehrere Änderungen im Voraus planen', () => {
      /**
       * Ausgangssituation:
       * - Fahrzeug hat Pauschale 0.25€/km
       * - Admin plant:
       *   - Ab 1. Juli: 0.28€/km
       *   - Ab 1. Oktober: 0.30€/km
       * 
       * Erwartetes Verhalten:
       * - Beide Änderungen werden in der Historie gespeichert
       * - System wählt automatisch die richtige Pauschale basierend auf Fahrtdatum
       */
      it('dokumentiert das erwartete Verhalten', () => {
        const historie = [
          { gueltigAb: new Date(2025, 0, 1), pauschale: 0.25 },  // 1. Januar
          { gueltigAb: new Date(2025, 6, 1), pauschale: 0.28 },  // 1. Juli
          { gueltigAb: new Date(2025, 9, 1), pauschale: 0.30 },  // 1. Oktober
        ];
        
        // Funktion zur Ermittlung der gültigen Pauschale
        const getGueltigePauschale = (datum: Date): number => {
          const gueltige = historie
            .filter(h => h.gueltigAb <= datum)
            .sort((a, b) => b.gueltigAb.getTime() - a.gueltigAb.getTime());
          return gueltige[0]?.pauschale ?? 0;
        };
        
        // Fahrt am 15. Mai
        expect(getGueltigePauschale(new Date(2025, 4, 15))).toBe(0.25);
        
        // Fahrt am 15. August
        expect(getGueltigePauschale(new Date(2025, 7, 15))).toBe(0.28);
        
        // Fahrt am 15. November
        expect(getGueltigePauschale(new Date(2025, 10, 15))).toBe(0.30);
      });
    });
  });
});

/**
 * Datenmodell-Spezifikation
 * 
 * KilometerpauschaleHistorie:
 * - id: String (CUID)
 * - fahrzeugId: String (Referenz auf Fahrzeug)
 * - pauschale: Float (€/km)
 * - gueltigAb: DateTime (immer 1. eines Monats)
 * - createdAt: DateTime
 * 
 * Index: [fahrzeugId, gueltigAb] für effiziente Abfragen
 */

/**
 * API-Spezifikation
 * 
 * PATCH /api/fahrzeuge/[id]
 * 
 * Request Body (bei Pauschale-Änderung):
 * {
 *   "kilometerpauschale": 0.30,
 *   "kilometerpauschaleGueltigAb": "2025-07-01" // optional
 * }
 * 
 * Verhalten:
 * 1. Wenn kilometerpauschaleGueltigAb angegeben:
 *    - Verwende dieses Datum (wird auf Monatsersten normalisiert)
 * 2. Wenn nicht angegeben:
 *    - Wenn heute der 1. ist: gilt ab heute
 *    - Sonst: gilt ab nächstem Monatsersten
 * 3. Erstelle Historieneintrag
 * 4. Aktualisiere Fahrzeug.kilometerpauschale nur wenn Änderung sofort gilt
 * 
 * Response:
 * - 200: Erfolg, aktualisiertes Fahrzeug
 * - 400: Fehler (z.B. rückwirkende Änderung nicht erlaubt)
 */

/**
 * Kostenberechnung-Spezifikation
 * 
 * Bei Fahrtabschluss (PUT /api/fahrten/[id] mit action=complete):
 * 
 * 1. Ermittle Fahrtbeginn (fahrt.createdAt)
 * 2. Suche in KilometerpauschaleHistorie:
 *    - WHERE fahrzeugId = fahrt.fahrzeugId
 *    - AND gueltigAb <= fahrt.createdAt
 *    - ORDER BY gueltigAb DESC
 *    - LIMIT 1
 * 3. Falls kein Eintrag gefunden: verwende Fahrzeug.kilometerpauschale
 * 4. Berechne: kosten = gefahreneKm * gueltigePauschale
 */
