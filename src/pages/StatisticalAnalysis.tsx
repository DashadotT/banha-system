import { useMemo, useState } from 'react';
import { Activity, BarChart3, FileText, LineChart } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { FormField, Input, Select } from '../components/common/FormField';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { Tabs } from '../components/common/Tabs';
import { PearsonResultsTable } from '../components/analysis/PearsonResultsTable';
import { TTestResultsTable } from '../components/analysis/TTestResultsTable';
import { CorrelationScatter } from '../components/analysis/CorrelationScatter';
import { GroupMeansBarChart } from '../components/analysis/GroupMeansBarChart';
import { AnalysisReport } from '../components/analysis/AnalysisReport';
import { useAsync } from '../hooks/useAsync';
import {
  fetchAnalysisDataset,
  runPearsonCorrelations,
  runTTestsBySubject,
} from '../services/analysisService';
import { fetchSettingOptions } from '../services/settingsService';

type TabId = 'pearson' | 'ttest' | 'graphs' | 'report';

export default function StatisticalAnalysis() {
  const [activeTab, setActiveTab] = useState<TabId>('pearson');
  const [subject, setSubject] = useState('');
  const [assessmentType, setAssessmentType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: typeOptions } = useAsync(() => fetchSettingOptions('assessment_type'));

  const { data: rows, loading, error, refetch } = useAsync(
    () =>
      fetchAnalysisDataset({
        subject: subject || undefined,
        assessmentType: assessmentType || undefined,
        dateRange: { from: dateFrom || null, to: dateTo || null },
      }),
    [subject, assessmentType, dateFrom, dateTo]
  );

  const subjects = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.assessment.subject))).sort(),
    [rows]
  );

  const pearsonResults = useMemo(() => (rows ? runPearsonCorrelations(rows) : []), [rows]);
  const tTestResults = useMemo(() => (rows ? runTTestsBySubject(rows) : []), [rows]);

  const filterSummary = [
    subject ? `Subject: ${subject}` : 'All subjects',
    assessmentType ? `Type: ${assessmentType}` : 'All types',
    dateFrom || dateTo ? `Date range: ${dateFrom || '…'} to ${dateTo || '…'}` : 'All dates',
  ].join(' · ');

  return (
    <AppLayout title="Statistical Analysis">
      <Card className="mb-6 print:hidden">
        <CardHeader title="Dataset Filters" subtitle="Analysis uses non-archived records only" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Subject">
            <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assessment Type">
            <Select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)}>
              <option value="">All types</option>
              {(typeOptions ?? []).map((t) => (
                <option key={t.id} value={t.value}>
                  {t.value}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date From">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </FormField>
          <FormField label="Date To">
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </FormField>
        </div>
      </Card>

      {loading && <LoadingState label="Running statistical calculations…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && rows && (
        <div>
          <div className="mb-6 rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-600 shadow-card print:hidden">
            Selected dataset: <span className="font-semibold text-primary">{rows.length}</span> non-archived
            assessment record{rows.length === 1 ? '' : 's'}
            {subject && (
              <>
                {' '}
                · Subject: <span className="font-medium text-primary">{subject}</span>
              </>
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Activity size={28} />}
              title="No data available for this selection"
              description="Adjust the filters above, or add assessment details to non-archived recordings."
            />
          ) : (
            <>
              <Tabs
                tabs={[
                  { id: 'pearson', label: 'Pearson Correlation', icon: <Activity size={15} /> },
                  { id: 'ttest', label: 'T-Test', icon: <BarChart3 size={15} /> },
                  { id: 'graphs', label: 'Graphs & Plots', icon: <LineChart size={15} /> },
                  { id: 'report', label: 'Generate Report', icon: <FileText size={15} /> },
                ]}
                active={activeTab}
                onChange={(id) => setActiveTab(id as TabId)}
              />

              {activeTab === 'pearson' && <PearsonResultsTable results={pearsonResults} />}

              {activeTab === 'ttest' && <TTestResultsTable results={tTestResults} />}

              {activeTab === 'graphs' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader
                      title="Environmental Variables vs. Score Percentage"
                      subtitle="Each point is one assessment record"
                    />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Temperature (°C)
                        </p>
                        <CorrelationScatter
                          data={rows
                            .filter((r) => r.avgTemperature !== null)
                            .map((r) => ({ x: r.avgTemperature as number, y: r.assessment.score_percentage }))}
                          xLabel="Temperature (°C)"
                          color="#678EC4"
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          CO₂ (ppm)
                        </p>
                        <CorrelationScatter
                          data={rows
                            .filter((r) => r.avgCo2 !== null)
                            .map((r) => ({ x: r.avgCo2 as number, y: r.assessment.score_percentage }))}
                          xLabel="CO₂ (ppm)"
                          color="#002858"
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Noise (dB)
                        </p>
                        <CorrelationScatter
                          data={rows
                            .filter((r) => r.avgNoise !== null)
                            .map((r) => ({ x: r.avgNoise as number, y: r.assessment.score_percentage }))}
                          xLabel="Noise (dB)"
                          color="#DEAE20"
                        />
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <CardHeader
                      title="Experimental vs. Comparison — Mean Score Percentage"
                      subtitle="Grouped by subject"
                    />
                    <GroupMeansBarChart results={tTestResults} />
                  </Card>
                </div>
              )}

              {activeTab === 'report' && (
                <AnalysisReport
                  rows={rows}
                  pearsonResults={pearsonResults}
                  tTestResults={tTestResults}
                  filterSummary={filterSummary}
                />
              )}
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}
