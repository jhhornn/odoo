# NestJS Odoo XML-RPC API Integration

A comprehensive NestJS API that interfaces with Odoo's XML-RPC endpoints, providing a RESTful wrapper for all Odoo operations. This API is designed to be dynamic and extensible, allowing interaction with any Odoo model without code modifications.

## Features

- ✅ **Complete Odoo API Coverage**: All XML-RPC operations (create, read, update, delete, search)
- ✅ **Dynamic Model Support**: Works with any Odoo model using URL parameters
- ✅ **RESTful Design**: Clean REST endpoints with proper HTTP methods
- ✅ **TypeScript Support**: Full type safety and IntelliSense
- ✅ **Swagger Documentation**: Auto-generated API documentation
- ✅ **HTTPS Support**: Works with Odoo.com and self-hosted instances
- ✅ **Error Handling**: Comprehensive error handling with meaningful messages
- ✅ **Extensible**: Easy to add model-specific controllers

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Common Use Cases](#common-use-cases)
- [Model-Specific Extensions](#model-specific-extensions)
- [Error Handling](#error-handling)
- [Development](#development)

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd nestjs-odoo-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Install required packages**
```bash
npm install @nestjs/common @nestjs/core @nestjs/config @nestjs/swagger
npm install xmlrpc reflect-metadata rxjs
npm install -D @types/xmlrpc
```

4. **Create environment file**
```bash
cp .env.example .env
```

5. **Configure your Odoo connection** (see [Configuration](#configuration))

6. **Start the application**
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Configuration

Create a `.env` file in the root directory:

```env
# Odoo Configuration
ODOO_URL=https://company.odoo.com
ODOO_DATABASE=your_database_name
ODOO_USERNAME=your_username
ODOO_PASSWORD=your_password

# Application Configuration
PORT=3000
```

### Supported URL Formats

- **Odoo.com hosted**: `https://company.odoo.com`
- **Self-hosted with HTTPS**: `https://your-server.com:8069`
- **Local development**: `http://localhost:8069`

## API Endpoints

### Base URL Pattern
All endpoints follow the pattern: `/odoo/{model}/{action}`

### Core Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/odoo/:model/fields` | Get model field information |
| `POST` | `/odoo/:model/search` | Search for record IDs |
| `POST` | `/odoo/:model/search-read` | Search and read records |
| `GET` | `/odoo/:model/:ids` | Read specific records by IDs |
| `POST` | `/odoo/:model` | Create new records |
| `PUT` | `/odoo/:model/:ids` | Update existing records |
| `DELETE` | `/odoo/:model/:ids` | Delete records |
| `GET` | `/odoo/:model/name-search` | Search records by name |
| `POST` | `/odoo/:model/count` | Count records matching criteria |

### Swagger Documentation

Access the interactive API documentation at: `http://localhost:3000/api`

## Usage Examples

### 1. Get Model Fields

```bash
GET /odoo/res.partner/fields
```

**Response:**
```json
{
  "name": {
    "string": "Name",
    "type": "char",
    "help": "The name of the partner"
  },
  "email": {
    "string": "Email",
    "type": "char"
  }
}
```

### 2. Search for Records

```bash
POST /odoo/res.partner/search
Content-Type: application/json

{
  "domain": [
    {"field": "is_company", "operator": "=", "value": true}
  ],
  "limit": 10,
  "offset": 0
}
```

**Response:**
```json
[7, 14, 23, 45]
```

### 3. Search and Read Records

```bash
POST /odoo/res.partner/search-read
Content-Type: application/json

{
  "domain": [
    {"field": "customer_rank", "operator": ">", "value": 0}
  ],
  "fields": ["name", "email", "phone"],
  "limit": 5
}
```

**Response:**
```json
[
  {
    "id": 7,
    "name": "Azure Interior",
    "email": "azure@example.com",
    "phone": "+1-555-0123"
  }
]
```

### 4. Create a New Record

```bash
POST /odoo/res.partner
Content-Type: application/json

{
  "values": {
    "name": "New Customer",
    "email": "customer@example.com",
    "is_company": true,
    "phone": "+1-555-0199"
  }
}
```

**Response:**
```json
156
```

### 5. Update Records

```bash
PUT /odoo/res.partner/156
Content-Type: application/json

{
  "values": {
    "phone": "+1-555-0200",
    "street": "123 Main St"
  }
}
```

**Response:**
```json
true
```

### 6. Read Specific Records

```bash
GET /odoo/res.partner/7,14,23?fields=name,email
```

**Response:**
```json
[
  {
    "id": 7,
    "name": "Azure Interior",
    "email": "azure@example.com"
  },
  {
    "id": 14,
    "name": "Deco Addict", 
    "email": "deco@example.com"
  }
]
```

### 7. Delete Records

```bash
DELETE /odoo/res.partner/156
```

**Response:**
```json
true
```

## Common Use Cases

### Creating an Invoice

First, find a valid partner:
```bash
GET /odoo/res.partner/name-search?name=customer&limit=5
```

Then create the invoice:
```bash
POST /odoo/account.move
Content-Type: application/json

{
  "values": {
    "move_type": "out_invoice",
    "partner_id": 7,
    "invoice_date": "2025-07-28",
    "invoice_line_ids": [
      [0, 0, {
        "name": "Consulting Services",
        "quantity": 10,
        "price_unit": 150.00
      }],
      [0, 0, {
        "name": "Travel Expenses",
        "quantity": 1,
        "price_unit": 200.00
      }]
    ]
  }
}
```

### Working with Products

```bash
# Search for products
POST /odoo/product.product/search-read
{
  "domain": [
    {"field": "sale_ok", "operator": "=", "value": true}
  ],
  "fields": ["name", "list_price", "default_code"],
  "limit": 20
}

# Create a new product
POST /odoo/product.product
{
  "values": {
    "name": "New Product",
    "list_price": 99.99,
    "type": "consu",
    "sale_ok": true
  }
}
```

### Managing Sales Orders

```bash
# Create a sales order
POST /odoo/sale.order
{
  "values": {
    "partner_id": 7,
    "order_line": [
      [0, 0, {
        "product_id": 25,
        "product_uom_qty": 2,
        "price_unit": 150.00
      }]
    ]
  }
}
```

## Model-Specific Extensions

You can create specialized controllers for specific models:

```typescript
@Controller('customers')
export class CustomersController {
  constructor(private readonly odooService: OdooService) {}

  @Get()
  async getAllCustomers() {
    return this.odooService.searchRead(
      'res.partner',
      [{ field: 'customer_rank', operator: '>', value: 0 }],
      { fields: ['name', 'email', 'phone'] }
    );
  }

  @Get('companies')
  async getCompanies() {
    return this.odooService.searchRead(
      'res.partner',
      [{ field: 'is_company', operator: '=', value: true }],
      { fields: ['name', 'email', 'website'] }
    );
  }
}
```

## Error Handling

The API provides meaningful error messages:

### Common Errors

1. **Authentication Failed (401)**
```json
{
  "statusCode": 401,
  "message": "Authentication failed"
}
```

2. **Record Not Found (400)**
```json
{
  "statusCode": 400,
  "message": "Odoo API Error: XML-RPC fault: Record does not exist or has been deleted."
}
```

3. **Invalid Field (400)**
```json
{
  "statusCode": 400,
  "message": "Odoo API Error: Invalid field 'invalid_field'"
}
```

### Debugging Tips

1. **Check partner IDs exist** before creating invoices:
```bash
GET /odoo/res.partner/name-search?limit=10
```

2. **Verify model fields** before creating records:
```bash
GET /odoo/account.move/fields
```

3. **Use search-read** to find existing records:
```bash
POST /odoo/res.partner/search-read
{
  "domain": [],
  "fields": ["id", "name"],
  "limit": 5
}
```

## Development

### Project Structure

```
src/
├── odoo/
│   ├── odoo.service.ts       # Core Odoo XML-RPC service
│   ├── odoo.controller.ts    # Generic REST endpoints
│   ├── odoo.module.ts        # Module configuration
│   └── model-specific.controller.ts  # Example extensions
├── app.module.ts
└── main.ts
```

### Adding New Model-Specific Controllers

1. Create a new controller file
2. Inject `OdooService`
3. Use the service methods with your model name
4. Add the controller to your module

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ODOO_URL` | Odoo instance URL | `https://company.odoo.com` |
| `ODOO_DATABASE` | Database name | `production_db` |
| `ODOO_USERNAME` | Username/email | `admin@company.com` |
| `ODOO_PASSWORD` | Password | `secure_password` |
| `PORT` | Application port | `3000` |

### Testing

```bash
# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Building for Production

```bash
npm run build
npm run start:prod
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License

## Support

For issues and questions:
- Create an issue on GitHub
- Check the Swagger documentation at `/api`
- Review Odoo's XML-RPC documentation

---

**Note**: This API is a wrapper around Odoo's XML-RPC interface. Make sure your Odoo instance has XML-RPC enabled and the user has appropriate permissions for the operations you want to perform.