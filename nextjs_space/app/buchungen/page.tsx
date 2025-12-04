'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar, Plus, Car, Clock, X, AlertCircle, ChevronDown } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { BuchungStatusBadge } from '@/components/status-badge';
import { LoadingState, EmptyState, PageContainer, PageHeader, ErrorAlert } from '@/components/page-states';
import type { BuchungWithRelations, Fahrzeug } from '@/lib/types';

export default function BuchungenPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [buchungen, setBuchungen] = useState<BuchungWithRelations[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
  const [verfuegbareFahrzeuge, setVerfuegbareFahrzeuge] = useState<Fahrzeug[]>([]);
  const [loadingFahrzeuge, setLoadingFahrzeuge] = useState(false);
  const [zeitraumGewaehlt, setZeitraumGewaehlt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fahrzeugId: '',
    startDatum: '',
    startStunde: '8',
    endDatum: '',
    endStunde: '17',
  });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAbgeschlossen, setShowAbgeschlossen] = useState(false);

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

  const fetchVerfuegbareFahrzeuge = async () => {
    if (!formData.startDatum || !formData.endDatum) {
      setError('Bitte wählen Sie Start- und Enddatum');
      return;
    }

    const startZeit = new Date(`${formData.startDatum}T${formData.startStunde.padStart(2, '0')}:00:00`);
    const endZeit = new Date(`${formData.endDatum}T${formData.endStunde.padStart(2, '0')}:00:00`);

    if (endZeit <= startZeit) {
      setError('Endzeit muss nach der Startzeit liegen');
      return;
    }

    setError('');
    setLoadingFahrzeuge(true);

    try {
      const response = await fetch(
        `/api/fahrzeuge/verfuegbar?startZeit=${startZeit.toISOString()}&endZeit=${endZeit.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setVerfuegbareFahrzeuge(data ?? []);
        setZeitraumGewaehlt(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Fehler beim Laden der Fahrzeuge');
      }
    } catch (err: any) {
      setError('Fehler beim Laden der Fahrzeuge');
    } finally {
      setLoadingFahrzeuge(false);
    }
  };

  const handleCreateBuchung = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      // Construct datetime from date + hour
      const startZeit = new Date(`${formData.startDatum}T${formData.startStunde.padStart(2, '0')}:00:00`);
      const endZeit = new Date(`${formData.endDatum}T${formData.endStunde.padStart(2, '0')}:00:00`);

      // Validate: end must be after start
      if (endZeit <= startZeit) {
        throw new Error('Endzeit muss nach der Startzeit liegen');
      }

      const response = await fetch('/api/buchungen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fahrzeugId: formData.fahrzeugId,
          startZeit: startZeit.toISOString(),
          endZeit: endZeit.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setShowModal(false);
      setFormData({ fahrzeugId: '', startDatum: '', startStunde: '8', endDatum: '', endStunde: '17' });
      setZeitraumGewaehlt(false);
      setVerfuegbareFahrzeuge([]);
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
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('Error cancelling buchung:', error);
    }
  };

  if (loading || status === 'loading') {
    return <LoadingState />;
  }

  const addButton = (
    <button
      onClick={() => setShowModal(true)}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
      aria-label="Neue Buchung erstellen"
    >
      <Plus className="w-5 h-5" aria-hidden="true" />
      Neue Buchung
    </button>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Buchungen"
        description="Verwalten Sie Ihre Fahrzeugbuchungen"
        action={addButton}
      />

      {(() => {
        const offeneBuchungen = buchungen?.filter?.((b: any) => b?.status === 'GEPLANT' || b?.status === 'LAUFEND') ?? [];
        const abgeschlosseneBuchungen = buchungen?.filter?.((b: any) => b?.status === 'ABGESCHLOSSEN' || b?.status === 'STORNIERT') ?? [];

        const renderBuchung = (buchung: any) => (
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
                    <span>Start: {formatDate(buchung?.startZeit)} {formatTime(buchung?.startZeit)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    <span>Ende: {formatDate(buchung?.endZeit)} {formatTime(buchung?.endZeit)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <BuchungStatusBadge status={buchung.status} />
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
        );

        if (buchungen.length === 0) {
          return (
            <EmptyState
              icon={Calendar}
              title="Keine Buchungen vorhanden"
              description="Erstellen Sie Ihre erste Buchung"
            />
          );
        }

        return (
          <div className="space-y-6">
            {/* Offene Buchungen */}
            {offeneBuchungen.length > 0 && (
              <div className="space-y-4">
                {offeneBuchungen.map(renderBuchung)}
              </div>
            )}

            {offeneBuchungen.length === 0 && abgeschlosseneBuchungen.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-600">Keine offenen Buchungen</p>
              </div>
            )}

            {/* Abgeschlossene Buchungen Accordion */}
            {abgeschlosseneBuchungen.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowAbgeschlossen(!showAbgeschlossen)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  aria-expanded={showAbgeschlossen}
                >
                  <span className="font-semibold text-gray-700">
                    Abgeschlossene Buchungen ({abgeschlosseneBuchungen.length})
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                      showAbgeschlossen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {showAbgeschlossen && (
                  <div className="p-4 space-y-4 bg-gray-50/50">
                    {abgeschlosseneBuchungen.map(renderBuchung)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

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
                  setZeitraumGewaehlt(false);
                  setVerfuegbareFahrzeuge([]);
                  setFormData({ fahrzeugId: '', startDatum: '', startStunde: '8', endDatum: '', endStunde: '17' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {error && <ErrorAlert message={error} icon={AlertCircle} className="mb-6" />}

            <form onSubmit={handleCreateBuchung} className="space-y-4">
              {/* Schritt 1: Zeitraum wählen */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-full ${zeitraumGewaehlt ? 'bg-green-500' : 'bg-blue-500'} text-white flex items-center justify-center text-sm font-bold`}>
                  {zeitraumGewaehlt ? '✓' : '1'}
                </div>
                <span className="font-medium text-gray-700">Zeitraum wählen</span>
                {zeitraumGewaehlt && (
                  <button
                    type="button"
                    onClick={() => {
                      setZeitraumGewaehlt(false);
                      setVerfuegbareFahrzeuge([]);
                      setFormData({ ...formData, fahrzeugId: '' });
                    }}
                    className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ändern
                  </button>
                )}
              </div>
              <div className={zeitraumGewaehlt ? 'opacity-60 pointer-events-none' : ''}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Startzeit *
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="startDatum"
                      type="date"
                      value={formData.startDatum}
                      onChange={(e) => setFormData({ ...formData, startDatum: e.target.value })}
                      required
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-required="true"
                    />
                    <select
                      id="startStunde"
                      value={formData.startStunde}
                      onChange={(e) => setFormData({ ...formData, startStunde: e.target.value })}
                      required
                      className="w-24 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Startstunde"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endzeit *
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="endDatum"
                      type="date"
                      value={formData.endDatum}
                      onChange={(e) => setFormData({ ...formData, endDatum: e.target.value })}
                      required
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-required="true"
                    />
                    <select
                      id="endStunde"
                      value={formData.endStunde}
                      onChange={(e) => setFormData({ ...formData, endStunde: e.target.value })}
                      required
                      className="w-24 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Endstunde"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!zeitraumGewaehlt && (
                  <button
                    type="button"
                    onClick={fetchVerfuegbareFahrzeuge}
                    disabled={loadingFahrzeuge || !formData.startDatum || !formData.endDatum}
                    className="w-full mt-3 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {loadingFahrzeuge ? 'Suche...' : 'Verfügbare Fahrzeuge suchen'}
                  </button>
                )}
              </div>

              {/* Schritt 2: Fahrzeug wählen */}
              {zeitraumGewaehlt && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <span className="font-medium text-gray-700">Fahrzeug wählen</span>
                  </div>
                  {verfuegbareFahrzeuge.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                      <AlertCircle className="w-4 h-4 inline-block mr-2" />
                      Keine Fahrzeuge in diesem Zeitraum verfügbar.
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 mb-2">
                        {verfuegbareFahrzeuge.length} Fahrzeug{verfuegbareFahrzeuge.length !== 1 ? 'e' : ''} verfügbar
                      </p>
                      <select
                        id="fahrzeug"
                        value={formData.fahrzeugId}
                        onChange={(e) => setFormData({ ...formData, fahrzeugId: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        aria-required="true"
                      >
                        <option value="">Fahrzeug auswählen</option>
                        {verfuegbareFahrzeuge.map((f: any) => (
                          <option key={f?.id} value={f?.id}>
                            {f?.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating || !zeitraumGewaehlt || !formData.fahrzeugId}
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
                    setZeitraumGewaehlt(false);
                    setVerfuegbareFahrzeuge([]);
                    setFormData({ fahrzeugId: '', startDatum: '', startStunde: '8', endDatum: '', endStunde: '17' });
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
    </PageContainer>
  );
}
