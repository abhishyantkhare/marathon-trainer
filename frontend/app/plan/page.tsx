'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { trainingPlanApi, TrainingPlanResponse, TrainingWeek, ApiError } from '@/lib/api';

export default function PlanPage() {
  const [plan, setPlan] = useState<TrainingPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  const fetchPlan = async () => {
    try {
      const data = await trainingPlanApi.get();
      setPlan(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPlan(null);
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to load training plan');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const generatePlan = async (regenerate: boolean = false) => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await trainingPlanApi.generate(regenerate);
      setPlan(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate training plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleWeek = (weekNumber: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekNumber)) {
      newExpanded.delete(weekNumber);
    } else {
      newExpanded.add(weekNumber);
    }
    setExpandedWeeks(newExpanded);
  };

  const expandAll = () => {
    if (plan) {
      setExpandedWeeks(new Set(plan.plan.weeks.map((w) => w.week_number)));
    }
  };

  const collapseAll = () => {
    setExpandedWeeks(new Set());
  };

  const getWorkoutTypeColor = (type: string) => {
    switch (type) {
      case 'easy_run':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'tempo':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'long_run':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'intervals':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'rest':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'cross_training':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getWorkoutTypeLabel = (type: string) => {
    switch (type) {
      case 'easy_run':
        return 'Easy Run';
      case 'tempo':
        return 'Tempo';
      case 'long_run':
        return 'Long Run';
      case 'intervals':
        return 'Intervals';
      case 'rest':
        return 'Rest';
      case 'cross_training':
        return 'Cross Training';
      default:
        return type.replace('_', ' ');
    }
  };

  return (
    <ProtectedRoute>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" message="Loading training plan..." />
        </div>
      ) : error && !plan ? (
        <div className="max-w-2xl mx-auto">
          <ErrorMessage message={error} onRetry={fetchPlan} />
        </div>
      ) : !plan ? (
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Training Plan Yet</h1>
          <p className="text-gray-600 mb-8">
            Generate your personalized AI-powered marathon training plan.
          </p>
          <button
            onClick={() => generatePlan(false)}
            disabled={isGenerating}
            className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Generating plan...</span>
              </>
            ) : (
              'Generate Training Plan'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{plan.plan.race_name} Training Plan</h1>
              <p className="text-gray-600">
                {plan.plan.total_weeks} weeks • Goal: {plan.plan.goal_time} • Race: {format(parseISO(plan.plan.race_date), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => generatePlan(true)}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? 'Regenerating...' : 'Regenerate Plan'}
              </button>
            </div>
          </div>

          {error && (
            <ErrorMessage message={error} />
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Expand all
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Collapse all
            </button>
          </div>

          {/* Weekly Plans */}
          <div className="space-y-4">
            {plan.plan.weeks.map((week: TrainingWeek) => (
              <div
                key={week.week_number}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleWeek(week.week_number)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-gray-900">
                      Week {week.week_number}
                    </span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                      {week.theme}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {format(parseISO(week.start_date), 'MMM d')} - {format(parseISO(week.end_date), 'MMM d')}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {week.total_distance_km} km
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedWeeks.has(week.week_number) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedWeeks.has(week.week_number) && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <div className="grid gap-3 mt-4">
                      {week.workouts.map((workout, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-4 rounded-lg border ${getWorkoutTypeColor(workout.workout_type)}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900 w-20">{workout.day}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getWorkoutTypeColor(workout.workout_type)}`}>
                                {getWorkoutTypeLabel(workout.workout_type)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{workout.description}</p>
                            {workout.notes && (
                              <p className="mt-1 text-xs text-gray-500 italic">{workout.notes}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            {workout.distance_km && (
                              <div className="font-semibold text-gray-900">
                                {workout.distance_km} km
                              </div>
                            )}
                            {workout.pace_target && (
                              <div className="text-sm text-gray-600">
                                {workout.pace_target}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Plan Notes */}
          {plan.plan.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Training Notes</h3>
              <p className="text-blue-800">{plan.plan.notes}</p>
            </div>
          )}

          {/* Plan Metadata */}
          <div className="text-sm text-gray-500 text-center">
            Plan generated on {format(parseISO(plan.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
