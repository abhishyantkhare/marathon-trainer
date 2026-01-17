import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  fitness_level: "beginner" | "intermediate" | "advanced";
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

export interface RunsResponse {
  runs: Run[];
  total: number;
}

export interface DayWorkout {
  day: string;
  date: string;
  workout_type: string;
  description: string;
  distance_km: number;
  pace: string;
  duration_minutes: number;
  notes: string;
}

export interface WeekPlan {
  week_number: number;
  start_date: string;
  focus: string;
  total_distance_km: number;
  days: DayWorkout[];
}

export interface TrainingPlanData {
  summary: {
    total_weeks: number;
    goal_time: string;
    fitness_level: string;
    race_date: string;
    pace_targets: {
      goal_pace: string;
      easy_pace: string;
      tempo_pace: string;
      interval_pace: string;
    };
  };
  weeks: WeekPlan[];
}

export interface TrainingPlan {
  id: number;
  plan_json: TrainingPlanData;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private getToken(): string | null {
    return Cookies.get("access_token") || null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        Cookies.remove("access_token");
        window.location.href = "/";
        throw new Error("Unauthorized");
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  getStravaLoginUrl(): string {
    return `${API_BASE_URL}/auth/strava`;
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  // Profile
  async getProfile(): Promise<Profile> {
    return this.request<Profile>("/api/profile");
  }

  async createProfile(data: {
    race_date: string;
    goal_time_minutes: number;
    fitness_level: "beginner" | "intermediate" | "advanced";
  }): Promise<Profile> {
    return this.request<Profile>("/api/profile", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Runs
  async getRuns(skip = 0, limit = 50): Promise<RunsResponse> {
    return this.request<RunsResponse>(`/api/runs?skip=${skip}&limit=${limit}`);
  }

  async syncRuns(): Promise<{ synced_count: number; message: string }> {
    return this.request("/api/runs/sync", {
      method: "POST",
    });
  }

  // Training Plan
  async getTrainingPlan(): Promise<TrainingPlan> {
    return this.request<TrainingPlan>("/api/training-plan");
  }

  async generateTrainingPlan(regenerate = false): Promise<TrainingPlan> {
    return this.request<TrainingPlan>("/api/training-plan/generate", {
      method: "POST",
      body: JSON.stringify({ regenerate }),
    });
  }
}

export const api = new ApiClient();
