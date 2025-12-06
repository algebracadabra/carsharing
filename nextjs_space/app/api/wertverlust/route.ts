import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { berechneWertverlust, WertverlustInput } from '@/lib/kalkulation';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    // Fahrzeuge laden - alle Fahrzeuge für alle Benutzer sichtbar
    const fahrzeuge = await prisma.fahrzeug.findMany({
      select: {
        id: true,
        name: true,
        kilometerstand: true,
        baujahr: true,
        restwert: true,
        erwarteteKmEndOfLife: true,
        erwarteteJahreEndOfLife: true,
        geschaetzteKmProJahr: true,
      },
    });

    const aktuellesJahr = new Date().getFullYear();
    
    let gesamtWertverlustMonat = 0;
    let gesamtWertverlustJahr = 0;
    const fahrzeugDetails: {
      id: string;
      name: string;
      wertverlustProMonat: number;
      wertverlustProJahr: number;
      jahreRest: number;
      vollstaendig: boolean;
    }[] = [];

    for (const fahrzeug of fahrzeuge) {
      // Prüfen ob alle Lebenszyklus-Felder vorhanden sind
      const vollstaendig = !!(
        fahrzeug.baujahr &&
        fahrzeug.restwert !== null &&
        fahrzeug.erwarteteKmEndOfLife &&
        fahrzeug.erwarteteJahreEndOfLife &&
        fahrzeug.geschaetzteKmProJahr
      );

      if (vollstaendig) {
        try {
          const input: WertverlustInput = {
            aktuellesJahr,
            baujahr: fahrzeug.baujahr!,
            restwert: fahrzeug.restwert!,
            erwarteteKmEndOfLife: fahrzeug.erwarteteKmEndOfLife!,
            erwarteteJahreEndOfLife: fahrzeug.erwarteteJahreEndOfLife!,
            geschaetzteKmProJahr: fahrzeug.geschaetzteKmProJahr!,
            kilometerstand: fahrzeug.kilometerstand,
          };

          const result = berechneWertverlust(input);
          
          gesamtWertverlustMonat += result.wertverlustProMonat;
          gesamtWertverlustJahr += result.wertverlustProJahr;

          fahrzeugDetails.push({
            id: fahrzeug.id,
            name: fahrzeug.name,
            wertverlustProMonat: result.wertverlustProMonat,
            wertverlustProJahr: result.wertverlustProJahr,
            jahreRest: result.jahreRest,
            vollstaendig: true,
          });
        } catch (error) {
          // Berechnungsfehler (z.B. ungültige Werte)
          fahrzeugDetails.push({
            id: fahrzeug.id,
            name: fahrzeug.name,
            wertverlustProMonat: 0,
            wertverlustProJahr: 0,
            jahreRest: 0,
            vollstaendig: false,
          });
        }
      } else {
        fahrzeugDetails.push({
          id: fahrzeug.id,
          name: fahrzeug.name,
          wertverlustProMonat: 0,
          wertverlustProJahr: 0,
          jahreRest: 0,
          vollstaendig: false,
        });
      }
    }

    const fahrzeugeOhneDaten = fahrzeugDetails.filter(f => !f.vollstaendig).length;

    return NextResponse.json({
      gesamtWertverlustMonat,
      gesamtWertverlustJahr,
      fahrzeugDetails,
      fahrzeugeGesamt: fahrzeuge.length,
      fahrzeugeOhneDaten,
    });
  } catch (error) {
    console.error('Fehler bei Wertverlust-Berechnung:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
