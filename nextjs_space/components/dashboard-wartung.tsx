'use client';

import { useState, useEffect } from 'react';
import { 
  Wrench, Check, ChevronDown, ChevronUp, Clock, 
  AlertTriangle, Calendar, TrendingUp, User, Car
} from 'lucide-react';
import Image from 'next/image';

interface WartungsTask {
  id: string;
  titel: string;
  beschreibung: string | null;
  faelligAm: string | null;
  faelligBeiKm: number | null;
  erledigt: boolean;
  erledigtAm: string | null;
  zugewiesenAnId: string | null;
  zugewiesenAn: { id: string; name: string } | null;
  erledigtVon: { id: string; name: string } | null;
  wartungsIntervall: { id: string; name: string } | null;
  fahrzeug: { id: string; name: string; kilometerstand: number; foto: string | null };
}

export function DashboardWartung() {
  const [tasks, setTasks] = useState<WartungsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBaldFaellig, setShowBaldFaellig] = useState(false);
  const [processingTask, setProcessingTask] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/wartungstasks?nurOffen=true');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTaskOverdue = (task: WartungsTask) => {
    if (task.erledigt) return false;
    if (task.faelligAm && new Date(task.faelligAm) < new Date()) return true;
    if (task.faelligBeiKm && task.faelligBeiKm <= task.fahrzeug.kilometerstand) return true;
    return false;
  };

  const isTaskDueSoon = (task: WartungsTask) => {
    if (task.erledigt) return false;
    if (task.faelligAm) {
      const dueDate = new Date(task.faelligAm);
      const now = new Date();
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 14;
    }
    if (task.faelligBeiKm) {
      const diffKm = task.faelligBeiKm - task.fahrzeug.kilometerstand;
      return diffKm > 0 && diffKm <= 1000;
    }
    return false;
  };

  const handleAssignToMe = async (taskId: string) => {
    setProcessingTask(taskId);
    try {
      const response = await fetch(`/api/wartungstasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zuweisen: true }),
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error assigning task:', error);
    } finally {
      setProcessingTask(null);
    }
  };

  const handleMarkDone = async (taskId: string) => {
    setProcessingTask(taskId);
    try {
      const response = await fetch(`/api/wartungstasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erledigt: true }),
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setProcessingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Wartungsaufgaben</h2>
        </div>
        <div className="text-center text-gray-500 py-4">Laden...</div>
      </div>
    );
  }

  const overdueTasks = tasks.filter(isTaskOverdue);
  const dueSoonTasks = tasks.filter(t => !isTaskOverdue(t) && isTaskDueSoon(t));

  // Wenn keine Aufgaben, nichts anzeigen
  if (overdueTasks.length === 0 && dueSoonTasks.length === 0) {
    return null;
  }

  const TaskCard = ({ task, isOverdue }: { task: WartungsTask; isOverdue: boolean }) => {
    const isProcessing = processingTask === task.id;
    
    return (
      <div
        className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
          isOverdue
            ? 'border-red-300 bg-red-50'
            : 'border-yellow-300 bg-yellow-50'
        }`}
      >
        {/* Fahrzeug-Miniatur */}
        <div className="flex-shrink-0">
          {task.fahrzeug.foto ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={task.fahrzeug.foto}
                alt={task.fahrzeug.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
              <Car className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`font-semibold ${isOverdue ? 'text-red-900' : 'text-yellow-900'}`}>
                {task.titel}
              </p>
              <p className={`text-sm font-medium ${isOverdue ? 'text-red-700' : 'text-yellow-700'}`}>
                {task.fahrzeug.name}
              </p>
            </div>
            {isOverdue && (
              <span className="flex-shrink-0 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                Überfällig
              </span>
            )}
          </div>
          
          {task.beschreibung && (
            <p className="text-sm text-gray-600 mt-1">{task.beschreibung}</p>
          )}
          
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
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
                <span className="text-gray-400">
                  (aktuell: {task.fahrzeug.kilometerstand.toLocaleString('de-DE')} km)
                </span>
              </span>
            )}
          </div>

          {/* Zugewiesen an */}
          {task.zugewiesenAn && (
            <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
              <User className="w-3 h-3" />
              Zugewiesen an: {task.zugewiesenAn.name}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {!task.zugewiesenAn && (
            <button
              onClick={() => handleAssignToMe(task.id)}
              disabled={isProcessing}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isOverdue
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              } disabled:opacity-50`}
            >
              <User className="w-3 h-3" />
              Übernehmen
            </button>
          )}
          <button
            onClick={() => handleMarkDone(task.id)}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
            Erledigt
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-900">Wartungsaufgaben</h2>
          {overdueTasks.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
              {overdueTasks.length} fällig
            </span>
          )}
        </div>
      </div>

      {/* Überfällige Tasks */}
      {overdueTasks.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">
              Fällige Aufgaben ({overdueTasks.length})
            </span>
          </div>
          <div className="space-y-3">
            {overdueTasks.map((task) => (
              <TaskCard key={task.id} task={task} isOverdue={true} />
            ))}
          </div>
        </div>
      )}

      {/* Bald fällige Tasks - einklappbar */}
      {dueSoonTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowBaldFaellig(!showBaldFaellig)}
            className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Clock className="w-4 h-4 text-yellow-600" />
            <span>Bald fällig ({dueSoonTasks.length})</span>
            {showBaldFaellig ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>
          
          {showBaldFaellig && (
            <div className="space-y-3 mt-3">
              {dueSoonTasks.map((task) => (
                <TaskCard key={task.id} task={task} isOverdue={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
