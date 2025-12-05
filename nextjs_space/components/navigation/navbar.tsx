'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Car, LayoutDashboard, CarFront, Calendar, Route, Wallet, User, LogOut, Menu, X, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export function Navbar() {
  const { data: session, status } = useSession() || {};
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (session?.user) {
      loadProfileImage();
    }
  }, [session]);

  const loadProfileImage = async () => {
    try {
      const response = await fetch('/api/user/profile/image');
      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.imageUrl);
      }
    } catch (err) {
      console.error('Error loading profile image:', err);
    }
  };

  // Navigation für alle eingeloggten User sichtbar
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Fahrzeuge', href: '/fahrzeuge', icon: CarFront },
    { name: 'Buchungen', href: '/buchungen', icon: Calendar },
    { name: 'Fahrten', href: '/fahrten', icon: Route },
    { name: 'Abrechnung', href: '/abrechnung', icon: Wallet },
    ...(userRole === 'ADMIN' ? [{ name: 'Benutzer', href: '/usermanagement', icon: Users }] : []),
  ];

  if (status === 'loading') {
    return null;
  }

  if (!session) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Car className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                CarSharing
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navigation?.map?.((item) => {
                const Icon = item?.icon;
                const isActive = pathname === item?.href;
                return (
                  <Link
                    key={item?.name}
                    href={item?.href ?? '#'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
                    {item?.name}
                  </Link>
                );
              }) ?? null}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/profil"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
              aria-label="Profil"
            >
              {profileImage ? (
                <div className="w-6 h-6 rounded-full overflow-hidden">
                  <Image
                    src={profileImage}
                    alt="Profilbild"
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <User className="w-4 h-4" aria-hidden="true" />
              )}
              {session?.user?.name ?? 'Profil'}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-all"
              aria-label="Abmelden"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Abmelden
            </button>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menü öffnen"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-1">
            {navigation?.map?.((item) => {
              const Icon = item?.icon;
              const isActive = pathname === item?.href;
              return (
                <Link
                  key={item?.name}
                  href={item?.href ?? '#'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {Icon && <Icon className="w-5 h-5" aria-hidden="true" />}
                  {item?.name}
                </Link>
              );
            }) ?? null}
            <Link
              href="/profil"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
            >
              {profileImage ? (
                <div className="w-5 h-5 rounded-full overflow-hidden">
                  <Image
                    src={profileImage}
                    alt="Profilbild"
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <User className="w-5 h-5" aria-hidden="true" />
              )}
              Profil
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut({ callbackUrl: '/login' });
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
              Abmelden
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
