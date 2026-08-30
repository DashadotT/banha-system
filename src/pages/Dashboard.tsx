import { ClipboardList, Info, ListChecks, Radio } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { StatCard } from '../components/dashboard/StatCard';
import { CurrentRecordingPanel } from '../components/dashboard/CurrentRecordingPanel';
import { EnvironmentalCards } from '../components/dashboard/EnvironmentalCards';
import { ActivityLogWidget } from '../components/dashboard/ActivityLogWidget';
import { Card, CardHeader } from '../components/common/Card';
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
  } = useAsync(() => fetchRecentActivity(12));

  useRealtimeRefresh(['recordings', 'environmental_readings'], refetch);
  useRealtimeRefresh(['activity_log'], refetchActivity);

  return (
    <AppLayout title="Dashboard">
      {loading && <LoadingState label="Loading dashboard…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              label="Completed Assessments"
              value={data.totalCompletedAssessments}
              icon={<ListChecks size={16} />}
              iconTone="secondary"
            />
          </div>

          {data.pendingAssessmentDetails > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800">
              <ClipboardList size={16} />
              <span>
                <strong className="font-semibold">{data.pendingAssessmentDetails}</strong> recording
                {data.pendingAssessmentDetails === 1 ? '' : 's'} pending assessment details.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <CurrentRecordingPanel recording={data.activeRecording} />
            </div>
            <div className="lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                {data.awaitingFirstReading ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Info size={13} />
                    Last known values — waiting for the first reading from the new recording
                  </div>
                ) : (
                  <div />
                )}
                <EnvironmentalStatusInfo compact />
              </div>
              <EnvironmentalCards
                co2={data.latestReading?.average_co2 ?? null}
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
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Temperature (°C)
                    </p>
                    <TrendChart data={data.trend} metric="average_temperature" color="#678EC4" unit="°C" height={180} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      CO₂ (ppm)
                    </p>
                    <TrendChart data={data.trend} metric="average_co2" color="#002858" unit="ppm" height={180} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Noise (dB)
                    </p>
                    <TrendChart data={data.trend} metric="average_noise" color="#DEAE20" unit="dB" height={180} />
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
