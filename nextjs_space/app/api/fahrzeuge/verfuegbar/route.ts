import { prisma } from '@/lib/db';
import {
  jsonResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const startZeit = searchParams.get('startZeit');
    const endZeit = searchParams.get('endZeit');

    if (!startZeit || !endZeit) {
      return errorResponse('Start- und Endzeit sind erforderlich');
    }

    const start = new Date(startZeit);
    const end = new Date(endZeit);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return errorResponse('Ungültige Datumswerte');
    }

    if (end <= start) {
      return errorResponse('Endzeit muss nach der Startzeit liegen');
    }

    // Find all vehicles that are VERFUEGBAR and don't have overlapping bookings
    // NUR_NOTFALL vehicles are excluded - they can only be booked via Schnellbuchung
    const fahrzeuge = await prisma.fahrzeug.findMany({
      where: {
        status: 'VERFUEGBAR',
        // Exclude vehicles with overlapping bookings
        NOT: {
          buchungen: {
            some: {
              status: { in: ['GEPLANT', 'LAUFEND'] },
              OR: [
                // Booking starts before our end AND ends after our start (overlap)
                {
                  AND: [
                    { startZeit: { lt: end } },
                    { endZeit: { gt: start } },
                  ],
                },
              ],
            },
          },
        },
      },
      include: { halter: true },
      orderBy: { name: 'asc' },
    });

    return jsonResponse(fahrzeuge);
  } catch (error) {
    console.error('Get verfuegbare fahrzeuge error:', error);
    return serverErrorResponse('Fehler beim Laden');
  }
}
