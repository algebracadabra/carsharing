# Language Mapping: German UI → English Code
# Die UI bleibt auf Deutsch, der Code ist auf Englisch

## Entities / Models
| Deutsch | Englisch | Kontext |
|---------|----------|---------|
| Fahrzeug | Vehicle | Fahrzeug-Entity |
| Buchung | Booking | Reservierung |
| Fahrt | Trip | Einzelne Fahrt |
| Zahlung | Payment | Zahlung |
| Halter | Owner | Fahrzeughalter |
| Fahrer | Driver | Fahrer |

## Fields / Properties
| Deutsch | Englisch | Kontext |
|---------|----------|---------|
| kilometerstand | odometer | Aktueller KM-Stand |
| kilometerpauschale | ratePerKm | Kosten pro KM |
| startZeit/endZeit | startTime/endTime | Zeitraum |
| gefahreneKm | distanceKm | Gefahrene Strecke |
| bemerkungen | notes | Anmerkungen |
| schluesselablageort | keyLocation | Wo ist der Schlüssel |
| startKilometer | startOdometer | Start-KM |
| endKilometer | endOdometer | End-KM |
| kosten | cost | Kosten |
| treibstoffKosten | fuelCosts | Treibstoffkosten |
| fixkosten | fixedCosts | Fixkosten |
| wartungsKosten | maintenanceCosts | Wartungskosten |
| foto | photo | Bild |
| betrag | amount | Geldbetrag |
| beleg | receipt | Zahlungsbeleg |
| beschreibung | description | Beschreibung |

## API Routes
| Deutsch | Englisch | Kontext |
|---------|----------|---------|
| /api/fahrzeuge | /api/vehicles | Fahrzeuge API |
| /api/buchungen | /api/bookings | Buchungen API |
| /api/fahrten | /api/trips | Fahrten API |
| /api/zahlungen | /api/payments | Zahlungen API |
| /api/abrechnung | /api/billing | Abrechnung API |
| verfuegbar | available | Verfügbare Fahrzeuge |
| belegung | schedule | Belegungsplan |
| zusammenfassung | summary | Zusammenfassung |

## Status Values (bleiben auf Englisch im Code)
| Deutsch | Englisch | Kontext |
|---------|----------|---------|
| VERFUEGBAR | AVAILABLE | Fahrzeugstatus |
| IN_WARTUNG | IN_MAINTENANCE | Fahrzeugstatus |
| AUSSER_BETRIEB | OUT_OF_SERVICE | Fahrzeugstatus |
| NUR_NOTFALL | EMERGENCY_ONLY | Fahrzeugstatus |
| GEPLANT | PLANNED | Buchungsstatus |
| LAUFEND | ACTIVE | Buchungsstatus |
| ABGESCHLOSSEN | COMPLETED | Buchungsstatus |
| STORNIERT | CANCELLED | Buchungsstatus |
| GESTARTET | STARTED | Fahrtstatus |
| AUSSTEHEND | PENDING | Zahlungsstatus |
| BESTAETIGT | CONFIRMED | Zahlungsstatus |

## Payment Types
| Deutsch | Englisch | Kontext |
|---------|----------|---------|
| BAR | CASH | Zahlungsart |
| TANKEN | FUEL | Zahlungsart |
| PFLEGE | CARE | Zahlungsart |
| WARTUNG | MAINTENANCE | Zahlungsart |
| REPARATUR | REPAIR | Zahlungsart |
