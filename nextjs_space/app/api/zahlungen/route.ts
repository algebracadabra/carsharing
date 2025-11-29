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
      zahlungen = await prisma.zahlung.findMany({
        include: { fahrer: true, fahrzeug: { include: { halter: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (userRole === 'HALTER') {
      zahlungen = await prisma.zahlung.findMany({
        where: { fahrzeug: { halterId: userId } },
        include: { fahrer: true, fahrzeug: { include: { halter: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      zahlungen = await prisma.zahlung.findMany({
        where: { fahrerId: userId },
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

    const body = await request.json();
    const { fahrerId, fahrzeugId, betrag, beschreibung } = body;

    if (!fahrerId || !fahrzeugId || betrag === undefined) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      );
    }

    const zahlung = await prisma.zahlung.create({
      data: {
        fahrerId,
        fahrzeugId,
        betrag: parseFloat(betrag),
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
