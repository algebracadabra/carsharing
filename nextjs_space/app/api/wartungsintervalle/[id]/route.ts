import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Einzelnes Wartungsintervall abrufen
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const intervall = await prisma.wartungsIntervall.findUnique({
      where: { id: params.id },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        fahrzeug: {
          select: { id: true, name: true, halterId: true },
        },
      },
    });

    if (!intervall) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(intervall);
  } catch (error: any) {
    console.error('Get wartungsintervall error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// PATCH - Wartungsintervall aktualisieren (nur Halter/Admin)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    const intervall = await prisma.wartungsIntervall.findUnique({
      where: { id: params.id },
      include: { fahrzeug: true },
    });

    if (!intervall) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const isOwner = intervall.fahrzeug.halterId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const { name, beschreibung, intervallTyp, intervallWert, monatImJahr, aktiv } = body;

    const updated = await prisma.wartungsIntervall.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : undefined,
        beschreibung: beschreibung !== undefined ? beschreibung : undefined,
        intervallTyp: intervallTyp !== undefined ? intervallTyp : undefined,
        intervallWert: intervallWert !== undefined ? parseInt(intervallWert) : undefined,
        monatImJahr: monatImJahr !== undefined ? (monatImJahr ? parseInt(monatImJahr) : null) : undefined,
        aktiv: aktiv !== undefined ? aktiv : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update wartungsintervall error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}

// DELETE - Wartungsintervall löschen (nur Halter/Admin)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    const intervall = await prisma.wartungsIntervall.findUnique({
      where: { id: params.id },
      include: { fahrzeug: true },
    });

    if (!intervall) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const isOwner = intervall.fahrzeug.halterId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await prisma.wartungsIntervall.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete wartungsintervall error:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
  }
}
