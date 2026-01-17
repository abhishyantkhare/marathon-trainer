'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/lib/api';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/plan', label: 'Training Plan' },
    { href: '/runs', label: 'Runs' },
  ];

  const isActive = (href: string) => pathname === href;

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/dashboard"
              className="flex-shrink-0 flex items-center"
            >
              <span className="text-xl font-bold text-orange-600">🏃 Marathon Tracker</span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(link.href)
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {user.profile_picture && (
                <img
                  src={user.profile_picture}
                  alt={user.name || 'Profile'}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user.name || 'Athlete'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden pb-3 flex space-x-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 text-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive(link.href)
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
