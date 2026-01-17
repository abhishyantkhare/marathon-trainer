'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, differenceInDays, parseISO, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { profileApi, trainingPlanApi, runsApi, Profile, TrainingPlanResponse, TrainingWeek, Run, ApiError } from '@/lib/api';

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<TrainingPlanResponse | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [currentWeek, setCurrentWeek] = useState<TrainingWeek | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, planData, runsData] = await Promise.all([
          profileApi.get(),
          trainingPlanApi.get().catch(() => null),
          runsApi.getAll(5, 0),
        ]);

        setProfile(profileData);
        setPlan(planData);
        setRecentRuns(runsData.runs);

        // Find current week
        if (planData) {
          const today = new Date();
          const weekStart = startOfWeek(today, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

          const current = planData.plan.weeks.find((week) => {
            const wStart = parseISO(week.start_date);
            const wEnd = parseISO(week.end_date);
            return isWithinInterval(today, { start: wStart, end: wEnd });
          });

          setCurrentWeek(current || planData.plan.weeks[0]);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load dashboard data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getWorkoutTypeColor = (type: string) => {
    switch (type) {
      case 'easy_run':
        return 'bg-green-100 text-green-800';
      case 'tempo':
        return 'bg-yellow-100 text-yellow-800';
      case 'long_run':
        return 'bg-blue-100 text-blue-800';
      case 'intervals':
        return 'bg-red-100 text-red-800';
      case 'rest':
        return 'bg-gray-100 text-gray-800';
      case 'cross_training':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" message="Loading dashboard..." />
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      ) : (
        <div className="space-y-6">
          {/* Header Stats */}
          {profile && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Race Day</div>
                <div className="text-2xl font-bold text-gray-900">
                  {format(parseISO(profile.race_date), 'MMM d, yyyy')}
                </div>
                <div className="text-sm text-orange-600 mt-1">
                  {differenceInDays(parseISO(profile.race_date), new Date())} days to go
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Goal Time</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.floor(profile.goal_time_minutes / 60)}:{String(profile.goal_time_minutes % 60).padStart(2, '0')}:00
                </div>
                <div className="text-sm text-gray-500 mt-1 capitalize">
                  {profile.fitness_level} level
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Current Week</div>
                <div className="text-2xl font-bold text-gray-900">
                  Week {currentWeek?.week_number || 1}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {currentWeek?.theme || 'Training'}
                </div>
              </div>
            </div>
          )}

          {/* Current Week's Workouts */}
          {currentWeek && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">This Week&apos;s Workouts</h2>
                <Link
                  href="/plan"
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  View full plan →
                </Link>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {currentWeek.workouts.map((workout, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-3 text-center"
                  >
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      {workout.day.slice(0, 3)}
                    </div>
                    <div
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getWorkoutTypeColor(workout.workout_type)}`}
                    >
                      {workout.workout_type === 'rest' ? 'Rest' : workout.workout_type.replace('_', ' ')}
                    </div>
                    {workout.distance_km && (
                      <div className="mt-2 text-sm font-semibold text-gray-900">
                        {workout.distance_km} km
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Weekly total: <span className="font-semibold">{currentWeek.total_distance_km} km</span>
              </div>
            </div>
          )}

          {/* Recent Runs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Runs</h2>
              <Link
                href="/runs"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View all runs →
              </Link>
            </div>

            {recentRuns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No runs synced yet.</p>
                <Link
                  href="/runs"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sync your runs from Strava
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{run.name || 'Run'}</div>
                      <div className="text-sm text-gray-500">
                        {format(parseISO(run.start_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatDistance(run.distance_meters)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(run.moving_time_seconds)} • {run.average_pace}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* No Plan State */}
          {!plan && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                No Training Plan Generated
              </h3>
              <p className="text-orange-700 mb-4">
                Generate your personalized AI training plan to get started.
              </p>
              <Link
                href="/plan"
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Generate Plan
              </Link>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
