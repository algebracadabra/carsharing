'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Route, Plus, Car, AlertCircle, X, Edit, Play, CheckCircle, Clock, ChevronDown, Zap } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';

export default function FahrtenPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [fahrten, setFahrten] = useState<any[]>([]);
  const [laufendeFahrten, setLaufendeFahrten] = useState<any[]>([]);
  const [offeneBuchungen, setOffeneBuchungen] = useState<any[]>([]);
  const [buchungen, setBuchungen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSchnellbuchungModal, setShowSchnellbuchungModal] = useState(false);
  
  // Schnellbuchung states
  const [verfuegbareFahrzeuge, setVerfuegbareFahrzeuge] = useState<any[]>([]);
  const [schnellbuchungDauer, setSchnellbuchungDauer] = useState(3); // Default: 3 Stunden
  const [selectedSchnellFahrzeug, setSelectedSchnellFahrzeug] = useState<any>(null);
  const [checkingVerfuegbarkeit, setCheckingVerfuegbarkeit] = useState(true);
  
  const [selectedBuchung, setSelectedBuchung] = useState<any>(null);
  const [selectedFahrt, setSelectedFahrt] = useState<any>(null);
  const [editingFahrt, setEditingFahrt] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    buchungId: '',
    startKilometer: '',
    endKilometer: '',
    bemerkungen: '',
  });
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [konfliktWarnung, setKonfliktWarnung] = useState<any>(null);
  const [showAbgeschlossen, setShowAbgeschlossen] = useState(false);

  // Helper function to calculate expected kilometer reading from previous trip
  const getExpectedKilometer = (currentFahrt: any) => {
    if (!currentFahrt?.fahrzeugId) return null;
    
    const vehicleTrips = fahrten
      ?.filter((f: any) => f?.fahrzeugId === currentFahrt.fahrzeugId && f?.status === 'ABGESCHLOSSEN')
      ?.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const currentIndex = vehicleTrips?.findIndex((f: any) => f.id === currentFahrt.id);
    if (currentIndex > 0) {
      return vehicleTrips[currentIndex - 1]?.endKilometer;
    }
    return null;
  };

  // Helper function to get conflict details
  const getKonfliktDetails = (fahrt: any) => {
    if (!fahrt?.kilometerKonflikt || fahrt?.konfliktGeloest) return null;
    
    const expectedKm = getExpectedKilometer(fahrt);
    
    // Auch ohne erwarteten Wert den Konflikt anzeigen
    if (expectedKm === null) {
      return {
        expected: null,
        actual: fahrt.startKilometer,
        difference: null,
        type: null
      };
    }
    
    const difference = fahrt.startKilometer - expectedKm;
    return {
      expected: expectedKm,
      actual: fahrt.startKilometer,
      difference: Math.abs(difference),
      type: difference > 0 ? 'höher' : 'niedriger'
    };
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
      checkVerfuegbarkeit();
      
      // Periodisch Verfügbarkeit prüfen (alle 30 Sekunden)
      const interval = setInterval(() => {
        checkVerfuegbarkeit();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [status]);

  // Prüft, ob Fahrzeuge für die nächsten X Stunden verfügbar sind
  const checkVerfuegbarkeit = async (dauer: number = schnellbuchungDauer) => {
    setCheckingVerfuegbarkeit(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + dauer * 60 * 60 * 1000);
      
      const res = await fetch(
        `/api/fahrzeuge/verfuegbar?startZeit=${start.toISOString()}&endZeit=${end.toISOString()}`
      );
      
      if (res.ok) {
        const data = await res.json();
        setVerfuegbareFahrzeuge(data ?? []);
      } else {
        setVerfuegbareFahrzeuge([]);
      }
    } catch (error) {
      console.error('Error checking verfuegbarkeit:', error);
      setVerfuegbareFahrzeuge([]);
    } finally {
      setCheckingVerfuegbarkeit(false);
    }
  };

  const fetchData = async () => {
    try {
      const [fahrtenRes, buchungenRes] = await Promise.all([
        fetch('/api/fahrten'),
        fetch('/api/buchungen'),
      ]);

      if (fahrtenRes.ok) {
        const data = await fahrtenRes.json();
        setFahrten(data ?? []);
        // Laufende Fahrten des aktuellen Users
        const laufende = data?.filter?.((f: any) => 
          f?.status === 'GESTARTET' && f?.fahrerId === (session?.user as any)?.id
        ) ?? [];
        setLaufendeFahrten(laufende);
      }

      if (buchungenRes.ok) {
        const data = await buchungenRes.json();
        setBuchungen(data ?? []);
        // Buchungen ohne Fahrt (GEPLANT oder ABGESCHLOSSEN ohne fahrt)
        const offene = data?.filter?.((b: any) => 
          (b?.status === 'GEPLANT' || b?.status === 'ABGESCHLOSSEN') && !b?.fahrt
        ) ?? [];
        setOffeneBuchungen(offene);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // === FAHRT STARTEN ===
  const handleOpenStartModal = (buchung?: any) => {
    setSelectedBuchung(buchung || null);
    setFormData({
      buchungId: buchung?.id || '',
      startKilometer: buchung?.fahrzeug?.kilometerstand?.toString?.() ?? '',
      endKilometer: '',
      bemerkungen: '',
    });
    setShowStartModal(true);
    setError('');
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

  const handleStartFahrt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/fahrten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buchungId: formData.buchungId,
          startKilometer: formData.startKilometer,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Starten');
      }

      setShowStartModal(false);
      setSelectedBuchung(null);
      setFormData({ buchungId: '', startKilometer: '', endKilometer: '', bemerkungen: '' });
      setKonfliktWarnung(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // === FAHRT ABSCHLIEßEN ===
  const handleOpenCompleteModal = (fahrt: any) => {
    setSelectedFahrt(fahrt);
    setFormData({
      buchungId: '',
      startKilometer: fahrt.startKilometer.toString(),
      endKilometer: '',
      bemerkungen: '',
    });
    setShowCompleteModal(true);
    setError('');
  };

  const handleCompleteFahrt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/fahrten/${selectedFahrt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          endKilometer: formData.endKilometer,
          bemerkungen: formData.bemerkungen,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Abschließen');
      }

      setShowCompleteModal(false);
      setSelectedFahrt(null);
      setFormData({ buchungId: '', startKilometer: '', endKilometer: '', bemerkungen: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // === FAHRT BEARBEITEN ===
  const handleOpenEditModal = (fahrt: any) => {
    setEditingFahrt(fahrt);
    setFormData({
      buchungId: '',
      startKilometer: fahrt.startKilometer.toString(),
      endKilometer: fahrt.endKilometer?.toString() || '',
      bemerkungen: fahrt.bemerkungen || '',
    });
    setShowEditModal(true);
    setError('');
  };

  const handleUpdateFahrt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/fahrten/${editingFahrt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startKilometer: formData.startKilometer,
          endKilometer: formData.endKilometer,
          bemerkungen: formData.bemerkungen,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }

      setShowEditModal(false);
      setEditingFahrt(null);
      setFormData({ buchungId: '', startKilometer: '', endKilometer: '', bemerkungen: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeAllModals = () => {
    setShowStartModal(false);
    setShowCompleteModal(false);
    setShowEditModal(false);
    setShowSchnellbuchungModal(false);
    setSelectedBuchung(null);
    setSelectedFahrt(null);
    setEditingFahrt(null);
    setSelectedSchnellFahrzeug(null);
    setError('');
    setKonfliktWarnung(null);
  };

  // === SCHNELLBUCHUNG + FAHRT STARTEN ===
  const handleOpenSchnellbuchungModal = async () => {
    await checkVerfuegbarkeit(schnellbuchungDauer);
    setSelectedSchnellFahrzeug(null);
    setFormData({
      buchungId: '',
      startKilometer: '',
      endKilometer: '',
      bemerkungen: '',
    });
    setShowSchnellbuchungModal(true);
    setError('');
  };

  const handleDauerChange = async (newDauer: number) => {
    setSchnellbuchungDauer(newDauer);
    await checkVerfuegbarkeit(newDauer);
  };

  const handleSchnellbuchungUndFahrtStarten = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!selectedSchnellFahrzeug) {
        throw new Error('Bitte wählen Sie ein Fahrzeug aus');
      }

      const startZeit = new Date();
      const endZeit = new Date(startZeit.getTime() + schnellbuchungDauer * 60 * 60 * 1000);

      // 1. Schnellbuchung erstellen
      const buchungRes = await fetch('/api/buchungen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fahrzeugId: selectedSchnellFahrzeug.id,
          startZeit: startZeit.toISOString(),
          endZeit: endZeit.toISOString(),
          schnellbuchung: true,
        }),
      });

      if (!buchungRes.ok) {
        const data = await buchungRes.json();
        throw new Error(data.error || 'Fehler beim Erstellen der Buchung');
      }

      const buchung = await buchungRes.json();

      // 2. Fahrt starten
      const fahrtRes = await fetch('/api/fahrten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buchungId: buchung.id,
          startKilometer: formData.startKilometer || selectedSchnellFahrzeug.kilometerstand,
        }),
      });

      if (!fahrtRes.ok) {
        const data = await fahrtRes.json();
        throw new Error(data.error || 'Fehler beim Starten der Fahrt');
      }

      setShowSchnellbuchungModal(false);
      setSelectedSchnellFahrzeug(null);
      setFormData({ buchungId: '', startKilometer: '', endKilometer: '', bemerkungen: '' });
      fetchData();
      checkVerfuegbarkeit();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Laden...</div>
      </div>
    );
  }

  const abgeschlosseneFahrten = fahrten?.filter?.((f: any) => f?.status === 'ABGESCHLOSSEN') ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fahrten</h1>
          <p className="text-gray-600">Erfassen und verwalten Sie Ihre Fahrten</p>
        </div>
        <div className="flex items-center gap-2">
          {!checkingVerfuegbarkeit && verfuegbareFahrzeuge.length === 0 && (
            <span className="text-sm text-orange-600 font-medium">
              Kein Fahrzeug verfügbar
            </span>
          )}
          <button
            onClick={handleOpenSchnellbuchungModal}
            disabled={checkingVerfuegbarkeit || verfuegbareFahrzeuge.length === 0}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={verfuegbareFahrzeuge.length === 0 ? 'Kein Fahrzeug verfügbar' : 'Schnellbuchung + Fahrt starten'}
          >
            <Zap className="w-4 h-4 mr-2" aria-hidden="true" />
            {checkingVerfuegbarkeit ? 'Prüfe...' : 'Fahrt starten'}
          </button>
        </div>
      </div>

      {/* LAUFENDE FAHRTEN - Prominent ganz oben */}
      {laufendeFahrten.length > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 rounded-full p-2">
              <Play className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              Laufende Fahrt{laufendeFahrten.length > 1 ? 'en' : ''}
            </h2>
          </div>
          <div className="space-y-4">
            {laufendeFahrten.map((fahrt: any) => (
              <div
                key={fahrt.id}
                className="bg-white rounded-xl p-5 shadow-md"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="w-5 h-5 text-green-600" aria-hidden="true" />
                      <h3 className="text-xl font-bold text-gray-900">{fahrt.fahrzeug?.name}</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Unterwegs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Gestartet:</span>{' '}
                        {new Date(fahrt.createdAt).toLocaleString('de-DE')}
                      </div>
                      <div>
                        <span className="font-medium">Startkilometer:</span>{' '}
                        {formatNumber(fahrt.startKilometer)} km
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenCompleteModal(fahrt)}
                    className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-md text-lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" aria-hidden="true" />
                    Fahrt beenden
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offene Buchungen (ohne Fahrt) */}
      {offeneBuchungen.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-600" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">
              Offene Buchungen ({offeneBuchungen.length})
            </h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Diese Buchungen haben noch keine zugehörige Fahrt.
          </p>
          <div className="space-y-3">
            {offeneBuchungen.map((buchung: any) => (
              <div
                key={buchung.id}
                className="bg-white rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{buchung.fahrzeug?.name}</h3>
                  <p className="text-sm text-gray-600">
                    Buchung vom {new Date(buchung.startZeit).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenStartModal(buchung)}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                  Fahrt starten
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abgeschlossene Fahrten - Accordion */}
      {abgeschlosseneFahrten.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Route className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Keine abgeschlossenen Fahrten
          </h3>
          <p className="text-gray-600">Starten Sie Ihre erste Fahrt</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAbgeschlossen(!showAbgeschlossen)}
            className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            aria-expanded={showAbgeschlossen}
          >
            <span className="font-semibold text-gray-700">
              Abgeschlossene Fahrten ({abgeschlosseneFahrten.length})
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
              {abgeschlosseneFahrten.map((fahrt: any) => (
                <div
                  key={fahrt.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="w-5 h-5 text-blue-600" aria-hidden="true" />
                        <h3 className="font-bold text-gray-900">{fahrt.fahrzeug?.name}</h3>
                        {fahrt.fahrerId === (session?.user as any)?.id && (
                          <button
                            onClick={() => handleOpenEditModal(fahrt)}
                            className="ml-2 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Fahrt bearbeiten"
                          >
                            <Edit className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Fahrer:</span> {fahrt.fahrer?.name}
                        </div>
                        <div>
                          <span className="font-medium">Strecke:</span> {formatNumber(fahrt.startKilometer)} - {formatNumber(fahrt.endKilometer)} km
                        </div>
                        <div>
                          <span className="font-medium">Gefahren:</span> {formatNumber(fahrt.gefahreneKm)} km
                        </div>
                      </div>
                      {fahrt.bemerkungen && (
                        <div className="text-sm text-gray-500 mt-2 italic">
                          "{fahrt.bemerkungen}"
                        </div>
                      )}
                      <div className="text-sm text-gray-500 mt-2">
                        {new Date(fahrt.createdAt).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(fahrt.kosten)} €
                      </p>
                      {(() => {
                        const konfliktDetails = getKonfliktDetails(fahrt);
                        if (!konfliktDetails) return null;
                        
                        return (
                          <div className="text-xs text-orange-600 font-medium mt-1">
                            <div className="mb-1">Kilometerkonflikt</div>
                            {konfliktDetails.expected !== null ? (
                              <>
                                <div className="text-xs text-orange-500">
                                  Erwartet: {formatNumber(konfliktDetails.expected)} km
                                </div>
                                <div className="text-xs text-orange-500">
                                  Eingegeben: {formatNumber(konfliktDetails.actual)} km
                                </div>
                                <div className="text-xs text-orange-500">
                                  Differenz: {formatNumber(konfliktDetails.difference)} km {konfliktDetails.type}
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-orange-500">
                                Startkilometer weicht vom Fahrzeugstand ab
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === MODAL: FAHRT STARTEN === */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <Play className="w-5 h-5 text-green-600" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Fahrt starten</h2>
              </div>
              <button
                onClick={closeAllModals}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleStartFahrt} className="space-y-4">
              {/* Buchung auswählen */}
              <div>
                <label htmlFor="buchung" className="block text-sm font-medium text-gray-700 mb-2">
                  Buchung auswählen *
                </label>
                <select
                  id="buchung"
                  value={formData.buchungId}
                  onChange={(e) => {
                    const buchungId = e.target.value;
                    const buchung = buchungen?.find?.((b: any) => b?.id === buchungId) ?? null;
                    setSelectedBuchung(buchung);
                    setFormData({
                      ...formData,
                      buchungId,
                      startKilometer: buchung?.fahrzeug?.kilometerstand?.toString?.() ?? '',
                    });
                    setKonfliktWarnung(null);
                  }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                >
                  <option value="" disabled>
                    Bitte Buchung wählen
                  </option>
                  {buchungen
                    ?.filter?.((b: any) => !b?.fahrt && b?.status !== 'STORNIERT')
                    ?.map?.((b: any) => (
                      <option key={b?.id} value={b?.id}>
                        {b?.fahrzeug?.name} – {b?.startZeit ? new Date(b.startZeit).toLocaleString('de-DE') : ''}
                      </option>
                    )) ?? null}
                </select>
              </div>

              {/* Fahrzeug-Info */}
              {selectedBuchung && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-900">{selectedBuchung.fahrzeug?.name}</p>
                  <p className="text-sm text-gray-600">
                    Aktueller Kilometerstand: {formatNumber(selectedBuchung.fahrzeug?.kilometerstand)} km
                  </p>
                </div>
              )}

              {/* Startkilometer */}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Fehler */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Konflikt-Warnung */}
              {konfliktWarnung && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3" role="alert">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-orange-800">{konfliktWarnung.message}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !formData.buchungId}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Wird gestartet...' : 'Fahrt starten'}
                </button>
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL: FAHRT ABSCHLIEßEN === */}
      {showCompleteModal && selectedFahrt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Fahrt beenden</h2>
              </div>
              <button
                onClick={closeAllModals}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Fahrt-Info */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-900">{selectedFahrt.fahrzeug?.name}</p>
              <p className="text-sm text-gray-600">
                Gestartet: {new Date(selectedFahrt.createdAt).toLocaleString('de-DE')}
              </p>
              <p className="text-sm text-gray-600">
                Startkilometer: {formatNumber(selectedFahrt.startKilometer)} km
              </p>
            </div>

            <form onSubmit={handleCompleteFahrt} className="space-y-4">
              {/* Endkilometer */}
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
                  min={selectedFahrt.startKilometer + 1}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Bemerkungen */}
              <div>
                <label htmlFor="bemerkungen" className="block text-sm font-medium text-gray-700 mb-2">
                  Bemerkungen (optional)
                </label>
                <textarea
                  id="bemerkungen"
                  value={formData.bemerkungen}
                  onChange={(e) => setFormData({ ...formData, bemerkungen: e.target.value })}
                  rows={3}
                  placeholder="z.B. Tankstop, besondere Vorkommnisse..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Kosten-Vorschau */}
              {formData.endKilometer && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Gefahrene Kilometer:</span>{' '}
                    {parseInt(formData.endKilometer) - selectedFahrt.startKilometer} km
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    Kosten:{' '}
                    {formatCurrency(
                      (parseInt(formData.endKilometer) - selectedFahrt.startKilometer) *
                      (selectedFahrt.fahrzeug?.kilometerpauschale ?? 0)
                    )}{' '}
                    €
                  </p>
                </div>
              )}

              {/* Fehler */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !formData.endKilometer}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Wird abgeschlossen...' : 'Fahrt abschließen'}
                </button>
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL: FAHRT BEARBEITEN === */}
      {showEditModal && editingFahrt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 rounded-full p-2">
                  <Edit className="w-5 h-5 text-gray-600" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Fahrt bearbeiten</h2>
              </div>
              <button
                onClick={closeAllModals}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Fahrt-Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="font-semibold text-gray-900">{editingFahrt.fahrzeug?.name}</p>
              <p className="text-sm text-gray-600">
                Erstellt: {new Date(editingFahrt.createdAt).toLocaleString('de-DE')}
              </p>
            </div>

            <form onSubmit={handleUpdateFahrt} className="space-y-4">
              {/* Startkilometer */}
              <div>
                <label htmlFor="editStartKilometer" className="block text-sm font-medium text-gray-700 mb-2">
                  Startkilometer *
                </label>
                <input
                  id="editStartKilometer"
                  type="number"
                  value={formData.startKilometer}
                  onChange={(e) => setFormData({ ...formData, startKilometer: e.target.value })}
                  required
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Endkilometer */}
              <div>
                <label htmlFor="editEndKilometer" className="block text-sm font-medium text-gray-700 mb-2">
                  Endkilometer *
                </label>
                <input
                  id="editEndKilometer"
                  type="number"
                  value={formData.endKilometer}
                  onChange={(e) => setFormData({ ...formData, endKilometer: e.target.value })}
                  required
                  min={formData.startKilometer || '0'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Bemerkungen */}
              <div>
                <label htmlFor="editBemerkungen" className="block text-sm font-medium text-gray-700 mb-2">
                  Bemerkungen (optional)
                </label>
                <textarea
                  id="editBemerkungen"
                  value={formData.bemerkungen}
                  onChange={(e) => setFormData({ ...formData, bemerkungen: e.target.value })}
                  rows={3}
                  placeholder="z.B. Tankstop, besondere Vorkommnisse..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Kosten-Vorschau */}
              {formData.startKilometer && formData.endKilometer && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Gefahrene Kilometer:</span>{' '}
                    {parseInt(formData.endKilometer) - parseInt(formData.startKilometer)} km
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    Kosten:{' '}
                    {formatCurrency(
                      (parseInt(formData.endKilometer) - parseInt(formData.startKilometer)) *
                      (editingFahrt.fahrzeug?.kilometerpauschale ?? 0)
                    )}{' '}
                    €
                  </p>
                </div>
              )}

              {/* Fehler */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Wird aktualisiert...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL: SCHNELLBUCHUNG + FAHRT STARTEN === */}
      {showSchnellbuchungModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <Zap className="w-5 h-5 text-blue-600" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Schnellstart</h2>
              </div>
              <button
                onClick={closeAllModals}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Erstellt automatisch eine Buchung und startet sofort die Fahrt.
            </p>

            <form onSubmit={handleSchnellbuchungUndFahrtStarten} className="space-y-4">
              {/* Buchungsdauer */}
              <div>
                <label htmlFor="schnellbuchungDauer" className="block text-sm font-medium text-gray-700 mb-2">
                  Buchungsdauer (Stunden)
                </label>
                <select
                  id="schnellbuchungDauer"
                  value={schnellbuchungDauer}
                  onChange={(e) => handleDauerChange(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value={1}>1 Stunde</option>
                  <option value={2}>2 Stunden</option>
                  <option value={3}>3 Stunden</option>
                  <option value={4}>4 Stunden</option>
                  <option value={6}>6 Stunden</option>
                  <option value={8}>8 Stunden</option>
                  <option value={12}>12 Stunden</option>
                  <option value={24}>24 Stunden</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Zeitraum: Jetzt bis {new Date(Date.now() + schnellbuchungDauer * 60 * 60 * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </p>
              </div>

              {/* Fahrzeug auswählen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verfügbare Fahrzeuge ({verfuegbareFahrzeuge.length})
                </label>
                {verfuegbareFahrzeuge.length === 0 ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-sm text-orange-800 font-medium">
                      Kein Fahrzeug für diesen Zeitraum verfügbar
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Versuchen Sie einen kürzeren Zeitraum oder eine andere Zeit.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {verfuegbareFahrzeuge.map((fahrzeug: any) => (
                      <button
                        key={fahrzeug.id}
                        type="button"
                        onClick={() => {
                          setSelectedSchnellFahrzeug(fahrzeug);
                          setFormData({
                            ...formData,
                            startKilometer: fahrzeug.kilometerstand?.toString() ?? '',
                          });
                        }}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedSchnellFahrzeug?.id === fahrzeug.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Car className={`w-5 h-5 ${selectedSchnellFahrzeug?.id === fahrzeug.id ? 'text-blue-600' : 'text-gray-400'}`} aria-hidden="true" />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{fahrzeug.name}</p>
                            <p className="text-sm text-gray-500">
                              {formatNumber(fahrzeug.kilometerstand)} km • {formatCurrency(fahrzeug.kilometerpauschale)} €/km
                            </p>
                          </div>
                          {selectedSchnellFahrzeug?.id === fahrzeug.id && (
                            <CheckCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Startkilometer (nur wenn Fahrzeug ausgewählt) */}
              {selectedSchnellFahrzeug && (
                <div>
                  <label htmlFor="schnellStartKilometer" className="block text-sm font-medium text-gray-700 mb-2">
                    Startkilometer
                  </label>
                  <input
                    id="schnellStartKilometer"
                    type="number"
                    value={formData.startKilometer}
                    onChange={(e) => setFormData({ ...formData, startKilometer: e.target.value })}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Aktueller Fahrzeugstand: {formatNumber(selectedSchnellFahrzeug.kilometerstand)} km
                  </p>
                </div>
              )}

              {/* Fehler */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !selectedSchnellFahrzeug}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Wird gestartet...' : 'Buchen & Fahrt starten'}
                </button>
                <button
                  type="button"
                  onClick={closeAllModals}
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
