// ── API key generation ──────────────────────────────────────────────
export const API_KEY_PREFIX = 'octo_odoo_';

// ── NestJS injection tokens ─────────────────────────────────────────
export const API_KEY_PROVIDER = 'API_KEY_PROVIDER';

// ── Metadata keys ───────────────────────────────────────────────────
export const API_RESPONSE_META = 'api_response_metadata';
export const ODOO_MODULE_OPTIONS = 'ODOO_MODULE_OPTIONS';
export const ODOO_API_MODULE_OPTIONS = 'ODOO_API_MODULE_OPTIONS';

// ── Metadata keys (auth) ────────────────────────────────────────────
export const IS_PUBLIC_KEY = 'isPublic';

// ── Odoo client defaults ────────────────────────────────────────────
export const ODOO_DEFAULT_URL = 'http://localhost:8069';
export const ODOO_DEFAULT_TIMEOUT_MS = 30_000;

// ── Pagination ──────────────────────────────────────────────────────
/** Upper bound applied to `limit` query parameters on packaged routes */
export const MAX_PAGE_LIMIT = 1000;
