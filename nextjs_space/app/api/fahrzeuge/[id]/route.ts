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

    // Check permissions - nur Owner oder Admin können bearbeiten
    const isOwner = fahrzeug.halterId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Owner und Admin können alles bearbeiten
    let updateData: any = {
      name: body.name,
      foto: body.foto,
      kilometerstand: body.kilometerstand ? parseInt(body.kilometerstand) : undefined,
      kilometerpauschale: body.kilometerpauschale
        ? parseFloat(body.kilometerpauschale)
        : undefined,
      schluesselablageort: body.schluesselablageort,
      status: body.status,
      fixkosten: body.fixkosten !== undefined
        ? parseFloat(body.fixkosten)
        : undefined,
      // Steckbrief-Felder
      versicherungsart: body.versicherungsart,
      kraftstoffart: body.kraftstoffart,
      aktuelleReifen: body.aktuelleReifen,
      naechsterOelwechsel: body.naechsterOelwechsel,
      reinigungszyklus: body.reinigungszyklus,
      motoroelTyp: body.motoroelTyp,
      kuehlerFrostschutzTyp: body.kuehlerFrostschutzTyp,
      anzahlSitze: body.anzahlSitze !== undefined && body.anzahlSitze !== ''
        ? parseInt(body.anzahlSitze)
        : undefined,
      anhaengerkupplung: body.anhaengerkupplung,
      kindersitz: body.kindersitz,
      defekte: body.defekte,
      naechsterTuev: body.naechsterTuev,
      macken: body.macken,
      sonstigeHinweise: body.sonstigeHinweise,
    };

    // treibstoffKosten is incremental - add to existing value
    if (body.treibstoffKostenIncrement !== undefined) {
      const increment = parseFloat(body.treibstoffKostenIncrement);
      if (increment > 0) {
        updateData.treibstoffKosten = (fahrzeug.treibstoffKosten ?? 0) + increment;
      }
    }

    // wartungsReparaturKosten is incremental - add to existing value
    if (body.wartungsReparaturKostenIncrement !== undefined) {
      const increment = parseFloat(body.wartungsReparaturKostenIncrement);
      if (increment > 0) {
        updateData.wartungsReparaturKosten = (fahrzeug.wartungsReparaturKosten ?? 0) + increment;
      }
    }

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

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
