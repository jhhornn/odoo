const MAX_FAULT_LENGTH = 500;
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
]);

/**
 * Reduce an Odoo XML-RPC fault to a client-safe one-line message.
 *
 * Odoo puts the full Python traceback in `faultString` for unexpected errors.
 * That leaks server internals (paths, module versions, SQL), so only the final
 * exception line is kept, without the `odoo.exceptions.` module prefix.
 */
export function summarizeOdooFault(message: string | undefined): string {
  if (!message) return 'Unknown Odoo error';

  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let summary = lines[0] ?? message;
  if (/^Traceback \(most recent call last\)/.test(summary)) {
    summary = lines[lines.length - 1];
  }

  summary = summary.replace(/^(?:\w+\.)+(\w+):\s*/, '$1: ');
  return summary.length > MAX_FAULT_LENGTH
    ? `${summary.slice(0, MAX_FAULT_LENGTH)}…`
    : summary;
}

/** True when the error is a network-level failure rather than an Odoo fault */
export function isConnectionError(error: any): boolean {
  return Boolean(error?.code && CONNECTION_ERROR_CODES.has(error.code));
}

/** True when Odoo rejected the stored credentials (e.g. password rotated) */
export function isAccessDenied(error: any): boolean {
  return /AccessDenied/.test(
    String(error?.faultString ?? error?.message ?? ''),
  );
}
