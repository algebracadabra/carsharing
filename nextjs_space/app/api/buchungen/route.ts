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

    let buchungen;

    if (userRole === 'ADMIN') {
      // Admin sieht alle Buchungen
      buchungen = await prisma.buchung.findMany({
        include: { fahrzeug: true, user: true, fahrt: true },
        orderBy: { startZeit: 'desc' },
      });
    } else {
      // User sieht eigene Buchungen + Buchungen für eigene Fahrzeuge
      buchungen = await prisma.buchung.findMany({
        where: {
          OR: [
            { userId },
            { fahrzeug: { halterId: userId } },
          ],
        },
        include: { fahrzeug: true, user: true, fahrt: true },
        orderBy: { startZeit: 'desc' },
      });
    }

    return NextResponse.json(buchungen);
  } catch (error: any) {
    console.error('Get buchungen error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { fahrzeugId, startZeit, endZeit } = body;

    if (!fahrzeugId || !startZeit || !endZeit) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      );
    }

    // Validate: end must be after start
    const start = new Date(startZeit);
    const end = new Date(endZeit);
    if (end <= start) {
      return NextResponse.json(
        { error: 'Endzeit muss nach der Startzeit liegen' },
        { status: 400 }
      );
    }

    // Check for overlapping bookings
    const overlapping = await prisma.buchung.findFirst({
      where: {
        fahrzeugId,
        status: { in: ['GEPLANT', 'LAUFEND'] },
        OR: [
          {
            AND: [
              { startZeit: { lte: new Date(startZeit) } },
              { endZeit: { gte: new Date(startZeit) } },
            ],
          },
          {
            AND: [
              { startZeit: { lte: new Date(endZeit) } },
              { endZeit: { gte: new Date(endZeit) } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'Das Fahrzeug ist in diesem Zeitraum bereits gebucht' },
        { status: 400 }
      );
    }

    const buchung = await prisma.buchung.create({
      data: {
        fahrzeugId,
        userId,
        startZeit: new Date(startZeit),
        endZeit: new Date(endZeit),
        status: 'GEPLANT',
        buchungsart: 'NORMALFAHRT',
      },
      include: { fahrzeug: true, user: true },
    });

    return NextResponse.json(buchung, { status: 201 });
  } catch (error: any) {
    console.error('Create buchung error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}
