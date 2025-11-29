import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const body = await request.json();
    const { action } = body;

    const zahlung = await prisma.zahlung.findUnique({
      where: { id: params.id },
      include: { fahrzeug: true },
    });

    if (!zahlung) {
      return NextResponse.json({ error: 'Zahlung nicht gefunden' }, { status: 404 });
    }

    let updateData: any = {};

    if (action === 'bestaetigen_fahrer' && (zahlung.fahrerId === userId || userRole === 'ADMIN')) {
      updateData.bestaetigung_fahrer = true;
    } else if (action === 'bestaetigen_halter' && (zahlung.fahrzeug.halterId === userId || userRole === 'ADMIN')) {
      updateData.bestaetigung_halter = true;
    } else {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const updatedZahlung = await prisma.zahlung.update({
      where: { id: params.id },
      data: updateData,
      include: { fahrer: true, fahrzeug: { include: { halter: true } } },
    });

    // Check if both confirmed and update status
    if (updatedZahlung.bestaetigung_fahrer && updatedZahlung.bestaetigung_halter) {
      await prisma.zahlung.update({
        where: { id: params.id },
        data: { status: 'BESTAETIGT' },
      });
    }

    const finalZahlung = await prisma.zahlung.findUnique({
      where: { id: params.id },
      include: { fahrer: true, fahrzeug: { include: { halter: true } } },
    });

    return NextResponse.json(finalZahlung);
  } catch (error: any) {
    console.error('Update zahlung error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}
