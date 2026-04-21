// ── BullMQ queue names ──────────────────────────────────────────────
export const WEBHOOK_QUEUE = 'webhook-delivery';

// ── Webhook delivery policy ─────────────────────────────────────────
/** Backoff schedule: 30s → 5m → 30m → 2h → 8h */
export const WEBHOOK_BACKOFF_DELAYS_MS = [
  30_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  8 * 60 * 60_000,
];

export const WEBHOOK_DELIVERY_TIMEOUT_MS = 10_000;
export const WEBHOOK_MAX_FAILURES_BEFORE_DISABLE = 10;
export const WEBHOOK_RESPONSE_PREVIEW_LENGTH = 500;

// ── Webhook event types ─────────────────────────────────────────────
export const WEBHOOK_EVENT_TYPES = [
  'partner.created',
  'partner.updated',
  'product.created',
  'product.updated',
  'invoice.created',
  'invoice.updated',
  'payment.created',
  'payment.exists',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
