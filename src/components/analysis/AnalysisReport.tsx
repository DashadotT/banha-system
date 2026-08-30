import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '../common/Button';
import { formatDate, formatDateShort } from '../../utils/dateTime';
import { downloadCsv } from '../../utils/csv';
import { fetchRecordingsDataset } from '../../services/analysisService';
import type { AnalysisRow } from '../../services/analysisService';
import type { PearsonResult, TTestResult } from '../../types';

export function AnalysisReport({
  rows,
  pearsonResults,
  tTestResults,
  filterSummary,
  dateFrom,
  dateTo,
}: {
  rows: AnalysisRow[];
  pearsonResults: PearsonResult[];
  tTestResults: TTestResult[];
  filterSummary: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [exportingRecordings, setExportingRecordings] = useState(false);

  function handleExportCsv() {
    const headers = [
      'Recording ID',
      'Device',
      'Recording Date',
      'Subject',
      'Section',
      'Group',
      'Assessment Type',
      'Assessment Number',
      'Assessment Date',
      'Class Average Score',
      'Total Possible Score',
      'Score Percentage',
      'Average CO2 (ppm)',
      'Average Temperature (C)',
      'Average Noise (dB)',
    ];
    const csvRows = rows.map((r) => [
      r.assessment.recording_id,
      r.assessment.recording?.device?.device_name ?? '',
      formatDateShort(r.assessment.recording?.started_at ?? null),
      r.assessment.subject,
      r.assessment.section,
      r.assessment.group_type,
      r.assessment.assessment_type,
      r.assessment.assessment_number,
      r.assessment.assessment_date,
      r.assessment.class_average_score,
      r.assessment.total_possible_score,
      r.assessment.score_percentage,
      r.avgCo2,
      r.avgTemperature,
      r.avgNoise,
    ]);
    downloadCsv(`banha-raw-data-${new Date().toISOString().slice(0, 10)}`, headers, csvRows);
  }

  async function handleExportRecordings() {
    setExportingRecordings(true);
    try {
      const dataset = await fetchRecordingsDataset({ from: dateFrom || null, to: dateTo || null });
      const headers = [
        'Recording ID',
        'Device',
        'Start',
        'End',
        'Duration (s)',
        'Status',
        'Data Packets',
        'Average CO2 (ppm)',
        'Average Temperature (C)',
        'Average Noise (dB)',
      ];
      const csvRows = dataset.map((d) => [
        d.recording.id,
        d.recording.device?.device_name ?? '',
        d.recording.started_at,
        d.recording.ended_at ?? '',
        d.recording.duration_seconds ?? '',
        d.recording.status,
        d.packetCount,
        d.avgCo2,
        d.avgTemperature,
        d.avgNoise,
      ]);
      downloadCsv(`banha-all-recordings-${new Date().toISOString().slice(0, 10)}`, headers, csvRows);
    } finally {
      setExportingRecordings(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-500">
          Review the report below, then print/save as PDF or export the underlying data.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCsv}
          >
            Export Raw Data (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={14} />}
            loading={exportingRecordings}
            onClick={handleExportRecordings}
          >
            Export All Recordings (CSV)
          </Button>
          <Button variant="primary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            Print Report
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white p-6 shadow-card print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary-600">
            BANHA Research Report
          </p>
          <h2 className="mt-1 text-lg font-bold text-primary">Statistical Analysis Summary</h2>
          <p className="mt-1 text-xs text-slate-500">Generated {formatDate(new Date())}</p>
          <p className="mt-2 text-xs text-slate-600">{filterSummary}</p>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-primary">Dataset Overview</h3>
          <p className="text-sm text-slate-600">
            Sample size (n): <span className="font-semibold text-primary">{rows.length}</span> non-archived
            assessment record{rows.length === 1 ? '' : 's'}.
          </p>
        </section>

        <section className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-primary">
            Pearson Product-Moment Correlation
          </h3>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-semibold text-slate-500">Variables</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">n</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">r</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">p-value</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">Result</th>
              </tr>
            </thead>
            <tbody>
              {pearsonResults.map((r) => (
                <tr key={`${r.variableX}-${r.variableY}`} className="border-b border-border align-top">
                  <td className="py-2 pr-3 font-medium text-primary">
                    {r.variableX} vs. {r.variableY}
                  </td>
                  <td className="py-2 pr-3">{r.n}</td>
                  <td className="py-2 pr-3">{r.r}</td>
                  <td className="py-2 pr-3">{r.pValue}</td>
                  <td className="py-2 pr-3">{r.significant ? 'Significant' : 'Not significant'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 space-y-1.5">
            {pearsonResults.map((r) => (
              <p key={`${r.variableX}-interp`} className="text-xs leading-relaxed text-slate-600">
                {r.interpretation}
              </p>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-primary">Independent Samples T-Test</h3>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-semibold text-slate-500">Subject</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">n (Exp.)</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">n (Comp.)</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">Mean (Exp.)</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">Mean (Comp.)</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">t</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">df</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">p-value</th>
                <th className="py-2 pr-3 font-semibold text-slate-500">Decision</th>
              </tr>
            </thead>
            <tbody>
              {tTestResults.map((r) => (
                <tr key={r.subject} className="border-b border-border align-top">
                  <td className="py-2 pr-3 font-medium text-primary">{r.subject}</td>
                  <td className="py-2 pr-3">{r.nExperimental}</td>
                  <td className="py-2 pr-3">{r.nComparison}</td>
                  <td className="py-2 pr-3">{r.meanExperimental}%</td>
                  <td className="py-2 pr-3">{r.meanComparison}%</td>
                  <td className="py-2 pr-3">{r.tValue}</td>
                  <td className="py-2 pr-3">{r.degreesOfFreedom}</td>
                  <td className="py-2 pr-3">{r.pValue}</td>
                  <td className="py-2 pr-3">{r.decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 space-y-1.5">
            {tTestResults.map((r) => (
              <p key={`${r.subject}-interp`} className="text-xs leading-relaxed text-slate-600">
                {r.interpretation}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
