export const MIN_PASSWORD_LENGTH = 12;

/** localStorage flag: this browser holds a password-recovery session only. */
export const RECOVERY_FLAG_KEY = 'banha:password-recovery';

export const RECOVERY_REQUEST_MESSAGE =
  'If an account is associated with this email address, a password recovery link will be sent.';

export const RECOVERY_SUCCESS_MESSAGE =
  'Your password has been successfully updated. You can now log in using your new password.';

export const INVALID_LINK_MESSAGE =
  'This password recovery link is invalid, has expired, or has already been used. Please request a new one.';

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Returns an error message, or null when the new password is acceptable. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (password !== confirm) return 'The two passwords do not match.';
  return null;
}

/**
 * Supabase reports expired / already-used / invalid recovery links by
 * redirecting back with `error`, `error_code` and `error_description` in the
 * URL hash (or query string). Returns a user-facing message when present.
 */
export function readRecoveryUrlError(hash = window.location.hash, search = window.location.search): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  new URLSearchParams(search).forEach((v, k) => {
    if (!params.has(k)) params.set(k, v);
  });
  if (params.has('error') || params.has('error_code') || params.has('error_description')) {
    return INVALID_LINK_MESSAGE;
  }
  return null;
}
