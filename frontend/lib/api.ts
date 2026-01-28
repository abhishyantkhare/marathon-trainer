/**
 * Get the API base URL, using preview backend URL in preview deployments.
 * Falls back to NEXT_PUBLIC_API_URL for staging/prod or localhost for dev.
 */
function getApiBaseUrl(): string {
  const isPreview = process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV === "preview";
  if (isPreview && process.env.NEXT_PUBLIC_PREVIEW_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_PREVIEW_BACKEND_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

const API_BASE_URL = getApiBaseUrl();

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Include cookies for JWT auth
  });

  if (!response.ok) {
    if (response.status === 401 && requireAuth) {
      // Redirect to login on auth failure
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(errorData.detail || 'Request failed', response.status);
  }

  return response.json();
}

// Auth API
export const authApi = {
  getMe: () => fetchApi<User>('/auth/me', { requireAuth: false }),
  logout: () => fetchApi<{ message: string }>('/auth/logout', { method: 'POST' }),
  getStravaAuthUrl: () => `${API_BASE_URL}/auth/strava`,
};

// Profile API
export const profileApi = {
  get: () => fetchApi<Profile>('/api/profile'),
  create: (data: ProfileCreate) =>
    fetchApi<Profile>('/api/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Runs API
export const runsApi = {
  getAll: (limit = 50, offset = 0) =>
    fetchApi<RunsListResponse>(`/api/runs?limit=${limit}&offset=${offset}`),
  sync: () =>
    fetchApi<SyncResponse>('/api/runs/sync', { method: 'POST' }),
};

// Training Plan API
export const trainingPlanApi = {
  get: () => fetchApi<TrainingPlanResponse>('/api/training-plan'),
  generate: (regenerate = false) =>
    fetchApi<TrainingPlanResponse>('/api/training-plan/generate', {
      method: 'POST',
      body: JSON.stringify({ regenerate }),
    }),
};

// Types
export interface User {
  id: number;
  strava_id: number;
  email: string | null;
  name: string | null;
  profile_picture: string | null;
  created_at: string;
  has_profile: boolean;
}

export interface Profile {
  id: number;
  race_date: string;
  goal_time_minutes: number;
  fitness_level: 'beginner' | 'intermediate' | 'advanced';
}

export interface ProfileCreate {
  race_date: string;
  goal_time_minutes: number;
  fitness_level: 'beginner' | 'intermediate' | 'advanced';
}

export interface Run {
  id: number;
  strava_activity_id: number;
  name: string | null;
  distance_meters: number;
  moving_time_seconds: number;
  start_date: string;
  average_pace: string | null;
  type: string | null;
}

export interface RunsListResponse {
  runs: Run[];
  total: number;
}

export interface SyncResponse {
  synced_count: number;
  message: string;
}

export interface WorkoutDay {
  day: string;
  workout_type: string;
  description: string;
  distance_km: number | null;
  pace_target: string | null;
  notes: string | null;
}

export interface TrainingWeek {
  week_number: number;
  start_date: string;
  end_date: string;
  theme: string;
  total_distance_km: number;
  workouts: WorkoutDay[];
}

export interface TrainingPlanData {
  race_name: string;
  race_date: string;
  goal_time: string;
  total_weeks: number;
  weeks: TrainingWeek[];
  notes: string | null;
}

export interface TrainingPlanResponse {
  id: number;
  plan: TrainingPlanData;
  created_at: string;
  updated_at: string;
}
