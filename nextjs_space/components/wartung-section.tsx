'use client';

import { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Trash2, Check, X, Clock, 
  AlertTriangle, Calendar, TrendingUp, Edit, RefreshCw 
} from 'lucide-react';
import { WARTUNGS_INTERVALL_TYP_LABELS, MONAT_LABELS } from '@/lib/types';
import type { WartungsIntervallTyp } from '@/lib/types';

interface WartungSectionProps {
  fahrzeugId: string;
  fahrzeugKilometerstand: number;
  canEdit: boolean; // Halter oder Admin
}

interface WartungsIntervall {
  id: string;
  name: string;
  beschreibung: string | null;
  intervallTyp: WartungsIntervallTyp;
  intervallWert: number;
  monatImJahr: number | null;
  aktiv: boolean;
}

interface WartungsTask {
  id: string;
  titel: string;
  beschreibung: string | null;
  faelligAm: string | null;
  faelligBeiKm: number | null;
  erledigt: boolean;
  erledigtAm: string | null;
  erledigtVon: { id: string; name: string } | null;
  wartungsIntervall: { id: string; name: string } | null;
  fahrzeug: { id: string; name: string; kilometerstand: number };
}

export function WartungSection({ fahrzeugId, fahrzeugKilometerstand, canEdit }: WartungSectionProps) {
  const [intervalle, setIntervalle] = useState<WartungsIntervall[]>([]);
  const [tasks, setTasks] = useState<WartungsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntervallForm, setShowIntervallForm] = useState(false);
  const [savingIntervall, setSavingIntervall] = useState(false);
  const [intervallForm, setIntervallForm] = useState({
    name: '',
    beschreibung: '',
    intervallTyp: 'WOCHEN' as WartungsIntervallTyp,
    intervallWert: '',
    monatImJahr: '',
  });

  useEffect(() => {
    fetchData();
  }, [fahrzeugId]);

  const fetchData = async () => {
    try {
      const [intervalleRes, tasksRes] = await Promise.all([
        fetch(`/api/wartungsintervalle?fahrzeugId=${fahrzeugId}`),
        fetch(`/api/wartungstasks?fahrzeugId=${fahrzeugId}&nurOffen=true`),
      ]);

      if (intervalleRes.ok) {
        const data = await intervalleRes.json();
        setIntervalle(data);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching wartung data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntervall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIntervall(true);

    try {
      const response = await fetch('/api/wartungsintervalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fahrzeugId,
          ...intervallForm,
        }),
      });

      if (response.ok) {
        setShowIntervallForm(false);
        setIntervallForm({
          name: '',
          beschreibung: '',
          intervallTyp: 'WOCHEN',
          intervallWert: '',
          monatImJahr: '',
        });
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      console.error('Error creating intervall:', error);
      alert('Fehler beim Erstellen');
    } finally {
      setSavingIntervall(false);
    }
  };

  const handleDeleteIntervall = async (id: string) => {
    if (!confirm('Wartungsintervall wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/wartungsintervalle/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting intervall:', error);
    }
  };

  const handleToggleTask = async (taskId: string, erledigt: boolean) => {
    try {
      const response = await fetch(`/api/wartungstasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erledigt }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const formatIntervall = (intervall: WartungsIntervall) => {
    switch (intervall.intervallTyp) {
      case 'KILOMETER':
        return `alle ${intervall.intervallWert.toLocaleString('de-DE')} km`;
      case 'WOCHEN':
        return `alle ${intervall.intervallWert} Wochen`;
      case 'MONATE':
        return `alle ${intervall.intervallWert} Monate`;
      case 'JAEHRLICH':
        return `jährlich im ${MONAT_LABELS[intervall.monatImJahr || 1]}`;
      default:
        return '';
    }
  };

  const isTaskOverdue = (task: WartungsTask) => {
    if (task.erledigt) return false;
    if (task.faelligAm && new Date(task.faelligAm) < new Date()) return true;
    if (task.faelligBeiKm && task.faelligBeiKm <= fahrzeugKilometerstand) return true;
    return false;
  };

  const isTaskDueSoon = (task: WartungsTask) => {
    if (task.erledigt) return false;
    if (task.faelligAm) {
      const dueDate = new Date(task.faelligAm);
      const now = new Date();
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 7;
    }
    if (task.faelligBeiKm) {
      const diffKm = task.faelligBeiKm - fahrzeugKilometerstand;
      return diffKm > 0 && diffKm <= 500;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="text-center text-gray-500">Laden...</div>
      </div>
    );
  }

  const openTasks = tasks.filter(t => !t.erledigt);
  const overdueTasks = openTasks.filter(isTaskOverdue);
  const dueSoonTasks = openTasks.filter(t => !isTaskOverdue(t) && isTaskDueSoon(t));

  return (
    <>
      {/* Offene Tasks Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-700" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">Offene Wartungsaufgaben</h2>
            {openTasks.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-sm font-medium px-2 py-0.5 rounded-full">
                {openTasks.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {overdueTasks.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Überfällig ({overdueTasks.length})</span>
            </div>
          </div>
        )}

        {openTasks.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Keine offenen Aufgaben</p>
        ) : (
          <div className="space-y-3">
            {openTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              const dueSoon = isTaskDueSoon(task);
              
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    overdue
                      ? 'border-red-300 bg-red-50'
                      : dueSoon
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTask(task.id, true)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        overdue
                          ? 'border-red-400 hover:bg-red-100'
                          : dueSoon
                          ? 'border-yellow-400 hover:bg-yellow-100'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                      title="Als erledigt markieren"
                    >
                      <Check className="w-4 h-4 text-gray-400" />
                    </button>
                    <div>
                      <p className={`font-medium ${overdue ? 'text-red-900' : 'text-gray-900'}`}>
                        {task.titel}
                      </p>
                      {task.beschreibung && (
                        <p className="text-sm text-gray-600">{task.beschreibung}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {task.faelligAm && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.faelligAm).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {task.faelligBeiKm && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            bei {task.faelligBeiKm.toLocaleString('de-DE')} km
                          </span>
                        )}
                        {task.wartungsIntervall && (
                          <span className="text-blue-600">
                            {task.wartungsIntervall.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {overdue && (
                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                      Überfällig
                    </span>
                  )}
                  {dueSoon && !overdue && (
                    <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                      Bald fällig
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wartungsintervalle Section - nur für Halter/Admin */}
      {canEdit && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gray-700" aria-hidden="true" />
              <h2 className="text-xl font-bold text-gray-900">Wartungsintervalle</h2>
            </div>
            <button
              onClick={() => setShowIntervallForm(!showIntervallForm)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Neues Intervall
            </button>
          </div>

          {/* Neues Intervall Formular */}
          {showIntervallForm && (
            <form onSubmit={handleCreateIntervall} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={intervallForm.name}
                    onChange={(e) => setIntervallForm({ ...intervallForm, name: e.target.value })}
                    placeholder="z.B. Reinigung, Ölwechsel"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intervall-Typ *
                  </label>
                  <select
                    value={intervallForm.intervallTyp}
                    onChange={(e) => setIntervallForm({ ...intervallForm, intervallTyp: e.target.value as WartungsIntervallTyp })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="WOCHEN">Wochen</option>
                    <option value="MONATE">Monate</option>
                    <option value="KILOMETER">Kilometer</option>
                    <option value="JAEHRLICH">Jährlich (bestimmter Monat)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {intervallForm.intervallTyp === 'KILOMETER' 
                      ? 'Alle X Kilometer *' 
                      : intervallForm.intervallTyp === 'JAEHRLICH'
                      ? 'Monat im Jahr *'
                      : `Alle X ${WARTUNGS_INTERVALL_TYP_LABELS[intervallForm.intervallTyp]} *`}
                  </label>
                  {intervallForm.intervallTyp === 'JAEHRLICH' ? (
                    <select
                      value={intervallForm.monatImJahr}
                      onChange={(e) => setIntervallForm({ ...intervallForm, monatImJahr: e.target.value, intervallWert: '1' })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">– Monat wählen –</option>
                      {Object.entries(MONAT_LABELS).map(([num, name]) => (
                        <option key={num} value={num}>{name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={intervallForm.intervallWert}
                      onChange={(e) => setIntervallForm({ ...intervallForm, intervallWert: e.target.value })}
                      placeholder={intervallForm.intervallTyp === 'KILOMETER' ? 'z.B. 10000' : 'z.B. 6'}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <input
                    type="text"
                    value={intervallForm.beschreibung}
                    onChange={(e) => setIntervallForm({ ...intervallForm, beschreibung: e.target.value })}
                    placeholder="Optionale Details"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIntervallForm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={savingIntervall}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {savingIntervall ? 'Speichern...' : 'Erstellen'}
                </button>
              </div>
            </form>
          )}

          {/* Liste der Intervalle */}
          {intervalle.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Noch keine Wartungsintervalle definiert
            </p>
          ) : (
            <div className="space-y-3">
              {intervalle.map((intervall) => (
                <div
                  key={intervall.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    intervall.aktiv ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{intervall.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatIntervall(intervall)}
                    </p>
                    {intervall.beschreibung && (
                      <p className="text-xs text-gray-500 mt-1">{intervall.beschreibung}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteIntervall(intervall.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
