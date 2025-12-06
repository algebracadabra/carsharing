import { ArrowLeft, Calculator, TrendingDown, Clock, Route, Euro, Info } from 'lucide-react';
import Link from 'next/link';

export default function WertverlustHilfePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/fahrzeuge"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Zurück zu Fahrzeugen
      </Link>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-3 rounded-lg">
            <Calculator className="w-8 h-8 text-purple-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wertverlust-Berechnung</h1>
            <p className="text-gray-600">So wird der Wertverlust Ihres Fahrzeugs berechnet</p>
          </div>
        </div>

        {/* Einleitung */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-blue-800">
              Der Wertverlust beschreibt, wie viel ein Fahrzeug über die Zeit an Wert verliert. 
              Diese Berechnung hilft dabei, die tatsächlichen Kosten pro Kilometer oder Monat 
              zu verstehen und faire Nutzungspauschalen festzulegen.
            </p>
          </div>
        </div>

        {/* Eingabewerte */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Euro className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            Benötigte Eingabewerte
          </h2>
          <div className="space-y-4">
            <div className="border-l-4 border-emerald-500 pl-4">
              <h3 className="font-semibold text-gray-900">Restwert</h3>
              <p className="text-sm text-gray-600">
                Der aktuelle geschätzte Marktwert des Fahrzeugs in Euro. 
                Dieser Wert kann z.B. über Gebrauchtwagen-Portale ermittelt werden.
              </p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <h3 className="font-semibold text-gray-900">Baujahr</h3>
              <p className="text-sm text-gray-600">
                Das Jahr, in dem das Fahrzeug hergestellt wurde. 
                Daraus wird das aktuelle Alter berechnet.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900">Geschätzte km/Jahr</h3>
              <p className="text-sm text-gray-600">
                Die erwartete jährliche Fahrleistung ab jetzt. 
                Ein typischer Wert liegt zwischen 10.000 und 20.000 km pro Jahr.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-gray-900">Erwartete km (End of Life)</h3>
              <p className="text-sm text-gray-600">
                Die Gesamtlaufleistung, bei der das Fahrzeug wirtschaftlich am Ende ist. 
                Typische Werte: 150.000–300.000 km je nach Fahrzeugtyp.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-gray-900">Erwartetes Alter (End of Life)</h3>
              <p className="text-sm text-gray-600">
                Das maximale Alter in Jahren, bis zu dem das Fahrzeug wirtschaftlich genutzt werden soll. 
                Typische Werte: 10–20 Jahre.
              </p>
            </div>
          </div>
        </section>

        {/* Berechnungslogik */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" aria-hidden="true" />
            Berechnungslogik
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Restlebensdauer ermitteln</h3>
              <p className="text-sm text-gray-600 mb-2">
                Die Restlebensdauer wird durch zwei Faktoren begrenzt:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-4">
                <li><strong>Nach Alter:</strong> Erwartetes Alter − Aktuelles Alter</li>
                <li><strong>Nach Kilometern:</strong> (Erwartete km − Aktueller km) ÷ Geschätzte km/Jahr</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">
                Der <strong>kleinere Wert</strong> bestimmt die effektive Restlebensdauer, 
                da das Fahrzeug durch das zuerst erreichte Limit begrenzt wird.
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">2. Wertverlust berechnen</h3>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-purple-600" aria-hidden="true" />
                    <span className="font-medium">Jährlicher Wertverlust</span>
                    <span className="text-gray-400">=</span>
                    <span className="text-sm text-gray-600">Restwert ÷ Restlebensdauer (Jahre)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" aria-hidden="true" />
                    <span className="font-medium">Monatlicher Wertverlust</span>
                    <span className="text-gray-400">=</span>
                    <span className="text-sm text-gray-600">Jährlicher Wertverlust ÷ 12</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-purple-600" aria-hidden="true" />
                    <span className="font-medium">Wertverlust pro km</span>
                    <span className="text-gray-400">=</span>
                    <span className="text-sm text-gray-600">Restwert ÷ Erwartete Restkilometer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Beispielrechnung */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Beispielrechnung</h2>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 mb-3">Beispiel: VW Golf, Baujahr 2018</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-600">Restwert:</span>
                <span className="font-medium ml-2">12.000 €</span>
              </div>
              <div>
                <span className="text-gray-600">Aktueller km-Stand:</span>
                <span className="font-medium ml-2">80.000 km</span>
              </div>
              <div>
                <span className="text-gray-600">Geschätzte km/Jahr:</span>
                <span className="font-medium ml-2">15.000 km</span>
              </div>
              <div>
                <span className="text-gray-600">Erwartete km (EoL):</span>
                <span className="font-medium ml-2">200.000 km</span>
              </div>
              <div>
                <span className="text-gray-600">Erwartetes Alter (EoL):</span>
                <span className="font-medium ml-2">15 Jahre</span>
              </div>
              <div>
                <span className="text-gray-600">Aktuelles Jahr:</span>
                <span className="font-medium ml-2">2025</span>
              </div>
            </div>

            <div className="border-t border-purple-200 pt-4 space-y-2 text-sm">
              <p><strong>Restlebensdauer nach Alter:</strong> 15 − 7 = <strong>8 Jahre</strong></p>
              <p><strong>Restlebensdauer nach km:</strong> (200.000 − 80.000) ÷ 15.000 = <strong>8 Jahre</strong></p>
              <p><strong>Effektive Restlebensdauer:</strong> min(8, 8) = <strong>8 Jahre</strong></p>
            </div>

            <div className="border-t border-purple-200 pt-4 mt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-500">Jährlich</p>
                  <p className="text-lg font-bold text-purple-600">1.500 €</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-500">Monatlich</p>
                  <p className="text-lg font-bold text-purple-600">125 €</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-500">Pro km</p>
                  <p className="text-lg font-bold text-purple-600">0,10 €</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hinweise */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Wichtige Hinweise</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm text-amber-800">
                <strong>Lineare Abschreibung:</strong> Die Berechnung geht von einem gleichmäßigen 
                Wertverlust über die Restlebensdauer aus. In der Realität verlieren Fahrzeuge 
                in den ersten Jahren oft schneller an Wert.
              </div>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm text-blue-800">
                <strong>Regelmäßige Aktualisierung:</strong> Der Restwert sollte regelmäßig 
                (z.B. jährlich) aktualisiert werden, um eine realistische Berechnung zu gewährleisten.
              </div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <Info className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm text-green-800">
                <strong>Kilometerpauschale:</strong> Der Wertverlust pro km kann als Grundlage 
                für die Festlegung einer fairen Kilometerpauschale dienen, zusammen mit anderen 
                Kosten wie Versicherung, Steuern und Wartung.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
