import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/common/Card';
import { FormField, Input, Select } from '../components/common/FormField';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States';
import { PearsonResultsTable } from '../components/analysis/PearsonResultsTable';
import { TTestResultsTable } from '../components/analysis/TTestResultsTable';
import { useAsync } from '../hooks/useAsync';
import {
  fetchAnalysisDataset,
  runPearsonCorrelations,
  runTTestsBySubject,
} from '../services/analysisService';
import type { AssessmentType } from '../types';

const ASSESSMENT_TYPES: AssessmentType[] = ['Quiz', 'Examination', 'Activity', 'Exercise'];

export default function StatisticalAnalysis() {
  const [subject, setSubject] = useState('');
  const [assessmentType, setAssessmentType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  return (
    <AppLayout title="Statistical Analysis">
      <Card className="mb-6">
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
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
        <div className="space-y-6">
          <div className="rounded-md border border-border bg-white px-4 py-3 text-sm text-slate-600 shadow-card">
            Selected dataset: <span className="font-semibold text-primary">{rows.length}</span> non-archived
            assessment record{rows.length === 1 ? '' : 's'}
            {subject && <> · Subject: <span className="font-medium text-primary">{subject}</span></>}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Activity size={28} />}
              title="No data available for this selection"
              description="Adjust the filters above, or add assessment details to non-archived recordings."
            />
          ) : (
            <>
              <PearsonResultsTable results={pearsonResults} />
              <TTestResultsTable results={tTestResults} />
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}
