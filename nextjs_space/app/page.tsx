import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { Car, Calendar, Route, TrendingUp, AlertCircle } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userId = (session.user as any)?.id;
  const userRole = (session.user as any)?.role;

  // Fetch data based on role
  let fahrzeuge: any[] = [];
  let buchungen: any[] = [];
  let offeneFahrten: any[] = [];
  let stats = {
    totalFahrzeuge: 0,
    totalBuchungen: 0,
    offeneFahrten: 0,
  };

  if (userRole === 'ADMIN') {
    fahrzeuge = await prisma.fahrzeug.findMany({
      take: 5,
      include: { halter: true },
      orderBy: { createdAt: 'desc' },
    });
    buchungen = await prisma.buchung.findMany({
      take: 5,
      include: { fahrzeug: true, user: true },
      orderBy: { startZeit: 'asc' },
      where: { status: { in: ['GEPLANT', 'LAUFEND'] } },
    });
    stats.totalFahrzeuge = await prisma.fahrzeug.count();
    stats.totalBuchungen = await prisma.buchung.count();
    offeneFahrten = await prisma.buchung.findMany({
      where: {
        status: 'ABGESCHLOSSEN',
        fahrt: null,
      },
      include: { fahrzeug: true, user: true },
      take: 5,
    });
  } else if (userRole === 'HALTER') {
    fahrzeuge = await prisma.fahrzeug.findMany({
      where: { halterId: userId },
      include: { halter: true },
      orderBy: { createdAt: 'desc' },
    });
    buchungen = await prisma.buchung.findMany({
      where: {
        fahrzeug: { halterId: userId },
        status: { in: ['GEPLANT', 'LAUFEND'] },
      },
      include: { fahrzeug: true, user: true },
      orderBy: { startZeit: 'asc' },
      take: 5,
    });
    stats.totalFahrzeuge = fahrzeuge.length;
    stats.totalBuchungen = await prisma.buchung.count({
      where: { fahrzeug: { halterId: userId } },
    });
    offeneFahrten = await prisma.buchung.findMany({
      where: {
        fahrzeug: { halterId: userId },
        status: 'ABGESCHLOSSEN',
        fahrt: null,
      },
      include: { fahrzeug: true, user: true },
      take: 5,
    });
  } else {
    // FAHRER
    buchungen = await prisma.buchung.findMany({
      where: {
        userId: userId,
        status: { in: ['GEPLANT', 'LAUFEND'] },
      },
      include: { fahrzeug: true, user: true },
      orderBy: { startZeit: 'asc' },
    });
    stats.totalBuchungen = await prisma.buchung.count({ where: { userId } });
    offeneFahrten = await prisma.buchung.findMany({
      where: {
        userId: userId,
        status: 'ABGESCHLOSSEN',
        fahrt: null,
      },
      include: { fahrzeug: true, user: true },
      take: 5,
    });
  }

  stats.offeneFahrten = offeneFahrten.length;

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {(userRole === 'ADMIN' || userRole === 'HALTER') && (
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fahrzeuge</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalFahrzeuge}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Car className="w-8 h-8 text-blue-600" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {userRole === 'FAHRER' ? 'Meine Buchungen' : 'Buchungen'}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalBuchungen}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="w-8 h-8 text-green-600" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offene Fahrten</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.offeneFahrten}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Route className="w-8 h-8 text-orange-600" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fahrzeuge (only for HALTER and ADMIN) */}
        {(userRole === 'ADMIN' || userRole === 'HALTER') && fahrzeuge.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Meine Fahrzeuge</h2>
              <Link
                href="/fahrzeuge"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Alle anzeigen
              </Link>
            </div>
            <div className="space-y-3">
              {fahrzeuge?.slice?.(0, 5)?.map?.((fahrzeug: any) => (
                <Link
                  key={fahrzeug?.id}
                  href={`/fahrzeuge/${fahrzeug?.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Car className="w-6 h-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{fahrzeug?.name}</h3>
                    <p className="text-sm text-gray-600">
                      {fahrzeug?.kilometerstand?.toLocaleString?.('de-DE') ?? 0} km
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        fahrzeug?.status === 'VERFUEGBAR'
                          ? 'bg-green-100 text-green-700'
                          : fahrzeug?.status === 'IN_WARTUNG'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {fahrzeug?.status === 'VERFUEGBAR'
                        ? 'Verfügbar'
                        : fahrzeug?.status === 'IN_WARTUNG'
                        ? 'In Wartung'
                        : 'Außer Betrieb'}
                    </span>
                  </div>
                </Link>
              )) ?? null}
            </div>
          </div>
        )}

        {/* Anstehende Buchungen */}
        {buchungen.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Anstehende Buchungen</h2>
              <Link
                href="/buchungen"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Alle anzeigen
              </Link>
            </div>
            <div className="space-y-3">
              {buchungen?.slice?.(0, 5)?.map?.((buchung: any) => (
                <div
                  key={buchung?.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{buchung?.fahrzeug?.name}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(buchung?.startZeit)?.toLocaleDateString?.('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      }) ?? ''}{' '}
                      {new Date(buchung?.startZeit)?.toLocaleTimeString?.('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }) ?? ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      buchung?.status === 'GEPLANT'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {buchung?.status === 'GEPLANT' ? 'Geplant' : 'Laufend'}
                  </span>
                </div>
              )) ?? null}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}
