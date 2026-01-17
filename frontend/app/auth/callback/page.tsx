'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AuthCallback() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user, refresh } = useAuth();

  useEffect(() => {
    // Refresh auth state after callback
    refresh();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user?.has_profile) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } else if (!isLoading && !isAuthenticated) {
      // Auth failed, redirect to home
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" message="Completing sign in..." />
    </div>
  );
}
