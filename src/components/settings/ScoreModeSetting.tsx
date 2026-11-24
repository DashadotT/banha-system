import { Percent, Sigma } from 'lucide-react';
import { Card, CardHeader } from '../common/Card';
import { useScoreMode } from '../../context/ScoreModeContext';
import { SCORE_MODE_META, type ScoreMode } from '../../utils/scoreMode';

const OPTIONS: { value: ScoreMode; icon: typeof Percent; description: string }[] = [
  {
    value: 'percentage',
    icon: Percent,
    description: 'Class average ÷ total possible score × 100. Makes assessments with different totals comparable.',
  },
  {
    value: 'average',
    icon: Sigma,
    description: "The class's average score exactly as entered in the assessment details, in points.",
  },
];

/** Chooses which score the Assessments table and Statistical Analysis use. */
export function ScoreModeSetting() {
  const { mode, setMode } = useScoreMode();

  return (
    <Card>
      <CardHeader
        title="Score Display & Analysis"
        subtitle="Choose which score the Assessments table and Statistical Analysis use"
      />
      <div role="radiogroup" aria-label="Score used for assessments and analysis" className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {OPTIONS.map(({ value, icon: Icon, description }) => {
          const selected = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(value)}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                selected ? 'border-primary bg-primary-50/60 ring-1 ring-primary' : 'border-border bg-white hover:bg-surface'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                  selected ? 'bg-primary text-white' : 'bg-surface text-slate-500'
                }`}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-primary">{SCORE_MODE_META[value].label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Applies to the score column of the <strong>Assessments</strong> table and to the Descriptive Statistics,
        Pearson Correlation, Paired T-Test and Report in <strong>Statistical Analysis</strong>. The choice is saved in
        this browser.
      </p>
    </Card>
  );
}
