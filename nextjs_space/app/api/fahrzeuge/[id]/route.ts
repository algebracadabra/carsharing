import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { setKilometerpauschale, getFirstOfMonth, getFirstOfNextMonth } from '@/lib/kilometerpauschale';

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

    // Kilometerpauschale-Änderung separat behandeln (nur zum Monatsersten)
    const neueKilometerpauschale = body.kilometerpauschale 
      ? parseFloat(body.kilometerpauschale) 
      : undefined;
    
    if (neueKilometerpauschale !== undefined && neueKilometerpauschale !== fahrzeug.kilometerpauschale) {
      // Bestimme das Gültigkeitsdatum (entweder angegeben oder nächster Monatserster)
      let gueltigAb: Date;
      
      if (body.kilometerpauschaleGueltigAb) {
        gueltigAb = new Date(body.kilometerpauschaleGueltigAb);
      } else {
        // Standard: Nächster Monatserster (oder aktueller, wenn heute der 1. ist)
        const heute = new Date();
        const ersterDesMonats = getFirstOfMonth(heute);
        
        // Wenn heute der 1. ist, gilt die Änderung ab heute, sonst ab nächstem Monat
        if (heute.getDate() === 1) {
          gueltigAb = ersterDesMonats;
        } else {
          gueltigAb = getFirstOfNextMonth(heute);
        }
      }
      
      try {
        // Erstelle Historieneintrag
        await setKilometerpauschale(params.id, neueKilometerpauschale, gueltigAb);
        
        // Aktualisiere auch die aktuelle Pauschale im Fahrzeug (für Anzeige)
        // Dies ist die "geplante" Pauschale, die ab gueltigAb gilt
      } catch (error: any) {
        return NextResponse.json({ 
          error: error.message || 'Fehler bei der Kilometerpauschale-Änderung' 
        }, { status: 400 });
      }
    }

    // Owner und Admin können alles bearbeiten
    let updateData: any = {
      name: body.name,
      foto: body.foto,
      kilometerstand: body.kilometerstand ? parseInt(body.kilometerstand) : undefined,
      // Kilometerpauschale wird nur aktualisiert wenn die Änderung sofort gilt (1. des Monats)
      kilometerpauschale: (() => {
        if (neueKilometerpauschale === undefined) return undefined;
        const heute = new Date();
        const ersterDesMonats = getFirstOfMonth(heute);
        // Nur aktualisieren wenn heute der 1. ist oder explizit der aktuelle Monat angegeben wurde
        if (heute.getDate() === 1 || 
            (body.kilometerpauschaleGueltigAb && 
             new Date(body.kilometerpauschaleGueltigAb) <= heute)) {
          return neueKilometerpauschale;
        }
        return undefined;
      })(),
      schluesselablageort: body.schluesselablageort,
      status: body.status,
      // Jährliche Fixkosten (Versicherung + Steuer)
      versicherungJaehrlich: body.versicherungJaehrlich !== undefined
        ? parseFloat(body.versicherungJaehrlich)
        : undefined,
      steuerJaehrlich: body.steuerJaehrlich !== undefined
        ? parseFloat(body.steuerJaehrlich)
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

    // Lebenszyklus-Felder - nur Admin kann diese bearbeiten
    if (isAdmin) {
      if (body.baujahr !== undefined) {
        updateData.baujahr = body.baujahr !== '' ? parseInt(body.baujahr) : null;
      }
      if (body.restwert !== undefined) {
        updateData.restwert = body.restwert !== '' ? parseFloat(body.restwert) : null;
      }
      if (body.erwarteteKmEndOfLife !== undefined) {
        updateData.erwarteteKmEndOfLife = body.erwarteteKmEndOfLife !== '' ? parseInt(body.erwarteteKmEndOfLife) : null;
      }
      if (body.erwarteteJahreEndOfLife !== undefined) {
        updateData.erwarteteJahreEndOfLife = body.erwarteteJahreEndOfLife !== '' ? parseInt(body.erwarteteJahreEndOfLife) : null;
      }
      if (body.geschaetzteKmProJahr !== undefined) {
        updateData.geschaetzteKmProJahr = body.geschaetzteKmProJahr !== '' ? parseInt(body.geschaetzteKmProJahr) : null;
      }
    }

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
