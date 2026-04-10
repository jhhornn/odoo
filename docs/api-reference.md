# API Reference

Complete endpoint reference for the Odoo NestJS Sync API. All endpoints require the `X-API-Key` header.

```
Base URL: http://localhost:3000
X-API-Key: your-api-key-here
Content-Type: application/json
```

---

## Table of Contents

- [Response Format](#response-format)
- [Odoo Generic Endpoints](#odoo-generic-endpoints)
- [Odoo Model Metadata](#odoo-model-metadata)
- [Partners](#partners)
- [Products](#products)
- [Invoices](#invoices)
- [Payments](#payments)
- [Field Reference](#field-reference)

---

## Response Format

All responses are wrapped in a standard envelope:

**Success:**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}
```

**Error:**

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Description of what went wrong"
}
```

**Odoo Error Codes:**

| Code | Description |
|---|---|
| `AUTHENTICATION_FAILED` | XML-RPC auth failed |
| `INVALID_CREDENTIALS` | Wrong username/password |
| `API_ERROR` | Generic Odoo API error |
| `CONNECTION_ERROR` | Cannot reach Odoo instance |
| `VALIDATION_ERROR` | Invalid data sent to Odoo |
| `RECORD_NOT_FOUND` | Record does not exist |
| `PERMISSION_DENIED` | User lacks access rights |

---

## Odoo Generic Endpoints

Dynamic operations for **any** Odoo model. The model name uses dot notation (e.g. `res.partner`, `product.product`).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/odoo/:model/search` | Search records, returns array of IDs |
| `POST` | `/odoo/:model/search_read` | Search and read records with fields |
| `POST` | `/odoo/:model/search-count` | Count records matching domain |
| `POST` | `/odoo/:model` | Create a new record |
| `GET` | `/odoo/:model/:id` | Read a single record by ID |
| `PUT` | `/odoo/:model/:id` | Update a record |
| `DELETE` | `/odoo/:model/:id` | Delete a record |
| `GET` | `/odoo/:model/fields` | Get model fields metadata |
| `GET` | `/odoo/:model/name-search` | Search by name pattern |

### Search Records

```
POST /odoo/:model/search
```

```json
{
  "domain": [
    { "field": "name", "operator": "ilike", "value": "John" }
  ],
  "limit": 10,
  "offset": 0
}
```

### Search & Read Records

```
POST /odoo/:model/search_read
```

```json
{
  "domain": [
    { "field": "active", "operator": "=", "value": true }
  ],
  "fields": ["name", "email", "phone"],
  "limit": 20,
  "offset": 0
}
```

### Create Record

```
POST /odoo/:model
```

```json
{
  "values": {
    "name": "New Record",
    "email": "new@example.com"
  }
}
```

### Read / Update / Delete

```
GET    /odoo/:model/:id
PUT    /odoo/:model/:id   Body: { "values": { "name": "Updated" } }
DELETE /odoo/:model/:id
```

### Count Records

```
POST /odoo/:model/search-count
```

```json
{
  "domain": [
    { "field": "active", "operator": "=", "value": true }
  ]
}
```

### Name Search

```
GET /odoo/:model/name-search?name=John&limit=10
```

Returns `[id, display_name]` tuples.

---

## Odoo Model Metadata

Introspection endpoints for exploring the Odoo data model.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/odoo/models/info` | Get model info (filter with `?model=res.partner`) |
| `GET` | `/odoo/models/modules` | List installed Odoo modules |
| `GET` | `/odoo/models/modules/:moduleName/models` | Get models belonging to a module |
| `GET` | `/odoo/models/:model/fields/detailed` | Detailed field info (types, relations, constraints) |
| `GET` | `/odoo/models/common-models` | Curated map of commonly used Odoo models |

---

## Partners

Customer, vendor, and contact management on `res.partner`.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/partners` | **Upsert** partner (create or update by `external_ref`) |
| `GET` | `/partners` | List/filter partners |
| `GET` | `/partners/companies` | List company partners |
| `GET` | `/partners/customers` | List customers (`customer_rank > 0`) |
| `GET` | `/partners/vendors` | List vendors (`supplier_rank > 0`) |
| `GET` | `/partners/suppliers` | Alias for `/partners/vendors` |
| `GET` | `/partners/all` | List all customers and vendors |
| `GET` | `/partners/search?q=` | Search by name or email |
| `GET` | `/partners/country/:countryId` | Partners by country |
| `GET` | `/partners/:id` | Get partner by ID |
| `PUT` | `/partners/:id` | Update partner |
| `DELETE` | `/partners/:id` | Delete partner |

### Upsert Request Body

```
POST /partners
```

| Field | Type | Required | Description |
|---|---|---|---|
| `external_ref` | string | **Yes** | Your system's unique ID (max 255 chars). Stored as Odoo `ref`. |
| `name` | string | **Yes** | Full name or company name (max 255 chars). |
| `partner_type` | enum | **Yes** | `"customer"`, `"vendor"`, or `"both"`. Sets `customer_rank`/`supplier_rank`. |
| `email` | string | No | Email address. |
| `phone` | string | No | Phone number (max 32 chars). |
| `mobile` | string | No | Mobile number (max 32 chars). |
| `is_company` | boolean | No | `true` for companies, `false` for individuals. |
| `vat` | string | No | Tax/VAT number (max 64 chars). |
| `street` | string | No | Street address (max 255 chars). |
| `city` | string | No | City (max 128 chars). |
| `country_id` | number | No | Odoo country ID (`res.country`). Nigeria=156, Ghana=84, Cameroon=37. |
| `active` | boolean | No | `false` to archive the partner. Default: `true`. |
| `extra_fields` | object | No | Pass-through to any Odoo field. |

**Example — Create a customer:**

```json
{
  "external_ref": "EXT-CUST-001",
  "name": "Acme Healthcare Ltd",
  "partner_type": "customer",
  "email": "billing@acme.com.ng",
  "phone": "+2348010000000",
  "is_company": true,
  "vat": "NG123456789A",
  "street": "15 Broad Street",
  "city": "Lagos",
  "active": true
}
```

**Example — Create a vendor:**

```json
{
  "external_ref": "EXT-VND-001",
  "name": "Medical Supplies Co",
  "partner_type": "vendor",
  "email": "accounts@medsupply.com.ng",
  "phone": "+2348021000000",
  "is_company": true
}
```

**Example — Update (same `external_ref`):**

```json
{
  "external_ref": "EXT-CUST-001",
  "name": "Acme Healthcare Ltd",
  "partner_type": "customer",
  "phone": "+2348010099999",
  "active": false
}
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "partnerId": 42,
    "created": true,
    "action": "created"
  }
}
```

### List Partners

```
GET /partners?name=Acme&is_company=true&limit=20&offset=0
```

| Param | Type | Description |
|---|---|---|
| `name` | string | Filter by name (case-insensitive substring) |
| `email` | string | Filter by email |
| `is_company` | boolean | Filter companies vs individuals |
| `customer_rank_gt` | number | Customers with rank > value |
| `supplier_rank_gt` | number | Suppliers with rank > value |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

### Search Partners

```
GET /partners/search?q=Acme&limit=10
```

Searches both `name` and `email` fields (case-insensitive substring).

### Get Partner by ID

```
GET /partners/:id
```

Returns: `id`, `name`, `ref`, `email`, `phone`, `mobile`, `street`, `city`, `zip`, `state_id`, `country_id`, `is_company`, `vat`, `customer_rank`, `supplier_rank`, `website`.

> **Note:** `state_id` and `country_id` are returned as `[id, display_name]` tuples. E.g. `country_id: [156, "Nigeria"]`.

---

## Products

Product and plan management on `product.product`.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/products` | **Upsert** product (create or update by `external_ref`) |
| `GET` | `/products` | List/filter products |
| `GET` | `/products/available` | Products available for sale |
| `GET` | `/products/in-stock` | Products currently in stock |
| `GET` | `/products/low-stock?threshold=5` | Products below stock threshold |
| `GET` | `/products/search?q=` | Search by name or internal reference |
| `GET` | `/products/category/:categoryId` | Products by category |
| `GET` | `/products/:id` | Get product by ID |
| `PUT` | `/products/:id` | Update product |
| `PUT` | `/products/:id/price` | Update product price |
| `DELETE` | `/products/:id` | Delete product |

### Upsert Request Body

```
POST /products
```

| Field | Type | Required | Description |
|---|---|---|---|
| `external_ref` | string | **Yes** | Your system's unique ID (max 255 chars). Stored as Odoo `default_code`. |
| `name` | string | **Yes** | Product/plan name (max 255 chars). |
| `type` | enum | No | `"service"` (default), `"product"` (storable), `"consu"` (consumable). |
| `list_price` | number | No | Sales price. Cannot be negative. |
| `standard_price` | number | No | Cost price. Cannot be negative. |
| `categ_id` | number | No | Odoo product category ID. |
| `sale_ok` | boolean | No | Available for sale. Default: `true`. |
| `purchase_ok` | boolean | No | Can be purchased. Default: `true`. |
| `description` | string | No | Product description (max 4000 chars). |
| `active` | boolean | No | `false` to archive. Default: `true`. |
| `extra_fields` | object | No | Pass-through to any Odoo field. |

**Example — Service plan:**

```json
{
  "external_ref": "EXT-PLAN-001",
  "name": "Premium Health Plan",
  "type": "service",
  "list_price": 5000.00,
  "standard_price": 3000.00,
  "sale_ok": true,
  "purchase_ok": false,
  "description": "Annual premium healthcare coverage"
}
```

**Example — Storable product:**

```json
{
  "external_ref": "EXT-PROD-001",
  "name": "Medical Kit A",
  "type": "product",
  "list_price": 1200.00,
  "standard_price": 800.00,
  "sale_ok": true,
  "purchase_ok": true
}
```

**Example — Update pricing (same `external_ref`):**

```json
{
  "external_ref": "EXT-PLAN-001",
  "name": "Premium Health Plan",
  "list_price": 5500.00
}
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "productId": 101,
    "created": true,
    "action": "created"
  }
}
```

### List Products

```
GET /products?name=Premium&limit=20
```

| Param | Type | Description |
|---|---|---|
| `name` | string | Filter by name (case-insensitive) |
| `default_code` | string | Filter by internal reference |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

### Search Products

```
GET /products/search?q=Premium&limit=10
```

Searches both `name` and `default_code` fields.

### Update Product Price

```
PUT /products/:id/price
```

```json
{
  "price": 5500.00
}
```

---

## Invoices

Invoice and bill management on `account.move`.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/invoices` | **Upsert** invoice (create or update by `external_ref`) |
| `GET` | `/invoices` | List/filter invoices |
| `GET` | `/invoices/partner/:partnerId` | Invoices for a specific partner |
| `GET` | `/invoices/:id` | Get invoice by ID |
| `PUT` | `/invoices/:id` | Update invoice |
| `DELETE` | `/invoices/:id` | Delete invoice (draft only) |
| `PUT` | `/invoices/:id/cancel` | Cancel an invoice |
| `PUT` | `/invoices/:id/reset-draft` | Reset invoice to draft |

### Upsert Request Body

```
POST /invoices
```

| Field | Type | Required | Description |
|---|---|---|---|
| `external_ref` | string | **Yes** | Your system's unique invoice/bill ID (max 255 chars). Stored as Odoo `ref`. |
| `move_type` | enum | **Yes** | `"out_invoice"`, `"in_invoice"`, `"out_refund"`, `"in_refund"`. |
| `partner_id` | number | **One of** | Odoo partner ID. |
| `partner_external_ref` | string | **One of** | Your `external_ref` from partner sync. Auto-resolved. |
| `invoice_date` | string | No | Invoice date (`YYYY-MM-DD`). Default: today. |
| `invoice_date_due` | string | No | Payment due date (`YYYY-MM-DD`). |
| `lines` | array | **Yes** | Invoice line items (min 1). See below. |
| `currency_code` | string | No | ISO currency code (e.g. `"USD"`, `"NGN"`). Default: company currency. |
| `journal_id` | number | No | Odoo journal ID. Default: automatic. |
| `narration` | string | No | Notes / PO reference (max 255 chars). |
| `auto_post` | boolean | No | `true` to confirm after creation. Default: `false`. |
| `extra_fields` | object | No | Pass-through to any Odoo field. |

> Either `partner_id` or `partner_external_ref` is required. If both are sent, `partner_id` takes priority.

### Invoice Line Fields (`lines[]`)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** | Line description (1–4000 chars). |
| `quantity` | number | **Yes** | Quantity. Cannot be negative. |
| `price_unit` | number | **Yes** | Unit price. |
| `product_id` | number | No | Odoo product ID. |
| `product_external_ref` | string | No | Your `external_ref` from product sync. Auto-resolved. **Fails if not found.** |
| `discount` | number | No | Discount percentage (0–100). Customer invoices only. |
| `account_id` | number | No | Odoo account ID override. |
| `tax_ids` | any | No | Tax IDs in Odoo command format (e.g. `[[6, 0, [1]]]`). |

**Example — Single-line customer invoice:**

```json
{
  "external_ref": "EXT-INV-001",
  "move_type": "out_invoice",
  "partner_id": 42,
  "invoice_date": "2026-04-08",
  "invoice_date_due": "2026-05-08",
  "lines": [
    {
      "name": "Consulting Fee - April 2026",
      "quantity": 1,
      "price_unit": 5000.00
    }
  ],
  "narration": "PO-2026-001",
  "auto_post": false
}
```

**Example — Multi-line invoice with products and discount:**

```json
{
  "external_ref": "EXT-INV-002",
  "move_type": "out_invoice",
  "partner_external_ref": "EXT-CUST-001",
  "invoice_date": "2026-04-08",
  "invoice_date_due": "2026-05-08",
  "lines": [
    {
      "name": "Premium Health Plan - 3 Months",
      "quantity": 3,
      "price_unit": 5000.00,
      "product_external_ref": "EXT-PLAN-001",
      "discount": 10
    },
    {
      "name": "Medical Kit A",
      "quantity": 10,
      "price_unit": 1200.00,
      "product_external_ref": "EXT-PROD-001"
    },
    {
      "name": "One-Time Setup Fee",
      "quantity": 1,
      "price_unit": 2500.00
    }
  ],
  "currency_code": "NGN",
  "narration": "PO-2026-002",
  "auto_post": true
}
```

**Example — Vendor bill:**

```json
{
  "external_ref": "EXT-BILL-001",
  "move_type": "in_invoice",
  "partner_external_ref": "EXT-VND-001",
  "invoice_date": "2026-04-01",
  "invoice_date_due": "2026-05-01",
  "lines": [
    {
      "name": "Lab Equipment Rental - Q2",
      "quantity": 1,
      "price_unit": 25000.00
    }
  ]
}
```

**Response — Created:**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "invoiceId": 201,
    "created": true,
    "action": "created"
  }
}
```

**Response — Created with `auto_post` failure:**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "invoiceId": 201,
    "created": true,
    "action": "created",
    "autoPostFailed": true,
    "autoPostError": "The journal entry has no line with a receivable or payable account."
  }
}
```

**Response — Already exists, not draft (skipped):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "invoiceId": 201,
    "created": false,
    "action": "skipped",
    "reason": "Invoice is in 'posted' state"
  }
}
```

### Update Behaviour

- Only **draft** invoices can be updated. Posted/cancelled invoices return `action: "skipped"`.
- Only header fields are updated (`invoice_date`, `invoice_date_due`, `narration`, `extra_fields`).
- `lines` are required by DTO validation but **ignored on update**. Use a placeholder line.
- To change line items, delete the draft invoice and recreate it.

### List Invoices

```
GET /invoices?limit=20&move_type=out_invoice
```

| Param | Type | Description |
|---|---|---|
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |
| `move_type` | enum | Filter by type |
| `partner_id` | number | Filter by partner |
| `invoice_date` | string | Filter by exact date |

### Cancel / Reset to Draft

```
PUT /invoices/:id/cancel        # Only posted invoices
PUT /invoices/:id/reset-draft   # Only cancelled invoices
```

---

## Payments

Payment registration on `account.payment`.

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments` | Register a payment for an invoice |

### Request Body

```
POST /payments
```

| Field | Type | Required | Description |
|---|---|---|---|
| `external_ref` | string | **Yes** | Your system's unique payment ID (max 255 chars). Idempotency key. |
| `invoice_id` | number | **One of** | Odoo invoice ID (`account.move`). |
| `invoice_external_ref` | string | **One of** | Your `external_ref` from invoice sync. Auto-resolved. |
| `amount` | number | **Yes** | Payment amount. Must be > 0. |
| `payment_date` | string | No | Payment date (`YYYY-MM-DD`). Default: today. |
| `payment_type` | enum | No | `"inbound"` or `"outbound"`. Auto-detected from invoice type. |
| `partner_type` | enum | No | `"customer"` or `"supplier"`. Auto-detected from invoice type. |
| `journal_id` | number | No | Payment journal ID. Default: automatic. |
| `ref` | string | No | Payment reference/memo (e.g. transaction ID). Max 255 chars. |
| `extra_fields` | object | No | Pass-through to any Odoo field. |

> Either `invoice_id` or `invoice_external_ref` is required.

**Example — Payment by invoice external ref:**

```json
{
  "external_ref": "EXT-PAY-001",
  "invoice_external_ref": "EXT-INV-001",
  "amount": 5000.00,
  "payment_date": "2026-04-10",
  "ref": "MPESA-TXN-ABC123"
}
```

**Example — Payment by invoice ID:**

```json
{
  "external_ref": "EXT-PAY-002",
  "invoice_id": 201,
  "amount": 10000.00,
  "payment_date": "2026-04-15",
  "payment_type": "inbound",
  "partner_type": "customer",
  "ref": "BANK-TXN-456"
}
```

**Response — Created:**

```json
{
  "statusCode": 201,
  "message": "Success",
  "data": {
    "paymentId": 301,
    "created": true,
    "action": "created",
    "invoiceId": 201
  }
}
```

**Response — Already exists (idempotent):**

```json
{
  "statusCode": 201,
  "message": "Success",
  "data": {
    "paymentId": 301,
    "created": false,
    "action": "already_exists"
  }
}
```

---

## Field Reference

### Partner Types

| `partner_type` | Description |
|---|---|
| `customer` | Customer (sets `customer_rank = 1`) |
| `vendor` | Vendor/Supplier (sets `supplier_rank = 1`) |
| `both` | Both customer and vendor |

### Invoice/Bill Types

| `move_type` | Description |
|---|---|
| `out_invoice` | Customer Invoice |
| `in_invoice` | Vendor Bill |
| `out_refund` | Credit Note (customer) |
| `in_refund` | Debit Note (vendor) |

### Product Types

| `type` | Description |
|---|---|
| `service` | Service (no stock tracking) |
| `product` | Storable product (stock tracked) |
| `consu` | Consumable (no stock tracking) |

### Payment Types

| `payment_type` | Description |
|---|---|
| `inbound` | Receipt from customer |
| `outbound` | Payment to vendor |

> `payment_type` and `partner_type` are auto-detected from the invoice type if omitted.
