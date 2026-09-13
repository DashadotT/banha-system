// src/utils/dateTime.ts

// ---------------------------------------------------------------------------
// BANHA date & time formatting utilities
//
// IMPORTANT:
// - All displayed times use 12-hour format.
// - Recording duration is based on timestamps, not packet timing.
// - Completed recording duration uses started_at -> ended_at.
// - Live elapsed time can use a synchronized server-time baseline.
// - elapsedSeconds() is kept for compatibility with existing components.
// ---------------------------------------------------------------------------

/**
 * Formats a date/time string or Date as "August 21, 2026".
 */
export function formatDate(
  value: string | Date | null | undefined
): string {
  if (!value) return '—';

  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a date/time string or Date as "Aug 21, 2026".
 */
export function formatDateShort(
  value: string | Date | null | undefined
): string {
  if (!value) return '—';

  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats the time portion only, always in 12-hour format.
 *
 * Example:
 * "9:05 AM"
 */
export function formatTime(
  value: string | Date | null | undefined
): string {
  if (!value) return '—';

  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a full date + time.
 *
 * Example:
 * "August 21, 2026, 9:05 AM"
 */
export function formatDateTime(
  value: string | Date | null | undefined
): string {
  if (!value) return '—';

  return `${formatDate(value)}, ${formatTime(value)}`;
}

/**
 * Formats a short date + time.
 *
 * Example:
 * "Aug 21, 2026, 9:05 AM"
 */
export function formatDateTimeShort(
  value: string | Date | null | undefined
): string {
  if (!value) return '—';

  return `${formatDateShort(value)}, ${formatTime(value)}`;
}

/**
 * Formats a duration in seconds as HH:MM:SS.
 *
 * Example:
 * 942 seconds -> "00:15:42"
 */
export function formatDuration(
  totalSeconds: number | null | undefined
): string {
  if (
    totalSeconds === null ||
    totalSeconds === undefined ||
    Number.isNaN(totalSeconds)
  ) {
    return '00:00:00';
  }

  const seconds = Math.max(0, Math.floor(totalSeconds));

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

/**
 * Calculates duration between two timestamps.
 *
 * USE THIS FOR:
 * - Completed recordings
 * - Recorded Assessments
 * - Reports
 *
 * IMPORTANT:
 * Both timestamps should come from the same authoritative
 * server/database clock.
 *
 * Duration is NOT based on:
 * - sensor packet count
 * - LoRa packet timing
 * - number of readings
 */
export function durationBetween(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined
): number {
  if (!startedAt || !endedAt) return 0;

  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * Calculates elapsed recording time using the synchronized
 * server-time baseline.
 *
 * serverNowMs:
 *   Server/database time in milliseconds at the moment it
 *   was synchronized.
 *
 * performanceStartMs:
 *   performance.now() captured at the exact moment the
 *   server time was obtained.
 *
 * WHY THIS IS USED:
 *
 * We do NOT calculate live recording duration using:
 *
 *   Date.now() - started_at
 *
 * because Date.now() depends on the computer's wall clock.
 *
 * Instead:
 *
 *   1. Get authoritative server time.
 *   2. Record performance.now() at that same moment.
 *   3. Use performance.now() to measure elapsed time.
 *   4. Add that elapsed time to the server-time baseline.
 *
 * This makes the live timer independent of changes to the
 * computer's system clock while the dashboard is running.
 */
export function elapsedSecondsFromServer(
  startedAt: string,
  serverNowMs: number,
  performanceStartMs: number
): number {
  const start = new Date(startedAt).getTime();

  if (Number.isNaN(start)) {
    return 0;
  }

  // performance.now() is a monotonic clock in milliseconds.
  const elapsedSinceSyncMs =
    performance.now() - performanceStartMs;

  // Estimate the current server time without using Date.now().
  const currentServerTimeMs =
    serverNowMs + elapsedSinceSyncMs;

  return Math.max(
    0,
    Math.floor(
      (currentServerTimeMs - start) / 1000
    )
  );
}

/**
 * Calculates elapsed seconds from started_at until now,
 * or started_at until ended_at when ended_at exists.
 *
 * IMPORTANT:
 * This function is kept for compatibility with existing
 * components such as CurrentRecordingPanel.tsx.
 *
 * For the NEW BANHA live timer, prefer:
 *
 *   elapsedSecondsFromServer()
 *
 * For completed recordings, prefer:
 *
 *   durationBetween()
 *
 * This compatibility helper uses the browser wall clock
 * while a recording is active.
 */
export function elapsedSeconds(
  startedAt: string,
  endedAt?: string | null
): number {
  const start = new Date(startedAt).getTime();

  const end = endedAt
    ? new Date(endedAt).getTime()
    : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((end - start) / 1000)
  );
}

/**
 * Relative "time ago" string for last-updated indicators.
 *
 * NOTE:
 * This is a display helper only.
 * It does NOT determine recording duration.
 */
export function timeAgo(
  value: string | Date | null | undefined
): string {
  if (!value) return '—';

  const date = typeof value === 'string' ? new Date(value) : value;

  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(diffMs)) return '—';

  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'just now';

  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }

  const diffMin = Math.floor(diffSec / 60);

  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHr = Math.floor(diffMin / 60);

  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }

  const diffDay = Math.floor(diffHr / 24);

  return `${diffDay}d ago`;
}

/**
 * Formats a Date as an ISO date (yyyy-MM-dd)
 * for <input type="date"> fields.
 */
export function toInputDate(
  value: string | Date | null | undefined
): string {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
}