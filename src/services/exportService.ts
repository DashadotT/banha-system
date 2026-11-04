import { downloadCsv } from '../utils/csv';
import { formatDateShort, formatDateTime, formatTime } from '../utils/dateTime';
import { getNoiseStatus, getTemperatureStatus } from '../utils/calculations';
import { assessmentTitle, distinctValues, getAssessmentState } from '../utils/assessment';
import type { AnalysisRow, RecordingDatasetRow } from './analysisService';
import type { EnvironmentalReading, Recording } from '../types';

const STATUS_LABEL: Record<string, string> = {
  recording: 'Recording',
  pending_assessment: 'Pending Assessment Details',
  incomplete_assessment: 'Incomplete Assessment Details',
  completed: 'Completed',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** One row per recording, with environmental summary and assessment details. */
export function exportRecordingsCsv(dataset: RecordingDatasetRow[]) {
  const headers = [
    'Recording ID',
    'Assessment Group',
    'Date',
    'Start',
    'End',
    'Duration (s)',
    'Status',
    'Notes',
    'Data Packets',
    'Average Temperature (C)',
    'Highest Temperature (C)',
    'Lowest Temperature (C)',
    'Average Noise (dBA)',
    'Highest Noise (dBA)',
    'Lowest Noise (dBA)',
    'Subject',
    'Section',
    'Group',
    'Assessment Type',
    'Assessment Number',
    'Class Average Score',
    'Total Possible Score',
    'Score Percentage',
    'Classroom / Room Type',
    'Class Schedule',
    'Assessment Progress',
    'Added to Assessments Page',
  ];
  const rows = dataset.map((d) => [
    d.recording.id,
    d.recording.group?.name ?? '',
    formatDateShort(d.recording.started_at),
    d.recording.started_at,
    d.recording.ended_at ?? '',
    d.recording.duration_seconds ?? '',
    STATUS_LABEL[d.recording.status] ?? d.recording.status,
    d.recording.notes ?? '',
    d.packetCount,
    d.avgTemperature,
    d.peakTemperature,
    d.lowestTemperature,
    d.avgNoise,
    d.peakNoise,
    d.lowestNoise,
    d.assessment?.subject ?? '',
    d.assessment?.section ?? '',
    d.assessment?.group_type ?? '',
    d.assessment?.assessment_type ?? '',
    d.assessment?.assessment_number ?? '',
    d.assessment?.class_average_score ?? '',
    d.assessment?.total_possible_score ?? '',
    d.assessment?.score_percentage ?? '',
    d.recording.classroom_type ?? '',
    d.recording.class_schedule ?? '',
    d.assessment ? (d.assessment.is_finalized ? 'Completed' : 'Ongoing') : '',
    d.assessment ? (d.assessment.show_in_assessments ? 'Added to Assessments' : 'Not Added') : '',
  ]);
  downloadCsv(`banha-all-recordings-${today()}`, headers, rows);
}

/** Raw sensor readings of one recording, one row per data packet. */
export function exportRecordingReadingsCsv(recording: Recording, readings: EnvironmentalReading[]) {
  const headers = [
    'Recording ID',
    'Assessment Group',
    'Recording Start',
    'Recording End',
    'Recording Status',
    'Packet Number',
    'Recorded At',
    'Date',
    'Time',
    'Temperature (C)',
    'Temperature Status',
    'Noise (dBA)',
    'Noise Status',
  ];
  const rows = readings.map((r) => [
    recording.id,
    recording.group?.name ?? '',
    recording.started_at,
    recording.ended_at ?? '',
    STATUS_LABEL[recording.status] ?? recording.status,
    r.packet_number,
    r.recorded_at,
    formatDateShort(r.recorded_at),
    formatTime(r.recorded_at),
    r.average_temperature,
    getTemperatureStatus(r.average_temperature),
    r.average_noise,
    getNoiseStatus(r.average_noise),
  ]);
  downloadCsv(`banha-recording-${recording.id.slice(0, 8)}-${today()}`, headers, rows);
}

/** Exactly the assessments passed in (i.e. the currently filtered table). */
export function exportAssessmentsCsv(rows: AnalysisRow[]) {
  const headers = [
    'Assessment ID',
    'Assessment',
    'Subject',
    'Section',
    'Group',
    'Assessment Type',
    'Assessment Number',
    'Assessment Date',
    'Classroom / Room Type',
    'Class Schedule',
    'Class Average Score',
    'Total Possible Score',
    'Score Percentage',
    'Details Status',
    'Assessment Progress',
    'Added to Assessments Page',
    'Assessment Group (Recordings)',
    'Recordings',
    'Recording IDs',
    'Recording Dates',
    'Data Packets',
    'Average Temperature (C)',
    'Highest Temperature (C)',
    'Lowest Temperature (C)',
    'Average Noise (dBA)',
    'Highest Noise (dBA)',
    'Lowest Noise (dBA)',
  ];
  const csvRows = rows.map((r) => {
    const a = r.assessment;
    return [
      a.id,
      assessmentTitle(a),
      a.subject ?? '',
      a.section ?? '',
      a.group_type ?? '',
      a.assessment_type ?? '',
      a.assessment_number ?? '',
      a.assessment_date,
      distinctValues(r.recordings.map((x) => x.classroom_type)).join('; '),
      distinctValues(r.recordings.map((x) => x.class_schedule)).join('; '),
      a.class_average_score ?? '',
      a.total_possible_score ?? '',
      a.score_percentage ?? '',
      getAssessmentState(a, r.recordings) === 'completed' ? 'Completed' : 'Incomplete',
      a.is_finalized ? 'Completed' : 'Ongoing',
      a.show_in_assessments ? 'Added to Assessments' : 'Not Added',
      a.group?.name ?? '',
      r.recordings.length,
      r.recordings.map((x) => x.id).join('; '),
      r.recordings.map((x) => formatDateTime(x.started_at)).join('; '),
      r.packetCount,
      r.avgTemperature,
      r.peakTemperature,
      r.lowestTemperature,
      r.avgNoise,
      r.peakNoise,
      r.lowestNoise,
    ];
  });
  downloadCsv(`banha-assessments-${today()}`, headers, csvRows);
}
