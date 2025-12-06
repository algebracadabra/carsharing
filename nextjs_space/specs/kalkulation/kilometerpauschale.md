# Kilometerpauschale - Spezifikation

## Übersicht

Die Kilometerpauschale ist der Betrag in €/km, der für jede gefahrene Strecke berechnet wird. Diese Spezifikation beschreibt, wie Änderungen an der Kilometerpauschale verwaltet werden.

## Geschäftsregeln

### Regel 1: Änderungen nur zum Monatsersten

Änderungen der Kilometerpauschale werden **immer zum 1. eines Monats** wirksam:

| Änderungszeitpunkt | Gültig ab |
|-------------------|-----------|
| Am 1. des Monats | Sofort (gleicher Tag) |
| An jedem anderen Tag | 1. des Folgemonats |

**Beispiel:**
- Änderung am 15. Juni → gilt ab 1. Juli
- Änderung am 1. Juli → gilt ab 1. Juli (sofort)

### Regel 2: Bereits berechnete Fahrten bleiben unberührt

Wenn eine Pauschale geändert wird, werden **keine bestehenden Fahrten neu berechnet**. Die Kosten einer Fahrt werden einmalig bei Fahrtabschluss berechnet und bleiben danach unverändert.

### Regel 3: Historische Pauschale bei Kostenberechnung

Bei der Kostenberechnung einer Fahrt wird die Pauschale verwendet, die **zum Zeitpunkt des Fahrtbeginns** gültig war.

```
Kosten = Gefahrene Kilometer × Pauschale (zum Fahrtbeginn gültig)
```

## Datenmodell

### KilometerpauschaleHistorie

```prisma
model KilometerpauschaleHistorie {
  id            String    @id @default(cuid())
  fahrzeugId    String
  pauschale     Float     // €/km
  gueltigAb     DateTime  // Immer der 1. eines Monats
  createdAt     DateTime  @default(now())

  fahrzeug      Fahrzeug  @relation(...)
  
  @@index([fahrzeugId, gueltigAb])
}
```

## API

### Pauschale ändern

**Endpoint:** `PATCH /api/fahrzeuge/[id]`

**Request:**
```json
{
  "kilometerpauschale": 0.30,
  "kilometerpauschaleGueltigAb": "2025-07-01"  // optional
}
```

**Verhalten:**
1. Wenn `kilometerpauschaleGueltigAb` angegeben → verwende dieses Datum
2. Wenn nicht angegeben:
   - Heute ist der 1. → gilt ab heute
   - Sonst → gilt ab nächstem Monatsersten
3. Erstelle Historieneintrag
4. Aktualisiere `Fahrzeug.kilometerpauschale` nur wenn Änderung sofort gilt

**Fehler:**
- `400 Bad Request`: Rückwirkende Änderungen sind nicht erlaubt

### Gültige Pauschale ermitteln

**Funktion:** `getGueltigeKilometerpauschale(fahrzeugId, datum)`

**Algorithmus:**
1. Suche in `KilometerpauschaleHistorie`:
   - `WHERE fahrzeugId = ?`
   - `AND gueltigAb <= datum`
   - `ORDER BY gueltigAb DESC`
   - `LIMIT 1`
2. Falls kein Eintrag → verwende `Fahrzeug.kilometerpauschale`

## Beispielszenarien

### Szenario 1: Einfache Erhöhung

```
Ausgangssituation:
- Fahrzeug "VW Golf" hat Pauschale 0.25€/km
- Heute: 15. Juni 2025
- Admin erhöht auf 0.30€/km

Ergebnis:
- Änderung gilt ab 1. Juli 2025
- Fahrten bis 30. Juni: 0.25€/km
- Fahrten ab 1. Juli: 0.30€/km
```

### Szenario 2: Änderung am Monatsersten

```
Ausgangssituation:
- Fahrzeug "VW Golf" hat Pauschale 0.25€/km
- Heute: 1. Juli 2025
- Admin erhöht auf 0.30€/km

Ergebnis:
- Änderung gilt sofort (ab 1. Juli 2025)
- Fahrten bis 30. Juni: 0.25€/km
- Fahrten ab 1. Juli: 0.30€/km
```

### Szenario 3: Fahrt über Monatswechsel

```
Ausgangssituation:
- Pauschale bis 30. Juni: 0.25€/km
- Pauschale ab 1. Juli: 0.30€/km
- Fahrt startet am 28. Juni, endet am 3. Juli
- Gefahrene km: 500

Berechnung:
- Maßgeblich ist der Fahrtbeginn (28. Juni)
- Gültige Pauschale: 0.25€/km
- Kosten: 500 × 0.25 = 125.00€
```

## Frontend-Hinweis

Bei Änderung der Kilometerpauschale wird dem Benutzer ein Hinweis angezeigt:

> **Änderung gilt ab [Datum]**
> 
> Bereits berechnete Fahrten bleiben unberührt. Die neue Pauschale wird nur für Fahrten verwendet, die ab dem Gültigkeitsdatum beginnen.

## Implementierte Dateien

| Datei | Beschreibung |
|-------|--------------|
| `prisma/schema.prisma` | Datenmodell `KilometerpauschaleHistorie` |
| `lib/kilometerpauschale.ts` | Hilfsfunktionen für Pauschale-Verwaltung |
| `app/api/fahrzeuge/[id]/route.ts` | API für Pauschale-Änderung |
| `app/api/fahrten/[id]/route.ts` | Kostenberechnung mit historischer Pauschale |
| `app/fahrzeuge/[id]/bearbeiten/page.tsx` | Frontend mit Gültigkeits-Hinweis |

## Hilfsfunktionen

```typescript
// lib/kilometerpauschale.ts

// Ermittelt die gültige Pauschale für ein Fahrzeug zu einem Datum
getGueltigeKilometerpauschale(fahrzeugId: string, datum: Date): Promise<number>

// Erstellt einen neuen Pauschale-Historieneintrag
setKilometerpauschale(fahrzeugId: string, pauschale: number, gueltigAb: Date): Promise<...>

// Datums-Hilfsfunktionen
getFirstOfMonth(date: Date): Date
getFirstOfNextMonth(date: Date): Date
isFirstOfMonth(date: Date): boolean
isAenderungErlaubt(gueltigAbDatum: Date): boolean

// Historie abrufen
getKilometerpauschaleHistorie(fahrzeugId: string): Promise<...>
```
