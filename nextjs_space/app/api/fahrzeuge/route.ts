import { prisma } from '@/lib/db';
import {
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  requireAuth,
  requireAdmin,
  parseIntSafe,
  parseFloatSafe,
} from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    // All authenticated users can see all vehicles
    const fahrzeuge = await prisma.fahrzeug.findMany({
      include: { halter: true },
      orderBy: { createdAt: 'desc' },
    });

    return jsonResponse(fahrzeuge);
  } catch (error) {
    console.error('Get fahrzeuge error:', error);
    return serverErrorResponse('Fehler beim Laden');
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    if (!user || !user.role) {
      return unauthorizedResponse('Nicht autorisiert');
    }

    if (!['ADMIN', 'USER'].includes(user.role)) {
      return forbiddenResponse('Sie haben keine Berechtigung, ein Fahrzeug anzulegen');
    }

    const body = await request.json();
    const { name, foto, kilometerstand, kilometerpauschale, schluesselablageort, status, halterId } = body;

    // Determine effective halterId: Admins may choose, others are fixed to themselves
    const effectiveHalterId = user.role === 'ADMIN' ? halterId : user.id;

    // Validate required fields
    if (!name || kilometerstand === undefined || !kilometerpauschale || !schluesselablageort || !effectiveHalterId) {
      return errorResponse('Alle Pflichtfelder müssen ausgefüllt werden (inkl. Halter)');
    }

    // Validate halter exists
    const halter = await prisma.user.findUnique({
      where: { id: effectiveHalterId },
    });

    if (!halter) {
      return errorResponse('Der ausgewählte Halter existiert nicht');
    }

    const parsedKilometerstand = parseIntSafe(kilometerstand);
    const parsedKilometerpauschale = parseFloatSafe(kilometerpauschale);

    if (parsedKilometerstand === null || parsedKilometerpauschale === null) {
      return errorResponse('Ungültige Zahlenwerte');
    }

    const fahrzeug = await prisma.fahrzeug.create({
      data: {
        name,
        foto: foto || null,
        kilometerstand: parsedKilometerstand,
        kilometerpauschale: parsedKilometerpauschale,
        schluesselablageort,
        status: status || 'VERFUEGBAR',
        halterId: effectiveHalterId,
      },
      include: { halter: true },
    });

    return jsonResponse(fahrzeug, 201);
  } catch (error) {
    console.error('Create fahrzeug error:', error);
    return serverErrorResponse('Fehler beim Erstellen');
  }
}
