// ── Redis cache prefixes ─────────────────────────────────────────────
export const API_KEY_CACHE_PREFIX = 'apikey:';
export const WEBHOOK_REG_CACHE_PREFIX = 'webhook:active:';
export const ODOO_CACHE_PREFIX = 'odoo:cache:';

// ── Redis cache TTLs (seconds) ──────────────────────────────────────
export const API_KEY_CACHE_TTL = 60;
export const WEBHOOK_REG_CACHE_TTL = 30;
export const ODOO_CACHE_TTL = 60;
