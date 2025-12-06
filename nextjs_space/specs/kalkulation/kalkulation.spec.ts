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
