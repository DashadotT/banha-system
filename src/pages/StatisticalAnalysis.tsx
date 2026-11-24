import { useMemo, useState } from 'react';
import { Activity, BarChart3, DoorOpen, FileText, SquareStack } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { FormField, Input, Select } from '../components/common/FormField';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { Tabs } from '../components/common/Tabs';
import { ExplainerButton } from '../components/common/ExplainerButton';
import { PearsonAnalysis } from '../components/analysis/PearsonAnalysis';
import { PairedTTestAnalysis } from '../components/analysis/PairedTTestAnalysis';
import { DescriptiveStatsTable } from '../components/analysis/DescriptiveStatsTable';
import { ClassroomConditions } from '../components/analysis/ClassroomConditions';
import { AnalysisReport } from '../components/analysis/AnalysisReport';
import { useAsync } from '../hooks/useAsync';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  fetchAnalysisDataset,
  runPairedTTest,
  runPearsonCorrelations,
  scoredRows,
} from '../services/analysisService';
import { useScoreMode } from '../context/ScoreModeContext';
import { getScoreValue } from '../utils/scoreMode';
import { fetchSettingOptions } from '../services/settingsService';
import { computeDescriptiveStats } from '../utils/statistics';
import type { GroupType } from '../types';

type TabId = 'descriptive' | 'pearson' | 'ttest' | 'classroom' | 'report';

