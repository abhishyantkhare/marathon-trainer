'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { profileApi, trainingPlanApi, ApiError } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export default function Onboarding() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, refresh } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [raceDate, setRaceDate] = useState('');
  const [goalHours, setGoalHours] = useState('4');
  const [goalMinutes, setGoalMinutes] = useState('0');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('intermediate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setIsRedirecting(true);
      router.push('/');
    } else if (!authLoading && user?.has_profile) {
      setIsRedirecting(true);
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Set minimum date to tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 14); // At least 2 weeks out
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const goalTimeMinutes = parseInt(goalHours) * 60 + parseInt(goalMinutes);

      // Create profile
      await profileApi.create({
        race_date: new Date(raceDate).toISOString(),
        goal_time_minutes: goalTimeMinutes,
        fitness_level: fitnessLevel,
      });

      // Generate training plan
      await trainingPlanApi.generate();

      // Refresh user data and redirect
      refresh();
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  // Show loading with consistent background during auth check or redirect
  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <span className="text-5xl">🏃</span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Set Your Goal</h1>
          <p className="mt-2 text-gray-600">
            Tell us about your marathon and we&apos;ll create a personalized training plan.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Race Date */}
            <div>
              <label htmlFor="raceDate" className="block text-sm font-medium text-gray-700 mb-2">
                Race Date
              </label>
              <input
                type="date"
                id="raceDate"
                min={minDateStr}
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              />
            </div>

            {/* Goal Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goal Finish Time
              </label>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label htmlFor="goalHours" className="sr-only">Hours</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="goalHours"
                      min="2"
                      max="8"
                      value={goalHours}
                      onChange={(e) => setGoalHours(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    />
                    <span className="absolute right-4 top-3 text-gray-500">hours</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="goalMinutes" className="sr-only">Minutes</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="goalMinutes"
                      min="0"
                      max="59"
                      value={goalMinutes}
                      onChange={(e) => setGoalMinutes(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    />
                    <span className="absolute right-4 top-3 text-gray-500">min</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Your goal: {goalHours}:{goalMinutes.padStart(2, '0')}:00
              </p>
            </div>

            {/* Fitness Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Fitness Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['beginner', 'intermediate', 'advanced'] as FitnessLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFitnessLevel(level)}
                    className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-colors capitalize ${
                      fitnessLevel === level
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {fitnessLevel === 'beginner' && 'New to running or marathons'}
                {fitnessLevel === 'intermediate' && 'Completed a few races, running regularly'}
                {fitnessLevel === 'advanced' && 'Experienced runner with multiple marathons'}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !raceDate}
              className="w-full py-4 px-6 text-white font-semibold rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Generating your plan...</span>
                </>
              ) : (
                'Generate Training Plan'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
