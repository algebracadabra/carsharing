'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Upload, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function BearbeitenFahrzeugPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    kilometerstand: '',
    kilometerpauschale: '',
    schluesselablageort: '',
    status: 'VERFUEGBAR',
    foto: '',
    // Lebenszyklus-Felder (nur Admin)
    baujahr: '',
    restwert: '',
    erwarteteKmEndOfLife: '',
    erwarteteJahreEndOfLife: '',
    geschaetzteKmProJahr: '',
    // Steckbrief-Felder
    versicherungsart: '',
    kraftstoffart: '',
    aktuelleReifen: '',
    naechsterOelwechsel: '',
    reinigungszyklus: '',
    motoroelTyp: '',
    kuehlerFrostschutzTyp: '',
    anzahlSitze: '',
    anhaengerkupplung: false,
    kindersitz: false,
    defekte: '',
    naechsterTuev: '',
    macken: '',
    sonstigeHinweise: '',
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
        setFormData({
          name: data.name,
          kilometerstand: data.kilometerstand.toString(),
          kilometerpauschale: data.kilometerpauschale.toString(),
          schluesselablageort: data.schluesselablageort,
          status: data.status,
          foto: data.foto || '',
          // Lebenszyklus-Felder
          baujahr: data.baujahr?.toString() || '',
          restwert: data.restwert?.toString() || '',
          erwarteteKmEndOfLife: data.erwarteteKmEndOfLife?.toString() || '',
          erwarteteJahreEndOfLife: data.erwarteteJahreEndOfLife?.toString() || '',
          geschaetzteKmProJahr: data.geschaetzteKmProJahr?.toString() || '',
          // Steckbrief-Felder
          versicherungsart: data.versicherungsart || '',
          kraftstoffart: data.kraftstoffart || '',
          aktuelleReifen: data.aktuelleReifen || '',
          naechsterOelwechsel: data.naechsterOelwechsel || '',
          reinigungszyklus: data.reinigungszyklus || '',
          motoroelTyp: data.motoroelTyp || '',
          kuehlerFrostschutzTyp: data.kuehlerFrostschutzTyp || '',
          anzahlSitze: data.anzahlSitze?.toString() || '',
          anhaengerkupplung: data.anhaengerkupplung || false,
          kindersitz: data.kindersitz || false,
          defekte: data.defekte || '',
          naechsterTuev: data.naechsterTuev || '',
          macken: data.macken || '',
          sonstigeHinweise: data.sonstigeHinweise || '',
        });

        // Check permissions - nur Owner oder Admin
        const isOwner = data.halterId === userId;
        const isAdmin = userRole === 'ADMIN';

        if (!isOwner && !isAdmin) {
          router.push(`/fahrzeuge/${id}`);
        }
      }
    } catch (error) {
      console.error('Error fetching fahrzeug:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, foto: data.key }));
    } catch (err: any) {
      setError('Fehler beim Hochladen des Fotos');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch(`/api/fahrzeuge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      router.push(`/fahrzeuge/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Laden...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/fahrzeuge/${id}`}
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Zurück zum Fahrzeug
      </Link>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fahrzeug bearbeiten</h1>
        <p className="text-gray-600 mb-8">
          Ändern Sie die Fahrzeugdetails
        </p>

        {error && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Fahrzeugname *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="foto" className="block text-sm font-medium text-gray-700 mb-2">
              Fahrzeugfoto
            </label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="foto"
                className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-5 h-5 text-gray-600" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700">
                  {uploading ? 'Wird hochgeladen...' : 'Neues Foto auswählen'}
                </span>
              </label>
              <input
                id="foto"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                aria-label="Fahrzeugfoto hochladen"
              />
              {formData.foto && (
                <span className="text-sm text-green-600">Foto vorhanden</span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="kilometerstand" className="block text-sm font-medium text-gray-700 mb-2">
              Kilometerstand *
            </label>
            <input
              id="kilometerstand"
              type="number"
              value={formData.kilometerstand}
              onChange={(e) => setFormData({ ...formData, kilometerstand: e.target.value })}
              required
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="kilometerpauschale" className="block text-sm font-medium text-gray-700 mb-2">
              Kilometerpauschale (€/km) *
            </label>
            <input
              id="kilometerpauschale"
              type="number"
              step="0.01"
              value={formData.kilometerpauschale}
              onChange={(e) => setFormData({ ...formData, kilometerpauschale: e.target.value })}
              required
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="schluesselablageort" className="block text-sm font-medium text-gray-700 mb-2">
              Schlüsselablageort *
            </label>
            <input
              id="schluesselablageort"
              type="text"
              value={formData.schluesselablageort}
              onChange={(e) => setFormData({ ...formData, schluesselablageort: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Fahrzeugstatus *
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-required="true"
            >
              <option value="VERFUEGBAR">Verfügbar</option>
              <option value="NUR_NOTFALL">Notfallfahrzeug</option>
              <option value="IN_WARTUNG">In Wartung</option>
              <option value="AUSSER_BETRIEB">Außer Betrieb</option>
            </select>
          </div>

          {/* Lebenszyklus Section - nur für Admin */}
          {userRole === 'ADMIN' && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-gray-700" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-gray-900">Lebenszyklus (nur Admin)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="baujahr" className="block text-sm font-medium text-gray-700 mb-2">
                    Baujahr
                  </label>
                  <input
                    id="baujahr"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    placeholder="z.B. 2018"
                    value={formData.baujahr}
                    onChange={(e) => setFormData({ ...formData, baujahr: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="restwert" className="block text-sm font-medium text-gray-700 mb-2">
                    Restwert (€)
                  </label>
                  <input
                    id="restwert"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="z.B. 5000"
                    value={formData.restwert}
                    onChange={(e) => setFormData({ ...formData, restwert: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="geschaetzteKmProJahr" className="block text-sm font-medium text-gray-700 mb-2">
                    Geschätzte km/Jahr
                  </label>
                  <input
                    id="geschaetzteKmProJahr"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="z.B. 15000"
                    value={formData.geschaetzteKmProJahr}
                    onChange={(e) => setFormData({ ...formData, geschaetzteKmProJahr: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="erwarteteKmEndOfLife" className="block text-sm font-medium text-gray-700 mb-2">
                    Erwartete km (End of Life)
                  </label>
                  <input
                    id="erwarteteKmEndOfLife"
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="z.B. 250000"
                    value={formData.erwarteteKmEndOfLife}
                    onChange={(e) => setFormData({ ...formData, erwarteteKmEndOfLife: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="erwarteteJahreEndOfLife" className="block text-sm font-medium text-gray-700 mb-2">
                    Erwartetes Alter (Jahre)
                  </label>
                  <input
                    id="erwarteteJahreEndOfLife"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="z.B. 15"
                    value={formData.erwarteteJahreEndOfLife}
                    onChange={(e) => setFormData({ ...formData, erwarteteJahreEndOfLife: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Steckbrief Section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-5 h-5 text-gray-700" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900">Fahrzeug-Steckbrief</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="versicherungsart" className="block text-sm font-medium text-gray-700 mb-2">
                  Versicherungsart
                </label>
                <select
                  id="versicherungsart"
                  value={formData.versicherungsart}
                  onChange={(e) => setFormData({ ...formData, versicherungsart: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">– Auswählen –</option>
                  <option value="Haftpflicht">Haftpflicht</option>
                  <option value="Teilkasko">Teilkasko</option>
                  <option value="Vollkasko">Vollkasko</option>
                </select>
              </div>

              <div>
                <label htmlFor="kraftstoffart" className="block text-sm font-medium text-gray-700 mb-2">
                  Kraftstoffart
                </label>
                <select
                  id="kraftstoffart"
                  value={formData.kraftstoffart}
                  onChange={(e) => setFormData({ ...formData, kraftstoffart: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">– Auswählen –</option>
                  <option value="Benzin">Benzin</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Elektro">Elektro</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Plug-in-Hybrid">Plug-in-Hybrid</option>
                  <option value="Erdgas (CNG)">Erdgas (CNG)</option>
                  <option value="Autogas (LPG)">Autogas (LPG)</option>
                </select>
              </div>

              <div>
                <label htmlFor="aktuelleReifen" className="block text-sm font-medium text-gray-700 mb-2">
                  Aktuelle Reifen
                </label>
                <select
                  id="aktuelleReifen"
                  value={formData.aktuelleReifen}
                  onChange={(e) => setFormData({ ...formData, aktuelleReifen: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">– Auswählen –</option>
                  <option value="Sommerreifen">Sommerreifen</option>
                  <option value="Winterreifen">Winterreifen</option>
                  <option value="Ganzjahresreifen">Ganzjahresreifen</option>
                </select>
              </div>

              <div>
                <label htmlFor="naechsterOelwechsel" className="block text-sm font-medium text-gray-700 mb-2">
                  Nächster Ölwechsel
                </label>
                <input
                  id="naechsterOelwechsel"
                  type="text"
                  placeholder="z.B. bei 120.000 km oder 03/2025"
                  value={formData.naechsterOelwechsel}
                  onChange={(e) => setFormData({ ...formData, naechsterOelwechsel: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="reinigungszyklus" className="block text-sm font-medium text-gray-700 mb-2">
                  Reinigungszyklus
                </label>
                <input
                  id="reinigungszyklus"
                  type="text"
                  placeholder="z.B. monatlich, alle 2 Wochen"
                  value={formData.reinigungszyklus}
                  onChange={(e) => setFormData({ ...formData, reinigungszyklus: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="motoroelTyp" className="block text-sm font-medium text-gray-700 mb-2">
                  Motoröl-Typ
                </label>
                <input
                  id="motoroelTyp"
                  type="text"
                  placeholder="z.B. 5W-30, 0W-40"
                  value={formData.motoroelTyp}
                  onChange={(e) => setFormData({ ...formData, motoroelTyp: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="kuehlerFrostschutzTyp" className="block text-sm font-medium text-gray-700 mb-2">
                  Kühler-Frostschutz-Typ
                </label>
                <input
                  id="kuehlerFrostschutzTyp"
                  type="text"
                  placeholder="z.B. G12+, G13"
                  value={formData.kuehlerFrostschutzTyp}
                  onChange={(e) => setFormData({ ...formData, kuehlerFrostschutzTyp: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="anzahlSitze" className="block text-sm font-medium text-gray-700 mb-2">
                  Anzahl Sitze
                </label>
                <input
                  id="anzahlSitze"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="z.B. 5"
                  value={formData.anzahlSitze}
                  onChange={(e) => setFormData({ ...formData, anzahlSitze: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="naechsterTuev" className="block text-sm font-medium text-gray-700 mb-2">
                  Nächster TÜV
                </label>
                <input
                  id="naechsterTuev"
                  type="text"
                  placeholder="z.B. 03/2025"
                  value={formData.naechsterTuev}
                  onChange={(e) => setFormData({ ...formData, naechsterTuev: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Checkboxen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.anhaengerkupplung}
                  onChange={(e) => setFormData({ ...formData, anhaengerkupplung: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Anhängerkupplung vorhanden</span>
              </label>

              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.kindersitz}
                  onChange={(e) => setFormData({ ...formData, kindersitz: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Kindersitz vorhanden</span>
              </label>
            </div>

            {/* Textfelder für längere Eingaben */}
            <div className="space-y-6 mt-6">
              <div>
                <label htmlFor="defekte" className="block text-sm font-medium text-gray-700 mb-2">
                  Bekannte Defekte
                </label>
                <textarea
                  id="defekte"
                  rows={3}
                  placeholder="Beschreiben Sie bekannte Defekte..."
                  value={formData.defekte}
                  onChange={(e) => setFormData({ ...formData, defekte: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="macken" className="block text-sm font-medium text-gray-700 mb-2">
                  Bekannte Macken
                </label>
                <textarea
                  id="macken"
                  rows={3}
                  placeholder="Beschreiben Sie bekannte Macken oder Eigenheiten..."
                  value={formData.macken}
                  onChange={(e) => setFormData({ ...formData, macken: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="sonstigeHinweise" className="block text-sm font-medium text-gray-700 mb-2">
                  Sonstige Hinweise
                </label>
                <textarea
                  id="sonstigeHinweise"
                  rows={4}
                  placeholder="Weitere wichtige Informationen zum Fahrzeug..."
                  value={formData.sonstigeHinweise}
                  onChange={(e) => setFormData({ ...formData, sonstigeHinweise: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Änderungen speichern"
            >
              {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
            <Link
              href={`/fahrzeuge/${id}`}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
