import { getNoiseLevel, getNoiseStatus, getTemperatureLevel, getTemperatureStatus } from '../../utils/calculations';
import type { EnvLevel } from '../../utils/calculations';

type Metric = 'temperature' | 'noise';

const LEVEL_FN: Record<Metric, (v: number | null | undefined) => EnvLevel> = {
  temperature: getTemperatureLevel,
  noise: getNoiseLevel,
};

const LABEL_FN = {
  temperature: getTemperatureStatus,
  noise: getNoiseStatus,
};

const DOT_CLASSES: Record<EnvLevel, string> = {
  good: 'bg-emerald-500',
  fair: 'bg-amber-500',
  poor: 'bg-rose-500',
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
  const level = LEVEL_FN[metric](value);
  return (
    <span className="inline-flex items-center gap-1.5" title={`${LABEL_FN[metric](value)} range`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[level]}`} />
      <span className="mono-num">
        {value.toFixed(decimals)} {unit}
      </span>
    </span>
  );
}
