import { Badge, statusToTone } from '../common/Badge';
import { getCO2Status, getNoiseStatus, getTemperatureStatus } from '../../utils/calculations';

interface EnvironmentalCardsProps {
  co2: number | null;
  temperature: number | null;
  noise: number | null;
}

export function EnvironmentalCards({ co2, temperature, noise }: EnvironmentalCardsProps) {
  const items = [
    {
      label: 'CO₂',
      value: co2,
      unit: 'ppm',
      status: getCO2Status(co2),
      decimals: 0,
    },
    {
      label: 'Temperature',
      value: temperature,
      unit: '°C',
      status: getTemperatureStatus(temperature),
      decimals: 1,
    },
    {
      label: 'Noise',
      value: noise,
      unit: 'dB',
      status: getNoiseStatus(noise),
      decimals: 1,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
            <Badge tone={statusToTone(item.status)}>{item.status}</Badge>
          </div>
          <p className="mono-num mt-3 text-2xl font-bold text-primary">
            {item.value !== null ? item.value.toFixed(item.decimals) : '—'}
            <span className="ml-1 text-sm font-medium text-slate-400">{item.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
