import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Car, Route, AlertCircle, AlertTriangle, Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import { formatNumber, formatCurrency, getUserDisplayName } from '@/lib/utils';
import { VehicleSchedule } from '@/components/vehicle-schedule';
import { DashboardWartung } from '@/components/dashboard-wartung';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userId = (session.user as any)?.id;
  const userRole = (session.user as any)?.role;

  // Fetch data based on role
  let offeneFahrten: any[] = [];
  let kilometerKonflikte: any[] = [];
  let ausstehendeZahlungen: any[] = [];
  let meinKontostand = 0; // Was ich schulde (positiv = ich schulde, negativ = mir wird geschuldet)
  let fahrzeugKontostaende: { fahrzeugName: string; saldo: number }[] = []; // Für Halter: Kontostände ihrer Fahrzeuge
  let stats = {
    offeneFahrten: 0,
  };

  if (userRole === 'ADMIN') {
    // Admin sieht alles
    offeneFahrten = await prisma.buchung.findMany({
      where: {
        status: 'ABGESCHLOSSEN',
        fahrt: null,
      },
      include: { fahrzeug: true, user: true },
      take: 5,
    });
    kilometerKonflikte = await prisma.fahrt.findMany({
      where: {
        kilometerKonflikt: true,
        konfliktGeloest: false,
      },
      include: { fahrzeug: { include: { halter: true } }, fahrer: true, buchung: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const zahlungenCount = await prisma.zahlung.count({
      where: {
        status: 'AUSSTEHEND',
      },
    });
    ausstehendeZahlungen = Array(zahlungenCount).fill(null);
  } else {
    // USER sieht eigene offene Fahrten und Buchungen für eigene Fahrzeuge
    offeneFahrten = await prisma.buchung.findMany({
      where: {
        OR: [
          { userId: userId },
          { fahrzeug: { halterId: userId } },
        ],
        status: 'ABGESCHLOSSEN',
        fahrt: null,
      },
      include: { fahrzeug: true, user: true },
      take: 5,
    });
    // User sieht Kilometer-Konflikte auf eigenen Fahrzeugen
    kilometerKonflikte = await prisma.fahrt.findMany({
      where: {
        fahrzeug: { halterId: userId },
        kilometerKonflikt: true,
        konfliktGeloest: false,
      },
      include: { fahrzeug: true, fahrer: true, buchung: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    // User sieht ausstehende Zahlungen wo er Fahrer oder Halter ist
    const userZahlungenCount = await prisma.zahlung.count({
      where: {
        status: 'AUSSTEHEND',
        OR: [
          { fahrerId: userId },
          { fahrzeug: { halterId: userId } },
        ],
      },
    });
    ausstehendeZahlungen = Array(userZahlungenCount).fill(null);
  }

  stats.offeneFahrten = offeneFahrten.length;

  // Berechne Kontostände
  const alleFahrten = await prisma.fahrt.findMany({
    where: userRole === 'ADMIN' 
      ? {} 
      : {
          OR: [
            { fahrerId: userId },
            { fahrzeug: { halterId: userId } },
          ],
        },
    include: { fahrzeug: { include: { halter: true } }, fahrer: true },
  });

  const alleZahlungen = await prisma.zahlung.findMany({
    where: userRole === 'ADMIN'
      ? { status: 'BESTAETIGT' }
      : {
          status: 'BESTAETIGT',
          OR: [
            { fahrerId: userId },
            { fahrzeug: { halterId: userId } },
          ],
        },
    include: { fahrzeug: true },
  });

  // Kontostand-Berechnung: Fahrer-Fahrzeug-Paare
  const konten: Record<string, { fahrerId: string; fahrzeugId: string; fahrzeugName: string; halterId: string; schulden: number; zahlungen: number }> = {};
  
  alleFahrten.forEach((fahrt) => {
    const key = `${fahrt.fahrerId}-${fahrt.fahrzeugId}`;
    if (!konten[key]) {
      konten[key] = {
        fahrerId: fahrt.fahrerId,
        fahrzeugId: fahrt.fahrzeugId,
        fahrzeugName: fahrt.fahrzeug.name,
        halterId: fahrt.fahrzeug.halterId,
        schulden: 0,
        zahlungen: 0,
      };
    }
    konten[key].schulden += fahrt.kosten ?? 0;
  });

  alleZahlungen.forEach((zahlung) => {
    const key = `${zahlung.fahrerId}-${zahlung.fahrzeugId}`;
    if (konten[key]) {
      konten[key].zahlungen += zahlung.betrag ?? 0;
    }
  });

  // Mein Kontostand: Summe aller Salden wo ich Fahrer bin
  Object.values(konten).forEach((konto) => {
    const saldo = konto.schulden - konto.zahlungen;
    if (konto.fahrerId === userId) {
      meinKontostand += saldo;
    }
  });

  // Fahrzeug-Kontostände: Für Halter - was ihnen geschuldet wird
  const fahrzeugSalden: Record<string, { fahrzeugName: string; saldo: number }> = {};
  Object.values(konten).forEach((konto) => {
    if (konto.halterId === userId && konto.fahrerId !== userId) {
      const saldo = konto.schulden - konto.zahlungen;
      if (!fahrzeugSalden[konto.fahrzeugId]) {
        fahrzeugSalden[konto.fahrzeugId] = { fahrzeugName: konto.fahrzeugName, saldo: 0 };
      }
      fahrzeugSalden[konto.fahrzeugId].saldo += saldo;
    }
  });
  fahrzeugKontostaende = Object.values(fahrzeugSalden).filter(f => Math.abs(f.saldo) > 0.01);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Willkommen, {session?.user?.name}!
        </h1>
        <p className="text-gray-600">
          Verwalten Sie Ihre Fahrzeuge, Buchungen und Fahrten an einem Ort
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Mein Kontostand */}
        <Link
          href="/abrechnung"
          className={`rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
            meinKontostand <= 0
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mein Kontostand</p>
              <p className={`text-2xl font-bold mt-2 ${
                meinKontostand <= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {meinKontostand > 0 ? '-' : ''}{formatCurrency(Math.abs(meinKontostand))} €
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {meinKontostand > 0 ? 'Offen' : 'Ausgeglichen'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${
              meinKontostand <= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {meinKontostand > 0 ? (
                <TrendingDown className={`w-8 h-8 text-red-600`} aria-hidden="true" />
              ) : (
                <TrendingUp className={`w-8 h-8 text-green-600`} aria-hidden="true" />
              )}
            </div>
          </div>
        </Link>

        {/* Fahrzeug-Einnahmen (nur für Halter) */}
        {fahrzeugKontostaende.length > 0 && (
          <Link
            href="/abrechnung"
            className="bg-blue-50 border border-blue-200 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fahrzeug-Einnahmen</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  +{formatCurrency(fahrzeugKontostaende.reduce((sum, f) => sum + f.saldo, 0))} €
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {fahrzeugKontostaende.length} Fahrzeug{fahrzeugKontostaende.length > 1 ? 'e' : ''}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Car className="w-8 h-8 text-blue-600" aria-hidden="true" />
              </div>
            </div>
          </Link>
        )}

        {/* Offene Fahrten */}
        {stats.offeneFahrten > 0 && (
          <Link
            href="/fahrten"
            className="bg-orange-50 border border-orange-200 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offene Fahrten</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.offeneFahrten}
                </p>
                <p className="text-xs text-gray-500 mt-1">Noch zu erfassen</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Route className="w-8 h-8 text-orange-600" aria-hidden="true" />
              </div>
            </div>
          </Link>
        )}

        {/* Offene Zahlungen */}
        {ausstehendeZahlungen.length > 0 && (
          <Link
            href="/abrechnung"
            className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offene Zahlungen</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {ausstehendeZahlungen.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Zu bestätigen</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Wallet className="w-8 h-8 text-yellow-600" aria-hidden="true" />
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Belegungsübersicht - 3 Tage */}
      <div className="mb-8">
        <VehicleSchedule daysCount={3} compact />
      </div>

      {/* Wartungsaufgaben */}
      <div className="mb-8">
        <DashboardWartung />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Offene Fahrten */}
        {offeneFahrten.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-900">Offene Fahrten</h2>
              </div>
              <Link
                href="/fahrten"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Alle anzeigen
              </Link>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Diese Buchungen sind abgeschlossen, aber es wurde noch keine Fahrt erfasst.
            </p>
            <div className="space-y-3">
              {offeneFahrten?.map?.((buchung: any) => (
                <Link
                  key={buchung?.id}
                  href="/fahrten"
                  className="flex items-center gap-4 p-4 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                >
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Route className="w-6 h-6 text-orange-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{buchung?.fahrzeug?.name}</h3>
                    <p className="text-sm text-gray-600">
                      Buchung vom{' '}
                      {new Date(buchung?.startZeit)?.toLocaleDateString?.('de-DE') ?? ''}
                    </p>
                  </div>
                  <button className="text-sm font-medium text-orange-700 hover:text-orange-800 px-4 py-2 bg-white rounded-lg border border-orange-200">
                    Fahrt erfassen
                  </button>
                </Link>
              )) ?? null}
            </div>
          </div>
        )}

        {/* Issues - Kilometer Konflikte */}
        {kilometerKonflikte.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-900">Issues</h2>
                <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
                  {kilometerKonflikte.length}
                </span>
              </div>
              <Link
                href="/fahrten"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Alle Fahrten anzeigen
              </Link>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Diese Fahrten haben Kilometerstand-Konflikte, die überprüft werden sollten.
            </p>
            <div className="space-y-3">
              {kilometerKonflikte?.map?.((fahrt: any) => (
                <Link
                  key={fahrt?.id}
                  href="/fahrten"
                  className="flex items-center gap-4 p-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div className="bg-red-100 p-3 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      Kilometerkonflikt: {fahrt?.fahrzeug?.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Fahrer: {getUserDisplayName(fahrt?.fahrer)} &bull; Start: {formatNumber(fahrt?.startKilometer)} km &bull; Ende: {formatNumber(fahrt?.endKilometer)} km
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Fahrt vom {new Date(fahrt?.createdAt)?.toLocaleDateString?.('de-DE') ?? ''}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
                    Ungelöst
                  </span>
                </Link>
              )) ?? null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
