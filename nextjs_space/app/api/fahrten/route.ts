import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    let fahrten;

    if (userRole === 'ADMIN') {
      // Admin sieht alle Fahrten
      fahrten = await prisma.fahrt.findMany({
        include: { fahrzeug: true, fahrer: true, buchung: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // User sieht eigene Fahrten + Fahrten auf eigenen Fahrzeugen
      fahrten = await prisma.fahrt.findMany({
        where: {
          OR: [
            { fahrerId: userId },
            { fahrzeug: { halterId: userId } },
          ],
        },
        include: { fahrzeug: true, fahrer: true, buchung: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(fahrten);
  } catch (error: any) {
    console.error('Get fahrten error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// POST: Fahrt starten (nur Buchung + Startkilometer)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { buchungId, startKilometer } = body;

    if (!buchungId || startKilometer === undefined) {
      return NextResponse.json(
        { error: 'Buchung und Startkilometer sind erforderlich' },
        { status: 400 }
      );
    }

    // Get buchung details
    const buchung = await prisma.buchung.findUnique({
      where: { id: buchungId },
      include: { fahrzeug: true },
    });

    if (!buchung) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 });
    }

    // Prevent creating trips from cancelled bookings
    if (buchung.status === 'STORNIERT') {
      return NextResponse.json({ error: 'Stornierte Buchungen können keine Fahrten haben' }, { status: 400 });
    }

    // Check if fahrt already exists for this buchung
    const existingFahrt = await prisma.fahrt.findUnique({
      where: { buchungId },
    });
    if (existingFahrt) {
      return NextResponse.json({ error: 'Für diese Buchung existiert bereits eine Fahrt' }, { status: 400 });
    }

    const start = parseInt(startKilometer);

    // Check for kilometer conflict
    const kilometerKonflikt = start !== buchung.fahrzeug.kilometerstand;

    // Create fahrt with status GESTARTET (no end kilometer yet)
    const fahrt = await prisma.fahrt.create({
      data: {
        buchungId,
        fahrzeugId: buchung.fahrzeugId,
        fahrerId: userId,
        startKilometer: start,
        endKilometer: null,
        gefahreneKm: null,
        kosten: null,
        status: 'GESTARTET',
        kilometerKonflikt,
        konfliktGeloest: !kilometerKonflikt,
      },
      include: { fahrzeug: true, fahrer: true, buchung: true },
    });

    // Update buchung status to LAUFEND
    await prisma.buchung.update({
      where: { id: buchungId },
      data: { status: 'LAUFEND' },
    });

    return NextResponse.json(fahrt, { status: 201 });
  } catch (error: any) {
    console.error('Create fahrt error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}
