import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EnvironmentalReading } from '../../types';
import { formatTime } from '../../utils/dateTime';

interface TrendChartProps {
  data: EnvironmentalReading[];
  metric: 'average_co2' | 'average_temperature' | 'average_noise';
  color: string;
  unit: string;
  height?: number;
}

export function TrendChart({ data, metric, color, unit, height = 220 }: TrendChartProps) {
  const chartData = data.map((d) => ({
    time: formatTime(d.recorded_at),
    value: d[metric],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={{ stroke: '#E2E6EC' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value) => [`${value} ${unit}`, '']}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #E2E6EC',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,40,88,0.08)',
          }}
          labelStyle={{ color: '#002858', fontWeight: 600 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
