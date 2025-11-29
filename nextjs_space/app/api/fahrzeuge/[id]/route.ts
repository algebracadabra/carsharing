import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id: params.id },
      include: {
        halter: true,
        buchungen: {
          include: { user: true },
          orderBy: { startZeit: 'desc' },
          take: 10,
        },
        fahrten: {
          include: { fahrer: true, buchung: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!fahrzeug) {
      return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(fahrzeug);
  } catch (error: any) {
    console.error('Get fahrzeug error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

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

    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id: params.id },
    });

    if (!fahrzeug) {
      return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });
    }

    const body = await request.json();

    // Check permissions
    const isOwner = fahrzeug.halterId === userId;
    const isAdmin = userRole === 'ADMIN';
    const isFahrer = userRole === 'FAHRER';

    if (!isOwner && !isAdmin && !isFahrer) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Fahrer can only edit schluesselablageort and kilometerpauschale
    let updateData: any = {};

    if (isFahrer && !isOwner && !isAdmin) {
      if (body.schluesselablageort !== undefined) {
        updateData.schluesselablageort = body.schluesselablageort;
      }
      if (body.kilometerpauschale !== undefined) {
        updateData.kilometerpauschale = parseFloat(body.kilometerpauschale);
      }
    } else {
      // Halter and Admin can edit everything
      updateData = {
        name: body.name,
        foto: body.foto,
        kilometerstand: body.kilometerstand ? parseInt(body.kilometerstand) : undefined,
        kilometerpauschale: body.kilometerpauschale
          ? parseFloat(body.kilometerpauschale)
          : undefined,
        schluesselablageort: body.schluesselablageort,
        status: body.status,
      };
      // Remove undefined values
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );
    }

    const updatedFahrzeug = await prisma.fahrzeug.update({
      where: { id: params.id },
      data: updateData,
      include: { halter: true },
    });

    return NextResponse.json(updatedFahrzeug);
  } catch (error: any) {
    console.error('Update fahrzeug error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}

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

    const fahrzeug = await prisma.fahrzeug.findUnique({
      where: { id: params.id },
    });

    if (!fahrzeug) {
      return NextResponse.json({ error: 'Fahrzeug nicht gefunden' }, { status: 404 });
    }

    const isOwner = fahrzeug.halterId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await prisma.fahrzeug.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete fahrzeug error:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
  }
}
