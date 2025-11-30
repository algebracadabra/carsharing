import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const fahrtId = params.id;
    const body = await request.json();
    const { startKilometer, endKilometer } = body;

    if (startKilometer === undefined || endKilometer === undefined) {
      return NextResponse.json(
        { error: 'Start- und Endkilometer sind erforderlich' },
        { status: 400 }
      );
    }

    // Get existing trip to check ownership
    const existingFahrt = await prisma.fahrt.findUnique({
      where: { id: fahrtId },
      include: { fahrzeug: true, buchung: true },
    });

    if (!existingFahrt) {
      return NextResponse.json({ error: 'Fahrt nicht gefunden' }, { status: 404 });
    }

    // Check if user is the creator of the trip
    if (existingFahrt.fahrerId !== userId) {
      return NextResponse.json(
        { error: 'Sie können nur Ihre eigenen Fahrten bearbeiten' },
        { status: 403 }
      );
    }

    const start = parseInt(startKilometer);
    const end = parseInt(endKilometer);

    if (start >= end) {
      return NextResponse.json(
        { error: 'Endkilometer muss größer als Startkilometer sein' },
        { status: 400 }
      );
    }

    const gefahreneKm = end - start;
    const kosten = gefahreneKm * existingFahrt.fahrzeug.kilometerpauschale;

    // Check for kilometer conflict with vehicle's current reading
    const kilometerKonflikt = start !== existingFahrt.fahrzeug.kilometerstand;

    // Update the trip
    const updatedFahrt = await prisma.fahrt.update({
      where: { id: fahrtId },
      data: {
        startKilometer: start,
        endKilometer: end,
        gefahreneKm,
        kosten,
        kilometerKonflikt,
        konfliktGeloest: !kilometerKonflikt,
        updatedAt: new Date(),
      },
      include: { fahrzeug: true, fahrer: true, buchung: true },
    });

    // Update vehicle's kilometer reading to the new end kilometer
    await prisma.fahrzeug.update({
      where: { id: existingFahrt.fahrzeugId },
      data: { kilometerstand: end },
    });

    return NextResponse.json(updatedFahrt);
  } catch (error: any) {
    console.error('Update fahrt error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}
