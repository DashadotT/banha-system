import { Info } from 'lucide-react';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';

export function EnvironmentalStatusInfo({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-md text-slate-400 hover:bg-secondary-50 hover:text-secondary-700 ${
          compact ? 'p-1' : 'border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-50'
        }`}
        title="How environmental status is determined"
      >
        <Info size={compact ? 13 : 13} />
        {!compact && 'Status guide'}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Environmental Status Guide"
        size="lg"
        footer={
          <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-5 text-sm text-slate-600">
          <p>
            Each 1-minute average is classified as <Badge tone="normal">Normal</Badge>,{' '}
            <Badge tone="moderate">Moderate</Badge>, or <Badge tone="poor">Poor</Badge> using the
            thresholds below. These are configured in one place in the codebase
            (<code className="rounded bg-surface px-1 py-0.5 text-xs">src/utils/calculations.ts</code>)
            and can be adjusted to match your study's specific criteria.
          </p>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              CO₂ (ppm)
            </p>
            <table className="w-full text-left text-xs">
              <tbody>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="normal">Normal</Badge></td>
                  <td className="py-1">Below 1,000 ppm</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="moderate">Moderate</Badge></td>
                  <td className="py-1">1,000 – 1,500 ppm</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="poor">Poor</Badge></td>
                  <td className="py-1">Above 1,500 ppm</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Temperature (°C)
            </p>
            <table className="w-full text-left text-xs">
              <tbody>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="normal">Normal</Badge></td>
                  <td className="py-1">20°C – 26°C</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="moderate">Moderate</Badge></td>
                  <td className="py-1">18°C – 20°C, or 26°C – 30°C</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="poor">Poor</Badge></td>
                  <td className="py-1">Below 18°C, or above 30°C</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Noise (dB)
            </p>
            <table className="w-full text-left text-xs">
              <tbody>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="normal">Normal</Badge></td>
                  <td className="py-1">Below 55 dB</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="moderate">Moderate</Badge></td>
                  <td className="py-1">55 – 70 dB</td>
                </tr>
                <tr>
                  <td className="py-1 pr-3"><Badge tone="poor">Poor</Badge></td>
                  <td className="py-1">Above 70 dB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </>
  );
}
