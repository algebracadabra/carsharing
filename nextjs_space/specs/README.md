# Spec-Driven Development

## Struktur

```
specs/
├── setup.ts              # Globale Test-Konfiguration
├── README.md             # Diese Dokumentation
├── kalkulation/          # Kalkulation-Specs
│   └── kalkulation.spec.ts
├── buchungen/            # Buchungen-Specs
├── fahrten/              # Fahrten-Specs
└── ...
```

## Workflow

1. **Spec schreiben** - Definiere das erwartete Verhalten
2. **Test ausführen** - Verifiziere, dass der Test fehlschlägt
3. **Implementieren** - Schreibe den Code, der den Test erfüllt
4. **Refactoren** - Verbessere den Code bei grünen Tests

## Befehle

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Modus
npm run test:watch

# Tests mit Coverage
npm run test:coverage

# Einzelne Spec ausführen
npm test -- kalkulation
```

## Spec-Konventionen

- Dateiname: `*.spec.ts`
- Beschreibungen auf Deutsch
- Gruppierung mit `describe` nach Feature
- Einzelne Tests mit `it` oder `test`
- AAA-Pattern: Arrange, Act, Assert

## Beispiel

```typescript
describe('Kalkulation', () => {
  describe('Kilometerkosten', () => {
    it('berechnet Kosten basierend auf gefahrenen Kilometern', () => {
      // Arrange
      const startKm = 1000;
      const endKm = 1100;
      const preisProKm = 0.30;

      // Act
      const kosten = berechneKilometerkosten(startKm, endKm, preisProKm);

      // Assert
      expect(kosten).toBe(30.0);
    });
  });
});
```
