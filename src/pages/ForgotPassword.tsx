import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell';
import { Button } from '../components/common/Button';
import { requestPasswordReset } from '../services/authService';
import { RECOVERY_REQUEST_MESSAGE, isValidEmail } from '../utils/passwordRecovery';

/** Supabase allows roughly one recovery email per minute per address. */
const COOLDOWN_SECONDS = 60;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || cooldown > 0) return;
    setError(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true); // neutral: identical whether or not the account exists
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 429
          ? 'Too many requests. Please wait a minute before requesting another link.'
          : 'We could not send the request. Check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your registered email to receive a recovery link">
      {sent && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          <span>{RECOVERY_REQUEST_MESSAGE}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="recovery-email" className="mb-1.5 block text-xs font-medium text-slate-700">
            Email
          </label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@gmail.com"
              className="w-full rounded-md border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
        )}

        <Button type="submit" variant="primary" className="w-full" loading={submitting} disabled={submitting || cooldown > 0}>
          {submitting ? 'Sending…' : cooldown > 0 ? `Send again in ${cooldown}s` : sent ? 'Send link again' : 'Send recovery link'}
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-5 inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium text-secondary-700 hover:text-primary"
      >
        <ArrowLeft size={13} />
        Back to login
      </Link>
    </AuthShell>
  );
}
