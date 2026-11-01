import { CheckCircle2, ClipboardList, Layers, ListChecks, Radio, TimerReset } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { StatCard } from '../components/dashboard/StatCard';
import { CurrentRecordingPanel } from '../components/dashboard/CurrentRecordingPanel';
import { EnvironmentalCards } from '../components/dashboard/EnvironmentalCards';
import { ActivityLogWidget } from '../components/dashboard/ActivityLogWidget';
import { Card, CardHeader } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { TrendChart } from '../components/charts/TrendChart';
import { EnvironmentalStatusInfo } from '../components/common/EnvironmentalStatusInfo';
import { LoadingState, ErrorState, EmptyState } from '../components/common/States';
import { useAsync } from '../hooks/useAsync';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { fetchDashboardSummary } from '../services/dashboardService';
import { fetchRecentActivity } from '../services/activityService';

export default function Dashboard() {
  const { data, loading, error, refetch } = useAsync(fetchDashboardSummary);
  const {
    data: activity,
    loading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useAsync(() => fetchRecentActivity(50));

  useRealtimeRefresh(['recordings', 'environmental_readings', 'assessments'], refetch);
  useRealtimeRefresh(['activity_log'], refetchActivity);

  return (
    <AppLayout title="Dashboard">
      {loading && <LoadingState label="Loading dashboard…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Recording Status"
              value={data.activeRecording ? 'Active' : 'Idle'}
              icon={<Radio size={16} />}
              iconTone="accent"
            />
            <StatCard
              label="Active Recordings"
              value={data.totalActiveRecordings}
              icon={<Radio size={16} />}
              iconTone="primary"
            />
            <StatCard
              label="Grouped Recordings"
              value={data.groupedAssessments}
              suffix={data.groupedAssessments === 1 ? 'group' : 'groups'}
              icon={<Layers size={16} />}
              iconTone="secondary"
            />
            <div className="rounded-lg border border-border bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assessment Progress</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-50 text-accent-700">
                  <TimerReset size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="mono-num text-2xl font-bold text-primary">{data.groupsOngoing}</p>
                  <p className="text-xs text-amber-700">Ongoing</p>
                </div>
                <div className="text-right">
                  <p className="mono-num text-2xl font-bold text-primary">{data.groupsCompleted}</p>
                  <p className="text-xs text-emerald-700">Completed</p>
                </div>
              </div>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div
                  className="bg-emerald-500"
                  style={{ width: `${data.groupedAssessments ? (data.groupsCompleted / data.groupedAssessments) * 100 : 0}%` }}
                />
                <div
                  className="bg-amber-400"
                  style={{ width: `${data.groupedAssessments ? (data.groupsOngoing / data.groupedAssessments) * 100 : 0}%` }}
                />
              </div>
            </div>
            <StatCard
              label="Pending Assessment Details"
              value={data.pendingAssessmentDetails}
              icon={<ClipboardList size={16} />}
              iconTone="accent"
            />
            <StatCard
              label="Incomplete Assessments"
              value={data.incompleteAssessments}
              icon={<ListChecks size={16} />}
              iconTone="primary"
            />
            <StatCard
              label="Completed Assessments"
              value={data.completedAssessments}
              icon={<CheckCircle2 size={16} />}
              iconTone="secondary"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <CurrentRecordingPanel recording={data.activeRecording} />
            </div>
            <div className="lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                {data.dataSource === 'live' && (
                  <Badge tone="normal" dot>
                    Live reading
                  </Badge>
                )}
                {data.dataSource === 'recent' && (
                  <Badge tone="neutral">
                    {data.activeRecording
                      ? 'Recent — waiting for the first reading from this recording'
                      : 'Recent — from the last recording'}
                  </Badge>
                )}
                {data.dataSource === 'none' && <div />}
                <EnvironmentalStatusInfo compact />
              </div>
              <EnvironmentalCards
                temperature={data.latestReading?.average_temperature ?? null}
                noise={data.latestReading?.average_noise ?? null}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Recent Environmental Trend"
                subtitle="1-minute averages from the most recent recording"
              />
              {data.trend.length === 0 ? (
                <EmptyState
                  title="No environmental data yet"
                  description="Trend data will appear once a BANHA device begins sending readings."
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Temperature (°C)
                    </p>
                    <TrendChart data={data.trend} metric="average_temperature" color="#678EC4" unit="°C" height={180} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Noise (dBA)
                    </p>
                    <TrendChart data={data.trend} metric="average_noise" color="#DEAE20" unit="dBA" height={180} />
                  </div>
                </div>
              )}
            </Card>

            <div className="xl:col-span-1">
              <ActivityLogWidget
                entries={activity}
                loading={activityLoading}
                error={activityError}
                onRetry={refetchActivity}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}