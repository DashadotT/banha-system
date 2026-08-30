import { HelpCircle } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export function ExplainerButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-50 print:hidden"
      >
        <HelpCircle size={13} />
        How is this calculated?
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="lg"
        footer={
          <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
      </Modal>
    </>
  );
}
