'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, Loader2, AlertCircle, ChevronUp, ChevronDown, Fuel, PiggyBank, Wrench, Car } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface KilometerpauschaleEmpfehlungProps {
  fahrzeugId: string;
  aktuellePauschale: number;
  zeitraumMonate?: number;
}

interface EmpfehlungData {
  empfohlenePauschale: number;
  aktuellePauschale: number;
  differenz: number;
  differenzProzent: number;
  empfehlung: 'erhoehen' | 'senken' | 'beibehalten';
  kostenProKm: {
    treibstoff: number;
    fixkosten: number;
    wartungReparatur: number;
    wertverlust: number;
    gesamt: number;
  };
  einnahmenPrognose: {
    zeitraumMonate: number;
    mitAktuellerPauschale: number;
    mitEmpfohlenerPauschale: number;
    unterschied: number;
  };
  wertverlustVerfuegbar: boolean;
  gefahreneKmImZeitraum: number;
  zeitraumMonate: number;
  error?: string;
  message?: string;
}

export function KilometerpauschaleEmpfehlung({
  fahrzeugId,
  aktuellePauschale,
  zeitraumMonate = 12,
}: KilometerpauschaleEmpfehlungProps) {
  const [empfehlung, setEmpfehlung] = useState<EmpfehlungData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEinnahmenTooltip, setShowEinnahmenTooltip] = useState(false);
  
  // Refs für tap & hold
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEmpfehlung();
  }, [fahrzeugId, zeitraumMonate]);

  const fetchEmpfehlung = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/fahrzeuge/${fahrzeugId}/empfehlung?zeitraumMonate=${zeitraumMonate}`
      );
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Empfehlung');
      }
      
      const data = await response.json();
      setEmpfehlung(data);
    } catch (err) {
      setError('Empfehlung konnte nicht geladen werden');
      console.error('Fehler beim Laden der Empfehlung:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tap & Hold Handler
  const handleTouchStart = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      setShowEinnahmenTooltip(true);
    }, 500); // 500ms halten
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    // Tooltip nach kurzer Zeit ausblenden
    setTimeout(() => {
      setShowEinnahmenTooltip(false);
    }, 3000);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setShowEinnahmenTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowEinnahmenTooltip(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Empfehlung wird berechnet...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  // Keine Fahrten im Zeitraum
  if (empfehlung?.error === 'Keine Fahrten im Zeitraum') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-amber-700">
          <Info className="w-4 h-4" />
          <span className="text-sm">{empfehlung.message}</span>
        </div>
      </div>
    );
  }

  if (!empfehlung) {
    return null;
  }

  // Farben basierend auf Empfehlung
  const getEmpfehlungStyles = () => {
    switch (empfehlung.empfehlung) {
      case 'erhoehen':
        return {
          bg: 'bg-gradient-to-r from-orange-50 to-amber-50',
          border: 'border-orange-200',
          icon: TrendingUp,
          iconColor: 'text-orange-600',
          badgeBg: 'bg-orange-100',
          badgeText: 'text-orange-700',
          label: 'Erhöhung empfohlen',
        };
      case 'senken':
        return {
          bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
          border: 'border-emerald-200',
          icon: TrendingDown,
          iconColor: 'text-emerald-600',
          badgeBg: 'bg-emerald-100',
          badgeText: 'text-emerald-700',
          label: 'Senkung möglich',
        };
      case 'beibehalten':
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
          border: 'border-blue-200',
          icon: Minus,
          iconColor: 'text-blue-600',
          badgeBg: 'bg-blue-100',
          badgeText: 'text-blue-700',
          label: 'Pauschale passt',
        };
    }
  };

  const styles = getEmpfehlungStyles();
  const Icon = styles.icon;

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-lg p-4 relative`}>
      {/* Header mit Empfehlung */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${styles.iconColor}`} aria-hidden="true" />
          <span className="font-semibold text-gray-800">Kilometerpauschalen-Empfehlung</span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles.badgeBg} ${styles.badgeText}`}>
          {styles.label}
        </span>
      </div>

      {/* Gegenüberstellung: Aktuell vs. Empfohlen */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Aktuelle Pauschale */}
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Aktuell</p>
          <p className="text-xl font-bold text-gray-700">
            {formatCurrency(empfehlung.aktuellePauschale)} €/km
          </p>
        </div>

        {/* Empfohlene Pauschale */}
        <div className="bg-white/60 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Empfohlen</p>
          <p className={`text-xl font-bold ${styles.iconColor}`}>
            {formatCurrency(empfehlung.empfohlenePauschale)} €/km
          </p>
          {empfehlung.differenz !== 0 && (
            <p className={`text-xs ${empfehlung.differenz > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
              {empfehlung.differenz > 0 ? '+' : ''}{formatCurrency(empfehlung.differenz)} €/km ({empfehlung.differenzProzent > 0 ? '+' : ''}{empfehlung.differenzProzent.toFixed(1)}%)
            </p>
          )}
        </div>
      </div>

      {/* Einnahmenprognose Button mit Tooltip */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowEinnahmenTooltip(!showEinnahmenTooltip)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/50 hover:bg-white/70 rounded-lg transition-colors text-sm text-gray-600 hover:text-gray-800"
        >
          <Info className="w-4 h-4" />
          <span>Einnahmenprognose anzeigen</span>
        </button>

        {/* Einnahmen-Tooltip */}
        {showEinnahmenTooltip && (
          <div 
            ref={tooltipRef}
            className="absolute left-0 right-0 bottom-full mb-2 bg-gray-900 text-white rounded-lg p-4 shadow-xl z-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="font-semibold">Einnahmenprognose ({empfehlung.einnahmenPrognose.zeitraumMonate} Monate)</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Mit aktueller Pauschale:</span>
                <span className="font-medium">{formatCurrency(empfehlung.einnahmenPrognose.mitAktuellerPauschale)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Mit empfohlener Pauschale:</span>
                <span className="font-medium">{formatCurrency(empfehlung.einnahmenPrognose.mitEmpfohlenerPauschale)} €</span>
              </div>
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="text-gray-300">Unterschied:</span>
                <span className={`font-bold ${empfehlung.einnahmenPrognose.unterschied >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {empfehlung.einnahmenPrognose.unterschied >= 0 ? '+' : ''}{formatCurrency(empfehlung.einnahmenPrognose.unterschied)} €
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Basierend auf {empfehlung.gefahreneKmImZeitraum.toLocaleString('de-DE')} km im Zeitraum
            </p>
            {/* Pfeil nach unten */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors py-1"
      >
        <span>Kostenaufschlüsselung</span>
        {showDetails ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Kostenaufschlüsselung */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200/50 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Treibstoff */}
            <div className="flex items-center gap-2 bg-white/40 rounded px-2 py-1.5">
              <Fuel className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-gray-600">Treibstoff</span>
            </div>
            <div className="text-right font-medium text-gray-800 px-2 py-1.5">
              {formatCurrency(empfehlung.kostenProKm.treibstoff)} €/km
            </div>

            {/* Fixkosten */}
            <div className="flex items-center gap-2 bg-white/40 rounded px-2 py-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-gray-600">Fixkosten</span>
            </div>
            <div className="text-right font-medium text-gray-800 px-2 py-1.5">
              {formatCurrency(empfehlung.kostenProKm.fixkosten)} €/km
            </div>

            {/* Wartung */}
            <div className="flex items-center gap-2 bg-white/40 rounded px-2 py-1.5">
              <Wrench className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-gray-600">Wartung</span>
            </div>
            <div className="text-right font-medium text-gray-800 px-2 py-1.5">
              {formatCurrency(empfehlung.kostenProKm.wartungReparatur)} €/km
            </div>

            {/* Wertverlust */}
            <div className="flex items-center gap-2 bg-white/40 rounded px-2 py-1.5">
              <Car className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-gray-600">Wertverlust</span>
            </div>
            <div className="text-right font-medium text-gray-800 px-2 py-1.5">
              {empfehlung.wertverlustVerfuegbar ? (
                `${formatCurrency(empfehlung.kostenProKm.wertverlust)} €/km`
              ) : (
                <span className="text-gray-400 text-xs">Keine Daten</span>
              )}
            </div>
          </div>

          {/* Gesamt */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
            <span className="font-semibold text-gray-700">Gesamt</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(empfehlung.kostenProKm.gesamt)} €/km
            </span>
          </div>

          {/* Hinweis wenn Wertverlust fehlt */}
          {!empfehlung.wertverlustVerfuegbar && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded p-2 mt-2">
              💡 Tipp: Füllen Sie die Lebenszyklus-Daten aus, um den Wertverlust in die Empfehlung einzubeziehen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
