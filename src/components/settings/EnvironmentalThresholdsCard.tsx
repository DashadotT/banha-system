import { Card, CardHeader } from '../common/Card';
import { EnvironmentalThresholdTables } from '../common/EnvironmentalThresholdTables';

/** Read-only view of the Temperature and Acoustic Noise classification used across BANHA. */
export function EnvironmentalThresholdsCard() {
  return (
    <Card>
      <CardHeader
        title="Temperature & Noise Thresholds"
        subtitle="How readings are classified on the Dashboard, Live Monitoring, Assessments and Analysis"
      />
      <EnvironmentalThresholdTables columns />
      <p className="mt-4 rounded-md bg-surface px-3 py-2 text-xs text-slate-500">
        Readings are classified by their whole-number part: a reading is only moved to the next band once it reaches
        the next whole number. These ranges are defined once in{' '}
        <code className="rounded bg-white px-1 py-0.5">src/utils/calculations.ts</code>.
      </p>
    </Card>
  );
}
