/**
 * Kilometerpauschalen-Empfehlung Spec
 * 
 * Spezifikation für die Berechnung der empfohlenen Kilometerpauschale.
 * 
 * Die Empfehlung basiert auf:
 * 1. Treibstoffkosten pro km (Zahlungsart: TANKEN)
 * 2. Wartungs-/Reparaturkosten pro km (Zahlungsart: PFLEGE, WARTUNG, REPARATUR)
 * 3. Fixkosten pro km (versicherungJaehrlich + steuerJaehrlich + Wertverlust)
 * 
 * Kostenkategorien-Zuordnung:
 * | Zahlungsart/Quelle        | Kostenkategorie      |
 * |---------------------------|----------------------|
 * | TANKEN                    | Treibstoffkosten     |
 * | PFLEGE, WARTUNG, REPARATUR| Wartung & Reparatur  |
 * | versicherungJaehrlich     | Fixkosten            |
 * | steuerJaehrlich           | Fixkosten            |
 * | Wertverlust (berechnet)   | Fixkosten            |
 */

import {
  berechneKilometerpauschaleEmpfehlung,
  formatEmpfehlung,
  KilometerpauschaleEmpfehlungInput,
} from '../../lib/kilometerpauschale-empfehlung';

describe('Kilometerpauschalen-Empfehlung', () => {
  describe('Grundlegende Berechnung', () => {
    it('berechnet empfohlene Pauschale aus Treibstoff-, Fix- und Wartungskosten', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.25,
        kilometerstand: 50000,
        treibstoffKosten: 1500,           // 1500€ Treibstoff (TANKEN)
        wartungsReparaturKosten: 500,      // 500€ Wartung (PFLEGE, WARTUNG, REPARATUR)
        versicherungJaehrlich: 800,        // 800€/Jahr Versicherung
        steuerJaehrlich: 400,              // 400€/Jahr Steuer
        gefahreneKmImZeitraum: 10000,      // 10.000 km gefahren
        zeitraumMonate: 12,                // in 12 Monaten
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);

      // Treibstoff: 1500€ / 10.000km = 0.15€/km
      expect(result.kostenProKm.treibstoff).toBeCloseTo(0.15, 2);
      
      // Fixkosten: (800€ + 400€) / 10.000km = 0.12€/km
      expect(result.kostenProKm.fixkosten).toBeCloseTo(0.12, 2);
      
      // Wartung: 500€ / 10.000km = 0.05€/km
      expect(result.kostenProKm.wartungReparatur).toBeCloseTo(0.05, 2);
      
      // Gesamt: 0.15 + 0.12 + 0.05 = 0.32€/km
      expect(result.kostenProKm.gesamt).toBeCloseTo(0.32, 2);
      
      // Empfohlene Pauschale
      expect(result.empfohlenePauschale).toBeCloseTo(0.32, 2);
    });

    it('berechnet Differenz zur aktuellen Pauschale', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.25,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);

      // Differenz: 0.32 - 0.25 = 0.07€/km
      expect(result.differenz).toBeCloseTo(0.07, 2);
      
      // Prozentuale Differenz: 0.07 / 0.25 * 100 = 28%
      expect(result.differenzProzent).toBeCloseTo(28, 0);
    });

    it('empfiehlt Erhöhung wenn Differenz > 5%', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.20,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);
      expect(result.empfehlung).toBe('erhoehen');
    });

    it('empfiehlt Senkung wenn Differenz < -5%', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.50,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);
      expect(result.empfehlung).toBe('senken');
    });

    it('empfiehlt Beibehaltung wenn Differenz innerhalb ±5%', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.31,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);
      expect(result.empfehlung).toBe('beibehalten');
    });
  });

  describe('Mit Wertverlust', () => {
    it('berücksichtigt Wertverlust wenn Lebenszyklus-Daten vorhanden', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.25,
        kilometerstand: 150000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 1200,
        steuerJaehrlich: 600,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
        // Lebenszyklus-Daten (Wertverlust fließt in Fixkosten ein)
        baujahr: 2017,
        restwert: 7000,
        erwarteteKmEndOfLife: 250000,
        erwarteteJahreEndOfLife: 15,
        geschaetzteKmProJahr: 15000,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);

      // Wertverlust sollte berechnet worden sein
      expect(result.wertverlustVerfuegbar).toBe(true);
      expect(result.kostenProKm.wertverlust).toBeGreaterThan(0);
      
      // Wertverlust: ~0.07€/km (aus kalkulation.spec.ts)
      expect(result.kostenProKm.wertverlust).toBeCloseTo(0.07, 2);
      
      // Gesamt sollte höher sein als ohne Wertverlust
      expect(result.kostenProKm.gesamt).toBeGreaterThan(0.32);
    });

    it('funktioniert auch ohne Lebenszyklus-Daten', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.25,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
        // Keine Lebenszyklus-Daten
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);

      expect(result.wertverlustVerfuegbar).toBe(false);
      expect(result.kostenProKm.wertverlust).toBe(0);
    });
  });

  describe('Einnahmenprognose', () => {
    it('berechnet Einnahmenunterschied für den Zeitraum', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.25,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);

      // Mit aktueller Pauschale: 10.000km * 0.25€/km = 2.500€
      expect(result.einnahmenPrognose.mitAktuellerPauschale).toBe(2500);
      
      // Mit empfohlener Pauschale: 10.000km * 0.32€/km = 3.200€
      expect(result.einnahmenPrognose.mitEmpfohlenerPauschale).toBeCloseTo(3200, 0);
      
      // Unterschied: 3.200€ - 2.500€ = 700€
      expect(result.einnahmenPrognose.unterschied).toBeCloseTo(700, 0);
      
      // Zeitraum
      expect(result.einnahmenPrognose.zeitraumMonate).toBe(12);
    });
  });

  describe('Validierung', () => {
    it('wirft Fehler wenn gefahreneKmImZeitraum <= 0', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.25,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 0,
        zeitraumMonate: 12,
      };

      expect(() => berechneKilometerpauschaleEmpfehlung(input)).toThrow(
        'gefahreneKmImZeitraum muss > 0 sein'
      );
    });

    it('wirft Fehler wenn zeitraumMonate <= 0', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.25,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 0,
      };

      expect(() => berechneKilometerpauschaleEmpfehlung(input)).toThrow(
        'zeitraumMonate muss > 0 sein'
      );
    });
  });

  describe('Formatierung', () => {
    it('formatiert Erhöhungsempfehlung korrekt', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.20,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);
      const text = formatEmpfehlung(result);

      expect(text).toContain('Erhöhung');
      expect(text).toContain('€/km');
    });

    it('formatiert Senkungsempfehlung korrekt', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.50,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);
      const text = formatEmpfehlung(result);

      expect(text).toContain('Senkung');
      expect(text).toContain('€/km');
    });

    it('formatiert Beibehaltungsempfehlung korrekt', () => {
      const input: KilometerpauschaleEmpfehlungInput = {
        kilometerpauschale: 0.31,
        kilometerstand: 50000,
        treibstoffKosten: 1500,
        wartungsReparaturKosten: 500,
        versicherungJaehrlich: 800,
        steuerJaehrlich: 400,
        gefahreneKmImZeitraum: 10000,
        zeitraumMonate: 12,
      };

      const result = berechneKilometerpauschaleEmpfehlung(input);
      const text = formatEmpfehlung(result);

      expect(text).toContain('angemessen');
    });
  });

  describe('Beispielszenarien', () => {
    describe('Szenario 1: Unterdeckung der Kosten', () => {
      /**
       * Ausgangssituation:
       * - Aktuelle Pauschale: 0.25€/km
       * - Tatsächliche Kosten: 0.35€/km
       * - Unterdeckung: 0.10€/km
       * 
       * Erwartetes Verhalten:
       * - Empfehlung: Erhöhung auf 0.35€/km
       * - Einnahmenunterschied bei 10.000km: +1.000€
       */
      it('empfiehlt Erhöhung bei Unterdeckung', () => {
        const input: KilometerpauschaleEmpfehlungInput = {
          kilometerpauschale: 0.25,
          kilometerstand: 50000,
          treibstoffKosten: 2000,           // 0.20€/km (TANKEN)
          wartungsReparaturKosten: 900,      // 0.09€/km (PFLEGE, WARTUNG, REPARATUR)
          versicherungJaehrlich: 400,        // 0.04€/km (Fixkosten)
          steuerJaehrlich: 200,              // 0.02€/km (Fixkosten)
          gefahreneKmImZeitraum: 10000,
          zeitraumMonate: 12,
        };

        const result = berechneKilometerpauschaleEmpfehlung(input);

        expect(result.empfehlung).toBe('erhoehen');
        expect(result.empfohlenePauschale).toBeCloseTo(0.35, 2);
        expect(result.einnahmenPrognose.unterschied).toBeCloseTo(1000, 0);
      });
    });

    describe('Szenario 2: Überdeckung der Kosten', () => {
      /**
       * Ausgangssituation:
       * - Aktuelle Pauschale: 0.40€/km
       * - Tatsächliche Kosten: 0.25€/km
       * - Überdeckung: 0.15€/km
       * 
       * Erwartetes Verhalten:
       * - Empfehlung: Senkung auf 0.25€/km möglich
       */
      it('empfiehlt Senkung bei Überdeckung', () => {
        const input: KilometerpauschaleEmpfehlungInput = {
          kilometerpauschale: 0.40,
          kilometerstand: 50000,
          treibstoffKosten: 1200,           // 0.12€/km (TANKEN)
          wartungsReparaturKosten: 700,      // 0.07€/km (PFLEGE, WARTUNG, REPARATUR)
          versicherungJaehrlich: 400,        // 0.04€/km (Fixkosten)
          steuerJaehrlich: 200,              // 0.02€/km (Fixkosten)
          gefahreneKmImZeitraum: 10000,
          zeitraumMonate: 12,
        };

        const result = berechneKilometerpauschaleEmpfehlung(input);

        expect(result.empfehlung).toBe('senken');
        expect(result.empfohlenePauschale).toBeCloseTo(0.25, 2);
      });
    });

    describe('Szenario 3: Pauschale passt', () => {
      /**
       * Ausgangssituation:
       * - Aktuelle Pauschale: 0.30€/km
       * - Tatsächliche Kosten: 0.29€/km
       * - Differenz: ~3%
       * 
       * Erwartetes Verhalten:
       * - Empfehlung: Beibehalten
       */
      it('empfiehlt Beibehaltung wenn Pauschale passt', () => {
        const input: KilometerpauschaleEmpfehlungInput = {
          kilometerpauschale: 0.30,
          kilometerstand: 50000,
          treibstoffKosten: 1500,           // 0.15€/km (TANKEN)
          wartungsReparaturKosten: 800,      // 0.08€/km (PFLEGE, WARTUNG, REPARATUR)
          versicherungJaehrlich: 400,        // 0.04€/km (Fixkosten)
          steuerJaehrlich: 200,              // 0.02€/km (Fixkosten)
          gefahreneKmImZeitraum: 10000,
          zeitraumMonate: 12,
        };

        const result = berechneKilometerpauschaleEmpfehlung(input);

        expect(result.empfehlung).toBe('beibehalten');
      });
    });
  });
});
