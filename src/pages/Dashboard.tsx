import { Layers, Radio, TimerReset } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { StatCard } from '../components/dashboard/StatCard';
import { CurrentRecordingPanel } from '../components/dashboard/CurrentRecordingPanel';
import { EnvironmentalCards } from '../components/dashboard/EnvironmentalCards';
import { ActivityLogWidget } from '../components/dashboard/ActivityLogWidget';
import { AssessmentPipeline } from '../components/dashboard/AssessmentPipeline';
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
        <div className="mx-auto max-w-[1400px] space-y-6">
          {/* Live conditions + current recording ---------------------------------- */}
          <section aria-label="Live conditions" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-primary">Classroom Conditions</h2>
                  {data.dataSource === 'live' && (
                    <Badge tone="normal" dot>
                      Live reading
                    </Badge>
                  )}
                  {data.dataSource === 'recent' && (
                    <Badge tone="neutral">
                      {data.activeRecording ? 'Waiting for first reading' : 'Last recording'}
                    </Badge>
                  )}
                </div>
                <EnvironmentalStatusInfo compact />
              </div>
              <EnvironmentalCards
                temperature={data.latestReading?.average_temperature ?? null}
                noise={data.latestReading?.average_noise ?? null}
              />
            </div>
            <div className="xl:col-span-1">
              <div className="mb-3 flex items-center">
                <h2 className="text-sm font-semibold text-primary">Recording</h2>
              </div>
              <CurrentRecordingPanel recording={data.activeRecording} />
            </div>
          </section>

          {/* Research progress ----------------------------------------------------- */}
          <section aria-label="Research progress" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Recording Status"
              value={data.activeRecording ? 'Active' : 'Idle'}
              icon={<Radio size={17} />}
              iconTone={data.activeRecording ? 'emerald' : 'secondary'}
              hint={`${data.totalActiveRecordings} recording${data.totalActiveRecordings === 1 ? '' : 's'} in progress`}
            />
            <StatCard
              label="Assessment Groups"
              value={data.groupedAssessments}
              suffix={data.groupedAssessments === 1 ? 'group' : 'groups'}
              icon={<Layers size={17} />}
              iconTone="primary"
              hint={
                <div>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-amber-700">{data.groupsOngoing} ongoing</span>
                    <span className="text-emerald-700">{data.groupsCompleted} completed</span>
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
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
              }
            />
            <div className="md:col-span-2">
              <AssessmentPipeline
                pending={data.pendingAssessmentDetails}
                incomplete={data.incompleteAssessments}
                completed={data.completedAssessments}
              />
            </div>
          </section>

          {/* Trend + activity ------------------------------------------------------ */}
          <section aria-label="Trends and activity" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Recent Environmental Trend"
                subtitle="1-minute averages from the most recent recording"
                action={<TimerReset size={16} className="text-slate-300" />}
              />
              {data.trend.length === 0 ? (
                <EmptyState
                  title="No environmental data yet"
                  description="Trend data will appear once a BANHA device begins sending readings."
                />
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Temperature (°C)</p>
                    <TrendChart data={data.trend} metric="average_temperature" color="#678EC4" unit="°C" height={190} />
                  </div>
                  <div className="border-t border-border pt-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Noise (dBA)</p>
                    <TrendChart data={data.trend} metric="average_noise" color="#DEAE20" unit="dBA" height={190} />
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
          </section>
        </div>
      )}
    </AppLayout>
  );
}