export default function StatisticalAnalysis() {
  const { mode, meta } = useScoreMode();
  const [activeTab, setActiveTab] = useState<TabId>('descriptive');
  const [subject, setSubject] = useState('');
  const [assessmentType, setAssessmentType] = useState('');
  const [groupType, setGroupType] = useState<GroupType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: typeOptions } = useAsync(() => fetchSettingOptions('assessment_type'));

  const { data: rows, loading, error, refetch } = useAsync(
    () =>
      fetchAnalysisDataset({
        subject: subject || undefined,
        assessmentType: assessmentType || undefined,
        groupType: groupType || undefined,
        publishedOnly: true,
        dateRange: { from: dateFrom || null, to: dateTo || null },
      }),
    [subject, assessmentType, groupType, dateFrom, dateTo]
  );

  useRealtimeRefresh(['assessments', 'recordings', 'environmental_readings'], refetch);

  const subjects = useMemo(
    () =>
      Array.from(new Set((rows ?? []).map((r) => r.assessment.subject).filter((s): s is string => Boolean(s)))).sort(),
    [rows]
  );

  const pearsonResults = useMemo(() => (rows ? runPearsonCorrelations(rows, mode) : []), [rows, mode]);
  // One overall result: every matched pair of the filtered dataset (all subjects pooled),
  // or just the selected subject's pairs when a Subject filter is applied.
  const pairedResult = useMemo(() => runPairedTTest(rows ?? [], mode, subject || undefined), [rows, mode, subject]);
  const descriptiveStats = useMemo(() => {
    if (!rows) return [];
    return [
      computeDescriptiveStats(
        'Temperature',
        '°C',
        rows.filter((r) => r.avgTemperature !== null).map((r) => r.avgTemperature as number)
      ),
      computeDescriptiveStats(
        'Noise',
        'dBA',
        rows.filter((r) => r.avgNoise !== null).map((r) => r.avgNoise as number)
      ),
      computeDescriptiveStats(
        meta.label,
        meta.unit,
        scoredRows(rows, mode).map((r) => getScoreValue(r.assessment, mode) as number)
      ),
    ];
  }, [rows, mode, meta]);

  const filterSummary = [
    subject ? `Subject: ${subject}` : 'All subjects',
    assessmentType ? `Type: ${assessmentType}` : 'All types',
    groupType ? `Group: ${groupType}` : 'All groups',
    dateFrom || dateTo ? `Date range: ${dateFrom || '…'} to ${dateTo || '…'}` : 'All dates',
  ].join(' · ');

  return (
    <AppLayout title="Statistical Analysis">
      <Card className="mb-6 print:hidden">
        <CardHeader
          title="Dataset Filters"
          subtitle={`Only assessments added to the Assessments page are analyzed · Using ${meta.label} (change in System Settings)`}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          <FormField label="Group">
            <Select value={groupType} onChange={(e) => setGroupType(e.target.value as GroupType | '')}>
              <option value="">All</option>
              <option value="Experimental">Experimental</option>
              <option value="Comparison">Comparison</option>
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
              description="Adjust the filters above, or add a completed assessment to the Assessments page — pending, incomplete and unpublished assessments are not analyzed."
            />
          ) : (
            <>
              <Tabs
                tabs={[
                  { id: 'descriptive', label: 'Descriptive Statistics', icon: <SquareStack size={15} /> },
                  { id: 'pearson', label: 'Pearson Correlation', icon: <Activity size={15} /> },
                  { id: 'ttest', label: 'Paired T-Test', icon: <BarChart3 size={15} /> },
                  { id: 'classroom', label: 'Classroom Conditions', icon: <DoorOpen size={15} /> },
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
                        Temperature and Noise are the per-recording averages already computed from
                        each recording's 1-minute environmental packets. {meta.label} comes directly from
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
                        between two variables — here, an environmental variable (Temperature or
                        Noise) and the {meta.label}.
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
                        sample size (n) can differ slightly between the two correlations.
                      </p>
                      <p>
                        Each scatter plot shows one point per assessment with the least-squares trend
                        line through them; r² is the share of the score&apos;s variation explained by the
                        environmental variable.
                      </p>
                    </ExplainerButton>
                  </div>
                  <PearsonAnalysis rows={rows} results={pearsonResults} mode={mode} meta={meta} />
                </div>
              )}

              {activeTab === 'ttest' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <ExplainerButton title="How the Paired Samples T-Test is calculated">
                      <p>
                        Each Experimental assessment is matched with the Comparison assessment that has the
                        same <strong>Subject, Assessment Type and Assessment Number</strong>. Every matched
                        pair gives one difference: Experimental {meta.label} − Comparison {meta.label}. If a
                        group has more than one assessment for the same match (for example two sections),
                        their scores are averaged first so each pair counts once.
                      </p>
                      <p>
                        The test then asks whether the <strong>mean of those differences</strong> is
                        different from zero: t = mean difference ÷ (SD of differences ÷ √n), with n − 1
                        degrees of freedom, where n is the number of pairs. The p-value is compared with
                        α = 0.05; if p &lt; 0.05 the null hypothesis (no difference between the groups) is
                        rejected.
                      </p>
                      <p>
                        With <strong>All subjects</strong> selected, the pairs of every subject are combined
                        into one overall result. Choose a Subject in the filters to see that subject on its
                        own. Assessments without a partner in the other group are left out.
                      </p>
                    </ExplainerButton>
                  </div>
                  <PairedTTestAnalysis result={pairedResult} meta={meta} />
                </div>
              )}

              {activeTab === 'classroom' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <ExplainerButton title="How Classroom Conditions are calculated">
                      <p>
                        Assessments are grouped by their saved Classroom / Room Type (and Class Schedule). Each
                        assessment contributes one temperature and one noise value: the average of all readings
                        from every recording that belongs to it.
                      </p>
                      <p>
                        A classroom's average is the mean of its assessments' values, then compared with the
                        study's temperature and noise ranges (Good / Fair / Poor overall, where the worse of the two
                        readings decides). Classrooms are flagged when at least half of their assessments
                        fell in the Fair or Poor range (minimum two assessments).
                      </p>
                      <p>The Group and date filters above apply here too.</p>
                    </ExplainerButton>
                  </div>
                  <ClassroomConditions rows={rows} />
                </div>
              )}

              {activeTab === 'report' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <ExplainerButton title="About this report">
                      <p>
                        The report gathers the <strong>overall results</strong> for the current filters —
                        descriptive statistics, the Pearson correlation (with scatter plots) and the paired
                        samples t-test (with its charts) — in one document that is ready to print or save as a
                        PDF.
                      </p>
                      <p>
                        It uses the {meta.label} setting from System Settings, so the figures match what you
                        see in the other tabs.
                      </p>
                    </ExplainerButton>
                  </div>
                  <AnalysisReport
                    rows={rows}
                    descriptiveStats={descriptiveStats}
                    pearsonResults={pearsonResults}
                    pairedResult={pairedResult}
                    mode={mode}
                    meta={meta}
                    filterSummary={filterSummary}
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
