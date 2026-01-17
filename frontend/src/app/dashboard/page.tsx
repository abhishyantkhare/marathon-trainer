"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { api, Profile, TrainingPlan, Run } from "@/lib/api";
import {
  formatGoalTime,
  daysUntil,
  formatDate,
  formatDistance,
  getWorkoutColor,
  getWorkoutTypeName,
} from "@/lib/utils";

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileData = await api.getProfile();
        setProfile(profileData);

        // Try to get training plan (might not exist)
        try {
          const planData = await api.getTrainingPlan();
          setPlan(planData);
        } catch {
          // No plan yet, that's okay
        }

        // Get recent runs
        try {
          const runsData = await api.getRuns(0, 5);
          setRecentRuns(runsData.runs);
        } catch {
          // No runs yet
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      const newPlan = await api.generateTrainingPlan(plan !== null);
      setPlan(newPlan);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate training plan"
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  // Get current week's workouts
  const getCurrentWeek = () => {
    if (!plan?.plan_json?.weeks) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const week of plan.plan_json.weeks) {
      const weekStart = new Date(week.start_date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      if (today >= weekStart && today < weekEnd) {
        return week;
      }
    }
    // Return first week if no match found
    return plan.plan_json.weeks[0] || null;
  };

  const currentWeek = getCurrentWeek();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-marathon-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏁</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Days Until Race</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {daysUntil(profile.race_date)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-marathon-accent/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Goal Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatGoalTime(profile.goal_time_minutes)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-marathon-success/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Race Date</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDate(profile.race_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Week */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentWeek
                      ? `Week ${currentWeek.week_number}: ${currentWeek.focus}`
                      : "This Week's Training"}
                  </h2>
                  {!plan && (
                    <button
                      onClick={handleGeneratePlan}
                      disabled={generating}
                      className="px-4 py-2 bg-marathon-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {generating ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          Generate Plan
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {currentWeek ? (
                <div className="p-6">
                  <div className="grid gap-4">
                    {currentWeek.days.map((day, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-shrink-0 w-16 text-center">
                          <p className="text-sm font-medium text-gray-500">
                            {day.day.substring(0, 3)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {day.date.split("-").slice(1).join("/")}
                          </p>
                        </div>
                        <div
                          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${getWorkoutColor(
                            day.workout_type
                          )}`}
                        >
                          {getWorkoutTypeName(day.workout_type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {day.description}
                          </p>
                          {day.pace && day.workout_type !== "rest" && (
                            <p className="text-xs text-gray-500">
                              Pace: {day.pace}
                            </p>
                          )}
                        </div>
                        {day.distance_km > 0 && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              {day.distance_km} km
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Weekly Total
                      </span>
                      <span className="text-lg font-bold text-marathon-primary">
                        {currentWeek.total_distance_km} km
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <span className="text-5xl mb-4 block">📋</span>
                  <p className="text-gray-600 mb-4">
                    No training plan yet. Generate one to get started!
                  </p>
                  <button
                    onClick={handleGeneratePlan}
                    disabled={generating}
                    className="px-6 py-3 bg-marathon-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {generating ? "Generating..." : "Generate Training Plan"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href="/plan"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xl">📅</span>
                  <span className="text-sm font-medium text-gray-700">
                    View Full Plan
                  </span>
                </Link>
                <Link
                  href="/runs"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xl">🏃</span>
                  <span className="text-sm font-medium text-gray-700">
                    View All Runs
                  </span>
                </Link>
                {plan && (
                  <button
                    onClick={handleGeneratePlan}
                    disabled={generating}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xl">🔄</span>
                    <span className="text-sm font-medium text-gray-700">
                      Regenerate Plan
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Recent Runs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Recent Runs</h3>
                <Link
                  href="/runs"
                  className="text-sm text-marathon-primary hover:underline"
                >
                  See all
                </Link>
              </div>
              {recentRuns.length > 0 ? (
                <div className="space-y-3">
                  {recentRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex justify-between items-center p-3 rounded-lg bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                          {run.name || "Untitled Run"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(run.start_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatDistance(run.distance_meters)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {run.average_pace}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No runs synced yet. Go to Runs to sync from Strava.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
