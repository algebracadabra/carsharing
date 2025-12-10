import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

/**
 * GET /api/fahrzeuge/[id]/statistik
 * 
 * Liefert Kilometer-Statistiken für ein Fahrzeug.
 * 
 * Query-Parameter:
 * - zeitraum: 'monat' | 'jahr' | 'gesamt' (default: 'monat')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const zeitraum = searchParams.get('zeitraum') || 'monat';

    // Fahrzeug prüfen
    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!fahrzeug) {
      return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });
    }

    // Zeitraum-Grenzen berechnen
    const jetzt = new Date();
    let startDatum: Date;
    let zeitraumLabel: string;

    switch (zeitraum) {
      case 'monat':
        // Aktueller Monat
        startDatum = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1);
        zeitraumLabel = jetzt.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        break;
      case 'jahr':
        // Aktuelles Jahr
        startDatum = new Date(jetzt.getFullYear(), 0, 1);
        zeitraumLabel = jetzt.getFullYear().toString();
        break;
      case 'gesamt':
        // Alle Fahrten
        startDatum = new Date(0);
        zeitraumLabel = 'Gesamt';
        break;
      default:
        startDatum = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1);
        zeitraumLabel = jetzt.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    }

    // Fahrten im Zeitraum abrufen
    const fahrten = await prisma.fahrt.findMany({
      where: {
        fahrzeugId: id,
        status: 'ABGESCHLOSSEN',
        createdAt: {
          gte: startDatum,
          lte: jetzt,
        },
      },
      select: {
        gefahreneKm: true,
        kosten: true,
        createdAt: true,
      },
    });

    const gefahreneKm = fahrten.reduce((sum, f) => sum + (f.gefahreneKm || 0), 0);
    const einnahmen = fahrten.reduce((sum, f) => sum + (f.kosten || 0), 0);
    const anzahlFahrten = fahrten.length;

    // Zahlungen im Zeitraum abrufen für Kosten-Statistik
    const zahlungen = await prisma.zahlung.findMany({
      where: {
        fahrzeugId: id,
        createdAt: {
          gte: startDatum,
          lte: jetzt,
        },
      },
      select: {
        betrag: true,
        zahlungsart: true,
      },
    });

    // Kosten nach Kategorie berechnen
    const treibstoffKosten = zahlungen
      .filter(z => z.zahlungsart === 'TANKEN')
      .reduce((sum, z) => sum + z.betrag, 0);
    
    const wartungsReparaturKosten = zahlungen
      .filter(z => ['PFLEGE', 'WARTUNG', 'REPARATUR'].includes(z.zahlungsart))
      .reduce((sum, z) => sum + z.betrag, 0);

    // Auch Statistiken für alle Zeiträume laden (für Übersicht)
    const monatStart = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1);
    const jahrStart = new Date(jetzt.getFullYear(), 0, 1);

    // Kosten-Statistiken für alle Zeiträume
    const [zahlungenMonat, zahlungenJahr, zahlungenGesamt] = await Promise.all([
      prisma.zahlung.findMany({
        where: { fahrzeugId: id, createdAt: { gte: monatStart, lte: jetzt } },
        select: { betrag: true, zahlungsart: true },
      }),
      prisma.zahlung.findMany({
        where: { fahrzeugId: id, createdAt: { gte: jahrStart, lte: jetzt } },
        select: { betrag: true, zahlungsart: true },
      }),
      prisma.zahlung.findMany({
        where: { fahrzeugId: id },
        select: { betrag: true, zahlungsart: true },
      }),
    ]);

    const berechneKosten = (zahlungenListe: { betrag: number; zahlungsart: string }[]) => ({
      treibstoffKosten: zahlungenListe
        .filter(z => z.zahlungsart === 'TANKEN')
        .reduce((sum, z) => sum + z.betrag, 0),
      wartungsReparaturKosten: zahlungenListe
        .filter(z => ['PFLEGE', 'WARTUNG', 'REPARATUR'].includes(z.zahlungsart))
        .reduce((sum, z) => sum + z.betrag, 0),
    });

    const kostenMonat = berechneKosten(zahlungenMonat);
    const kostenJahr = berechneKosten(zahlungenJahr);
    const kostenGesamt = berechneKosten(zahlungenGesamt);

    const [fahrtenMonat, fahrtenJahr, fahrtenGesamt] = await Promise.all([
      prisma.fahrt.aggregate({
        where: {
          fahrzeugId: id,
          status: 'ABGESCHLOSSEN',
          createdAt: { gte: monatStart, lte: jetzt },
        },
        _sum: { gefahreneKm: true, kosten: true },
        _count: true,
      }),
      prisma.fahrt.aggregate({
        where: {
          fahrzeugId: id,
          status: 'ABGESCHLOSSEN',
          createdAt: { gte: jahrStart, lte: jetzt },
        },
        _sum: { gefahreneKm: true, kosten: true },
        _count: true,
      }),
      prisma.fahrt.aggregate({
        where: {
          fahrzeugId: id,
          status: 'ABGESCHLOSSEN',
        },
        _sum: { gefahreneKm: true, kosten: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      fahrzeugId: id,
      zeitraum,
      zeitraumLabel,
      gefahreneKm,
      einnahmen,
      anzahlFahrten,
      // Kosten aus Zahlungen im gewählten Zeitraum
      treibstoffKosten,
      wartungsReparaturKosten,
      uebersicht: {
        monat: {
          label: jetzt.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
          gefahreneKm: fahrtenMonat._sum.gefahreneKm || 0,
          einnahmen: fahrtenMonat._sum.kosten || 0,
          anzahlFahrten: fahrtenMonat._count,
          ...kostenMonat,
        },
        jahr: {
          label: jetzt.getFullYear().toString(),
          gefahreneKm: fahrtenJahr._sum.gefahreneKm || 0,
          einnahmen: fahrtenJahr._sum.kosten || 0,
          anzahlFahrten: fahrtenJahr._count,
          ...kostenJahr,
        },
        gesamt: {
          label: 'Gesamt',
          gefahreneKm: fahrtenGesamt._sum.gefahreneKm || 0,
          einnahmen: fahrtenGesamt._sum.kosten || 0,
          anzahlFahrten: fahrtenGesamt._count,
          ...kostenGesamt,
        },
      },
    });
  } catch (error) {
    console.error('Fehler bei Statistik-Abfrage:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Statistik' },
      { status: 500 }
    );
  }
}
