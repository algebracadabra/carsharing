'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Edit, Trash2, MapPin, TrendingUp, DollarSign, Key, Car, Calendar, Route, Fuel, Wrench, PiggyBank, X, Check, Wallet, FileText, Droplets, Thermometer, Users, CircleDot, Baby, AlertTriangle, Shield, Info, ChevronDown, ChevronUp, Clock, Euro, TrendingDown, ExternalLink } from 'lucide-react';
import { berechneWertverlust, WertverlustInput, WertverlustOutput } from '@/lib/kalkulation';
import { formatNumber, formatCurrency, getUserDisplayName } from '@/lib/utils';
import { WartungSection } from '@/components/wartung-section';
import { KilometerpauschaleEmpfehlung } from '@/components/kilometerpauschale-empfehlung';

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
    versicherungJaehrlich: '0',
    steuerJaehrlich: '0',
  });
  const [kontostand, setKontostand] = useState<any>(null);
  const [wertverlust, setWertverlust] = useState<WertverlustOutput | null>(null);
  
  // Einklappbare Sektionen
  const [showLebenszyklus, setShowLebenszyklus] = useState(false);
  const [showSteckbrief, setShowSteckbrief] = useState(false);
  const [showKontostand, setShowKontostand] = useState(false);

  const zahlungsartLabels: Record<string, string> = {
    BAR: 'Bar',
    TANKEN: 'Tanken',
    PFLEGE: 'Pflege',
    WARTUNG: 'Wartung',
    REPARATUR: 'Reparatur',
  };

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
      fetchKontostand();
    }
  }, [status, id]);

  const fetchKontostand = async () => {
    try {
      const response = await fetch(`/api/abrechnung/zusammenfassung?fahrzeugId=${id}`);
      if (response.ok) {
        const data = await response.json();
        // Finde den Kontostand für dieses Fahrzeug
        const fzKontostand = data.fahrzeugKontostaende?.find((fz: any) => fz.fahrzeugId === id);
        setKontostand(fzKontostand || null);
      }
    } catch (error) {
      console.error('Error fetching kontostand:', error);
    }
  };

  const berechneWertverlustFuerFahrzeug = (data: any) => {
    // Prüfen ob alle Lebenszyklus-Felder vorhanden sind
    const vollstaendig = !!(data.baujahr && data.restwert !== null && data.erwarteteKmEndOfLife && data.erwarteteJahreEndOfLife && data.geschaetzteKmProJahr);
    
    if (vollstaendig) {
      try {
        const input: WertverlustInput = {
          aktuellesJahr: new Date().getFullYear(),
          baujahr: data.baujahr,
          restwert: data.restwert,
          erwarteteKmEndOfLife: data.erwarteteKmEndOfLife,
          erwarteteJahreEndOfLife: data.erwarteteJahreEndOfLife,
          geschaetzteKmProJahr: data.geschaetzteKmProJahr,
          kilometerstand: data.kilometerstand,
        };
        const result = berechneWertverlust(input);
        setWertverlust(result);
      } catch (error) {
        console.error('Fehler bei Wertverlust-Berechnung:', error);
        setWertverlust(null);
      }
    } else {
      setWertverlust(null);
    }
  };

  const fetchFahrzeug = async () => {
    try {
      const response = await fetch(`/api/fahrzeuge/${id}`);
      if (response.ok) {
        const data = await response.json();
        setFahrzeug(data);
        berechneWertverlustFuerFahrzeug(data);
        
        setCostFormData({
          versicherungJaehrlich: (data.versicherungJaehrlich ?? 0).toString(),
          steuerJaehrlich: (data.steuerJaehrlich ?? 0).toString(),
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
          versicherungJaehrlich: costFormData.versicherungJaehrlich,
          steuerJaehrlich: costFormData.steuerJaehrlich,
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
                {formatNumber(fahrzeug?.kilometerstand)} km
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Kilometerpauschale</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(fahrzeug?.kilometerpauschale)} €/km
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
                    versicherungJaehrlich: (fahrzeug?.versicherungJaehrlich ?? 0).toString(),
                    steuerJaehrlich: (fahrzeug?.steuerJaehrlich ?? 0).toString(),
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Treibstoff - disabled, kommt aus Abrechnungen */}
            <div className="bg-orange-50 rounded-lg p-6 opacity-60">
              <div className="flex items-center gap-3 mb-2">
                <Fuel className="w-5 h-5 text-orange-600" aria-hidden="true" />
                <span className="font-semibold text-gray-900">Treibstoffkosten</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(fahrzeug?.treibstoffKosten)} €
              </p>
              <p className="text-xs text-gray-500 mt-1">Aus TANKEN-Zahlungen (nicht editierbar)</p>
            </div>

            {/* Wartung - disabled, kommt aus Abrechnungen */}
            <div className="bg-rose-50 rounded-lg p-6 opacity-60">
              <div className="flex items-center gap-3 mb-2">
                <Wrench className="w-5 h-5 text-rose-600" aria-hidden="true" />
                <span className="font-semibold text-gray-900">Wartung & Reparatur</span>
              </div>
              <p className="text-2xl font-bold text-rose-600">
                {formatCurrency(fahrzeug?.wartungsReparaturKosten)} €
              </p>
              <p className="text-xs text-gray-500 mt-1">Aus Pflege/Wartung/Reparatur (nicht editierbar)</p>
            </div>

            {/* Versicherung - editierbar */}
            <div className="bg-teal-50 rounded-lg p-6 ring-2 ring-teal-400">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-teal-600" aria-hidden="true" />
                <label htmlFor="versicherungJaehrlich" className="font-semibold text-gray-900">Versicherung jährlich</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="versicherungJaehrlich"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costFormData.versicherungJaehrlich}
                  onChange={(e) => setCostFormData({ ...costFormData, versicherungJaehrlich: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg font-bold"
                />
                <span className="text-lg font-bold text-teal-600">€/Jahr</span>
              </div>
            </div>

            {/* Steuer - editierbar */}
            <div className="bg-indigo-50 rounded-lg p-6 ring-2 ring-indigo-400">
              <div className="flex items-center gap-3 mb-2">
                <PiggyBank className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                <label htmlFor="steuerJaehrlich" className="font-semibold text-gray-900">KFZ-Steuer jährlich</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="steuerJaehrlich"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costFormData.steuerJaehrlich}
                  onChange={(e) => setCostFormData({ ...costFormData, steuerJaehrlich: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-bold"
                />
                <span className="text-lg font-bold text-indigo-600">€/Jahr</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Fuel className="w-5 h-5 text-orange-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Treibstoffkosten</h3>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(fahrzeug?.treibstoffKosten)} €
              </p>
              <p className="text-xs text-gray-500 mt-1">Summe aus TANKEN-Zahlungen</p>
            </div>

            <div className="bg-rose-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Wrench className="w-5 h-5 text-rose-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Wartung & Reparatur</h3>
              </div>
              <p className="text-2xl font-bold text-rose-600">
                {formatCurrency(fahrzeug?.wartungsReparaturKosten)} €
              </p>
              <p className="text-xs text-gray-500 mt-1">Summe aus Pflege/Wartung/Reparatur</p>
            </div>

            <div className="bg-teal-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-teal-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Versicherung</h3>
              </div>
              <p className="text-2xl font-bold text-teal-600">
                {formatCurrency(fahrzeug?.versicherungJaehrlich)} €/Jahr
              </p>
              <p className="text-xs text-gray-500 mt-1">Jährliche Versicherungskosten</p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <PiggyBank className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">KFZ-Steuer</h3>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(fahrzeug?.steuerJaehrlich)} €/Jahr
              </p>
              <p className="text-xs text-gray-500 mt-1">Jährliche KFZ-Steuer</p>
            </div>
          </div>
        )}
      </div>

      {/* Kilometerpauschalen-Empfehlung - nur für Owner/Admin */}
      {(isOwner || isAdmin) && fahrzeug && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <KilometerpauschaleEmpfehlung
            fahrzeugId={id}
            aktuellePauschale={fahrzeug.kilometerpauschale}
            zeitraumMonate={12}
          />
        </div>
      )}

      {/* Lebenszyklus Section - einklappbar */}
      <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
        <button
          onClick={() => setShowLebenszyklus(!showLebenszyklus)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-700" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Lebenszyklus & Wertentwicklung</h2>
          </div>
          {showLebenszyklus ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showLebenszyklus && (
          <div className="px-6 pb-6 border-t border-gray-100">
            {/* Wertverlust-Anzeige */}
            {wertverlust ? (
              <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-purple-600" aria-hidden="true" />
                    <span className="font-semibold text-purple-700">Wertverlust</span>
                  </div>
                  <Link
                    href="/hilfe/wertverlust"
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <span>Wie wird das berechnet?</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Monatlich</p>
                    <p className="text-xl font-bold text-purple-600">
                      {formatCurrency(wertverlust.wertverlustProMonat)} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Jährlich</p>
                    <p className="text-xl font-bold text-purple-600">
                      {formatCurrency(wertverlust.wertverlustProJahr)} €
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Restlebensdauer: {wertverlust.jahreRest.toFixed(1)} Jahre • {formatCurrency(wertverlust.wertverlustProKm)} €/km
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <TrendingDown className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">Wertverlust</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Bitte füllen Sie die Lebenszyklus-Daten aus, um den Wertverlust zu berechnen.
                </p>
                <Link
                  href="/hilfe/wertverlust"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2 transition-colors"
                >
                  <span>Mehr erfahren</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {/* Baujahr & Alter */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-indigo-700">Baujahr / Alter</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {fahrzeug?.baujahr ? (
                    <>
                      {fahrzeug.baujahr}
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({new Date().getFullYear() - fahrzeug.baujahr} Jahre alt)
                      </span>
                    </>
                  ) : '–'}
                </p>
              </div>

              {/* Restwert */}
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Euro className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-emerald-700">Restwert</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {fahrzeug?.restwert ? `${formatCurrency(fahrzeug.restwert)} €` : '–'}
                </p>
              </div>

              {/* Geschätzte km/Jahr */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-blue-700">Geschätzte km/Jahr</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {fahrzeug?.geschaetzteKmProJahr ? `${formatNumber(fahrzeug.geschaetzteKmProJahr)} km` : '–'}
                </p>
              </div>

              {/* Erwartete km End of Life */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Route className="w-4 h-4 text-orange-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-orange-700">Erwartete km (End of Life)</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {fahrzeug?.erwarteteKmEndOfLife ? (
                    <>
                      {formatNumber(fahrzeug.erwarteteKmEndOfLife)} km
                      {fahrzeug?.kilometerstand && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          (noch {formatNumber(fahrzeug.erwarteteKmEndOfLife - fahrzeug.kilometerstand)} km)
                        </span>
                      )}
                    </>
                  ) : '–'}
                </p>
              </div>

              {/* Erwartetes Alter End of Life */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-purple-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-purple-700">Erwartetes Alter (End of Life)</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {fahrzeug?.erwarteteJahreEndOfLife ? (
                    <>
                      {fahrzeug.erwarteteJahreEndOfLife} Jahre
                      {fahrzeug?.baujahr && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          (noch {fahrzeug.erwarteteJahreEndOfLife - (new Date().getFullYear() - fahrzeug.baujahr)} Jahre)
                        </span>
                      )}
                    </>
                  ) : '–'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Steckbrief Section - einklappbar */}
      <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
        <button
          onClick={() => setShowSteckbrief(!showSteckbrief)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-700" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Fahrzeug-Steckbrief</h2>
          </div>
          {showSteckbrief ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showSteckbrief && (
        <div className="px-6 pb-6 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {/* Versicherungsart */}
          <div className="bg-teal-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-teal-600" aria-hidden="true" />
              <span className="text-sm font-medium text-teal-700">Versicherungsart</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.versicherungsart || '–'}
            </p>
          </div>

          {/* Kraftstoffart */}
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="text-sm font-medium text-amber-700">Kraftstoffart</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.kraftstoffart || '–'}
            </p>
          </div>

          {/* Aktuelle Reifen */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CircleDot className="w-4 h-4 text-slate-600" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-700">Aktuelle Reifen</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.aktuelleReifen || '–'}
            </p>
          </div>

          {/* Nächster Ölwechsel */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-yellow-600" aria-hidden="true" />
              <span className="text-sm font-medium text-yellow-700">Nächster Ölwechsel</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.naechsterOelwechsel || '–'}
            </p>
          </div>

          {/* Reinigungszyklus */}
          <div className="bg-cyan-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-cyan-600" aria-hidden="true" />
              <span className="text-sm font-medium text-cyan-700">Reinigungszyklus</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.reinigungszyklus || '–'}
            </p>
          </div>

          {/* Motoröl-Typ */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-orange-600" aria-hidden="true" />
              <span className="text-sm font-medium text-orange-700">Motoröl-Typ</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.motoroelTyp || '–'}
            </p>
          </div>

          {/* Kühler-Frostschutz-Typ */}
          <div className="bg-sky-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="w-4 h-4 text-sky-600" aria-hidden="true" />
              <span className="text-sm font-medium text-sky-700">Kühler-Frostschutz</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.kuehlerFrostschutzTyp || '–'}
            </p>
          </div>

          {/* Anzahl Sitze */}
          <div className="bg-violet-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-violet-600" aria-hidden="true" />
              <span className="text-sm font-medium text-violet-700">Anzahl Sitze</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.anzahlSitze ?? '–'}
            </p>
          </div>

          {/* Anhängerkupplung */}
          <div className={`rounded-lg p-4 ${fahrzeug?.anhaengerkupplung ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Car className="w-4 h-4 text-gray-600" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700">Anhängerkupplung</span>
            </div>
            <p className={`text-lg font-semibold ${fahrzeug?.anhaengerkupplung ? 'text-green-700' : 'text-gray-500'}`}>
              {fahrzeug?.anhaengerkupplung ? 'Ja' : 'Nein'}
            </p>
          </div>

          {/* Kindersitz */}
          <div className={`rounded-lg p-4 ${fahrzeug?.kindersitz ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Baby className="w-4 h-4 text-gray-600" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700">Kindersitz</span>
            </div>
            <p className={`text-lg font-semibold ${fahrzeug?.kindersitz ? 'text-green-700' : 'text-gray-500'}`}>
              {fahrzeug?.kindersitz ? 'Ja' : 'Nein'}
            </p>
          </div>

          {/* Nächster TÜV */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span className="text-sm font-medium text-emerald-700">Nächster TÜV</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {fahrzeug?.naechsterTuev || '–'}
            </p>
          </div>
        </div>

        {/* Defekte, Macken, Sonstige Hinweise - volle Breite */}
        <div className="mt-4 space-y-4">
          {/* Defekte */}
          {fahrzeug?.defekte && (
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" aria-hidden="true" />
                <span className="text-sm font-medium text-red-700">Bekannte Defekte</span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">{fahrzeug.defekte}</p>
            </div>
          )}

          {/* Macken */}
          {fahrzeug?.macken && (
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                <span className="text-sm font-medium text-amber-700">Bekannte Macken</span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">{fahrzeug.macken}</p>
            </div>
          )}

          {/* Sonstige Hinweise */}
          {fahrzeug?.sonstigeHinweise && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span className="text-sm font-medium text-blue-700">Sonstige Hinweise</span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">{fahrzeug.sonstigeHinweise}</p>
            </div>
          )}
        </div>
        </div>
        )}
      </div>

      {/* Wartung Section */}
      <WartungSection
        fahrzeugId={id}
        fahrzeugKilometerstand={fahrzeug?.kilometerstand || 0}
        canEdit={canEdit}
      />

      {/* Kontostand Section - einklappbar */}
      {kontostand && (
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <button
            onClick={() => setShowKontostand(!showKontostand)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-gray-700" aria-hidden="true" />
              <h2 className="text-xl font-bold text-gray-900">Kontostand</h2>
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                kontostand.saldo > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {formatCurrency(kontostand.saldo)} €
              </span>
            </div>
            {showKontostand ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {showKontostand && (
          <div className="px-6 pb-6 border-t border-gray-100">
          {/* Übersichts-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <span className="text-sm font-medium text-blue-700">Einnahmen (Fahrten)</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(kontostand.gesamtEinnahmen)} €
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-600" aria-hidden="true" />
                <span className="text-sm font-medium text-green-700">Zahlungen erhalten</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(kontostand.gesamtZahlungen)} €
              </p>
            </div>
            <div className={`rounded-lg p-4 ${
              kontostand.saldo > 0
                ? 'bg-orange-50'
                : 'bg-emerald-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className={`w-4 h-4 ${kontostand.saldo > 0 ? 'text-orange-600' : 'text-emerald-600'}`} aria-hidden="true" />
                <span className={`text-sm font-medium ${kontostand.saldo > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                  Offener Saldo
                </span>
              </div>
              <p className={`text-2xl font-bold ${kontostand.saldo > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {formatCurrency(kontostand.saldo)} €
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {kontostand.saldo > 0 ? 'Noch offen' : 'Ausgeglichen'}
              </p>
            </div>
          </div>

          {/* Aufschlüsselung nach Zahlungsart */}
          {kontostand.zahlungenNachArt && Object.keys(kontostand.zahlungenNachArt).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Zahlungen nach Art</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(kontostand.zahlungenNachArt).map(([art, betrag]) => (
                  <div key={art} className="bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-500 block">{zahlungsartLabels[art] || art}</span>
                    <span className="text-lg font-semibold text-gray-900">{formatCurrency(betrag as number)} €</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                  <p className="font-semibold text-gray-900">{getUserDisplayName(fahrt?.fahrer)}</p>
                  <p className="text-sm text-gray-600">
                    {fahrt?.gefahreneKm} km ({fahrt?.startKilometer} - {fahrt?.endKilometer} km)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{formatCurrency(fahrt?.kosten)} €</p>
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
      )}
    </div>
  );
}
