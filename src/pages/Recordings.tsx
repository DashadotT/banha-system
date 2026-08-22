import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ClipboardList, Eye } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { FilterBar } from '../components/common/FilterBar';
import { Select } from '../components/common/FormField';
import { Td, Th, TableShell } from '../components/common/Table';
import { RecordingStatusBadge } from '../components/recordings/RecordingStatusBadge';
import { ArchiveConfirmDialog } from '../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { useAsync } from '../hooks/useAsync';
import { archiveRecording, fetchRecordings } from '../services/recordingService';
import { formatDateShort, formatDuration, formatTime } from '../utils/dateTime';
import type { Recording, RecordingStatus } from '../types';

export default function Recordings() {
  const { data, loading, error, refetch } = useAsync(fetchRecordings);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecordingStatus | 'all'>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Recording | null>(null);
  const [archiving, setArchiving] = useState(false);

  const devices = useMemo(() => {
    const set = new Set((data ?? []).map((r) => r.device?.device_name ?? '').filter(Boolean));
    return Array.from(set);
  }, [data]);

  const filtered = useMemo(() => {
    return (data ?? []).filter((r) => {
      const matchesSearch =
        !search ||
        r.device?.device_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesDevice = deviceFilter === 'all' || r.device?.device_name === deviceFilter;
      const matchesDate = !dateFilter || r.started_at.slice(0, 10) === dateFilter;
      return matchesSearch && matchesStatus && matchesDevice && matchesDate;
    });
  }, [data, search, statusFilter, deviceFilter, dateFilter]);

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveRecording(archiveTarget.id);
      setArchiveTarget(null);
      refetch();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <AppLayout title="Recordings">
      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by device or ID…">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RecordingStatus | 'all')} className="w-auto">
          <option value="all">All statuses</option>
          <option value="recording">Recording</option>
          <option value="completed">Completed</option>
          <option value="pending_assessment">Pending Assessment Details</option>
        </Select>
        <Select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)} className="w-auto">
          <option value="all">All devices</option>
          {devices.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </FilterBar>

      {loading && <LoadingState label="Loading recordings…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No recordings found"
          description="Adjust your filters, or check back once a BANHA device starts a session."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <TableShell>
          <thead>
            <tr>
              <Th>Recording ID</Th>
              <Th>Device</Th>
              <Th>Date</Th>
              <Th>Start</Th>
              <Th>End</Th>
              <Th>Duration</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-surface/60">
                <Td className="font-mono text-xs text-slate-500">{r.id.slice(0, 8)}</Td>
                <Td className="font-medium text-primary">{r.device?.device_name ?? '—'}</Td>
                <Td>{formatDateShort(r.started_at)}</Td>
                <Td>{formatTime(r.started_at)}</Td>
                <Td>{r.ended_at ? formatTime(r.ended_at) : '—'}</Td>
                <Td className="mono-num">{formatDuration(r.duration_seconds)}</Td>
                <Td>
                  <RecordingStatusBadge status={r.status} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/recordings/${r.id}`}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary"
                      title="View details"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      onClick={() => setArchiveTarget(r)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      title="Archive"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <ArchiveConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        itemLabel={archiveTarget ? `recording ${archiveTarget.id.slice(0, 8)}` : ''}
        loading={archiving}
      />
    </AppLayout>
  );
}
