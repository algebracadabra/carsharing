'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Edit, Trash2, MapPin, TrendingUp, DollarSign, Key, Car, Calendar, Route, Fuel, Wrench, PiggyBank, X, Check } from 'lucide-react';

export default function FahrzeugDetailPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [fahrzeug, setFahrzeug] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingCosts, setEditingCosts] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);
  const [costFormData, setCostFormData] = useState({
    treibstoffKostenIncrement: '',
    fixkosten: '0',
    wartungsReparaturKostenIncrement: '',
  });

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetchFahrzeug();
    }
  }, [status, id]);

  const fetchFahrzeug = async () => {
    try {
      const response = await fetch(`/api/fahrzeuge/${id}`);
      if (response.ok) {
        const data = await response.json();
        setFahrzeug(data);
        
        setCostFormData({
          treibstoffKostenIncrement: '',
          fixkosten: (data.fixkosten ?? 0).toString(),
          wartungsReparaturKostenIncrement: '',
        });
        
        // Vercel Blob URLs are public - use directly
        if (data?.foto) {
          setFotoUrl(data.foto);
        }
      }
    } catch (error) {
      console.error('Error fetching fahrzeug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCosts = async () => {
    setSavingCosts(true);
    try {
      const response = await fetch(`/api/fahrzeuge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treibstoffKostenIncrement: costFormData.treibstoffKostenIncrement || undefined,
          fixkosten: costFormData.fixkosten,
          wartungsReparaturKostenIncrement: costFormData.wartungsReparaturKostenIncrement || undefined,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setFahrzeug((prev: any) => ({ ...prev, ...updated }));
        setEditingCosts(false);
      } else {
        alert('Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving costs:', error);
      alert('Fehler beim Speichern');
    } finally {
      setSavingCosts(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie dieses Fahrzeug wirklich löschen?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/fahrzeuge/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/fahrzeuge');
      } else {
        alert('Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting fahrzeug:', error);
      alert('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Laden...</div>
      </div>
    );
  }

  if (!fahrzeug) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Fahrzeug nicht gefunden</div>
      </div>
    );
  }

  const isOwner = fahrzeug?.halterId === userId;
  const isAdmin = userRole === 'ADMIN';
  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/fahrzeuge"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Zurück zu Fahrzeugen
      </Link>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
          {fotoUrl ? (
            <Image
              src={fotoUrl}
              alt={`Foto von ${fahrzeug?.name ?? 'Fahrzeug'}`}
              fill
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Car className="w-24 h-24 text-gray-400" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{fahrzeug?.name}</h1>
              <p className="text-gray-600">
                Halter: <span className="font-semibold">{fahrzeug?.halter?.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium px-4 py-2 rounded-full ${
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
              {canEdit && (
                <Link
                  href={`/fahrzeuge/${id}/bearbeiten`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Fahrzeug bearbeiten"
                >
                  <Edit className="w-5 h-5 text-gray-600" aria-hidden="true" />
                </Link>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Fahrzeug löschen"
                >
                  <Trash2 className="w-5 h-5 text-red-600" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Kilometerstand</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {fahrzeug?.kilometerstand?.toLocaleString?.('de-DE') ?? 0} km
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Kilometerpauschale</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {fahrzeug?.kilometerpauschale?.toFixed?.(2) ?? '0.00'} €/km
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-purple-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Schlüssel</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {fahrzeug?.schluesselablageort}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kosten Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-gray-700" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Kostenübersicht</h2>
          </div>
          {(isOwner || isAdmin) && !editingCosts && (
            <button
              onClick={() => setEditingCosts(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Kosten bearbeiten"
            >
              <Edit className="w-5 h-5 text-gray-600" aria-hidden="true" />
            </button>
          )}
          {editingCosts && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveCosts}
                disabled={savingCosts}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Speichern"
              >
                <Check className="w-5 h-5 text-green-600" aria-hidden="true" />
              </button>
              <button
                onClick={() => {
                  setEditingCosts(false);
                  setCostFormData({
                    treibstoffKostenIncrement: '',
                    fixkosten: (fahrzeug?.fixkosten ?? 0).toString(),
                    wartungsReparaturKostenIncrement: '',
                  });
                }}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                aria-label="Abbrechen"
              >
                <X className="w-5 h-5 text-red-600" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {editingCosts ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Fuel className="w-5 h-5 text-orange-600" aria-hidden="true" />
                <label htmlFor="treibstoffKosten" className="font-semibold text-gray-900">Treibstoffkosten hinzufügen</label>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Aktuell: {fahrzeug?.treibstoffKosten?.toFixed?.(2) ?? '0.00'} €
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-orange-600">+</span>
                <input
                  id="treibstoffKosten"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costFormData.treibstoffKostenIncrement}
                  onChange={(e) => setCostFormData({ ...costFormData, treibstoffKostenIncrement: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-bold"
                />
                <span className="text-lg font-bold text-orange-600">€</span>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <PiggyBank className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                <label htmlFor="fixkosten" className="font-semibold text-gray-900">Fixkosten</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="fixkosten"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costFormData.fixkosten}
                  onChange={(e) => setCostFormData({ ...costFormData, fixkosten: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-bold"
                />
                <span className="text-lg font-bold text-indigo-600">€</span>
              </div>
            </div>

            <div className="bg-rose-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Wrench className="w-5 h-5 text-rose-600" aria-hidden="true" />
                <label htmlFor="wartungsReparaturKosten" className="font-semibold text-gray-900">Wartung & Reparatur hinzufügen</label>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Aktuell: {fahrzeug?.wartungsReparaturKosten?.toFixed?.(2) ?? '0.00'} €
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-rose-600">+</span>
                <input
                  id="wartungsReparaturKosten"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costFormData.wartungsReparaturKostenIncrement}
                  onChange={(e) => setCostFormData({ ...costFormData, wartungsReparaturKostenIncrement: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-lg font-bold"
                />
                <span className="text-lg font-bold text-rose-600">€</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Fuel className="w-5 h-5 text-orange-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Treibstoffkosten</h3>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {fahrzeug?.treibstoffKosten?.toFixed?.(2) ?? '0.00'} €
              </p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <PiggyBank className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Fixkosten</h3>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {fahrzeug?.fixkosten?.toFixed?.(2) ?? '0.00'} €
              </p>
            </div>

            <div className="bg-rose-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Wrench className="w-5 h-5 text-rose-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Wartung & Reparatur</h3>
              </div>
              <p className="text-2xl font-bold text-rose-600">
                {fahrzeug?.wartungsReparaturKosten?.toFixed?.(2) ?? '0.00'} €
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Buchungen Section */}
      {fahrzeug?.buchungen && fahrzeug.buchungen.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-700" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Letzte Buchungen</h2>
          </div>
          <div className="space-y-3">
            {fahrzeug?.buchungen?.slice?.(0, 5)?.map?.((buchung: any) => (
              <div
                key={buchung?.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">{buchung?.user?.name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(buchung?.startZeit)?.toLocaleDateString?.('de-DE') ?? ''} -{' '}
                    {new Date(buchung?.endZeit)?.toLocaleDateString?.('de-DE') ?? ''}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    buchung?.status === 'GEPLANT'
                      ? 'bg-blue-100 text-blue-700'
                      : buchung?.status === 'LAUFEND'
                      ? 'bg-purple-100 text-purple-700'
                      : buchung?.status === 'ABGESCHLOSSEN'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {buchung?.status === 'GEPLANT'
                    ? 'Geplant'
                    : buchung?.status === 'LAUFEND'
                    ? 'Laufend'
                    : buchung?.status === 'ABGESCHLOSSEN'
                    ? 'Abgeschlossen'
                    : 'Storniert'}
                </span>
              </div>
            )) ?? null}
          </div>
        </div>
      )}

      {/* Fahrten Section */}
      {fahrzeug?.fahrten && fahrzeug.fahrten.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Route className="w-5 h-5 text-gray-700" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Letzte Fahrten</h2>
          </div>
          <div className="space-y-3">
            {fahrzeug?.fahrten?.slice?.(0, 5)?.map?.((fahrt: any) => (
              <div
                key={fahrt?.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">{fahrt?.fahrer?.name}</p>
                  <p className="text-sm text-gray-600">
                    {fahrt?.gefahreneKm} km ({fahrt?.startKilometer} - {fahrt?.endKilometer} km)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{fahrt?.kosten?.toFixed?.(2) ?? '0.00'} €</p>
                  <p className="text-xs text-gray-500">
                    {new Date(fahrt?.createdAt)?.toLocaleDateString?.('de-DE') ?? ''}
                  </p>
                </div>
              </div>
            )) ?? null}
          </div>
        </div>
      )}
    </div>
  );
}
