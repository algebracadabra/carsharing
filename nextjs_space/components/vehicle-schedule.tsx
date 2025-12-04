'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Fahrzeug {
  id: string;
  name: string;
}

interface Buchung {
  id: string;
  fahrzeugId: string;
  startZeit: string;
  endZeit: string;
  status: 'GEPLANT' | 'LAUFEND';
  user: {
    id: string;
    name: string | null;
  };
}

interface BelegungData {
  fahrzeuge: Fahrzeug[];
  buchungen: Buchung[];
  startDate: string;
  endDate: string;
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function VehicleSchedule() {
  const [data, setData] = useState<BelegungData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBelegung();
  }, []);

  const fetchBelegung = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fahrzeuge/belegung');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        setError('Fehler beim Laden der Belegung');
      }
    } catch (err) {
      setError('Fehler beim Laden der Belegung');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-red-500">{error || 'Keine Daten verfügbar'}</p>
      </div>
    );
  }

  // Generate array of 7 days starting from today
  const days: Date[] = [];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }

  // Helper to check if a booking overlaps with a specific day
  const getBookingsForDay = (fahrzeugId: string, day: Date): Buchung[] => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return data.buchungen.filter((b) => {
      if (b.fahrzeugId !== fahrzeugId) return false;
      const bookingStart = new Date(b.startZeit);
      const bookingEnd = new Date(b.endZeit);
      // Check if booking overlaps with this day
      return bookingStart <= dayEnd && bookingEnd >= dayStart;
    });
  };

  // Calculate position and width for a booking bar within a day cell
  const getBookingStyle = (buchung: Buchung, day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const bookingStart = new Date(buchung.startZeit);
    const bookingEnd = new Date(buchung.endZeit);

    // Clamp to day boundaries
    const effectiveStart = bookingStart < dayStart ? dayStart : bookingStart;
    const effectiveEnd = bookingEnd > dayEnd ? dayEnd : bookingEnd;

    const dayDuration = 24 * 60 * 60 * 1000; // ms in a day
    const startOffset = (effectiveStart.getTime() - dayStart.getTime()) / dayDuration;
    const endOffset = (effectiveEnd.getTime() - dayStart.getTime()) / dayDuration;
    const width = endOffset - startOffset;

    return {
      left: `${startOffset * 100}%`,
      width: `${Math.max(width * 100, 5)}%`, // Minimum 5% width for visibility
    };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-900">Belegungsübersicht</h2>
        <span className="text-sm text-gray-500 ml-2">Nächste 7 Tage</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row with days */}
          <div className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
            <div className="p-3 font-medium text-gray-700 text-sm">Fahrzeug</div>
            {days.map((day, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-2 text-center border-l border-gray-200',
                  isToday(day) && 'bg-blue-50'
                )}
              >
                <div className={cn(
                  'text-xs font-medium',
                  isToday(day) ? 'text-blue-600' : 'text-gray-500'
                )}>
                  {WEEKDAYS[day.getDay()]}
                </div>
                <div className={cn(
                  'text-sm font-semibold',
                  isToday(day) ? 'text-blue-700' : 'text-gray-900'
                )}>
                  {formatDate(day)}
                </div>
              </div>
            ))}
          </div>

          {/* Vehicle rows */}
          {data.fahrzeuge.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Keine Fahrzeuge vorhanden
            </div>
          ) : (
            data.fahrzeuge.map((fahrzeug) => (
              <div
                key={fahrzeug.id}
                className="grid grid-cols-[180px_repeat(7,1fr)] border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="p-3 font-medium text-gray-900 text-sm truncate flex items-center">
                  {fahrzeug.name}
                </div>
                {days.map((day, dayIdx) => {
                  const bookings = getBookingsForDay(fahrzeug.id, day);
                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        'relative h-12 border-l border-gray-200',
                        isToday(day) && 'bg-blue-50/50'
                      )}
                    >
                      {bookings.map((buchung) => {
                        const style = getBookingStyle(buchung, day);
                        return (
                          <div
                            key={buchung.id}
                            className={cn(
                              'absolute top-1 bottom-1 rounded-sm cursor-pointer transition-all hover:opacity-80',
                              buchung.status === 'LAUFEND'
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                            )}
                            style={style}
                            title={`${buchung.user.name || 'Unbekannt'}\n${new Date(buchung.startZeit).toLocaleString('de-DE')} - ${new Date(buchung.endZeit).toLocaleString('de-DE')}`}
                          >
                            <div className="px-1 text-[10px] text-white truncate leading-tight h-full flex items-center">
                              {buchung.user.name?.split(' ')[0] || ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
          <span className="text-gray-600">Geplant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          <span className="text-gray-600">Laufend</span>
        </div>
      </div>
    </div>
  );
}
