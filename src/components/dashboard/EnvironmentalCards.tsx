import { Thermometer, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, levelToTone } from '../common/Badge';
import {
  ENV_GAUGE,
  getNoiseLevel,
  getNoiseStatus,
  getTemperatureLevel,
  getTemperatureStatus,
  type EnvLevel,
} from '../../utils/calculations';

interface EnvironmentalCardsProps {
  temperature: number | null;
  noise: number | null;
}

const SEGMENT_COLORS: Record<EnvLevel, string> = {
  good: 'bg-emerald-400',
  fair: 'bg-amber-400',
  poor: 'bg-rose-400',
};

const VALUE_COLORS: Record<EnvLevel, string> = {
  good: 'text-emerald-700',
  fair: 'text-amber-700',
  poor: 'text-rose-700',
};

/** Colour-banded scale with a marker showing where the current reading sits. */
function RangeGauge({ metric, value }: { metric: 'temperature' | 'noise'; value: number | null }) {
  const { min, max, segments } = ENV_GAUGE[metric];
  const span = max - min;
  let from = min;
  const bands = segments.map((s) => {
    const width = ((s.to - from) / span) * 100;
    from = s.to;
    return { ...s, width };
  });
  const position = value === null ? null : Math.min(100, Math.max(0, ((value - min) / span) * 100));

  return (
    <div className="mt-4">
      <div className="relative">
        <div className="flex h-2 overflow-hidden rounded-full">
          {bands.map((b) => (
            <div key={b.to} className={SEGMENT_COLORS[b.level]} style={{ width: `${b.width}%` }} />
          ))}
        </div>
        {position !== null && (
          <span
            className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-primary ring-2 ring-white"
            style={{ left: `${position}%` }}
          />
        )}
      </div>
      <div className="relative mt-1.5 h-3.5 text-[10px] text-slate-400">
        {[min, ...segments.slice(0, -1).map((s) => s.to), max].map((tick, idx, all) => (
          <span
            key={tick}
            className="mono-num absolute"
            style={{
              left: `${((tick - min) / span) * 100}%`,
              transform: idx === 0 ? 'none' : idx === all.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  icon,
  value,
  unit,
  level,
  status,
  metric,
}: {
  label: string;
  icon: ReactNode;
  value: number | null;
  unit: string;
  level: EnvLevel;
  status: string;
  metric: 'temperature' | 'noise';
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-50 text-primary">{icon}</span>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        </div>
        {value !== null && <Badge tone={levelToTone(level)}>{status}</Badge>}
      </div>
      <p className={`mono-num mt-4 text-4xl font-bold leading-none ${value !== null ? VALUE_COLORS[level] : 'text-slate-300'}`}>
        {value !== null ? value.toFixed(1) : '—'}
        <span className="ml-1.5 text-base font-medium text-slate-400">{unit}</span>
      </p>
      <RangeGauge metric={metric} value={value} />
    </div>
  );
}

export function EnvironmentalCards({ temperature, noise }: EnvironmentalCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MetricTile
        label="Temperature"
        icon={<Thermometer size={16} />}
        value={temperature}
        unit="°C"
        level={getTemperatureLevel(temperature)}
        status={getTemperatureStatus(temperature)}
        metric="temperature"
      />
      <MetricTile
        label="Noise"
        icon={<Volume2 size={16} />}
        value={noise}
        unit="dBA"
        level={getNoiseLevel(noise)}
        status={getNoiseStatus(noise)}
        metric="noise"
      />
    </div>
  );
}
