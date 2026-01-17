'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from './Navbar';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export default function ProtectedRoute({ children, requireProfile = true }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (requireProfile && user && !user.has_profile) {
        router.push('/onboarding');
      }
    }
  }, [isLoading, isAuthenticated, user, requireProfile, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireProfile && user && !user.has_profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={logout} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
