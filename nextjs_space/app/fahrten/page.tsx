'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Route, Plus, Car, AlertCircle, X } from 'lucide-react';

export default function FahrtenPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [fahrten, setFahrten] = useState<any[]>([]);
  const [offeneBuchungen, setOffeneBuchungen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBuchung, setSelectedBuchung] = useState<any>(null);
  const [formData, setFormData] = useState({
    buchungId: '',
    startKilometer: '',
    endKilometer: '',
  });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [konfliktWarnung, setKonfliktWarnung] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [fahrtenRes, buchungenRes] = await Promise.all([
        fetch('/api/fahrten'),
        fetch('/api/buchungen'),
      ]);

      if (fahrtenRes.ok) {
        const data = await fahrtenRes.json();
        setFahrten(data ?? []);
      }

      if (buchungenRes.ok) {
        const data = await buchungenRes.json();
        const offene = data?.filter?.((b: any) => b?.status === 'ABGESCHLOSSEN' && !b?.fahrt) ?? [];
        setOffeneBuchungen(offene);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (buchung: any) => {
    setSelectedBuchung(buchung);
    setFormData({
      buchungId: buchung.id,
      startKilometer: buchung?.fahrzeug?.kilometerstand?.toString?.() ?? '',
      endKilometer: '',
    });
    setShowModal(true);
    setKonfliktWarnung(null);
  };

  const checkKonflikt = (startKm: string) => {
    if (!startKm || !selectedBuchung) return;
    
    const start = parseInt(startKm);
    const current = selectedBuchung?.fahrzeug?.kilometerstand;
    
    if (start !== current) {
      const differenz = start - current;
      setKonfliktWarnung({
        differenz,
        message: `Kilometerkonflikt: Eingegebener Start (${start} km) weicht vom aktuellen Fahrzeugstand (${current} km) um ${Math.abs(differenz)} km ab.`,
      });
    } else {
      setKonfliktWarnung(null);
    }
  };

  const handleCreateFahrt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const response = await fetch('/api/fahrten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setShowModal(false);
      setSelectedBuchung(null);
      setFormData({ buchungId: '', startKilometer: '', endKilometer: '' });
      setKonfliktWarnung(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Laden...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fahrten</h1>
        <p className="text-gray-600">Erfassen und verwalten Sie Ihre Fahrten</p>
      </div>

      {/* Offene Fahrten */}
      {offeneBuchungen.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Offene Fahrten ({offeneBuchungen.length})</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Diese Buchungen sind abgeschlossen, aber es wurde noch keine Fahrt erfasst.
          </p>
          <div className="space-y-3">
            {offeneBuchungen?.map?.((buchung: any) => (
              <div
                key={buchung?.id}
                className="bg-white rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{buchung?.fahrzeug?.name}</h3>
                  <p className="text-sm text-gray-600">
                    Buchung vom {new Date(buchung?.startZeit)?.toLocaleDateString?.('de-DE') ?? ''}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenModal(buchung)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  Fahrt erfassen
                </button>
              </div>
            )) ?? null}
          </div>
        </div>
      )}

      {/* Fahrten Liste */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Alle Fahrten</h2>
        {fahrten.length === 0 ? (
          <div className="text-center py-12">
            <Route className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Keine Fahrten vorhanden
            </h3>
            <p className="text-gray-600">Erfassen Sie Ihre erste Fahrt</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fahrten?.map?.((fahrt: any) => (
              <div
                key={fahrt?.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="w-5 h-5 text-blue-600" aria-hidden="true" />
                      <h3 className="font-bold text-gray-900">{fahrt?.fahrzeug?.name}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Fahrer:</span> {fahrt?.fahrer?.name}
                      </div>
                      <div>
                        <span className="font-medium">Strecke:</span> {fahrt?.startKilometer} - {fahrt?.endKilometer} km
                      </div>
                      <div>
                        <span className="font-medium">Gefahren:</span> {fahrt?.gefahreneKm} km
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      {new Date(fahrt?.createdAt)?.toLocaleDateString?.('de-DE') ?? ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {fahrt?.kosten?.toFixed?.(2) ?? '0.00'} €
                    </p>
                    {fahrt?.kilometerKonflikt && !fahrt?.konfliktGeloest && (
                      <span className="text-xs text-orange-600 font-medium">
                        Kilometerkonflikt
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )) ?? null}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedBuchung && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Fahrt erfassen</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError('');
                  setKonfliktWarnung(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-900">{selectedBuchung?.fahrzeug?.name}</p>
              <p className="text-sm text-gray-600">
                Aktueller Kilometerstand: {selectedBuchung?.fahrzeug?.kilometerstand?.toLocaleString?.('de-DE') ?? 0} km
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3" role="alert">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {konfliktWarnung && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3" role="alert">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-orange-800">{konfliktWarnung.message}</p>
              </div>
            )}

            <form onSubmit={handleCreateFahrt} className="space-y-4">
              <div>
                <label htmlFor="startKilometer" className="block text-sm font-medium text-gray-700 mb-2">
                  Startkilometer *
                </label>
                <input
                  id="startKilometer"
                  type="number"
                  value={formData.startKilometer}
                  onChange={(e) => {
                    setFormData({ ...formData, startKilometer: e.target.value });
                    checkKonflikt(e.target.value);
                  }}
                  required
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="endKilometer" className="block text-sm font-medium text-gray-700 mb-2">
                  Endkilometer *
                </label>
                <input
                  id="endKilometer"
                  type="number"
                  value={formData.endKilometer}
                  onChange={(e) => setFormData({ ...formData, endKilometer: e.target.value })}
                  required
                  min={formData.startKilometer || '0'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                />
              </div>

              {formData.startKilometer && formData.endKilometer && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Gefahrene Kilometer:</span>{' '}
                    {parseInt(formData.endKilometer) - parseInt(formData.startKilometer)} km
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Kosten:</span>{' '}
                    {(
                      (parseInt(formData.endKilometer) - parseInt(formData.startKilometer)) *
                      (selectedBuchung?.fahrzeug?.kilometerpauschale ?? 0)
                    ).toFixed(2)}{' '}
                    €
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  aria-label="Fahrt erfassen"
                >
                  {creating ? 'Wird erfasst...' : 'Erfassen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                    setKonfliktWarnung(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
