import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Einzelnen Task abrufen
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const task = await prisma.wartungsTask.findUnique({
      where: { id: params.id },
      include: {
        fahrzeug: {
          select: { id: true, name: true, kilometerstand: true, halterId: true },
        },
        wartungsIntervall: {
          select: { id: true, name: true, intervallTyp: true, intervallWert: true, monatImJahr: true },
        },
        erledigtVon: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error: any) {
    console.error('Get wartungstask error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// PATCH - Task aktualisieren (alle können abhaken, nur Halter/Admin können bearbeiten)
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

    const task = await prisma.wartungsTask.findUnique({
      where: { id: params.id },
      include: { 
        fahrzeug: true,
        wartungsIntervall: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const isOwner = task.fahrzeug.halterId === userId;
    const isAdmin = userRole === 'ADMIN';

    const body = await request.json();
    const { erledigt, zuweisen, titel, beschreibung, faelligAm, faelligBeiKm } = body;

    // Jeder kann sich Tasks zuweisen
    if (zuweisen !== undefined) {
      const updated = await prisma.wartungsTask.update({
        where: { id: params.id },
        data: {
          zugewiesenAnId: zuweisen ? userId : null,
        },
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
      });

      return NextResponse.json(updated);
    }

    // Jeder kann Tasks abhaken
    if (erledigt !== undefined) {
      const updateData: any = {
        erledigt,
        erledigtAm: erledigt ? new Date() : null,
        erledigtVonId: erledigt ? userId : null,
      };

      const updated = await prisma.wartungsTask.update({
        where: { id: params.id },
        data: updateData,
        include: {
          fahrzeug: {
            select: { id: true, name: true, kilometerstand: true, foto: true },
          },
          wartungsIntervall: true,
          erledigtVon: {
            select: { id: true, name: true },
          },
          zugewiesenAn: {
            select: { id: true, name: true },
          },
        },
      });

      // Wenn Task erledigt und es ein Intervall gibt, erstelle nächsten Task
      if (erledigt && task.wartungsIntervall && task.wartungsIntervall.aktiv) {
        await createNextTaskFromIntervall(task.wartungsIntervall, task.fahrzeug.kilometerstand);
      }

      return NextResponse.json(updated);
    }

    // Nur Halter/Admin können andere Felder bearbeiten
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const updated = await prisma.wartungsTask.update({
      where: { id: params.id },
      data: {
        titel: titel !== undefined ? titel : undefined,
        beschreibung: beschreibung !== undefined ? beschreibung : undefined,
        faelligAm: faelligAm !== undefined ? (faelligAm ? new Date(faelligAm) : null) : undefined,
        faelligBeiKm: faelligBeiKm !== undefined ? (faelligBeiKm ? parseInt(faelligBeiKm) : null) : undefined,
      },
      include: {
        fahrzeug: {
          select: { id: true, name: true },
        },
        wartungsIntervall: {
          select: { id: true, name: true },
        },
        erledigtVon: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update wartungstask error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}

// DELETE - Task löschen (nur Halter/Admin)
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

    const task = await prisma.wartungsTask.findUnique({
      where: { id: params.id },
      include: { fahrzeug: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const isOwner = task.fahrzeug.halterId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await prisma.wartungsTask.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete wartungstask error:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
  }
}

// Hilfsfunktion: Nächsten Task basierend auf Intervall erstellen
async function createNextTaskFromIntervall(intervall: any, aktuellerKilometerstand: number) {
  const now = new Date();
  let faelligAm: Date | null = null;
  let faelligBeiKm: number | null = null;
  let titel = `${intervall.name} fällig`;

  switch (intervall.intervallTyp) {
    case 'KILOMETER':
      faelligBeiKm = aktuellerKilometerstand + intervall.intervallWert;
      titel = `${intervall.name} bei ${faelligBeiKm!.toLocaleString('de-DE')} km`;
      break;
    case 'WOCHEN':
      faelligAm = new Date(now.getTime() + intervall.intervallWert * 7 * 24 * 60 * 60 * 1000);
      break;
    case 'MONATE':
      faelligAm = new Date(now);
      faelligAm.setMonth(faelligAm.getMonth() + intervall.intervallWert);
      break;
    case 'JAEHRLICH':
      faelligAm = new Date(now.getFullYear() + 1, (intervall.monatImJahr || 1) - 1, 1);
      break;
  }

  await prisma.wartungsTask.create({
    data: {
      fahrzeugId: intervall.fahrzeugId,
      wartungsIntervallId: intervall.id,
      titel,
      beschreibung: intervall.beschreibung,
      faelligAm,
      faelligBeiKm,
    },
  });
}
