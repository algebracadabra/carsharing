import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Alle offenen Tasks abrufen (optional nach Fahrzeug filtern)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fahrzeugId = searchParams.get('fahrzeugId');
    const nurOffen = searchParams.get('nurOffen') !== 'false';

    const where: any = {};
    
    if (fahrzeugId) {
      where.fahrzeugId = fahrzeugId;
    }
    
    if (nurOffen) {
      where.erledigt = false;
    }

    const tasks = await prisma.wartungsTask.findMany({
      where,
      include: {
        fahrzeug: {
          select: { id: true, name: true, kilometerstand: true, foto: true },
        },
        wartungsIntervall: {
          select: { id: true, name: true },
        },
        erledigtVon: {
          select: { id: true, name: true },
        },
        zugewiesenAn: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { erledigt: 'asc' },
        { faelligAm: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error('Get wartungstasks error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// POST - Manuellen Task erstellen (nur Halter/Admin)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    const body = await request.json();
    const { fahrzeugId, titel, beschreibung, faelligAm, faelligBeiKm } = body;

    if (!fahrzeugId || !titel) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }

    // Prüfe ob User Halter oder Admin ist
    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id: fahrzeugId },
    });

    if (!fahrzeug) {
      return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });
    }

    const isOwner = fahrzeug.halterId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const task = await prisma.wartungsTask.create({
      data: {
        fahrzeugId,
        titel,
        beschreibung: beschreibung || null,
        faelligAm: faelligAm ? new Date(faelligAm) : null,
        faelligBeiKm: faelligBeiKm ? parseInt(faelligBeiKm) : null,
      },
      include: {
        fahrzeug: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error('Create wartungstask error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}
