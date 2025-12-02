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

    let fahrzeuge;

    if (userRole === 'ADMIN') {
      fahrzeuge = await prisma.fahrzeug.findMany({
        include: { halter: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // HALTER and FAHRER see all available vehicles
      fahrzeuge = await prisma.fahrzeug.findMany({
        include: { halter: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(fahrzeuge);
  } catch (error: any) {
    console.error('Get fahrzeuge error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    if (userRole !== 'ADMIN' && userRole !== 'HALTER' && userRole !== 'FAHRER') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      foto,
      kilometerstand,
      kilometerpauschale,
      schluesselablageort,
      status,
    } = body;

    if (!name || kilometerstand === undefined || !kilometerpauschale || !schluesselablageort) {
      return NextResponse.json(
        { error: 'Alle Pflichtfelder müssen ausgefüllt werden' },
        { status: 400 }
      );
    }

    const fahrzeug = await prisma.fahrzeug.create({
      data: {
        name,
        foto: foto || null,
        kilometerstand: parseInt(kilometerstand),
        kilometerpauschale: parseFloat(kilometerpauschale),
        schluesselablageort,
        status: status || 'VERFUEGBAR',
        halterId: userId,
      },
      include: { halter: true },
    });

    // Wenn ein FAHRER ein Fahrzeug erstellt, wird er automatisch zum HALTER
    if (userRole === 'FAHRER') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'HALTER' },
      });
    }

    return NextResponse.json(fahrzeug, { status: 201 });
  } catch (error: any) {
    console.error('Create fahrzeug error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}
