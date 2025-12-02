'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Upload, AlertCircle } from 'lucide-react';
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
              <option value="IN_WARTUNG">In Wartung</option>
              <option value="AUSSER_BETRIEB">Außer Betrieb</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
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
