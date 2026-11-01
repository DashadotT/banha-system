import { Card, CardHeader } from '../common/Card';
import { EnvValue } from '../common/EnvValue';
import { Td, Th, TableShell } from '../common/Table';
import { TrendChart } from '../charts/TrendChart';
import { combinedMeans } from '../../utils/calculations';
import { formatDateShort, formatDuration, formatTime } from '../../utils/dateTime';
import type { EnvironmentalReading, Recording } from '../../types';

/**
 * Combined environment of an assessment group: the overall mean is computed
 * from every individual reading of every recording, alongside each recording's
 * own figures (original records are not changed).
 */
export function GroupCombinedCard({
  members,
  readings,
  highlightId,
  onOpenRecording,
  showCharts = false,
}: {
  members: Recording[];
  readings: EnvironmentalReading[];
  highlightId?: string;
  onOpenRecording?: (id: string) => void;
  showCharts?: boolean;
}) {
  const overall = combinedMeans(readings);
  return (
    <Card>
      <CardHeader
        title="Combined Environment"
        subtitle={`Mean of all ${overall.packets} readings across ${members.length} recording${members.length === 1 ? '' : 's'}`}
      />
      <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Combined Mean Temperature</dt>
          <dd className="mt-0.5 text-sm font-medium text-primary">
            <EnvValue metric="temperature" value={overall.avgTemperature} unit="°C" />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Combined Mean Noise</dt>
          <dd className="mt-0.5 text-sm font-medium text-primary">
            <EnvValue metric="noise" value={overall.avgNoise} unit="dBA" />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Data Packets</dt>
          <dd className="mono-num mt-0.5 text-sm font-medium text-primary">{overall.packets}</dd>
        </div>
      </dl>

      <TableShell scrollable={false}>
        <thead>
          <tr>
            <Th>Recording</Th>
            <Th>Date</Th>
            <Th>Time</Th>
            <Th>Classroom</Th>
            <Th>Schedule</Th>
            <Th>Avg Temp</Th>
            <Th>Avg Noise</Th>
            <Th>Packets</Th>
            <Th>Duration</Th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const own = combinedMeans(readings.filter((r) => r.recording_id === m.id));
            return (
              <tr key={m.id} className={m.id === highlightId ? 'bg-secondary-50/60' : ''}>
                <Td className="font-mono text-xs">
                  {onOpenRecording && m.id !== highlightId ? (
                    <button onClick={() => onOpenRecording(m.id)} className="text-secondary-700 hover:underline">
                      {m.id.slice(0, 8)}
                    </button>
                  ) : (
                    <span className={m.id === highlightId ? 'font-semibold text-primary' : 'text-slate-500'}>
                      {m.id.slice(0, 8)}
                      {m.id === highlightId ? ' (this)' : ''}
                    </span>
                  )}
                </Td>
                <Td>{formatDateShort(m.started_at)}</Td>
                <Td>
                  {formatTime(m.started_at)} – {m.ended_at ? formatTime(m.ended_at) : '—'}
                </Td>
                <Td>{m.classroom_type ?? <span className="text-slate-300">—</span>}</Td>
                <Td>{m.class_schedule ?? <span className="text-slate-300">—</span>}</Td>
                <Td>
                  <EnvValue metric="temperature" value={own.avgTemperature} unit="°C" />
                </Td>
                <Td>
                  <EnvValue metric="noise" value={own.avgNoise} unit="dBA" />
                </Td>
                <Td className="mono-num">{own.packets}</Td>
                <Td className="mono-num">{formatDuration(m.duration_seconds)}</Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      {showCharts && readings.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Temperature (all sessions)</p>
            <TrendChart data={readings} metric="average_temperature" color="#678EC4" unit="°C" height={180} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Noise (all sessions)</p>
            <TrendChart data={readings} metric="average_noise" color="#DEAE20" unit="dBA" height={180} />
          </div>
        </div>
      )}
    </Card>
  );
}
