'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Car } from 'lucide-react';
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

interface VehicleScheduleProps {
  daysCount?: number;
  showTitle?: boolean;
  compact?: boolean;
  showDaysSelector?: boolean;
}

export function VehicleSchedule({ daysCount: initialDaysCount = 7, showTitle = true, compact = false, showDaysSelector = false }: VehicleScheduleProps) {
  const [daysCount, setDaysCount] = useState(initialDaysCount);
  const [data, setData] = useState<BelegungData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBelegung();
    
    // Periodisch aktualisieren (alle 30 Sekunden)
    const interval = setInterval(() => {
      fetchBelegung();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [daysCount]); // Refetch when daysCount changes

  const fetchBelegung = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fahrzeuge/belegung?days=${daysCount}`);
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

  // Generate array of days starting from today
  const days: Date[] = [];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  for (let i = 0; i < daysCount; i++) {
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

  // Dynamic grid columns using inline style (Tailwind can't handle dynamic class names)
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: compact 
      ? `120px repeat(${daysCount}, 1fr)`
      : `180px repeat(${daysCount}, 1fr)`,
  };

  // Mobile: Render a card-based vertical layout
  const renderMobileView = () => (
    <div className="md:hidden space-y-4 p-3">
      {data.fahrzeuge.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Keine Fahrzeuge vorhanden
        </div>
      ) : (
        data.fahrzeuge.map((fahrzeug) => {
          // Get all bookings for this vehicle in the date range
          const vehicleBookings = data.buchungen
            .filter((b) => b.fahrzeugId === fahrzeug.id)
            .sort((a, b) => new Date(a.startZeit).getTime() - new Date(b.startZeit).getTime());

          return (
            <div
              key={fahrzeug.id}
              className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
            >
              {/* Vehicle Header */}
              <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200">
                <Car className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-900 text-sm">{fahrzeug.name}</span>
                {vehicleBookings.length > 0 && (
                  <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {vehicleBookings.length} Buchung{vehicleBookings.length !== 1 ? 'en' : ''}
                  </span>
                )}
              </div>

              {/* Days Timeline */}
              <div className="p-2 space-y-1">
                {days.map((day, dayIdx) => {
                  const dayBookings = getBookingsForDay(fahrzeug.id, day);
                  const dayIsToday = isToday(day);

                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        'flex items-stretch gap-2 rounded-md transition-colors min-h-[36px]',
                        dayIsToday ? 'bg-blue-50' : 'bg-white',
                        dayBookings.length === 0 && 'opacity-60'
                      )}
                    >
                      {/* Day Label */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-16 flex flex-col items-center justify-center py-1.5 rounded-l-md',
                          dayIsToday ? 'bg-blue-100' : 'bg-gray-100'
                        )}
                      >
                        <span
                          className={cn(
                            'text-[10px] font-medium',
                            dayIsToday ? 'text-blue-600' : 'text-gray-500'
                          )}
                        >
                          {WEEKDAYS[day.getDay()]}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            dayIsToday ? 'text-blue-700' : 'text-gray-900'
                          )}
                        >
                          {formatDate(day)}
                        </span>
                      </div>

                      {/* Bookings for this day */}
                      <div className="flex-1 flex items-center gap-1 py-1 pr-2 overflow-x-auto">
                        {dayBookings.length === 0 ? (
                          <span className="text-xs text-gray-400">Frei</span>
                        ) : (
                          dayBookings.map((buchung) => {
                            const startTime = new Date(buchung.startZeit);
                            const endTime = new Date(buchung.endZeit);
                            const startsToday = startTime.toDateString() === day.toDateString();
                            const endsToday = endTime.toDateString() === day.toDateString();

                            return (
                              <div
                                key={buchung.id}
                                className={cn(
                                  'flex-shrink-0 px-2 py-1 rounded text-xs text-white',
                                  buchung.status === 'LAUFEND' ? 'bg-green-500' : 'bg-blue-500'
                                )}
                              >
                                <div className="font-medium truncate max-w-[100px]">
                                  {buchung.user.name?.split(' ')[0] || 'Unbekannt'}
                                </div>
                                <div className="text-[10px] opacity-90">
                                  {startsToday
                                    ? startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                                    : '00:00'}
                                  {' - '}
                                  {endsToday
                                    ? endTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                                    : '24:00'}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // Desktop: Render the grid-based horizontal layout
  const renderDesktopView = () => (
    <div className="hidden md:block overflow-x-auto">
      <div className={compact ? 'min-w-[400px]' : 'min-w-[600px]'}>
        {/* Header row with days */}
        <div className="border-b border-gray-200 bg-gray-50" style={gridStyle}>
          <div className={cn('font-medium text-gray-700 text-sm', compact ? 'p-2' : 'p-3')}>
            Fahrzeug
          </div>
          {days.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                'text-center border-l border-gray-200',
                compact ? 'p-1.5' : 'p-2',
                isToday(day) && 'bg-blue-50'
              )}
            >
              <div
                className={cn(
                  'text-xs font-medium',
                  isToday(day) ? 'text-blue-600' : 'text-gray-500'
                )}
              >
                {WEEKDAYS[day.getDay()]}
              </div>
              <div
                className={cn(
                  compact ? 'text-xs' : 'text-sm',
                  'font-semibold',
                  isToday(day) ? 'text-blue-700' : 'text-gray-900'
                )}
              >
                {formatDate(day)}
              </div>
            </div>
          ))}
        </div>

        {/* Vehicle rows */}
        {data.fahrzeuge.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Keine Fahrzeuge vorhanden</div>
        ) : (
          data.fahrzeuge.map((fahrzeug) => (
            <div
              key={fahrzeug.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              style={gridStyle}
            >
              <div
                className={cn(
                  'font-medium text-gray-900 text-sm truncate flex items-center',
                  compact ? 'p-2' : 'p-3'
                )}
              >
                {fahrzeug.name}
              </div>
              {days.map((day, dayIdx) => {
                const bookings = getBookingsForDay(fahrzeug.id, day);
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'relative border-l border-gray-200',
                      compact ? 'h-10' : 'h-12',
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
                            buchung.status === 'LAUFEND' ? 'bg-green-500' : 'bg-blue-500'
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
  );

  return (
    <div className={cn(
      "bg-white rounded-lg shadow-md overflow-hidden",
      compact && "shadow-sm"
    )}>
      {showTitle && (
        <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Belegungsübersicht</h2>
            <span className="text-xs sm:text-sm text-gray-500 ml-1 sm:ml-2">({daysCount} Tage)</span>
          </div>
          {showDaysSelector && (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-500">Tage:</span>
              <div className="flex items-center gap-1">
                {[3, 7, 14, 21].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDaysCount(days)}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                      daysCount === days
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {days}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile View */}
      {renderMobileView()}

      {/* Desktop View */}
      {renderDesktopView()}

      {/* Legend */}
      <div className={cn(
        "border-t border-gray-200 bg-gray-50 flex items-center gap-4 text-xs",
        compact ? "p-2" : "p-3"
      )}>
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
