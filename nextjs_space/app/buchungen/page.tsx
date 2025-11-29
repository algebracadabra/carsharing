'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar, Plus, Car, User, Clock, X, AlertCircle } from 'lucide-react';

export default function BuchungenPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [buchungen, setBuchungen] = useState<any[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fahrzeugId: '',
    startZeit: '',
    endZeit: '',
  });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

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
      const [buchungenRes, fahrzeugeRes] = await Promise.all([
        fetch('/api/buchungen'),
        fetch('/api/fahrzeuge'),
      ]);

      if (buchungenRes.ok) {
        const data = await buchungenRes.json();
        setBuchungen(data ?? []);
      }

      if (fahrzeugeRes.ok) {
        const data = await fahrzeugeRes.json();
        setFahrzeuge(data ?? []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBuchung = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const response = await fetch('/api/buchungen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setShowModal(false);
      setFormData({ fahrzeugId: '', startZeit: '', endZeit: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStornieren = async (id: string) => {
    if (!confirm('Möchten Sie diese Buchung wirklich stornieren?')) return;

    try {
      await fetch(`/api/buchungen/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'STORNIERT' }),
      });
      fetchData();
    } catch (error) {
      console.error('Error cancelling buchung:', error);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buchungen</h1>
          <p className="text-gray-600">Verwalten Sie Ihre Fahrzeugbuchungen</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
          aria-label="Neue Buchung erstellen"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          Neue Buchung
        </button>
      </div>

      {buchungen.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Keine Buchungen vorhanden
          </h3>
          <p className="text-gray-600">Erstellen Sie Ihre erste Buchung</p>
        </div>
      ) : (
        <div className="space-y-4">
          {buchungen?.map?.((buchung: any) => (
            <div
              key={buchung?.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Car className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {buchung?.fahrzeug?.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Gebucht von: {buchung?.user?.name}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      <span>
                        Start: {new Date(buchung?.startZeit)?.toLocaleDateString?.('de-DE') ?? ''}{' '}
                        {new Date(buchung?.startZeit)?.toLocaleTimeString?.('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }) ?? ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      <span>
                        Ende: {new Date(buchung?.endZeit)?.toLocaleDateString?.('de-DE') ?? ''}{' '}
                        {new Date(buchung?.endZeit)?.toLocaleTimeString?.('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }) ?? ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
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
                  {buchung?.status === 'GEPLANT' && (
                    <button
                      onClick={() => handleStornieren(buchung?.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Stornieren
                    </button>
                  )}
                </div>
              </div>
            </div>
          )) ?? null}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Neue Buchung</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3" role="alert">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateBuchung} className="space-y-4">
              <div>
                <label htmlFor="fahrzeug" className="block text-sm font-medium text-gray-700 mb-2">
                  Fahrzeug *
                </label>
                <select
                  id="fahrzeug"
                  value={formData.fahrzeugId}
                  onChange={(e) => setFormData({ ...formData, fahrzeugId: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                >
                  <option value="">Fahrzeug auswählen</option>
                  {fahrzeuge?.filter?.(f => f?.status === 'VERFUEGBAR')?.map?.((f: any) => (
                    <option key={f?.id} value={f?.id}>
                      {f?.name}
                    </option>
                  )) ?? null}
                </select>
              </div>

              <div>
                <label htmlFor="startZeit" className="block text-sm font-medium text-gray-700 mb-2">
                  Startzeit *
                </label>
                <input
                  id="startZeit"
                  type="datetime-local"
                  value={formData.startZeit}
                  onChange={(e) => setFormData({ ...formData, startZeit: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="endZeit" className="block text-sm font-medium text-gray-700 mb-2">
                  Endzeit *
                </label>
                <input
                  id="endZeit"
                  type="datetime-local"
                  value={formData.endZeit}
                  onChange={(e) => setFormData({ ...formData, endZeit: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  aria-label="Buchung erstellen"
                >
                  {creating ? 'Wird erstellt...' : 'Erstellen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
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
