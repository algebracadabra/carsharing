import { prisma } from '@/lib/db';
import {
  jsonResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  requireAuth,
  parseIntSafe,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// PUT: Fahrt abschließen (Endkilometer + Bemerkungen) oder bearbeiten
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const fahrtId = params.id;
    const body = await request.json();
    const { startKilometer, endKilometer, bemerkungen, action } = body;

    // Get existing trip to check ownership
    const existingFahrt = await prisma.fahrt.findUnique({
      where: { id: fahrtId },
      include: { fahrzeug: true, buchung: true },
    });

    if (!existingFahrt) {
      return notFoundResponse('Fahrt nicht gefunden');
    }

    // Check if user is the creator of the trip
    if (existingFahrt.fahrerId !== user!.id) {
      return forbiddenResponse('Sie können nur Ihre eigenen Fahrten bearbeiten');
    }

    // Action: complete - Fahrt abschließen (nur endKilometer erforderlich)
    if (action === 'complete') {
      const end = parseIntSafe(endKilometer);
      if (end === null) {
        return errorResponse('Endkilometer ist erforderlich');
      }

      const start = existingFahrt.startKilometer;
      if (start >= end) {
        return errorResponse('Endkilometer muss größer als Startkilometer sein');
      }

      const gefahreneKm = end - start;
      const kosten = gefahreneKm * existingFahrt.fahrzeug.kilometerpauschale;

      // Update the trip to completed
      const updatedFahrt = await prisma.fahrt.update({
        where: { id: fahrtId },
        data: {
          endKilometer: end,
          gefahreneKm,
          kosten,
          status: 'ABGESCHLOSSEN',
          bemerkungen: bemerkungen || null,
          updatedAt: new Date(),
        },
        include: { fahrzeug: true, fahrer: true, buchung: true },
      });

      // Update vehicle's kilometer reading
      await prisma.fahrzeug.update({
        where: { id: existingFahrt.fahrzeugId },
        data: { kilometerstand: end },
      });

      // Update buchung status to ABGESCHLOSSEN
      await prisma.buchung.update({
        where: { id: existingFahrt.buchungId },
        data: { status: 'ABGESCHLOSSEN' },
      });

      return jsonResponse(updatedFahrt);
    }

    // Default action: edit - Fahrt bearbeiten (beide Kilometer erforderlich)
    const start = parseIntSafe(startKilometer);
    const end = parseIntSafe(endKilometer);

    if (start === null || end === null) {
      return errorResponse('Start- und Endkilometer sind erforderlich');
    }

    if (start >= end) {
      return errorResponse('Endkilometer muss größer als Startkilometer sein');
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
        bemerkungen: bemerkungen !== undefined ? bemerkungen : existingFahrt.bemerkungen,
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

    return jsonResponse(updatedFahrt);
  } catch (error) {
    console.error('Update fahrt error:', error);
    return serverErrorResponse('Fehler beim Aktualisieren');
  }
}
