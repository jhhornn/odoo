# NestJS Odoo XML-RPC API Integration

A comprehensive NestJS API that interfaces with Odoo's XML-RPC endpoints, providing a RESTful wrapper for Odoo operations.
This API is **dynamic and extensible**, with dedicated controllers and DTOs for common models like Partners, Products, and Invoices.

## Features

* ✅ **Complete Odoo API Coverage**: Create, read, update, delete, search, and count records
* ✅ **Dynamic Model Support**: Works with any Odoo model using generic endpoints
* ✅ **Model-Specific Controllers**: Prebuilt controllers & DTOs for **Partners**, **Products**, and **Invoices**
* ✅ **Filtering Support**: Query partners, products, and invoices with flexible filters
* ✅ **RESTful Design**: Clean REST endpoints with proper HTTP methods
* ✅ **TypeScript + Swagger**: Strong typing and auto-generated docs
* ✅ **Error Handling**: Maps Odoo XML-RPC faults to friendly HTTP errors
* ✅ **Extensible**: Easy to add new model-specific controllers and DTOs

## Table of Contents

* [Installation](#installation)
* [Configuration](#configuration)
* [API Endpoints](#api-endpoints)
* [Model-Specific Extensions](#model-specific-extensions)
* [Usage Examples](#usage-examples)
* [Error Handling](#error-handling)
* [Development](#development)

---

## Installation

```bash
git clone <repository-url>
cd nestjs-odoo-api

yarn install
cp .env.example .env
```

Start the app:

```bash
yarn run start:dev
```

---

## Configuration

`.env` file:

```env
ODOO_URL=https://company.odoo.com
ODOO_DATABASE=your_db
ODOO_USERNAME=your_username
ODOO_PASSWORD=your_password
PORT=3000
```

---

## API Endpoints

### Generic Endpoints

All generic endpoints follow `/odoo/{model}/{action}`.

| Method | Endpoint                   | Description           |
| ------ | -------------------------- | --------------------- |
| GET    | `/odoo/:model/fields`      | Get model fields      |
| POST   | `/odoo/:model/search`      | Search for IDs        |
| POST   | `/odoo/:model/search-read` | Search & read         |
| GET    | `/odoo/:model/:ids`        | Read records by ID(s) |
| POST   | `/odoo/:model`             | Create records        |
| PUT    | `/odoo/:model/:ids`        | Update records        |
| DELETE | `/odoo/:model/:ids`        | Delete records        |
| GET    | `/odoo/:model/name-search` | Search by name        |
| POST   | `/odoo/:model/count`       | Count records         |

### Model-Specific Endpoints

#### Partners (`/partners`)

* `GET /partners` → list with filters (DTO-based)
* `GET /partners/:id` → get by ID
* `POST /partners` → create partner
* `PUT /partners/:id` → update partner
* `DELETE /partners/:id` → delete partner

#### Products (`/products`)

* Same as partners, with product-specific DTOs

#### Invoices (`/invoices`)

* `GET /invoices` → list invoices with filters
* `GET /invoices/:id` → fetch invoice by ID
* `POST /invoices` → create invoice (supports lines)
* `PUT /invoices/:id` → update invoice fields
* `DELETE /invoices/:id` → delete invoice

---

## Model-Specific Extensions

We now use **DTOs** to validate inputs and generate proper Swagger documentation.

### Example: Create Invoice

```ts
export class CreateInvoiceDto {
  @ApiProperty({ example: 'out_invoice' })
  move_type: 'out_invoice' | 'in_invoice' | 'out_refund' | 'in_refund';

  @ApiProperty({ example: 7 })
  partner_id: number;

  @ApiPropertyOptional({ example: '2025-08-22' })
  invoice_date?: string;

  @ApiPropertyOptional({ example: 'INV0001' })
  payment_reference?: string;

  @ApiProperty({
    example: [
      [0, 0, { product_id: 42, name: 'Consulting', quantity: 10, price_unit: 150 }]
    ],
  })
  invoice_line_ids: any[];
}
```

> ⚠️ **Note on Products in Invoices**:
> Odoo expects the `product_id` from `product.product` (variant), not `product.template`.
> Use `/products` endpoint to fetch valid IDs before creating invoice lines.

---

## Usage Examples

### Fetch Partners

```bash
GET /partners?name=azure&limit=5
```

### Create Product

```bash
POST /products
{
  "name": "Premium Service",
  "list_price": 199.99,
  "type": "service",
  "sale_ok": true
}
```

### Create Invoice

```bash
POST /invoices
{
  "move_type": "out_invoice",
  "partner_id": 3272,
  "invoice_date": "2025-08-22",
  "invoice_line_ids": [
    [
      0,
      0,
      {
        "name": "Consulting Services",
        "product_id": 135,
        "quantity": 10,
        "price_unit": 150
      }
    ],
    [
      0,
      0,
      {
        "name": "Implementation Support",
        "product_id": 140,
        "quantity": 5,
        "price_unit": 200
      }
    ],
    [
      0,
      0,
      {
        "name": "Maintenance Package",
        "product_id": 145,
        "quantity": 1,
        "price_unit": 500
      }
    ]
  ]
}

```

---

## Error Handling

* **401 Authentication Failed**
* **400 Record Not Found** (e.g., product/product\_id doesn’t exist)
* **400 Invalid Field** if wrong field supplied
* **Type Conversion Errors** are handled (filters/limit/offset cast to numbers)

---

## Development

### Project Structure

```
src/
├── odoo/                # Generic Odoo module
├── partners/            # Partner controller, service, DTOs
├── products/            # Product controller, service, DTOs
├── invoices/            # Invoice controller, service, DTOs
└── app.module.ts
```

### Adding New Models

1. Create a DTO (create/update/filter).
2. Create a service extending `OdooService`.
3. Add a controller with endpoints.
4. Register in `AppModule`.

---


