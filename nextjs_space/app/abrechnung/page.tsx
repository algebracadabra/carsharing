'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Wallet, Plus, CheckCircle, Clock, X, AlertCircle, Upload, Image as ImageIcon, Calendar, Car, User, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, getUserDisplayName } from '@/lib/utils';

type ZeitraumTyp = 'monat' | 'jahr' | 'custom';

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

function getYearRange(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31);
  return { start, end };
}

function formatDateForInput(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

export default function AbrechnungPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [zahlungen, setZahlungen] = useState<any[]>([]);
  const [fahrten, setFahrten] = useState<any[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fahrerId: '',
    fahrzeugId: '',
    betrag: '',
    zahlungsart: 'BAR',
    beleg: '',
    beschreibung: '',
  });
  const [uploading, setUploading] = useState(false);

  // Zeitraum-State
  const [zeitraumTyp, setZeitraumTyp] = useState<ZeitraumTyp>('monat');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [customStartDate, setCustomStartDate] = useState(formatDateForInput(new Date()));
  const [customEndDate, setCustomEndDate] = useState(formatDateForInput(new Date()));
  
  // Zusammenfassung-State
  const [zusammenfassung, setZusammenfassung] = useState<any>(null);
  const [selectedFahrzeugId, setSelectedFahrzeugId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'user' | 'fahrzeuge'>('user');

  const zahlungsartLabels: Record<string, string> = {
    BAR: 'Bar',
    TANKEN: 'Tanken',
    PFLEGE: 'Pflege',
    WARTUNG: 'Wartung',
    REPARATUR: 'Reparatur',
  };
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [kontostaende, setKontostaende] = useState<any>({});

  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;

  // Berechnete Zeitraum-Daten
  const zeitraumDaten = useMemo(() => {
    let start: Date, end: Date;
    
    switch (zeitraumTyp) {
      case 'monat':
        const monthRange = getMonthRange(selectedMonth);
        start = monthRange.start;
        end = monthRange.end;
        break;
      case 'jahr':
        const yearRange = getYearRange(selectedYear);
        start = yearRange.start;
        end = yearRange.end;
        break;
      case 'custom':
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        break;
      default:
        const defaultRange = getMonthRange(new Date());
        start = defaultRange.start;
        end = defaultRange.end;
    }
    
    return {
      startDate: formatDateForInput(start),
      endDate: formatDateForInput(end),
    };
  }, [zeitraumTyp, selectedMonth, selectedYear, customStartDate, customEndDate]);

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

  // Zusammenfassung laden wenn sich Zeitraum ändert
  useEffect(() => {
    if (status === 'authenticated') {
      fetchZusammenfassung();
    }
  }, [status, zeitraumDaten.startDate, zeitraumDaten.endDate]);

  const fetchData = async () => {
    try {
      const responses = await Promise.all([
        fetch('/api/zahlungen'),
        fetch('/api/fahrten'),
        fetch('/api/fahrzeuge'),
      ]);

      const [zahlungenData, fahrtenData, fahrzeugeData] = await Promise.all(
        responses.map(r => r.ok ? r.json() : [])
      );

      setZahlungen(zahlungenData ?? []);
      setFahrten(fahrtenData ?? []);
      setFahrzeuge(fahrzeugeData ?? []);

      // Calculate Kontostaende (nur abgeschlossene Fahrten)
      const konten: any = {};
      
      fahrtenData?.filter?.((f: any) => f?.status === 'ABGESCHLOSSEN')?.forEach?.((fahrt: any) => {
        const key = `${fahrt?.fahrerId}-${fahrt?.fahrzeugId}`;
        if (!konten[key]) {
          konten[key] = {
            fahrerId: fahrt?.fahrerId,
            fahrerName: getUserDisplayName(fahrt?.fahrer),
            fahrzeugId: fahrt?.fahrzeugId,
            fahrzeugName: fahrt?.fahrzeug?.name,
            schulden: 0,
            zahlungen: 0,
          };
        }
        konten[key].schulden += fahrt?.kosten ?? 0;
      });

      zahlungenData?.filter?.((z: any) => z?.status === 'BESTAETIGT')?.forEach?.((zahlung: any) => {
        const key = `${zahlung?.fahrerId}-${zahlung?.fahrzeugId}`;
        if (!konten[key]) {
          // Konto erstellen falls noch nicht vorhanden (z.B. wenn nur Zahlungen aber keine Fahrten)
          konten[key] = {
            fahrerId: zahlung?.fahrerId,
            fahrerName: getUserDisplayName(zahlung?.fahrer),
            fahrzeugId: zahlung?.fahrzeugId,
            fahrzeugName: zahlung?.fahrzeug?.name,
            schulden: 0,
            zahlungen: 0,
          };
        }
        konten[key].zahlungen += zahlung?.betrag ?? 0;
      });

      setKontostaende(konten);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchZusammenfassung = async () => {
    try {
      const params = new URLSearchParams({
        startDate: zeitraumDaten.startDate,
        endDate: zeitraumDaten.endDate,
      });
      
      const response = await fetch(`/api/abrechnung/zusammenfassung?${params}`);
      if (response.ok) {
        const data = await response.json();
        setZusammenfassung(data);
      }
    } catch (error) {
      console.error('Error fetching zusammenfassung:', error);
    }
  };

  const handleCreateZahlung = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validierung
    if (!formData.fahrzeugId) {
      setError('Bitte wählen Sie ein Fahrzeug aus');
      return;
    }
    if (!formData.fahrerId) {
      setError('Bitte wählen Sie einen Fahrer aus');
      return;
    }
    if (!formData.betrag) {
      setError('Bitte geben Sie einen Betrag ein');
      return;
    }
    
    setCreating(true);

    try {
      const response = await fetch('/api/zahlungen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setShowModal(false);
      setFormData({ fahrerId: '', fahrzeugId: '', betrag: '', zahlungsart: 'BAR', beleg: '', beschreibung: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleBestaetigen = async (zahlungId: string, isFahrer: boolean) => {
    try {
      const action = isFahrer ? 'bestaetigen_fahrer' : 'bestaetigen_halter';
      await fetch(`/api/zahlungen/${zahlungId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchData();
    } catch (error) {
      console.error('Error confirming zahlung:', error);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Laden...</div>
      </div>
    );
  }

  const kontoArray = Object.values(kontostaende).map((k: any) => ({
    ...k,
    saldo: k.schulden - k.zahlungen,
  }));

  // Fahrzeuge filtern: Nur Fahrzeuge, bei denen der User Fahrer (hat Fahrten) oder Halter ist
  const berechtigteFahrzeuge = fahrzeuge.filter((f: any) => {
    // User ist Halter des Fahrzeugs
    if (f?.halterId === userId) return true;
    // User hat Fahrten mit diesem Fahrzeug gemacht
    const hatFahrten = fahrten.some((fahrt: any) => fahrt?.fahrzeugId === f?.id && fahrt?.fahrerId === userId);
    return hatFahrten;
  });

  // Kann der User überhaupt Zahlungen erfassen?
  const kannZahlungErfassen = berechtigteFahrzeuge.length > 0 || userRole === 'ADMIN';

  // Hilfsfunktion für Monat-Navigation
  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  // Hilfsfunktion für Jahr-Navigation
  const navigateYear = (direction: number) => {
    const newDate = new Date(selectedYear);
    newDate.setFullYear(newDate.getFullYear() + direction);
    setSelectedYear(newDate);
  };

  // Zeitraum-Label
  const getZeitraumLabel = () => {
    switch (zeitraumTyp) {
      case 'monat':
        return formatMonthYear(selectedMonth);
      case 'jahr':
        return selectedYear.getFullYear().toString();
      case 'custom':
        return `${new Date(customStartDate).toLocaleDateString('de-DE')} - ${new Date(customEndDate).toLocaleDateString('de-DE')}`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Abrechnung</h1>
          <p className="text-gray-600">Verwalten Sie Kontostände und Zahlungen</p>
        </div>
        {kannZahlungErfassen && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg"
            aria-label="Neue Zahlung erfassen"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            Zahlung erfassen
          </button>
        )}
      </div>

      {/* Zeitraum-Auswahl */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Zeitraum</h2>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end">
          {/* Zeitraum-Typ Auswahl */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ansicht</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setZeitraumTyp('monat')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  zeitraumTyp === 'monat'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Monat
              </button>
              <button
                onClick={() => setZeitraumTyp('jahr')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                  zeitraumTyp === 'jahr'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Jahr
              </button>
              <button
                onClick={() => setZeitraumTyp('custom')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                  zeitraumTyp === 'custom'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Benutzerdefiniert
              </button>
            </div>
          </div>

          {/* Monat-Navigation */}
          {zeitraumTyp === 'monat' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <span className="min-w-[150px] text-center font-medium">
                {formatMonthYear(selectedMonth)}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          )}

          {/* Jahr-Navigation */}
          {zeitraumTyp === 'jahr' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateYear(-1)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <span className="min-w-[80px] text-center font-medium">
                {selectedYear.getFullYear()}
              </span>
              <button
                onClick={() => navigateYear(1)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          )}

          {/* Benutzerdefinierter Zeitraum */}
          {zeitraumTyp === 'custom' && (
            <div className="flex items-center gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Von</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bis</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab-Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('user')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <User className="w-4 h-4" />
          Mein Kontostand
        </button>
        <button
          onClick={() => setActiveTab('fahrzeuge')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'fahrzeuge'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          <Car className="w-4 h-4" />
          Fahrzeug-Kontostände
        </button>
      </div>

      {/* User Kontostand */}
      {activeTab === 'user' && zusammenfassung?.userKontostand && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Mein Kontostand</h2>
            <span className="text-sm text-gray-500 ml-2">({getZeitraumLabel()})</span>
          </div>

          {/* Übersichts-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">Schulden (Fahrten)</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(zusammenfassung.userKontostand.gesamtSchulden)} €
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Zahlungen</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(zusammenfassung.userKontostand.gesamtZahlungen)} €
              </p>
            </div>
            <div className={`bg-gradient-to-br rounded-lg p-4 border ${
              zusammenfassung.userKontostand.saldo > 0
                ? 'from-orange-50 to-orange-100 border-orange-200'
                : 'from-blue-50 to-blue-100 border-blue-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className={`w-4 h-4 ${zusammenfassung.userKontostand.saldo > 0 ? 'text-orange-600' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${zusammenfassung.userKontostand.saldo > 0 ? 'text-orange-700' : 'text-blue-700'}`}>
                  Saldo
                </span>
              </div>
              <p className={`text-2xl font-bold ${zusammenfassung.userKontostand.saldo > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                {formatCurrency(zusammenfassung.userKontostand.saldo)} €
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {zusammenfassung.userKontostand.saldo > 0 ? 'Noch offen' : 'Ausgeglichen'}
              </p>
            </div>
          </div>

          {/* Aufschlüsselung nach Zahlungsart */}
          {Object.keys(zusammenfassung.userKontostand.zahlungenNachArt).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Zahlungen nach Art</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(zusammenfassung.userKontostand.zahlungenNachArt).map(([art, betrag]) => (
                  <div key={art} className="bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-500 block">{zahlungsartLabels[art] || art}</span>
                    <span className="text-lg font-semibold text-gray-900">{formatCurrency(betrag as number)} €</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aufschlüsselung nach Fahrzeug */}
          {Object.keys(zusammenfassung.userKontostand.zahlungenNachFahrzeug).length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Zahlungen nach Fahrzeug</h3>
              <div className="space-y-2">
                {Object.entries(zusammenfassung.userKontostand.zahlungenNachFahrzeug).map(([fzId, data]: [string, any]) => (
                  <div key={fzId} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                    <span className="text-sm text-gray-700">{data.name}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(data.betrag)} €</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fahrzeug-Kontostände */}
      {activeTab === 'fahrzeuge' && zusammenfassung?.fahrzeugKontostaende && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Fahrzeug-Kontostände</h2>
            <span className="text-sm text-gray-500 ml-2">({getZeitraumLabel()})</span>
          </div>

          {zusammenfassung.fahrzeugKontostaende.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Keine Fahrzeugdaten verfügbar</p>
          ) : (
            <div className="space-y-6">
              {zusammenfassung.fahrzeugKontostaende.map((fz: any) => (
                <div key={fz.fahrzeugId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{fz.fahrzeugName}</h3>
                      <p className="text-sm text-gray-500">Halter: {fz.halterName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${fz.saldo > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(fz.saldo)} €
                      </p>
                      <p className="text-xs text-gray-500">
                        {fz.saldo > 0 ? 'Offen' : 'Ausgeglichen'}
                      </p>
                    </div>
                  </div>

                  {/* Einnahmen/Zahlungen Übersicht */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <span className="text-xs text-blue-600 block">Einnahmen (Fahrten)</span>
                      <span className="text-lg font-semibold text-blue-700">{formatCurrency(fz.gesamtEinnahmen)} €</span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <span className="text-xs text-green-600 block">Zahlungen erhalten</span>
                      <span className="text-lg font-semibold text-green-700">{formatCurrency(fz.gesamtZahlungen)} €</span>
                    </div>
                  </div>

                  {/* Aufschlüsselung nach Zahlungsart */}
                  {Object.keys(fz.zahlungenNachArt).length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">Nach Zahlungsart</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(fz.zahlungenNachArt).map(([art, betrag]) => (
                          <span key={art} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                            <span className="text-gray-500">{zahlungsartLabels[art] || art}:</span>
                            <span className="font-medium">{formatCurrency(betrag as number)} €</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alte Kontostände (Detail-Ansicht) */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Kontostände (Gesamt)</h2>
        {kontoArray.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Keine Kontodaten verfügbar</p>
        ) : (
          <div className="space-y-4">
            {kontoArray?.map?.((konto: any, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{konto?.fahrerName}</h3>
                    <p className="text-sm text-gray-600">{konto?.fahrzeugName}</p>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Schulden: {formatCurrency(konto?.schulden)} €</p>
                      <p>Zahlungen: {formatCurrency(konto?.zahlungen)} €</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${
                        konto?.saldo > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(konto?.saldo)} €
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {konto?.saldo > 0 ? 'Offen' : 'Beglichen'}
                    </p>
                  </div>
                </div>
              </div>
            )) ?? null}
          </div>
        )}
      </div>

      {/* Zahlungen */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Zahlungen</h2>
        {zahlungen.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Keine Zahlungen vorhanden</p>
        ) : (
          <div className="space-y-4">
            {zahlungen?.map?.((zahlung: any) => {
              const isFahrer = zahlung?.fahrerId === userId;
              const isHalter = zahlung?.fahrzeug?.halterId === userId;
              const isAdmin = userRole === 'ADMIN';
              const canConfirmFahrer = (isFahrer || isAdmin) && !zahlung?.bestaetigung_fahrer;
              const canConfirmHalter = (isHalter || isAdmin) && !zahlung?.bestaetigung_halter;

              return (
                <div
                  key={zahlung?.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-5 h-5 text-blue-600" aria-hidden="true" />
                        <h3 className="font-bold text-gray-900">
                          {formatCurrency(zahlung?.betrag)} €
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Von: {getUserDisplayName(zahlung?.fahrer)} für {zahlung?.fahrzeug?.name}
                      </p>
                      <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {zahlungsartLabels[zahlung?.zahlungsart] || zahlung?.zahlungsart}
                      </span>
                      {zahlung?.beleg && (
                        <a
                          href={zahlung.beleg}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ml-2 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Beleg
                        </a>
                      )}
                      {zahlung?.beschreibung && (
                        <p className="text-sm text-gray-500 mt-1">{zahlung?.beschreibung}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-1">
                          {zahlung?.bestaetigung_fahrer ? (
                            <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                          )}
                          <span className={zahlung?.bestaetigung_fahrer ? 'text-green-600' : 'text-gray-500'}>
                            Fahrer
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {zahlung?.bestaetigung_halter ? (
                            <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                          ) : (
                            <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                          )}
                          <span className={zahlung?.bestaetigung_halter ? 'text-green-600' : 'text-gray-500'}>
                            Halter
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full ${
                          zahlung?.status === 'BESTAETIGT'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {zahlung?.status === 'BESTAETIGT' ? 'Bestätigt' : 'Ausstehend'}
                      </span>
                      {canConfirmFahrer && (
                        <button
                          onClick={() => handleBestaetigen(zahlung?.id, true)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Als Fahrer bestätigen
                        </button>
                      )}
                      {canConfirmHalter && (
                        <button
                          onClick={() => handleBestaetigen(zahlung?.id, false)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Als Halter bestätigen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) ?? null}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Zahlung erfassen</h2>
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

            <form onSubmit={handleCreateZahlung} className="space-y-4">
              <div>
                <label htmlFor="fahrzeug" className="block text-sm font-medium text-gray-700 mb-2">
                  Fahrzeug *
                </label>
                <select
                  id="fahrzeug"
                  value={formData.fahrzeugId}
                  onChange={(e) => {
                    const selectedFahrzeugId = e.target.value;
                    const selectedFahrzeug = fahrzeuge.find((f: any) => f?.id === selectedFahrzeugId);
                    const istHalterVomFahrzeug = selectedFahrzeug?.halterId === userId;
                    // Wenn User nicht Halter ist, ist er selbst der Fahrer
                    const neuerFahrerId = (istHalterVomFahrzeug || userRole === 'ADMIN') ? '' : (userId || '');
                    console.log('Fahrzeug gewählt:', { selectedFahrzeugId, istHalterVomFahrzeug, userId, neuerFahrerId });
                    setFormData((prev) => ({ ...prev, fahrzeugId: selectedFahrzeugId, fahrerId: neuerFahrerId }));
                  }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                >
                  <option value="">Fahrzeug auswählen</option>
                  {(userRole === 'ADMIN' ? fahrzeuge : berechtigteFahrzeuge)?.map?.((f: any) => (
                    <option key={f?.id} value={f?.id}>
                      {f?.name} ({f?.halter?.name || 'Kein Halter'})
                    </option>
                  )) ?? null}
                </select>
              </div>

              <div>
                <label htmlFor="fahrer" className="block text-sm font-medium text-gray-700 mb-2">
                  Fahrer *
                </label>
                {(() => {
                  const selectedFahrzeug = fahrzeuge.find((f: any) => f?.id === formData.fahrzeugId);
                  const istHalterVomFahrzeug = selectedFahrzeug?.halterId === userId;
                  const istFahrerModus = formData.fahrzeugId && !istHalterVomFahrzeug && userRole !== 'ADMIN';
                  
                  if (istFahrerModus) {
                    // Fahrer-Modus: Zeige nur ein deaktiviertes Textfeld mit dem eigenen Namen
                    return (
                      <input
                        type="text"
                        id="fahrer"
                        value={session?.user?.name || 'Sie'}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      />
                    );
                  }
                  
                  // Fahrer die Fahrten mit diesem Fahrzeug haben
                  const fahrerMitFahrten = formData.fahrzeugId 
                    ? Array.from(
                        new Map(
                          fahrten
                            ?.filter((f: any) => f?.fahrzeugId === formData.fahrzeugId)
                            ?.map((f: any) => [f?.fahrerId, { fahrerId: f?.fahrerId, fahrerName: getUserDisplayName(f?.fahrer) }])
                        ).values()
                      )
                    : [];
                  
                  return (
                    <select
                      id="fahrer"
                      value={formData.fahrerId}
                      onChange={(e) => setFormData({ ...formData, fahrerId: e.target.value })}
                      disabled={!formData.fahrzeugId}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {!formData.fahrzeugId ? (
                        <option value="">Zuerst Fahrzeug auswählen</option>
                      ) : fahrerMitFahrten.length === 0 ? (
                        <option value="">Keine Fahrten für dieses Fahrzeug vorhanden</option>
                      ) : (
                        <>
                          <option value="">Fahrer auswählen</option>
                          {fahrerMitFahrten?.map?.((k: any) => (
                            <option key={k?.fahrerId} value={k?.fahrerId}>
                              {k?.fahrerName}
                            </option>
                          )) ?? null}
                        </>
                      )}
                    </select>
                  );
                })()}
              </div>

              <div>
                <label htmlFor="betrag" className="block text-sm font-medium text-gray-700 mb-2">
                  Betrag (€) *
                </label>
                <input
                  id="betrag"
                  type="number"
                  step="0.01"
                  value={formData.betrag}
                  onChange={(e) => setFormData({ ...formData, betrag: e.target.value })}
                  required
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="zahlungsart" className="block text-sm font-medium text-gray-700 mb-2">
                  Zahlungsart
                </label>
                <select
                  id="zahlungsart"
                  value={formData.zahlungsart}
                  onChange={(e) => setFormData({ ...formData, zahlungsart: e.target.value, beleg: '' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="BAR">Bar</option>
                  <option value="TANKEN">Tanken</option>
                  <option value="PFLEGE">Pflege</option>
                  <option value="WARTUNG">Wartung</option>
                  <option value="REPARATUR">Reparatur</option>
                </select>
              </div>

              {formData.zahlungsart !== 'BAR' && (
                <div>
                  <label htmlFor="beleg" className="block text-sm font-medium text-gray-700 mb-2">
                    Zahlungsbeleg (Bild)
                  </label>
                  {formData.beleg ? (
                    <div className="flex items-center gap-3">
                      <a
                        href={formData.beleg}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Beleg hochgeladen
                      </a>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, beleg: '' })}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Entfernen
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        id="beleg"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploading(true);
                          try {
                            const uploadFormData = new FormData();
                            uploadFormData.append('file', file);
                            
                            const response = await fetch('/api/upload', {
                              method: 'POST',
                              body: uploadFormData,
                            });
                            
                            if (!response.ok) {
                              throw new Error('Upload fehlgeschlagen');
                            }
                            
                            const data = await response.json();
                            setFormData({ ...formData, beleg: data.url });
                          } catch (err) {
                            setError('Bild-Upload fehlgeschlagen');
                          } finally {
                            setUploading(false);
                          }
                        }}
                        disabled={uploading}
                        className="hidden"
                      />
                      <label
                        htmlFor="beleg"
                        className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${
                          uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {uploading ? 'Wird hochgeladen...' : 'Bild auswählen'}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="beschreibung" className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung
                </label>
                <textarea
                  id="beschreibung"
                  value={formData.beschreibung}
                  onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  aria-label="Zahlung erfassen"
                >
                  {creating ? 'Wird erfasst...' : 'Erfassen'}
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
