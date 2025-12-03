'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Car, Plus, MapPin, TrendingUp, Settings } from 'lucide-react';

interface Fahrzeug {
  id: string;
  name: string;
  foto: string | null;
  kilometerstand: number;
  kilometerpauschale: number;
  schluesselablageort: string;
  status: string;
  halter: {
    name: string | null;
  };
}

export default function FahrzeugePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [loading, setLoading] = useState(true);
  const [fotoUrls, setFotoUrls] = useState<{ [key: string]: string }>({});

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFahrzeuge();
    }
  }, [status]);

  const fetchFahrzeuge = async () => {
    try {
      const response = await fetch('/api/fahrzeuge');
      if (response.ok) {
        const data = await response.json();
        setFahrzeuge(data ?? []);
        
        // Set foto URLs directly - Vercel Blob URLs are public
        const urls: { [key: string]: string } = {};
        for (const f of data ?? []) {
          if (f?.foto) {
            urls[f.id] = f.foto;
          }
        }
        setFotoUrls(urls);
      }
    } catch (error) {
      console.error('Error fetching fahrzeuge:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Laden...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fahrzeuge</h1>
          <p className="text-gray-600">Verwalten Sie alle verfügbaren Fahrzeuge</p>
        </div>
        {userRole === 'ADMIN' && (
          <Link
            href="/fahrzeuge/neu"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
            aria-label="Neues Fahrzeug hinzufügen"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            Fahrzeug hinzufügen
          </Link>
        )}
      </div>

      {fahrzeuge.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-gray-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Noch keine Fahrzeuge vorhanden
          </h3>
          <p className="text-gray-600 mb-4">
            {userRole === 'ADMIN' ? 'Fügen Sie Ihr erstes Fahrzeug hinzu' : 'Es sind noch keine Fahrzeuge verfügbar'}
          </p>
          {userRole === 'ADMIN' && (
            <Link
              href="/fahrzeuge/neu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              Fahrzeug hinzufügen
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fahrzeuge?.map?.((fahrzeug) => (
            <Link
              key={fahrzeug?.id}
              href={`/fahrzeuge/${fahrzeug?.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
                {fahrzeug?.foto && fotoUrls?.[fahrzeug?.id] ? (
                  <Image
                    src={fotoUrls[fahrzeug.id]}
                    alt={`Foto von ${fahrzeug?.name ?? 'Fahrzeug'}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Car className="w-16 h-16 text-gray-400" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm ${
                      fahrzeug?.status === 'VERFUEGBAR'
                        ? 'bg-green-100/90 text-green-700'
                        : fahrzeug?.status === 'IN_WARTUNG'
                        ? 'bg-yellow-100/90 text-yellow-700'
                        : 'bg-red-100/90 text-red-700'
                    }`}
                  >
                    {fahrzeug?.status === 'VERFUEGBAR'
                      ? 'Verfügbar'
                      : fahrzeug?.status === 'IN_WARTUNG'
                      ? 'In Wartung'
                      : 'Außer Betrieb'}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {fahrzeug?.name}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <TrendingUp className="w-4 h-4" aria-hidden="true" />
                    <span>{fahrzeug?.kilometerstand?.toLocaleString?.('de-DE') ?? 0} km</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    <span className="truncate">{fahrzeug?.schluesselablageort}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Kilometerpauschale</p>
                    <p className="text-lg font-bold text-blue-600">
                      {fahrzeug?.kilometerpauschale?.toFixed?.(2) ?? '0.00'} €/km
                    </p>
                  </div>
                  <Settings
                    className="w-5 h-5 text-gray-400"
                    aria-label="Einstellungen"
                  />
                </div>
              </div>
            </Link>
          )) ?? null}
        </div>
      )}
    </div>
  );
}
