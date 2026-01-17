"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingSpinner from "@/components/LoadingSpinner";
import { parseTimeToMinutes } from "@/lib/utils";

function OnboardingForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [raceDate, setRaceDate] = useState("");
  const [goalTime, setGoalTime] = useState("4:00:00");
  const [fitnessLevel, setFitnessLevel] = useState<
    "beginner" | "intermediate" | "advanced"
  >("intermediate");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const goalTimeMinutes = parseTimeToMinutes(goalTime);

      if (goalTimeMinutes < 120 || goalTimeMinutes > 420) {
        throw new Error(
          "Goal time should be between 2:00:00 and 7:00:00"
        );
      }

      const selectedDate = new Date(raceDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        throw new Error("Race date must be in the future");
      }

      await api.createProfile({
        race_date: new Date(raceDate).toISOString(),
        goal_time_minutes: goalTimeMinutes,
        fitness_level: fitnessLevel,
      });

      await refreshUser();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  // Calculate min date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="text-5xl">🏃</span>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
            Set Your Marathon Goal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Tell us about your race and we&apos;ll create a personalized training
            plan.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="raceDate"
                className="block text-sm font-medium text-gray-700"
              >
                Race Date
              </label>
              <div className="mt-1">
                <input
                  id="raceDate"
                  name="raceDate"
                  type="date"
                  required
                  min={minDateStr}
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-marathon-primary focus:border-marathon-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="goalTime"
                className="block text-sm font-medium text-gray-700"
              >
                Goal Finish Time (HH:MM:SS)
              </label>
              <div className="mt-1">
                <input
                  id="goalTime"
                  name="goalTime"
                  type="text"
                  required
                  pattern="\d{1,2}:\d{2}:\d{2}"
                  placeholder="4:00:00"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-marathon-primary focus:border-marathon-primary sm:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Format: H:MM:SS (e.g., 3:30:00 for 3 hours 30 minutes)
              </p>
            </div>

            <div>
              <label
                htmlFor="fitnessLevel"
                className="block text-sm font-medium text-gray-700"
              >
                Current Fitness Level
              </label>
              <div className="mt-2 space-y-2">
                {[
                  {
                    value: "beginner",
                    label: "Beginner",
                    description: "New to running or first marathon",
                  },
                  {
                    value: "intermediate",
                    label: "Intermediate",
                    description: "Completed a marathon or run regularly",
                  },
                  {
                    value: "advanced",
                    label: "Advanced",
                    description: "Experienced marathoner with serious goals",
                  },
                ].map((level) => (
                  <label
                    key={level.value}
                    className={`relative flex cursor-pointer rounded-lg border p-4 ${
                      fitnessLevel === level.value
                        ? "border-marathon-primary bg-marathon-primary/5"
                        : "border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fitnessLevel"
                      value={level.value}
                      checked={fitnessLevel === level.value}
                      onChange={(e) =>
                        setFitnessLevel(
                          e.target.value as
                            | "beginner"
                            | "intermediate"
                            | "advanced"
                        )
                      }
                      className="sr-only"
                    />
                    <div className="flex flex-1 flex-col">
                      <span className="block text-sm font-medium text-gray-900">
                        {level.label}
                      </span>
                      <span className="mt-1 text-xs text-gray-500">
                        {level.description}
                      </span>
                    </div>
                    {fitnessLevel === level.value && (
                      <div className="text-marathon-primary">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-marathon-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marathon-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  "Create My Training Plan"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute requireProfile={false}>
      <OnboardingForm />
    </ProtectedRoute>
  );
}
