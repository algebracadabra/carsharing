import { prisma } from '@/lib/db';
import {
  jsonResponse,
  serverErrorResponse,
  requireAuth,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    // Get days parameter from query string (default: 7)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = Math.min(Math.max(parseInt(daysParam || '7', 10) || 7, 1), 30); // Clamp between 1 and 30

    // Get all vehicles the user can see
    let fahrzeuge;
    if (user!.role === 'ADMIN') {
      fahrzeuge = await prisma.fahrzeug.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    } else {
      // Non-admin users see all vehicles (for booking purposes)
      fahrzeuge = await prisma.fahrzeug.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    }

    // Calculate date range: today to N days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    // Get all bookings in this time range
    const buchungen = await prisma.buchung.findMany({
      where: {
        fahrzeugId: { in: fahrzeuge.map(f => f.id) },
        status: { in: ['GEPLANT', 'LAUFEND'] },
        OR: [
          // Booking starts within range
          {
            startZeit: { gte: today, lte: endDate },
          },
          // Booking ends within range
          {
            endZeit: { gte: today, lte: endDate },
          },
          // Booking spans the entire range
          {
            AND: [
              { startZeit: { lte: today } },
              { endZeit: { gte: endDate } },
            ],
          },
        ],
      },
      select: {
        id: true,
        fahrzeugId: true,
        startZeit: true,
        endZeit: true,
        status: true,
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startZeit: 'asc' },
    });

    return jsonResponse({
      fahrzeuge,
      buchungen,
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
    });
  } catch (error) {
    console.error('Get belegung error:', error);
    return serverErrorResponse('Fehler beim Laden der Belegung');
  }
}
