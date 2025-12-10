import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { berechneKilometerpauschaleEmpfehlung } from '@/lib/kilometerpauschale-empfehlung';

/**
 * GET /api/fahrzeuge/[id]/empfehlung
 * 
 * Berechnet die empfohlene Kilometerpauschale für ein Fahrzeug.
 * 
 * Query-Parameter:
 * - zeitraumMonate: Betrachtungszeitraum in Monaten (default: 12)
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
    const zeitraumMonate = parseInt(searchParams.get('zeitraumMonate') || '12', 10);

    // Fahrzeug laden
    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id },
      select: {
        id: true,
        kilometerpauschale: true,
        kilometerstand: true,
        treibstoffKostenPlan: true,
        wartungsReparaturKostenPlan: true,
        versicherungJaehrlich: true,
        steuerJaehrlich: true,
        baujahr: true,
        restwert: true,
        erwarteteKmEndOfLife: true,
        erwarteteJahreEndOfLife: true,
        geschaetzteKmProJahr: true,
        halterId: true,
      },
    });

    if (!fahrzeug) {
      return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });
    }

    // Berechne Zeitraum-Grenzen
    const endDatum = new Date();
    const startDatum = new Date();
    startDatum.setMonth(startDatum.getMonth() - zeitraumMonate);

    // Gefahrene Kilometer im Zeitraum ermitteln
    const fahrtenImZeitraum = await prisma.fahrt.findMany({
      where: {
        fahrzeugId: id,
        status: 'ABGESCHLOSSEN',
        createdAt: {
          gte: startDatum,
          lte: endDatum,
        },
      },
      select: {
        gefahreneKm: true,
      },
    });

    const gefahreneKmImZeitraum = fahrtenImZeitraum.reduce(
      (sum, fahrt) => sum + (fahrt.gefahreneKm || 0),
      0
    );

    // Falls keine Fahrten im Zeitraum, können wir keine Empfehlung berechnen
    if (gefahreneKmImZeitraum === 0) {
      return NextResponse.json({
        error: 'Keine Fahrten im Zeitraum',
        message: 'Es wurden keine abgeschlossenen Fahrten im gewählten Zeitraum gefunden. Eine Empfehlung kann nicht berechnet werden.',
        zeitraumMonate,
        gefahreneKmImZeitraum: 0,
      }, { status: 200 });
    }

    // Empfehlung berechnen
    const empfehlung = berechneKilometerpauschaleEmpfehlung({
      kilometerpauschale: fahrzeug.kilometerpauschale,
      kilometerstand: fahrzeug.kilometerstand,
      treibstoffKosten: fahrzeug.treibstoffKostenPlan,
      wartungsReparaturKosten: fahrzeug.wartungsReparaturKostenPlan,
      versicherungJaehrlich: fahrzeug.versicherungJaehrlich,
      steuerJaehrlich: fahrzeug.steuerJaehrlich,
      baujahr: fahrzeug.baujahr ?? undefined,
      restwert: fahrzeug.restwert ?? undefined,
      erwarteteKmEndOfLife: fahrzeug.erwarteteKmEndOfLife ?? undefined,
      erwarteteJahreEndOfLife: fahrzeug.erwarteteJahreEndOfLife ?? undefined,
      geschaetzteKmProJahr: fahrzeug.geschaetzteKmProJahr ?? undefined,
      gefahreneKmImZeitraum,
      zeitraumMonate,
    });

    return NextResponse.json({
      ...empfehlung,
      fahrzeugId: id,
      zeitraumMonate,
      gefahreneKmImZeitraum,
      berechnungsDatum: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fehler bei Empfehlungsberechnung:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Berechnung der Empfehlung' },
      { status: 500 }
    );
  }
}
