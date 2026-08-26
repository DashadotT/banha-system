// ---------------------------------------------------------------------------
// BANHA date & time formatting utilities
// IMPORTANT: All displayed times must use 12-hour format (e.g. 9:05 AM).
// Never format time using 24-hour notation anywhere in the UI.
// ---------------------------------------------------------------------------

/**
 * Formats a date/time string or Date as "August 21, 2026" (no time).
 */
export function formatDate(value: string | Date | null | undefined): string {
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
 * Formats a date/time string or Date as "Aug 21, 2026" (short month, no time).
 */
export function formatDateShort(value: string | Date | null | undefined): string {
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
 * Formats the time portion only, always in 12-hour format, e.g. "9:05 AM".
 */
export function formatTime(value: string | Date | null | undefined): string {
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
 * Formats a full date + time, e.g. "August 21, 2026, 9:05 AM".
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/**
 * Formats a short date + time, e.g. "Aug 21, 2026, 9:05 AM".
 */
export function formatDateTimeShort(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return `${formatDateShort(value)}, ${formatTime(value)}`;
}

/**
 * Formats a duration in seconds as HH:MM:SS, e.g. "00:15:42".
 */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) {
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
 * Returns the elapsed duration in seconds between a start ISO string and now
 * (or an optional end ISO string for completed recordings).
 */
export function elapsedSeconds(startedAt: string, endedAt?: string | null): number {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * Relative "time ago" string for last-updated indicators, e.g. "12s ago".
 */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return '—';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/**
 * Formats a Date as an ISO date (yyyy-MM-dd) for <input type="date"> fields.
 */
export function toInputDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
