// ── Webhook delivery statuses ────────────────────────────────────────
export const DELIVERY_STATUS_SUCCESS = 'success';
export const DELIVERY_STATUS_RETRYING = 'retrying';
export const DELIVERY_STATUS_DEAD_LETTER = 'dead_letter';

// ── Upsert / mutation action strings ────────────────────────────────
export const ACTION_CREATED = 'created';
export const ACTION_UPDATED = 'updated';
export const ACTION_SKIPPED = 'skipped';
export const ACTION_ALREADY_EXISTS = 'already_exists';
export const ACTION_ALREADY_ARCHIVED = 'already_archived';
export const ACTION_ALREADY_ACTIVE = 'already_active';
