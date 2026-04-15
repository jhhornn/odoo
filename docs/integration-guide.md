# Integration Guide

This guide is for developers of **external systems** (e.g. billing platforms, health apps) that sync data with Odoo through this API. It covers the sync workflows, webhooks, error handling, and idempotency guarantees.

For endpoint details and request/response schemas, see the [API Reference](api-reference.md).

---

## Table of Contents

- [Authentication](#authentication)
- [Sync Workflow](#sync-workflow)
  - [Step 1: Partner Sync](#step-1-partner-sync)
  - [Step 2: Product Sync](#step-2-product-sync)
  - [Step 3: Invoice Sync](#step-3-invoice-sync)
  - [Step 4: Payment Sync](#step-4-payment-sync)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [Idempotency & Retry](#idempotency--retry)

---

## Authentication

Every request must include an API key via the `Authorization` header (preferred) or `X-API-Key` header:

```
Authorization: Bearer sk_live_...
```

or:

```
X-API-Key: sk_live_...
```

API keys are provisioned by the system administrator via `POST /admin/api-keys`. Each key is associated with a `systemName` (e.g. `octohealth`, `octodoc`) that identifies the calling application. Keys are stored as SHA-256 hashes — the plaintext is shown only at creation.

Each key also has:
- **Scopes** — permissions like `["read", "write"]`
- **Rate limit tier** — controls requests-per-minute (default: 100/min)

Missing or invalid keys return `401 Unauthorized`. Exceeding the rate limit returns `429 Too Many Requests` with a `Retry-After` header.

---

## Sync Workflow

Operations have dependencies. Always follow this order:

```
Step 1: Sync Partners     POST /partners        (no dependencies)
Step 2: Sync Products     POST /products        (no dependencies)
            ↓
Step 3: Sync Invoices     POST /invoices        (requires partners + products)
            ↓
Step 4: Sync Payments     POST /payments        (requires posted invoices)
```

> **Steps 1 and 2 are independent** and can run in parallel.

| Step | Endpoint | Depends On | Why |
|---|---|---|---|
| 1 | `POST /partners` | Nothing | Partners must exist before invoices reference them. |
| 2 | `POST /products` | Nothing | Products must exist before invoice lines reference them. |
| 3 | `POST /invoices` | Steps 1 & 2 | Resolves partners by `partner_external_ref` and products by `product_external_ref`. |
| 4 | `POST /payments` | Step 3 | Resolves invoices by `invoice_external_ref`. Invoice must be in `posted` state. |

---

### Step 1: Partner Sync

**Endpoint:** `POST /partners`

When a customer or vendor is created or updated in your system, push it to Odoo.

**How it works:**

1. The API checks if a partner with the given `external_ref` already exists in Odoo (matched by `ref` field).
2. **Not found** → creates the partner with the correct rank.
3. **Found** → updates basic fields (name, email, phone, address, active status).
4. Emits a webhook event (`partner.created` or `partner.updated`) to your registered endpoint.

**Key points:**

- `external_ref` is stored as Odoo's `ref` field and used for all future lookups.
- `partner_type` sets `customer_rank` and/or `supplier_rank` automatically.
- Set `active: false` to archive (soft-delete) a partner. The API searches both active and archived records.
- `action` in the response is `"created"` on first call, `"updated"` on subsequent calls.

**Example:**

```json
{
  "external_ref": "EXT-CUST-001",
  "name": "Acme Healthcare Ltd",
  "partner_type": "customer",
  "email": "billing@acme.com.ng",
  "phone": "+2348010000000",
  "is_company": true,
  "city": "Lagos"
}
```

---

### Step 2: Product Sync

**Endpoint:** `POST /products`

When a plan or product is created or updated in your system, push it to Odoo.

**How it works:**

1. The API checks if a product with the given `external_ref` already exists in Odoo (matched by `default_code`).
2. **Not found** → creates the product.
3. **Found** → updates basic fields (name, prices, type, active status).
4. Emits a webhook event (`product.created` or `product.updated`) to your registered endpoint.

**Key points:**

- `external_ref` is stored as Odoo's `default_code` (Internal Reference).
- `type: "service"` = no inventory tracking (plans, consulting). `type: "product"` = stock-tracked.
- Storable products may require Inventory/User role in Odoo.

**Example:**

```json
{
  "external_ref": "EXT-PLAN-001",
  "name": "Premium Health Plan",
  "type": "service",
  "list_price": 5000.00,
  "standard_price": 3000.00
}
```

---

### Step 3: Invoice Sync

**Endpoint:** `POST /invoices`

When an invoice or vendor bill is created in your system, push it to Odoo.

> **Prerequisites:** Partners and products referenced in the invoice must already exist in Odoo (Steps 1 & 2).

**How it works:**

1. Resolves the partner — by `partner_id` (Odoo ID) or `partner_external_ref` (your ref from Step 1).
2. Resolves products on line items — by `product_id` or `product_external_ref` (from Step 2). If a `product_external_ref` is not found, the entire request **fails**.
3. Checks if an invoice with the given `external_ref` already exists:
   - **Not found** → creates the invoice with line items.
   - **Found (draft)** → updates header fields only (dates, narration). Lines are not modified.
   - **Found (posted/cancelled)** → skips update, returns `action: "skipped"`.
4. If `auto_post: true`, confirms the invoice after creation. Posting failure leaves it in draft with error details in the response.
5. Emits a webhook event (`invoice.created` or `invoice.updated`) to your registered endpoint.

**Key points:**

- Use `partner_external_ref` when you don't know the Odoo ID. Use `partner_id` for faster lookups when you have it cached.
- `lines` are only used on **create**. Updates ignore them — use a placeholder.
- Draft invoices can be deleted via `DELETE /invoices/:id`. Posted invoices require credit notes.
- `currency_code` (e.g. `"NGN"`) sets the invoice currency. The currency must be active in Odoo.

**Example — Customer invoice:**

```json
{
  "external_ref": "EXT-INV-001",
  "move_type": "out_invoice",
  "partner_external_ref": "EXT-CUST-001",
  "invoice_date": "2026-04-08",
  "invoice_date_due": "2026-05-08",
  "auto_post": true,
  "lines": [
    {
      "name": "Premium Health Plan - April 2026",
      "quantity": 1,
      "price_unit": 5000.00,
      "product_external_ref": "EXT-PLAN-001"
    },
    {
      "name": "Setup Fee",
      "quantity": 1,
      "price_unit": 500.00
    }
  ]
}
```

**Example — Vendor bill:**

```json
{
  "external_ref": "EXT-BILL-001",
  "move_type": "in_invoice",
  "partner_external_ref": "EXT-VND-001",
  "lines": [
    {
      "name": "Medical supplies",
      "quantity": 100,
      "price_unit": 25.00
    }
  ]
}
```

---

### Step 4: Payment Sync

**Endpoint:** `POST /payments`

When a payment is received against an invoice, push it to Odoo.

> **Prerequisites:** The invoice must exist in Odoo and be in `posted` state. Use `auto_post: true` in Step 3, or confirm manually in Odoo.

**How it works:**

1. Checks if a payment with the same `external_ref` already exists. If so, returns the existing record (**idempotent**).
2. Resolves the invoice by `invoice_id` or `invoice_external_ref`.
3. Validates the invoice is in `posted` state.
4. Auto-detects `payment_type` and `partner_type` from the invoice:
   - Customer invoice (`out_invoice`) → `inbound` payment, `customer`
   - Vendor bill (`in_invoice`) → `outbound` payment, `supplier`
5. Creates and posts the payment.
6. Emits a webhook event (`payment.created` or `payment.exists`) to your registered endpoint.

**Key points:**

- `external_ref` should be a truly unique ID from your payment gateway (e.g. M-Pesa transaction ID).
- Partial payments are supported. Call multiple times with different `external_ref` values.
- Odoo tracks the remaining balance via `amount_residual` and updates `payment_state` (`not_paid` → `partial` → `paid`).

**Example:**

```json
{
  "external_ref": "EXT-PAY-001",
  "invoice_external_ref": "EXT-INV-001",
  "amount": 5000.00,
  "payment_date": "2026-04-10",
  "ref": "MPESA-TXN-ABC123"
}
```

---

## Webhooks

Webhooks deliver real-time notifications to your application when sync operations complete. Each application registers its own webhook URL and receives **only events it triggered** — Octohealth's partner upsert notifies Octohealth's webhook, not Octodoc's.

### Registration

Register a webhook endpoint via `POST /admin/webhooks`:

```json
{
  "serviceName": "octohealth",
  "url": "https://octohealth.example.com/webhooks",
  "eventTypes": ["partner.created", "partner.updated", "invoice.created", "payment.created"]
}
```

The response includes a `signingSecret` — store it securely. It's shown **only once** and is needed to verify webhook signatures.

### Delivery

When an event occurs:

1. The event is persisted in the database (for audit and replay)
2. A BullMQ job is enqueued for each matching webhook registration
3. The worker POSTs the payload to your URL with HMAC-SHA256 signature headers:

```
POST https://octohealth.example.com/webhooks
Content-Type: application/json
X-Webhook-Signature: t=1712764800000,v1=a1b2c3...
X-Webhook-ID: <event-uuid>
X-Webhook-Event: partner.created
```

**Payload:**

Every webhook payload follows a common structure with extra fields per resource type:

```json
{
  "model": "<odoo-model>",
  "externalRef": "<your-external-ref>",
  "<resource>Id": 42,
  "created": true,
  "action": "created"
}
```

**Common fields (always present):**

| Field | Type | Description |
|---|---|---|
| `model` | string | Odoo model name (e.g. `res.partner`, `account.move`) |
| `externalRef` | string | The `external_ref` you provided in the upsert/create request |
| `<resource>Id` | number | The Odoo record ID (`partnerId`, `productId`, `invoiceId`, or `paymentId`) |
| `created` | boolean | `true` if a new record was created, `false` if an existing record was matched |
| `action` | string | What happened — see per-resource table below |

#### Partner events (`partner.created`, `partner.updated`)

```json
{
  "model": "res.partner",
  "externalRef": "EXT-CUST-001",
  "partnerId": 42,
  "created": true,
  "action": "created"
}
```

| `action` | Meaning |
|---|---|
| `created` | New partner created in Odoo |
| `updated` | Existing partner matched by `external_ref` and updated |

#### Product events (`product.created`, `product.updated`)

```json
{
  "model": "product.product",
  "externalRef": "PLAN-PRO-MONTHLY",
  "productId": 17,
  "created": false,
  "action": "updated"
}
```

| `action` | Meaning |
|---|---|
| `created` | New product created in Odoo |
| `updated` | Existing product matched by `external_ref` and updated |

#### Invoice events (`invoice.created`, `invoice.updated`)

```json
{
  "model": "account.move",
  "externalRef": "INV-2026-001",
  "invoiceId": 103,
  "created": true,
  "action": "created"
}
```

| `action` | Meaning | Extra fields |
|---|---|---|
| `created` | New invoice created in Odoo | `autoPostFailed?: boolean`, `autoPostError?: string` |
| `updated` | Existing draft invoice updated | — |
| `skipped` | Existing invoice was not in draft state, update skipped | `reason: string` |

> **Note:** When `action` is `skipped`, the event type is still `invoice.updated` (since `created` is `false`), even though the invoice was not modified.

#### Payment events (`payment.created`, `payment.exists`)

```json
{
  "model": "account.payment",
  "externalRef": "PAY-2026-001",
  "paymentId": 88,
  "created": true,
  "action": "created",
  "invoiceId": 103
}
```

| `action` | Meaning | Extra fields |
|---|---|---|
| `created` | New payment registered in Odoo | `invoiceId: number`, optionally `postFailed?: boolean`, `postError?: string` |
| `already_exists` | Duplicate `external_ref` — existing payment returned | — |

### Verifying Signatures

Verify the `X-Webhook-Signature` header to ensure the payload is authentic:

```typescript
const [tPart, vPart] = signatureHeader.split(',');
const timestamp = tPart.slice(2);
const receivedSig = vPart.slice(3);

const message = `${timestamp}.${rawBody}`;
const expected = crypto.createHmac('sha256', signingSecret).update(message).digest('hex');

// Use timing-safe comparison
const valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedSig, 'hex'));

// Also reject if timestamp is older than 5 minutes (replay protection)
```

### Retry & Failure Handling

- **Retry schedule:** 30s → 5m → 30m → 2h → 8h (5 retries after initial attempt)
- **Auto-disable:** After 10 consecutive failures across events, the webhook registration is automatically deactivated
- **429 handling:** If your endpoint returns `429`, the system respects the `Retry-After` header
- **Dead letter:** After all retries are exhausted, the delivery is marked `dead_letter`
- A failed webhook **never** rolls back the Odoo operation

### Delivery Logs

View delivery history via `GET /admin/webhooks/:id/deliveries`. Each attempt logs: status, HTTP response code, latency, response preview, and error message.

### Event Types

| Event | Trigger |
|---|---|
| `partner.created` | New partner created |
| `partner.updated` | Existing partner updated |
| `product.created` | New product created |
| `product.updated` | Existing product updated |
| `invoice.created` | New invoice created |
| `invoice.updated` | Existing draft invoice updated |
| `payment.created` | New payment registered |
| `payment.exists` | Duplicate `external_ref` — existing record returned |

---

## Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Description or array of validation errors"
}
```

### Common Errors

| HTTP Status | Cause | Example |
|---|---|---|
| 400 | Validation — missing/invalid fields | `["external_ref is required", "move_type must be one of: ..."]` |
| 400 | Resolution failure — ref not found | `"Partner with external ref 'EXT-CUST-999' not found"` |
| 400 | Business rule — wrong state | `"Cannot update invoice in 'posted' state"` |
| 401 | Missing or invalid `X-API-Key` | `"Unauthorized"` |

### Resolution Failures

When `partner_external_ref` or `product_external_ref` doesn't match any record in Odoo, the API returns 400. This usually means:

- The partner/product hasn't been synced yet (run Steps 1 & 2 first).
- The `external_ref` was mistyped.

Product references are resolved per-line — if one line fails, the entire invoice creation is rejected.

---

## Idempotency & Retry

All sync endpoints are safe to retry. The `external_ref`-based lookup prevents duplicates:

| Resource | Behaviour |
|---|---|
| **Partners** | Same `external_ref` → first call creates, subsequent calls update. |
| **Products** | Same behaviour as partners. |
| **Invoices** | Same `external_ref` → creates once, then updates if draft or skips if posted/cancelled. |
| **Payments** | Same `external_ref` → creates once, then returns the existing record. |

If a call fails due to a network error, retry with the same payload. No duplicates will be created.
