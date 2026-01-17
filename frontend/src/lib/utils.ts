/**
 * Format distance in meters to km
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format minutes to HH:MM:SS
 */
export function formatGoalTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}:00`;
}

/**
 * Parse HH:MM:SS to total minutes
 */
export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Get workout type color
 */
export function getWorkoutColor(type: string): string {
  const colors: Record<string, string> = {
    easy_run: "bg-green-100 text-green-800",
    tempo: "bg-orange-100 text-orange-800",
    long_run: "bg-blue-100 text-blue-800",
    intervals: "bg-red-100 text-red-800",
    rest: "bg-gray-100 text-gray-800",
    cross_training: "bg-purple-100 text-purple-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
}

/**
 * Get workout type display name
 */
export function getWorkoutTypeName(type: string): string {
  const names: Record<string, string> = {
    easy_run: "Easy Run",
    tempo: "Tempo Run",
    long_run: "Long Run",
    intervals: "Intervals",
    rest: "Rest",
    cross_training: "Cross Training",
  };
  return names[type] || type;
}

/**
 * Calculate days until a date
 */
export function daysUntil(date: string | Date): number {
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
