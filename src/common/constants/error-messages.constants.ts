// ── Auth error messages ──────────────────────────────────────────────
export const ERR_AUTHENTICATION_REQUIRED = 'Authentication required';
export const ERR_TOO_MANY_REQUESTS = 'Too many requests';
export const ERR_AUTH_FAILED_CHECK_CREDENTIALS =
  'Authentication failed - check credentials';

// ── Webhook error messages ──────────────────────────────────────────
export const ERR_WEBHOOK_REGISTRATION_NOT_FOUND =
  'Webhook registration not found';
export const ERR_REGISTRATION_INACTIVE = 'Registration inactive or deleted';
export const ERR_INVALID_URL_FORMAT = 'Invalid URL format';
export const ERR_WEBHOOK_URL_MUST_USE_HTTPS = 'Webhook URLs must use HTTPS';
export const ERR_WEBHOOK_URL_PRIVATE_ADDRESS =
  'Webhook URLs must not point to private or internal addresses';
export const errWebhookServiceNameNotFound = (serviceName: string) =>
  `No active API key found with systemName "${serviceName}"`;

// ── Webhook delivery template messages ──────────────────────────────
export const errTimeout = (ms: number) => `Timeout after ${ms}ms`;
export const errHttpStatus = (status: number) => `HTTP ${status}`;
export const errHttpStatusDetail = (status: number, detail: string) =>
  `HTTP ${status}: ${detail}`;
export const errRateLimited = (delayMs: number) =>
  `Rate limited. Retry after ${delayMs}ms`;
export const errHttp429Retry = (delayMs: number) =>
  `HTTP 429 - retry after ${delayMs}ms`;

// ── Odoo record error messages ──────────────────────────────────────
export const ERR_PRICE_CANNOT_BE_NEGATIVE = 'Price cannot be negative';
export const ERR_PARTNER_OR_REF_REQUIRED =
  'Either partner_id or partner_external_ref must be provided';
export const ERR_INVOICE_OR_REF_REQUIRED =
  'Either invoice_id or invoice_external_ref must be provided';

export const errRecordNotFound = (model: string, id: number | string) =>
  `${model} ID ${id} not found`;
export const errPartnerRefNotFound = (ref: string) =>
  `Partner with external ref '${ref}' not found`;
export const errInvoiceRefNotFound = (ref: string) =>
  `Invoice with external ref '${ref}' not found`;
export const errProductRefNotFound = (ref: string, lineIndex: number) =>
  `Line ${lineIndex}: Product with external ref '${ref}' not found in Odoo`;
export const errCurrencyNotFound = (code: string) =>
  `Currency '${code}' not found or not active in Odoo`;
export const errInvoiceStateBlocked = (
  action: string,
  name: string,
  state: string,
  hint: string,
) => `Cannot ${action} invoice '${name}' in '${state}' state. ${hint}`;
export const errInvoiceMustBePosted = (invoiceId: number, state: string) =>
  `Invoice ID ${invoiceId} must be in 'posted' state to register payment (current: '${state}')`;
export const errOdooRpcFailed = (model: string, method: string, msg: string) =>
  `${model}.${method} failed: ${msg}`;

// ── Config error messages ───────────────────────────────────────────
export const errEnvVarMissing = (key: string) =>
  `Environment variable '${key}' is missing!`;
export const errOdooConfigRequired = (key: string) => `${key} is required`;
