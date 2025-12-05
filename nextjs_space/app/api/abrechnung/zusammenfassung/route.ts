import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const fahrzeugId = searchParams.get('fahrzeugId');

    // Zeitraum-Filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      // Ende des Tages
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const createdAtFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // User-Kontostand (nur eigene Zahlungen)
    const userZahlungen = await prisma.zahlung.findMany({
      where: {
        fahrerId: userId,
        status: 'BESTAETIGT',
        ...createdAtFilter,
      },
      include: {
        fahrzeug: true,
      },
    });

    const allUserFahrten = await prisma.fahrt.findMany({
      where: {
        fahrerId: userId,
        status: 'ABGESCHLOSSEN',
      },
      include: {
        fahrzeug: true,
        buchung: true,
      },
    });
    
    // Filter nach Buchungs-Startzeit im Speicher
    const userFahrten = hasDateFilter 
      ? allUserFahrten.filter(f => {
          const buchungStart = new Date(f.buchung.startZeit);
          return (!dateFilter.gte || buchungStart >= dateFilter.gte) && 
                 (!dateFilter.lte || buchungStart <= dateFilter.lte);
        })
      : allUserFahrten;

    // User-Zusammenfassung
    const userKontostand = {
      gesamtSchulden: userFahrten.reduce((sum, f) => sum + (f.kosten || 0), 0),
      gesamtZahlungen: userZahlungen.reduce((sum, z) => sum + z.betrag, 0),
      saldo: 0,
      zahlungenNachArt: {} as Record<string, number>,
      zahlungenNachFahrzeug: {} as Record<string, { name: string; betrag: number }>,
    };
    userKontostand.saldo = userKontostand.gesamtSchulden - userKontostand.gesamtZahlungen;

    // Aufschlüsselung nach Zahlungsart für User
    userZahlungen.forEach((z) => {
      const art = z.zahlungsart;
      userKontostand.zahlungenNachArt[art] = (userKontostand.zahlungenNachArt[art] || 0) + z.betrag;
      
      const fzName = z.fahrzeug.name;
      if (!userKontostand.zahlungenNachFahrzeug[z.fahrzeugId]) {
        userKontostand.zahlungenNachFahrzeug[z.fahrzeugId] = { name: fzName, betrag: 0 };
      }
      userKontostand.zahlungenNachFahrzeug[z.fahrzeugId].betrag += z.betrag;
    });

    // Fahrzeug-Kontostände (alle sichtbar)
    let fahrzeugFilter: any = {};
    if (fahrzeugId) {
      fahrzeugFilter = { id: fahrzeugId };
    }

    const fahrzeuge = await prisma.fahrzeug.findMany({
      where: fahrzeugFilter,
      include: {
        halter: true,
      },
    });

    const fahrzeugKontostaende = await Promise.all(
      fahrzeuge.map(async (fahrzeug) => {
        // Alle bestätigten Zahlungen für dieses Fahrzeug
        const zahlungen = await prisma.zahlung.findMany({
          where: {
            fahrzeugId: fahrzeug.id,
            status: 'BESTAETIGT',
            ...createdAtFilter,
          },
          include: {
            fahrer: true,
          },
        });

        // Alle abgeschlossenen Fahrten für dieses Fahrzeug
        const allFahrten = await prisma.fahrt.findMany({
          where: {
            fahrzeugId: fahrzeug.id,
            status: 'ABGESCHLOSSEN',
          },
          include: {
            fahrer: true,
            buchung: true,
          },
        });
        
        // Filter nach Buchungs-Startzeit im Speicher
        const fahrten = hasDateFilter 
          ? allFahrten.filter(f => {
              const buchungStart = new Date(f.buchung.startZeit);
              return (!dateFilter.gte || buchungStart >= dateFilter.gte) && 
                     (!dateFilter.lte || buchungStart <= dateFilter.lte);
            })
          : allFahrten;

        // Gesamteinnahmen (Kosten der Fahrten)
        const gesamtEinnahmen = fahrten.reduce((sum, f) => sum + (f.kosten || 0), 0);

        // Gesamtzahlungen
        const gesamtZahlungen = zahlungen.reduce((sum, z) => sum + z.betrag, 0);

        // Aufschlüsselung nach Zahlungsart
        const zahlungenNachArt: Record<string, number> = {};
        zahlungen.forEach((z) => {
          const art = z.zahlungsart;
          zahlungenNachArt[art] = (zahlungenNachArt[art] || 0) + z.betrag;
        });

        return {
          fahrzeugId: fahrzeug.id,
          fahrzeugName: fahrzeug.name,
          halterName: fahrzeug.halter.name,
          halterId: fahrzeug.halterId,
          gesamtEinnahmen,
          gesamtZahlungen,
          saldo: gesamtEinnahmen - gesamtZahlungen,
          zahlungenNachArt,
        };
      })
    );

    return NextResponse.json({
      userKontostand,
      fahrzeugKontostaende,
      zeitraum: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (error: any) {
    console.error('Get zusammenfassung error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}
