import { Info } from 'lucide-react';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { EnvironmentalThresholdTables } from './EnvironmentalThresholdTables';

export function EnvironmentalStatusInfo({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-md text-slate-400 hover:bg-secondary-50 hover:text-secondary-700 ${compact ? 'p-1' : 'border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-50'
          }`}
        title="How environmental status is determined"
      >
        <Info size={13} />
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
            Each reading is classified using the study&apos;s Temperature and Acoustic Noise ranges below. Readings
            are classified by their whole-number part, so a value that has not yet reached the next whole number
            stays in its current band.
          </p>
          <EnvironmentalThresholdTables />
        </div>
      </Modal>
    </>
  );
}
