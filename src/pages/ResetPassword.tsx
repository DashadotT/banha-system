import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/States';
import { useAuth } from '../context/AuthContext';
import { updatePassword } from '../services/authService';
import {
  INVALID_LINK_MESSAGE,
  MIN_PASSWORD_LENGTH,
  readRecoveryUrlError,
  validateNewPassword,
} from '../utils/passwordRecovery';

/** How long to wait for Supabase to establish the recovery session from the link. */
const SESSION_WAIT_MS = 6000;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { session, isRecovery, isLoading, logout } = useAuth();
  // Read once, before Supabase cleans the URL.
  const [urlError] = useState(readRecoveryUrlError);
  const [timedOut, setTimedOut] = useState(false);
  const [sessionLost, setSessionLost] = useState(false);
  const [done, setDone] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), SESSION_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  const ready = isRecovery && Boolean(session) && !sessionLost;
  const invalid = !done && (Boolean(urlError) || sessionLost || (!ready && timedOut && !isLoading));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !ready) return;
    setError(null);

    const validation = validateNewPassword(password, confirm);
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
    } catch (err) {
      const e2 = err as { code?: string; status?: number; message?: string };
      if (e2.code === 'same_password') {
        setError('Your new password must be different from your current password.');
      } else if (e2.code === 'weak_password') {
        setError(e2.message || 'That password is too weak. Choose a stronger one.');
      } else if (e2.status === 401 || e2.status === 403 || e2.code === 'session_not_found' || e2.code === 'session_expired') {
        setSessionLost(true); // link expired while the page was open
      } else {
        setError('We could not update your password. Please try again.');
      }
      setSubmitting(false);
      return;
    }

    // Password changed: end the recovery session so the researcher signs in normally.
    setDone(true);
    try {
      await logout();
    } catch {
      // the password is already updated; ignore sign-out hiccups
    }
    navigate('/login', { replace: true, state: { passwordReset: true } });
  }

  const inputClass =
    'w-full rounded-md border border-border bg-white py-2.5 pl-9 pr-10 text-sm text-primary placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your BANHA account">
      {!ready && !invalid && <LoadingState label={done ? 'Password updated — redirecting to login…' : 'Verifying your recovery link…'} />}

      {invalid && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{urlError ?? INVALID_LINK_MESSAGE}</span>
          </div>
          <Link
            to="/forgot-password"
            onClick={() => void logout().catch(() => undefined)}
            className="block rounded-md bg-primary px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-700"
          >
            Request a new link
          </Link>
        </div>
      )}

      {ready && !invalid && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-slate-700">
              New password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="new-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={show ? 'Hide passwords' : 'Show passwords'}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {password.length}/{MIN_PASSWORD_LENGTH} characters minimum
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-slate-700">
              Confirm new password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="confirm-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the new password"
                className={inputClass}
              />
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="mt-1 text-xs text-rose-600">The two passwords do not match.</p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
          )}

          <Button type="submit" variant="primary" className="w-full" loading={submitting} disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      )}

      <Link
        to="/login"
        onClick={() => void logout().catch(() => undefined)}
        className="mt-5 inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium text-secondary-700 hover:text-primary"
      >
        <ArrowLeft size={13} />
        Back to login
      </Link>
    </AuthShell>
  );
}
