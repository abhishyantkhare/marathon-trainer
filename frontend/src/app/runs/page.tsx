"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { api, Run } from "@/lib/api";
import { formatDistance, formatDuration, formatDate } from "@/lib/utils";

function RunsContent() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      const data = await api.getRuns(0, 100);
      setRuns(data.runs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);

    try {
      const result = await api.syncRuns();
      setSyncMessage(result.message);
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync runs");
    } finally {
      setSyncing(false);
    }
  };

  // Calculate stats
  const totalDistance = runs.reduce((sum, run) => sum + run.distance_meters, 0);
  const totalTime = runs.reduce(
    (sum, run) => sum + run.moving_time_seconds,
    0
  );
  const thisWeekRuns = runs.filter((run) => {
    const runDate = new Date(run.start_date);
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return runDate >= weekStart;
  });
  const thisWeekDistance = thisWeekRuns.reduce(
    (sum, run) => sum + run.distance_meters,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading runs..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Runs</h1>
            <p className="text-gray-600 mt-1">
              {total} total runs synced from Strava
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-strava-orange text-white rounded-lg hover:bg-strava-orange-dark transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {syncing ? (
              <>
                <LoadingSpinner size="sm" />
                Syncing...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.01 13.828h4.171" />
                </svg>
                Sync from Strava
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {syncMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {syncMessage}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Distance</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatDistance(totalDistance)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Time</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatDuration(totalTime)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">This Week</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatDistance(thisWeekDistance)}
            </p>
          </div>
        </div>

        {/* Runs List */}
        {runs.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pace
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">🏃</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {run.name || "Untitled Run"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(run.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatDistance(run.distance_meters)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatDuration(run.moving_time_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {run.average_pace || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <span className="text-6xl mb-6 block">🏃</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Runs Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Sync your running activities from Strava to track your training
              progress.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-6 py-3 bg-strava-orange text-white rounded-lg hover:bg-strava-orange-dark transition-colors disabled:opacity-50 text-lg font-semibold"
            >
              {syncing ? "Syncing..." : "Sync from Strava"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function RunsPage() {
  return (
    <ProtectedRoute>
      <RunsContent />
    </ProtectedRoute>
  );
}
