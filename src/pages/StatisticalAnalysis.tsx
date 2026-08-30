import { useMemo, useState } from 'react';
import { Activity, BarChart3, FileText, LineChart, SquareStack } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { FormField, Input, Select } from '../components/common/FormField';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { Tabs } from '../components/common/Tabs';
import { ExplainerButton } from '../components/common/ExplainerButton';
import { PearsonResultsTable } from '../components/analysis/PearsonResultsTable';
import { TTestResultsTable } from '../components/analysis/TTestResultsTable';
import { DescriptiveStatsTable } from '../components/analysis/DescriptiveStatsTable';
import { CorrelationScatter } from '../components/analysis/CorrelationScatter';
import { GroupMeansBarChart } from '../components/analysis/GroupMeansBarChart';
import { AnalysisReport } from '../components/analysis/AnalysisReport';
import { useAsync } from '../hooks/useAsync';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  fetchAnalysisDataset,
  runPearsonCorrelations,
  runTTestsBySubject,
} from '../services/analysisService';
import { fetchSettingOptions } from '../services/settingsService';
import { computeDescriptiveStats } from '../utils/statistics';

type TabId = 'descriptive' | 'pearson' | 'ttest' | 'graphs' | 'report';

export default function StatisticalAnalysis() {
  const [activeTab, setActiveTab] = useState<TabId>('descriptive');
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

  useRealtimeRefresh(['assessments', 'recordings', 'environmental_readings'], refetch);

  const subjects = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.assessment.subject))).sort(),
    [rows]
  );

  const pearsonResults = useMemo(() => (rows ? runPearsonCorrelations(rows) : []), [rows]);
  const tTestResults = useMemo(() => (rows ? runTTestsBySubject(rows) : []), [rows]);
  const descriptiveStats = useMemo(() => {
    if (!rows) return [];
    return [
      computeDescriptiveStats(
        'Temperature',
        '°C',
        rows.filter((r) => r.avgTemperature !== null).map((r) => r.avgTemperature as number)
      ),
      computeDescriptiveStats(
        'CO₂',
        'ppm',
        rows.filter((r) => r.avgCo2 !== null).map((r) => r.avgCo2 as number)
      ),
      computeDescriptiveStats(
        'Noise',
        'dB',
        rows.filter((r) => r.avgNoise !== null).map((r) => r.avgNoise as number)
      ),
      computeDescriptiveStats(
        'Score Percentage',
        '%',
        rows.map((r) => r.assessment.score_percentage)
      ),
    ];
  }, [rows]);

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
                  { id: 'descriptive', label: 'Descriptive Statistics', icon: <SquareStack size={15} /> },
                  { id: 'pearson', label: 'Pearson Correlation', icon: <Activity size={15} /> },
                  { id: 'ttest', label: 'T-Test', icon: <BarChart3 size={15} /> },
                  { id: 'graphs', label: 'Graphs & Plots', icon: <LineChart size={15} /> },
                  { id: 'report', label: 'Generate Report', icon: <FileText size={15} /> },
                ]}
                active={activeTab}
                onChange={(id) => setActiveTab(id as TabId)}
              />

              {activeTab === 'descriptive' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <ExplainerButton title="How Descriptive Statistics are calculated">
                      <p>
                        For each variable, every non-archived record in the current filter selection is
                        collected into a list of numbers, then summarized with:
                      </p>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>
                          <strong>n</strong> — the count of records with a value for that variable.
                        </li>
                        <li>
                          <strong>Mean</strong> — the sum of all values divided by n.
                        </li>
                        <li>
                          <strong>Median</strong> — the middle value once sorted (or the average of the two
                          middle values when n is even).
                        </li>
                        <li>
                          <strong>Standard Deviation</strong> — the sample standard deviation, showing how
                          spread out the values are from the mean.
                        </li>
                        <li>
                          <strong>Min / Max</strong> — the smallest and largest observed values.
                        </li>
                      </ul>
                      <p>
                        Temperature, CO₂, and Noise are the per-recording averages already computed from
                        each device's 1-minute environmental packets. Score Percentage comes directly from
                        each assessment record.
                      </p>
                    </ExplainerButton>
                  </div>
                  <DescriptiveStatsTable stats={descriptiveStats} />
                </div>
              )}

              {activeTab === 'pearson' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <ExplainerButton title="How Pearson Correlation is calculated">
                      <p>
                        Pearson's r measures the strength and direction of a straight-line relationship
                        between two variables — here, an environmental variable (CO₂, Temperature, or
                        Noise) and Score Percentage.
                      </p>
                      <p>
                        For each pair of variables, r is computed from the covariance of the two variables
                        divided by the product of their standard deviations. r ranges from -1 (perfect
                        negative relationship) to +1 (perfect positive relationship), with 0 meaning no
                        linear relationship.
                      </p>
                      <p>
                        The p-value is derived from a Student's t-distribution with n − 2 degrees of
                        freedom, testing whether the observed r could plausibly arise by chance. A result
                        is flagged <strong>Significant</strong> when p &lt; 0.05.
                      </p>
                      <p>
                        Only non-archived assessments matching the current filters, and only records with
                        an available reading for that variable, are included in each calculation — so the
                        sample size (n) can differ slightly between the three correlations.
                      </p>
                    </ExplainerButton>
                  </div>
                  <PearsonResultsTable results={pearsonResults} />
                </div>
              )}

              {activeTab === 'ttest' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <ExplainerButton title="How the Independent Samples T-Test is calculated">
                      <p>
                        For each subject in the filtered dataset, assessment records are split into the
                        Experimental group and the Comparison group by their Score Percentage.
                      </p>
                      <p>
                        This is a Welch's t-test, which does not assume the two groups have equal
                        variance — a safer default for real classroom data. It computes the difference
                        between the two group means, divided by the standard error of that difference, to
                        get the t-value. Degrees of freedom are estimated with the Welch–Satterthwaite
                        equation rather than assumed to be n₁ + n₂ − 2.
                      </p>
                      <p>
                        The resulting p-value is compared against α = 0.05. If p &lt; 0.05, the null
                        hypothesis (that the two group means are equal) is rejected, meaning the difference
                        between groups is unlikely to be due to chance alone.
                      </p>
                      <p>
                        Each subject is tested independently — results from different subjects are never
                        combined into a single t-test.
                      </p>
                    </ExplainerButton>
                  </div>
                  <TTestResultsTable results={tTestResults} />
                </div>
              )}

              {activeTab === 'graphs' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <ExplainerButton title="How to read these graphs">
                      <p>
                        <strong>Scatter plots</strong> place one point per assessment record: its
                        environmental variable (CO₂, Temperature, or Noise) on the x-axis, and its Score
                        Percentage on the y-axis. A downward-sloping cluster suggests a negative
                        relationship; an upward-sloping cluster suggests a positive one. A shapeless cloud
                        suggests little to no linear relationship — this is the visual counterpart to the
                        Pearson Correlation tab.
                      </p>
                      <p>
                        <strong>The bar chart</strong> shows the mean Score Percentage for the Experimental
                        and Comparison groups, grouped by subject — the same means used in the T-Test tab,
                        shown side by side for a quick visual comparison.
                      </p>
                    </ExplainerButton>
                  </div>
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
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <ExplainerButton title="About this report">
                      <p>
                        This report summarizes the Pearson Correlation and T-Test results for the current
                        filter selection, ready to print or save as a PDF.
                      </p>
                      <p>
                        <strong>Export Raw Data (CSV)</strong> downloads exactly the filtered
                        assessment-and-environmental dataset used to produce the results above — one row
                        per assessment, joined with its recording's average CO₂, Temperature, and Noise.
                      </p>
                      <p>
                        <strong>Export All Recordings (CSV)</strong> downloads every non-archived
                        recording within the selected date range — including recordings that don't yet
                        have assessment details attached — with device, timing, and environmental averages.
                      </p>
                    </ExplainerButton>
                  </div>
                  <AnalysisReport
                    rows={rows}
                    pearsonResults={pearsonResults}
                    tTestResults={tTestResults}
                    filterSummary={filterSummary}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}
