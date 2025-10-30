/**
 * Harvest API Utility Functions
 */

const SECONDS_PER_HOUR = 3600;

/**
 * Convert hours to seconds (for Harvest API)
 * @param hours - Number of hours
 * @returns Number of seconds
 * @example hoursToSeconds(35) // 126000
 */
export function hoursToSeconds(hours: number): number {
  return hours * SECONDS_PER_HOUR;
}

/**
 * Convert seconds to hours (from Harvest API)
 * @param seconds - Number of seconds
 * @returns Number of hours
 * @example secondsToHours(126000) // 35
 */
export function secondsToHours(seconds: number): number {
  return seconds / SECONDS_PER_HOUR;
}
