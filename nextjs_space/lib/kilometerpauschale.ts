import { prisma } from '@/lib/db';

/**
 * Ermittelt den ersten Tag des angegebenen Monats
 */
export function getFirstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Ermittelt den ersten Tag des nächsten Monats
 */
export function getFirstOfNextMonth(date: Date = new Date()): Date {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return nextMonth;
}

/**
 * Prüft ob das angegebene Datum der erste Tag eines Monats ist
 */
export function isFirstOfMonth(date: Date): boolean {
  return date.getDate() === 1;
}

/**
 * Ermittelt die gültige Kilometerpauschale für ein Fahrzeug zu einem bestimmten Datum.
 * Sucht in der Historie nach dem neuesten Eintrag, dessen gueltigAb <= datum ist.
 * Falls kein Historieneintrag existiert, wird die aktuelle Pauschale des Fahrzeugs verwendet.
 */
export async function getGueltigeKilometerpauschale(
  fahrzeugId: string,
  datum: Date
): Promise<number> {
  // Suche den neuesten Historieneintrag, der vor oder am angegebenen Datum gültig wurde
  const historieEintrag = await prisma.kilometerpauschaleHistorie.findFirst({
    where: {
      fahrzeugId,
      gueltigAb: {
        lte: datum,
      },
    },
    orderBy: {
      gueltigAb: 'desc',
    },
  });

  if (historieEintrag) {
    return historieEintrag.pauschale;
  }

  // Fallback: Aktuelle Pauschale des Fahrzeugs verwenden
  const fahrzeug = await prisma.fahrzeug.findUnique({
    where: { id: fahrzeugId },
    select: { kilometerpauschale: true },
  });

  return fahrzeug?.kilometerpauschale ?? 0;
}

/**
 * Erstellt einen neuen Kilometerpauschale-Historieneintrag.
 * Die Änderung wird immer zum 1. des angegebenen Monats wirksam.
 * 
 * @param fahrzeugId - ID des Fahrzeugs
 * @param neuePauschale - Neue Kilometerpauschale in €/km
 * @param gueltigAbDatum - Datum ab dem die Pauschale gilt (wird auf Monatsersten normalisiert)
 * @returns Der erstellte Historieneintrag
 * @throws Error wenn das Datum nicht der 1. eines Monats ist oder in der Vergangenheit liegt
 */
export async function setKilometerpauschale(
  fahrzeugId: string,
  neuePauschale: number,
  gueltigAbDatum: Date
): Promise<{ id: string; pauschale: number; gueltigAb: Date }> {
  const gueltigAb = getFirstOfMonth(gueltigAbDatum);
  const heute = new Date();
  const ersterDesAktuellenMonats = getFirstOfMonth(heute);

  // Prüfen ob das Datum in der Vergangenheit liegt (vor dem aktuellen Monat)
  if (gueltigAb < ersterDesAktuellenMonats) {
    throw new Error('Änderungen können nicht rückwirkend vorgenommen werden');
  }

  // Prüfen ob bereits ein Eintrag für diesen Monat existiert
  const existierenderEintrag = await prisma.kilometerpauschaleHistorie.findFirst({
    where: {
      fahrzeugId,
      gueltigAb,
    },
  });

  if (existierenderEintrag) {
    // Bestehenden Eintrag aktualisieren
    return await prisma.kilometerpauschaleHistorie.update({
      where: { id: existierenderEintrag.id },
      data: { pauschale: neuePauschale },
    });
  }

  // Neuen Eintrag erstellen
  return await prisma.kilometerpauschaleHistorie.create({
    data: {
      fahrzeugId,
      pauschale: neuePauschale,
      gueltigAb,
    },
  });
}

/**
 * Holt alle Kilometerpauschale-Historieneinträge für ein Fahrzeug
 */
export async function getKilometerpauschaleHistorie(fahrzeugId: string) {
  return await prisma.kilometerpauschaleHistorie.findMany({
    where: { fahrzeugId },
    orderBy: { gueltigAb: 'desc' },
  });
}

/**
 * Prüft ob eine Pauschale-Änderung für den angegebenen Monat erlaubt ist
 * (nur aktueller oder zukünftiger Monat)
 */
export function isAenderungErlaubt(gueltigAbDatum: Date): boolean {
  const gueltigAb = getFirstOfMonth(gueltigAbDatum);
  const ersterDesAktuellenMonats = getFirstOfMonth(new Date());
  return gueltigAb >= ersterDesAktuellenMonats;
}
