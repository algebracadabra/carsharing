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

    let zahlungen;

    if (userRole === 'ADMIN') {
      // Admin sieht alle Zahlungen
      zahlungen = await prisma.zahlung.findMany({
        include: { fahrer: true, fahrzeug: { include: { halter: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // User sieht eigene Zahlungen + Zahlungen für eigene Fahrzeuge
      zahlungen = await prisma.zahlung.findMany({
        where: {
          OR: [
            { fahrerId: userId },
            { fahrzeug: { halterId: userId } },
          ],
        },
        include: { fahrer: true, fahrzeug: { include: { halter: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(zahlungen);
  } catch (error: any) {
    console.error('Get zahlungen error:', error);
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
    const userRole = (session.user as any)?.role;

    const body = await request.json();
    const { fahrerId, fahrzeugId, betrag, beschreibung, zahlungsart, beleg } = body;

    if (!fahrerId || !fahrzeugId || betrag === undefined) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob User berechtigt ist (Admin, Halter des Fahrzeugs, oder Fahrer mit Fahrten)
    if (userRole !== 'ADMIN') {
      const fahrzeug = await prisma.fahrzeug.findUnique({
        where: { id: fahrzeugId },
        select: { halterId: true },
      });

      const hatFahrten = await prisma.fahrt.findFirst({
        where: {
          fahrzeugId,
          fahrerId: userId,
        },
      });

      const istHalter = fahrzeug?.halterId === userId;
      const istFahrerMitFahrten = !!hatFahrten;

      if (!istHalter && !istFahrerMitFahrten) {
        return NextResponse.json(
          { error: 'Nur Fahrer oder Halter des Fahrzeugs können Zahlungen erfassen' },
          { status: 403 }
        );
      }
    }

    const zahlung = await prisma.zahlung.create({
      data: {
        fahrerId,
        fahrzeugId,
        betrag: parseFloat(betrag),
        zahlungsart: zahlungsart || 'BAR',
        beleg: beleg || null,
        beschreibung,
        bestaetigung_fahrer: false,
        bestaetigung_halter: false,
        status: 'AUSSTEHEND',
      },
      include: { fahrer: true, fahrzeug: { include: { halter: true } } },
    });

    return NextResponse.json(zahlung, { status: 201 });
  } catch (error: any) {
    console.error('Create zahlung error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}
