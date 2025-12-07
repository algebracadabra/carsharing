import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Alle Wartungsintervalle für ein Fahrzeug abrufen
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fahrzeugId = searchParams.get('fahrzeugId');

    if (!fahrzeugId) {
      return NextResponse.json({ error: 'fahrzeugId ist erforderlich' }, { status: 400 });
    }

    const intervalle = await prisma.wartungsIntervall.findMany({
      where: { fahrzeugId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(intervalle);
  } catch (error: any) {
    console.error('Get wartungsintervalle error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// POST - Neues Wartungsintervall erstellen (nur Halter/Admin)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    const body = await request.json();
    const { fahrzeugId, name, beschreibung, intervallTyp, intervallWert, monatImJahr } = body;

    if (!fahrzeugId || !name || !intervallTyp || intervallWert === undefined) {
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

    const intervall = await prisma.wartungsIntervall.create({
      data: {
        fahrzeugId,
        name,
        beschreibung: beschreibung || null,
        intervallTyp,
        intervallWert: parseInt(intervallWert),
        monatImJahr: monatImJahr ? parseInt(monatImJahr) : null,
      },
    });

    // Erstelle direkt den ersten Task basierend auf dem Intervall
    await createNextTask(intervall, fahrzeug.kilometerstand);

    return NextResponse.json(intervall, { status: 201 });
  } catch (error: any) {
    console.error('Create wartungsintervall error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}

// Hilfsfunktion: Nächsten Task basierend auf Intervall erstellen
async function createNextTask(intervall: any, aktuellerKilometerstand: number) {
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
      faelligAm = new Date(now.getFullYear(), (intervall.monatImJahr || 1) - 1, 1);
      // Wenn der Monat dieses Jahr schon vorbei ist, nächstes Jahr
      if (faelligAm <= now) {
        faelligAm.setFullYear(faelligAm.getFullYear() + 1);
      }
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
