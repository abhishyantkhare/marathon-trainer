'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { runsApi, Run, ApiError } from '@/lib/api';

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchRuns = async () => {
    try {
      const data = await runsApi.getAll(100, 0);
      setRuns(data.runs);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load runs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const syncRuns = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    setError(null);

    try {
      const result = await runsApi.sync();
      setSyncMessage(result.message);
      // Refresh runs list
      await fetchRuns();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to sync runs');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDistance = (meters: number) => {
    const miles = meters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const getTotalStats = () => {
    const totalDistance = runs.reduce((sum, run) => sum + run.distance_meters, 0);
    const totalTime = runs.reduce((sum, run) => sum + run.moving_time_seconds, 0);
    return {
      distance: formatDistance(totalDistance),
      time: formatTime(totalTime),
      count: runs.length,
    };
  };

  const stats = getTotalStats();

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Runs</h1>
            <p className="text-gray-600">
              All your synced runs from Strava
            </p>
          </div>
          <button
            onClick={syncRuns}
            disabled={isSyncing}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
          >
            {isSyncing ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync from Strava
              </>
            )}
          </button>
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{syncMessage}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <ErrorMessage message={error} onRetry={fetchRuns} />
        )}

        {/* Stats */}
        {!isLoading && runs.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
              <div className="text-sm text-gray-500">Total Runs</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.distance}</div>
              <div className="text-sm text-gray-500">Total Distance</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.time}</div>
              <div className="text-sm text-gray-500">Total Time</div>
            </div>
          </div>
        )}

        {/* Runs List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" message="Loading runs..." />
          </div>
        ) : runs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">🏃</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Runs Yet</h2>
            <p className="text-gray-600 mb-6">
              Sync your runs from Strava to see them here.
            </p>
            <button
              onClick={syncRuns}
              disabled={isSyncing}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
            >
              Sync from Strava
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distance
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pace
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(parseISO(run.start_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {run.name || 'Run'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {run.type || 'Run'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatDistance(run.distance_meters)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {formatTime(run.moving_time_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {run.average_pace || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Strava Link */}
        <div className="text-center text-sm text-gray-500">
          <a
            href="https://www.strava.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-orange-600 hover:text-orange-700"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" />
              <path d="M10.293 13.828l-2.61-5.172h3.728l2.611 5.172h-3.729z" opacity="0.6" />
              <path d="M7.683 8.656L4.5 2h3.728l3.183 6.656H7.683z" />
            </svg>
            View on Strava
          </a>
        </div>
      </div>
    </ProtectedRoute>
  );
}
