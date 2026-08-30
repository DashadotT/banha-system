import {
  getCO2Status,
  getNoiseStatus,
  getTemperatureStatus,
} from '../../utils/calculations';
import type { EnvironmentalStatus } from '../../types';

type Metric = 'co2' | 'temperature' | 'noise';

const STATUS_FN: Record<Metric, (v: number | null | undefined) => EnvironmentalStatus> = {
  co2: getCO2Status,
  temperature: getTemperatureStatus,
  noise: getNoiseStatus,
};

const DOT_CLASSES: Record<EnvironmentalStatus, string> = {
  Normal: 'bg-emerald-500',
  Moderate: 'bg-amber-500',
  Poor: 'bg-rose-500',
};

export function EnvValue({
  metric,
  value,
  unit,
  decimals = 1,
}: {
  metric: Metric;
  value: number | null | undefined;
  unit: string;
  decimals?: number;
}) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">—</span>;
  }
  const status = STATUS_FN[metric](value);
  return (
    <span className="inline-flex items-center gap-1.5" title={`${status} range`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[status]}`} />
      <span className="mono-num">
        {value.toFixed(decimals)} {unit}
      </span>
    </span>
  );
}
