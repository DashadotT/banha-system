/**
 * Axis helpers for trend charts. They only choose WHERE the axes sit; the
 * plotted values are always the real recorded measurements.
 */

function niceStep(rawStep: number): number {
  const exp = Math.floor(Math.log10(rawStep));
  const base = 10 ** exp;
  const f = rawStep / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

/**
 * Y domain fitted to the data with ~10% headroom. `minSpan` stops tiny sensor
 * jitter from being blown up to fill the whole chart (which would exaggerate
 * it): a series that varies less than `minSpan` is shown centred in a
 * `minSpan`-tall window.
 */
export function fitDomain(values: number[], minSpan: number): { domain: [number, number]; ticks: number[]; step: number } {
  if (values.length === 0) return { domain: [0, 1], ticks: [0, 1], step: 1 };
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  const pad = (hi - lo) * 0.1;
  lo -= pad;
  hi += pad;
  const step = niceStep((hi - lo) / 4);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= end + step / 1000; t += step) ticks.push(Number(t.toFixed(6)));
  return { domain: [start, end], ticks, step };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TIME_STEPS = [
  MINUTE, 2 * MINUTE, 5 * MINUTE, 10 * MINUTE, 15 * MINUTE, 30 * MINUTE,
  HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 7 * DAY,
];

/** Evenly spaced ticks on round clock times (e.g. 9:00, 9:15, 9:30). */
export function buildTimeTicks(minMs: number, maxMs: number, target = 6): number[] {
  const span = Math.max(maxMs - minMs, MINUTE);
  const step = TIME_STEPS.find((s) => span / s <= target) ?? 7 * DAY;
  const tzOffset = new Date(minMs).getTimezoneOffset() * MINUTE;
  const first = Math.ceil((minMs - tzOffset) / step) * step + tzOffset;
  const ticks: number[] = [];
  for (let t = first; t <= maxMs; t += step) ticks.push(t);
  if (ticks.length < 2) return [minMs, maxMs];
  return ticks;
}
