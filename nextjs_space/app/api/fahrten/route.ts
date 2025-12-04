import { prisma } from '@/lib/db';
import {
  jsonResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  requireAuth,
  parseIntSafe,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    let fahrten;

    if (user!.role === 'ADMIN') {
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
            { fahrerId: user!.id },
            { fahrzeug: { halterId: user!.id } },
          ],
        },
        include: { fahrzeug: true, fahrer: true, buchung: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return jsonResponse(fahrten);
  } catch (error) {
    console.error('Get fahrten error:', error);
    return serverErrorResponse('Fehler beim Laden');
  }
}

// POST: Fahrt starten (nur Buchung + Startkilometer)
export async function POST(request: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { buchungId, startKilometer } = body;

    if (!buchungId || startKilometer === undefined) {
      return errorResponse('Buchung und Startkilometer sind erforderlich');
    }

    // Get buchung details
    const buchung = await prisma.buchung.findUnique({
      where: { id: buchungId },
      include: { fahrzeug: true },
    });

    if (!buchung) {
      return notFoundResponse('Buchung nicht gefunden');
    }

    // Prevent creating trips from cancelled bookings
    if (buchung.status === 'STORNIERT') {
      return errorResponse('Stornierte Buchungen können keine Fahrten haben');
    }

    // Check if fahrt already exists for this buchung
    const existingFahrt = await prisma.fahrt.findUnique({
      where: { buchungId },
    });
    if (existingFahrt) {
      return errorResponse('Für diese Buchung existiert bereits eine Fahrt');
    }

    const start = parseIntSafe(startKilometer);
    if (start === null) {
      return errorResponse('Ungültiger Kilometerstand');
    }

    // Check for kilometer conflict
    const kilometerKonflikt = start !== buchung.fahrzeug.kilometerstand;

    // Create fahrt with status GESTARTET (no end kilometer yet)
    const fahrt = await prisma.fahrt.create({
      data: {
        buchungId,
        fahrzeugId: buchung.fahrzeugId,
        fahrerId: user!.id,
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

    return jsonResponse(fahrt, 201);
  } catch (error) {
    console.error('Create fahrt error:', error);
    return serverErrorResponse('Fehler beim Erstellen');
  }
}
