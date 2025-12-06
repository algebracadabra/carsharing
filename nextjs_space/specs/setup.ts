/**
 * Jest Setup File
 * 
 * Wird vor jedem Test-File ausgeführt.
 * Hier können globale Mocks, Test-Utilities und Setup-Logik definiert werden.
 */

// Beispiel: Timeout für alle Tests erhöhen
jest.setTimeout(10000);

// Beispiel: Globale Mocks
// jest.mock('@/lib/db', () => ({
//   prisma: {
//     // Mock-Implementierungen
//   },
// }));

export {};
