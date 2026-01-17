"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { api, TrainingPlan } from "@/lib/api";
import {
  formatDate,
  getWorkoutColor,
  getWorkoutTypeName,
} from "@/lib/utils";

function PlanContent() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const planData = await api.getTrainingPlan();
        setPlan(planData);

        // Auto-expand current week
        if (planData?.plan_json?.weeks) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (const week of planData.plan_json.weeks) {
            const weekStart = new Date(week.start_date);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            if (today >= weekStart && today < weekEnd) {
              setExpandedWeek(week.week_number);
              break;
            }
          }
        }
      } catch {
        // No plan exists
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
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
        <LoadingSpinner size="lg" text="Loading training plan..." />
      </div>
    );
  }

  const isCurrentWeek = (weekNumber: number) => {
    if (!plan?.plan_json?.weeks) return false;
    const week = plan.plan_json.weeks.find((w) => w.week_number === weekNumber);
    if (!week) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(week.start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return today >= weekStart && today < weekEnd;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Training Plan</h1>
            {plan && (
              <p className="text-gray-600 mt-1">
                {plan.plan_json.summary.total_weeks} weeks to your{" "}
                {plan.plan_json.summary.goal_time} marathon
              </p>
            )}
          </div>
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
                <span>🔄</span>
                {plan ? "Regenerate" : "Generate Plan"}
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {plan ? (
          <div className="space-y-4">
            {/* Pace Targets Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Pace Targets
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Goal Pace</p>
                  <p className="font-bold text-marathon-primary">
                    {plan.plan_json.summary.pace_targets.goal_pace}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Easy Pace</p>
                  <p className="font-bold text-green-700">
                    {plan.plan_json.summary.pace_targets.easy_pace}
                  </p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Tempo Pace</p>
                  <p className="font-bold text-orange-700">
                    {plan.plan_json.summary.pace_targets.tempo_pace}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Interval Pace</p>
                  <p className="font-bold text-red-700">
                    {plan.plan_json.summary.pace_targets.interval_pace}
                  </p>
                </div>
              </div>
            </div>

            {/* Week by Week */}
            {plan.plan_json.weeks.map((week) => (
              <div
                key={week.week_number}
                className={`bg-white rounded-xl shadow-sm border ${
                  isCurrentWeek(week.week_number)
                    ? "border-marathon-primary ring-2 ring-marathon-primary/20"
                    : "border-gray-100"
                }`}
              >
                <button
                  onClick={() =>
                    setExpandedWeek(
                      expandedWeek === week.week_number
                        ? null
                        : week.week_number
                    )
                  }
                  className="w-full p-6 flex justify-between items-center text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                          isCurrentWeek(week.week_number)
                            ? "bg-marathon-primary text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {week.week_number}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        Week {week.week_number}: {week.focus}
                        {isCurrentWeek(week.week_number) && (
                          <span className="text-xs bg-marathon-primary text-white px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(week.start_date)} -{" "}
                        {week.total_distance_km} km total
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`w-6 h-6 text-gray-400 transition-transform ${
                      expandedWeek === week.week_number ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {expandedWeek === week.week_number && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="mt-4 space-y-3">
                      {week.days.map((day, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 rounded-lg bg-gray-50"
                        >
                          <div className="flex-shrink-0 w-20">
                            <p className="text-sm font-medium text-gray-700">
                              {day.day}
                            </p>
                            <p className="text-xs text-gray-400">{day.date}</p>
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
                              <p className="text-xs text-gray-500 mt-1">
                                Target pace: {day.pace}
                              </p>
                            )}
                            {day.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">
                                {day.notes}
                              </p>
                            )}
                          </div>
                          {day.distance_km > 0 && (
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {day.distance_km} km
                              </p>
                              {day.duration_minutes > 0 && (
                                <p className="text-xs text-gray-500">
                                  ~{day.duration_minutes} min
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <span className="text-6xl mb-6 block">📋</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Training Plan Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Generate an AI-powered training plan tailored to your goal time
              and fitness level.
            </p>
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="px-6 py-3 bg-marathon-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-lg font-semibold"
            >
              {generating ? "Generating..." : "Generate Training Plan"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PlanPage() {
  return (
    <ProtectedRoute>
      <PlanContent />
    </ProtectedRoute>
  );
}
