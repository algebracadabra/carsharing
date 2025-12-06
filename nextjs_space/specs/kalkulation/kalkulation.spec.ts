/**
 * Kalkulation Spec
 * 
 * Spezifikation für die Kostenberechnung im Carsharing-System.
 * 
 * Workflow:
 * 1. Definiere die erwarteten Berechnungen als Tests
 * 2. Implementiere die Kalkulations-Logik in lib/kalkulation.ts
 * 3. Führe Tests aus bis alle grün sind
 */

import {
  berechneWertverlust,
  berechneWertverlustFuerZeitraum,
  berechneWertverlustProJahr,
  berechneWertverlustProMonat,
  WertverlustError,
  WertverlustInput,
} from '../../lib/kalkulation';

describe('Wertverlust', () => {
  describe('Beispiel 1: Standardfahrzeug', () => {
    const input: WertverlustInput = {
      aktuellesJahr: 2025,
      baujahr: 2017,
      restwert: 7000.0,
      erwarteteKmEndOfLife: 250000,
      erwarteteJahreEndOfLife: 15,
      geschaetzteKmProJahr: 15000.0,
      kilometerstand: 150000,
    };

    it('berechnet das Alter korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.alter).toBe(8);
    });

    it('berechnet Jahre_rest_alter korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.jahreRestAlter).toBe(7);
    });

    it('berechnet km_rest korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.kmRest).toBe(100000);
    });

    it('berechnet Jahre_rest_km korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.jahreRestKm).toBeCloseTo(6.6667, 3);
    });

    it('berechnet Jahre_rest als Minimum korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.jahreRest).toBeCloseTo(6.6667, 3);
    });

    it('berechnet Wertverlust_rest korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.wertverlustRest).toBe(7000);
    });

    it('berechnet Wertverlust_pro_Jahr korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.wertverlustProJahr).toBeCloseTo(1050, 0);
    });

    it('berechnet Wertverlust_pro_Monat korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.wertverlustProMonat).toBeCloseTo(87.5, 1);
    });

    it('berechnet km_rest_effektiv korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.kmRestEffektiv).toBeCloseTo(100000, 0);
    });

    it('berechnet Wertverlust_pro_km korrekt', () => {
      const result = berechneWertverlust(input);
      expect(result.wertverlustProKm).toBeCloseTo(0.07, 2);
    });
  });

  describe('Beispiel 2: Fahrzeug am Lebensende', () => {
    const input: WertverlustInput = {
      aktuellesJahr: 2035,
      baujahr: 2017,
      restwert: 1000.0,
      erwarteteKmEndOfLife: 250000,
      erwarteteJahreEndOfLife: 15,
      geschaetzteKmProJahr: 15000.0,
      kilometerstand: 260000,
    };

    it('berechnet Alter korrekt (über Lebensende)', () => {
      const result = berechneWertverlust(input);
      expect(result.alter).toBe(18);
    });

    it('setzt Jahre_rest_alter auf 0 wenn überschritten', () => {
      const result = berechneWertverlust(input);
      expect(result.jahreRestAlter).toBe(0);
    });

    it('setzt km_rest auf 0 wenn überschritten', () => {
      const result = berechneWertverlust(input);
      expect(result.kmRest).toBe(0);
    });

    it('setzt Jahre_rest auf 0', () => {
      const result = berechneWertverlust(input);
      expect(result.jahreRest).toBe(0);
    });

    it('setzt Wertverlust_pro_Jahr auf 0', () => {
      const result = berechneWertverlust(input);
      expect(result.wertverlustProJahr).toBe(0);
    });

    it('setzt Wertverlust_pro_Monat auf 0', () => {
      const result = berechneWertverlust(input);
      expect(result.wertverlustProMonat).toBe(0);
    });

    it('setzt Wertverlust_pro_km auf 0', () => {
      const result = berechneWertverlust(input);
      expect(result.wertverlustProKm).toBe(0);
    });
  });

  describe('Beispiel 3: Validierungsfehler', () => {
    it('wirft Fehler wenn geschaetzteKmProJahr = 0', () => {
      const input: WertverlustInput = {
        aktuellesJahr: 2025,
        baujahr: 2020,
        restwert: 15000.0,
        erwarteteKmEndOfLife: 250000,
        erwarteteJahreEndOfLife: 15,
        geschaetzteKmProJahr: 0,
        kilometerstand: 50000,
      };

      expect(() => berechneWertverlust(input)).toThrow(WertverlustError);
      expect(() => berechneWertverlust(input)).toThrow('geschaetzteKmProJahr muss > 0 sein');
    });

    it('wirft Fehler bei negativem Restwert', () => {
      const input: WertverlustInput = {
        aktuellesJahr: 2025,
        baujahr: 2020,
        restwert: -1000,
        erwarteteKmEndOfLife: 250000,
        erwarteteJahreEndOfLife: 15,
        geschaetzteKmProJahr: 15000,
        kilometerstand: 50000,
      };

      expect(() => berechneWertverlust(input)).toThrow('restwert darf nicht negativ sein');
    });

    it('wirft Fehler wenn aktuellesJahr vor baujahr liegt', () => {
      const input: WertverlustInput = {
        aktuellesJahr: 2019,
        baujahr: 2020,
        restwert: 15000,
        erwarteteKmEndOfLife: 250000,
        erwarteteJahreEndOfLife: 15,
        geschaetzteKmProJahr: 15000,
        kilometerstand: 50000,
      };

      expect(() => berechneWertverlust(input)).toThrow('aktuellesJahr darf nicht vor baujahr liegen');
    });
  });

  describe('Hilfsfunktionen', () => {
    const input: WertverlustInput = {
      aktuellesJahr: 2025,
      baujahr: 2017,
      restwert: 7000.0,
      erwarteteKmEndOfLife: 250000,
      erwarteteJahreEndOfLife: 15,
      geschaetzteKmProJahr: 15000.0,
      kilometerstand: 150000,
    };

    it('berechneWertverlustProJahr gibt korrekten Wert zurück', () => {
      const result = berechneWertverlustProJahr(input);
      expect(result).toBeCloseTo(1050, 0);
    });

    it('berechneWertverlustProMonat gibt korrekten Wert zurück', () => {
      const result = berechneWertverlustProMonat(input);
      expect(result).toBeCloseTo(87.5, 1);
    });

    it('berechneWertverlustFuerZeitraum berechnet für 6 Monate', () => {
      const result = berechneWertverlustFuerZeitraum(input, 6);
      expect(result).toBeCloseTo(525, 0); // 87.5 * 6
    });

    it('berechneWertverlustFuerZeitraum berechnet für 12 Monate (= 1 Jahr)', () => {
      const result = berechneWertverlustFuerZeitraum(input, 12);
      expect(result).toBeCloseTo(1050, 0);
    });
  });
});

describe('Kalkulation', () => {
  describe('Kilometerkosten', () => {
    it.todo('berechnet Kosten basierend auf gefahrenen Kilometern');
    it.todo('gibt 0 zurück wenn keine Kilometer gefahren wurden');
    it.todo('wirft Fehler bei negativen Kilometern');
  });

  describe('Fixkosten', () => {
    it.todo('berechnet monatliche Fixkosten pro Fahrzeug');
    it.todo('verteilt Fixkosten auf alle aktiven Nutzer');
  });

  describe('Gesamtkosten', () => {
    it.todo('summiert Kilometerkosten und anteilige Fixkosten');
    it.todo('rundet auf zwei Dezimalstellen');
  });

  describe('Abrechnung', () => {
    it.todo('erstellt Abrechnung für einen Zeitraum');
    it.todo('gruppiert Fahrten nach Fahrer');
    it.todo('berechnet Gesamtsumme pro Fahrer');
  });
});
