import { prisma } from '@/lib/db';
import {
  jsonResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    let buchungen;

    if (user!.role === 'ADMIN') {
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
            { userId: user!.id },
            { fahrzeug: { halterId: user!.id } },
          ],
        },
        include: { fahrzeug: true, user: true, fahrt: true },
        orderBy: { startZeit: 'desc' },
      });
    }

    return jsonResponse(buchungen);
  } catch (error) {
    console.error('Get buchungen error:', error);
    return serverErrorResponse('Fehler beim Laden');
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { fahrzeugId, startZeit, endZeit } = body;

    if (!fahrzeugId || !startZeit || !endZeit) {
      return errorResponse('Alle Felder sind erforderlich');
    }

    // Validate: end must be after start
    const start = new Date(startZeit);
    const end = new Date(endZeit);
    if (end <= start) {
      return errorResponse('Endzeit muss nach der Startzeit liegen');
    }

    // Check for overlapping bookings
    const overlapping = await prisma.buchung.findFirst({
      where: {
        fahrzeugId,
        status: { in: ['GEPLANT', 'LAUFEND'] },
        OR: [
          {
            AND: [
              { startZeit: { lte: start } },
              { endZeit: { gte: start } },
            ],
          },
          {
            AND: [
              { startZeit: { lte: end } },
              { endZeit: { gte: end } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return errorResponse('Das Fahrzeug ist in diesem Zeitraum bereits gebucht');
    }

    const buchung = await prisma.buchung.create({
      data: {
        fahrzeugId,
        userId: user!.id,
        startZeit: start,
        endZeit: end,
        status: 'GEPLANT',
        buchungsart: 'NORMALFAHRT',
      },
      include: { fahrzeug: true, user: true },
    });

    return jsonResponse(buchung, 201);
  } catch (error) {
    console.error('Create buchung error:', error);
    return serverErrorResponse('Fehler beim Erstellen');
  }
}
