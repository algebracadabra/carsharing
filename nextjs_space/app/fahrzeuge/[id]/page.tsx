'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Edit, Trash2, MapPin, TrendingUp, DollarSign, Key, Car, Calendar, Route, Fuel, Wrench, PiggyBank, X, Check, Wallet, FileText, Droplets, Thermometer, Users, CircleDot, Baby, AlertTriangle, Shield, Info } from 'lucide-react';
import { formatNumber, formatCurrency, getUserDisplayName } from '@/lib/utils';
import { WartungSection } from '@/components/wartung-section';

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
  const [kontostand, setKontostand] = useState<any>(null);

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
                Aktuell: {formatCurrency(fahrzeug?.treibstoffKosten)} €
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
                Aktuell: {formatCurrency(fahrzeug?.wartungsReparaturKosten)} €
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
                {formatCurrency(fahrzeug?.treibstoffKosten)} €
              </p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <PiggyBank className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Fixkosten</h3>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(fahrzeug?.fixkosten)} €
              </p>
            </div>

            <div className="bg-rose-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Wrench className="w-5 h-5 text-rose-600" aria-hidden="true" />
                <h3 className="font-semibold text-gray-900">Wartung & Reparatur</h3>
              </div>
              <p className="text-2xl font-bold text-rose-600">
                {formatCurrency(fahrzeug?.wartungsReparaturKosten)} €
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Steckbrief Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-gray-700" aria-hidden="true" />
          <h2 className="text-xl font-bold text-gray-900">Fahrzeug-Steckbrief</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Wartung Section */}
      <WartungSection
        fahrzeugId={id}
        fahrzeugKilometerstand={fahrzeug?.kilometerstand || 0}
        canEdit={canEdit}
      />

      {/* Kontostand Section */}
      {kontostand && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-gray-700" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Kontostand</h2>
          </div>

          {/* Übersichts-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
  );
}
