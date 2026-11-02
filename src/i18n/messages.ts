import { translate } from './translate';

export interface Result {
  success: boolean;
  error?: string;
  errorKey?: string;
  errorVars?: Record<string, string | number>;
  [key: string]: any;
}

/**
 * Pure helper returning a failed Result.
 * The English `error` string is always filled using translate('en', key, vars)
 * so logs, the activity log and old callers keep working.
 */
export function fail<T extends Record<string, any> = Record<string, any>>(
  key: string,
  vars?: Record<string, string | number>,
  extra?: T
): Result & T {
  return {
    success: false,
    error: translate('en', key, vars),
    errorKey: key,
    errorVars: vars,
    ...((extra || {}) as T)
  };
}

/**
 * Pure helper for UI components displaying result errors.
 * Returns t(result.errorKey, result.errorVars) when errorKey exists,
 * otherwise result.error, otherwise the fallback key translated.
 */
export function resultMessage(
  t: (key: string, vars?: any) => string,
  result?: { error?: string; errorKey?: string; errorVars?: Record<string, string | number> } | null,
  fallbackKey?: string
): string {
  if (result?.errorKey) {
    return t(result.errorKey, result.errorVars);
  }
  if (result?.error) {
    return result.error;
  }
  if (fallbackKey) {
    return t(fallbackKey);
  }
  return '';
}

/**
 * Custom Error class that holds an i18n key and interpolation variables.
 * Initialized with English translated message for Error.message fallback.
 */
export class KeyedError extends Error {
  key: string;
  vars?: Record<string, string | number>;

  constructor(key: string, vars?: Record<string, string | number>) {
    super(translate('en', key, vars));
    this.name = 'KeyedError';
    this.key = key;
    this.vars = vars;
  }
}

/**
 * Helper to extract and translate error messages from unknown error objects or KeyedError.
 */
export function errorMessage(
  t: (key: string, vars?: any) => string,
  err: unknown,
  fallbackKey?: string
): string {
  if (err && typeof err === 'object') {
    if ('key' in err && typeof (err as any).key === 'string') {
      return t((err as any).key, (err as any).vars);
    }
    if ('errorKey' in err && typeof (err as any).errorKey === 'string') {
      return t((err as any).errorKey, (err as any).errorVars);
    }
    if ('message' in err && typeof (err as any).message === 'string' && (err as any).message) {
      return (err as any).message;
    }
  }
  if (fallbackKey) {
    return t(fallbackKey);
  }
  return String(err || '');
}
