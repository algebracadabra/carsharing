import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navigation/navbar';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Gülstorf shares - Gemeinschaftliches Fahrzeugteilen',
  description: 'Plattform für gemeinschaftliches CarSharing mit Fahrzeugverwaltung, Buchungen und Abrechnung',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gülstorf shares',
  },
  openGraph: {
    title: 'Gülstorf shares',
    description: 'Gemeinschaftliches Fahrzeugteilen mit Buchungen, Fahrten und Abrechnung',
    images: ['/og-image.svg'],
    type: 'website',
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gülstorf shares',
    description: 'Gemeinschaftliches Fahrzeugteilen',
    images: ['/og-image.svg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
