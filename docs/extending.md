# Extending & Library Usage

This guide covers using `@nestjs-odoo/core` as an **NPM library** in your own NestJS app, and extending it with custom Odoo model modules.

---

## Table of Contents

- [Using as a Library](#using-as-a-library)
  - [Setup](#setup)
  - [Using Built-in Services](#using-built-in-services)
  - [Using OdooService Directly](#using-odooservice-directly)
  - [Dynamic Model Access](#dynamic-model-access)
- [Adding Custom Modules](#adding-custom-modules)
- [Exported API](#exported-api)

---

## Using as a Library

### Setup

Install the package:

```bash
yarn add @nestjs-odoo/core
```

Import the modules you need:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  OdooModule,
  PartnerModule,
  ProductModule,
  InvoiceModule,
} from '@nestjs-odoo/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OdooModule,
    PartnerModule,
    ProductModule,
    InvoiceModule,
  ],
})
export class AppModule {}
```

> `OdooModule` is `@Global()` — importing it once makes `OdooService`, `OdooServiceFactory`, and `OdooConfigService` available throughout your app.

### Using Built-in Services

**PartnerService:**

```typescript
import { Injectable } from '@nestjs/common';
import { PartnerService, CreatePartnerDto } from '@nestjs-odoo/core';

@Injectable()
export class MyCustomerService {
  constructor(private readonly partnerService: PartnerService) {}

  async createCustomer(data: CreatePartnerDto) {
    return this.partnerService.createPartner({
      name: data.name,
      email: data.email,
      phone: data.phone,
      is_company: data.is_company,
      customer_rank: 1,
    });
  }

  async listCustomers() {
    return this.partnerService.findCustomers(50);
  }

  async searchPartners(query: string) {
    return this.partnerService.searchByNameOrEmail(query);
  }
}
```

**ProductService:**

```typescript
import { Injectable } from '@nestjs/common';
import { ProductService } from '@nestjs-odoo/core';

@Injectable()
export class CatalogService {
  constructor(private readonly productService: ProductService) {}

  async getAvailableProducts() {
    return this.productService.findAvailableProducts(100);
  }

  async getLowStockAlerts(threshold = 5) {
    return this.productService.findLowStock(threshold);
  }

  async addProduct(name: string, price: number) {
    return this.productService.createProduct({
      name,
      list_price: price,
      type: 'product',
    });
  }
}
```

**InvoiceService:**

```typescript
import { Injectable } from '@nestjs/common';
import { InvoiceService } from '@nestjs-odoo/core';

@Injectable()
export class BillingService {
  constructor(private readonly invoiceService: InvoiceService) {}

  async createInvoice(partnerId: number, lines: { name: string; quantity: number; price_unit: number }[]) {
    return this.invoiceService.createInvoice({
      partner_id: partnerId,
      move_type: 'out_invoice',
      invoice_line_ids: lines.map((line) => [0, 0, line]),
    });
  }

  async getDraftInvoices() {
    return this.invoiceService.findDraftInvoices();
  }

  async confirmAndPost(invoiceId: number) {
    return this.invoiceService.confirmInvoice(invoiceId);
  }
}
```

### Using OdooService Directly

For models not covered by built-in services:

```typescript
import { Injectable } from '@nestjs/common';
import { OdooService } from '@nestjs-odoo/core';

@Injectable()
export class SaleOrderService {
  constructor(private readonly odoo: OdooService) {}

  async getConfirmedOrders(limit = 50) {
    return this.odoo.searchRead('sale.order', [
      { field: 'state', operator: '=', value: 'sale' },
    ], { limit, fields: ['name', 'partner_id', 'amount_total', 'date_order'] });
  }

  async createOrder(partnerId: number) {
    return this.odoo.create('sale.order', { partner_id: partnerId });
  }
}
```

### Dynamic Model Access

For ad-hoc access to any Odoo model without creating a dedicated service:

```typescript
import { Injectable } from '@nestjs/common';
import { OdooServiceFactory } from '@nestjs-odoo/core';

@Injectable()
export class MyService {
  constructor(private factory: OdooServiceFactory) {}

  async getSaleOrders() {
    const service = this.factory.createForModel('sale.order');
    return service.searchRead(
      [{ field: 'state', operator: '=', value: 'sale' }],
      { limit: 50 },
    );
  }
}
```

---

## Adding Custom Modules

To add support for a new Odoo model (e.g. **Sale Orders**):

### 1. Create the Service

Extend `BaseOdooService` for typed access to any model:

```typescript
// src/sale-order/sale-order.service.ts
import { Injectable } from '@nestjs/common';
import { BaseOdooService } from '../common/services/base.service';
import { OdooService } from '../odoo/odoo.service';

@Injectable()
export class SaleOrderService extends BaseOdooService {
  constructor(odooService: OdooService) {
    super(odooService, 'sale.order');
  }

  async findConfirmedOrders(limit = 80) {
    return this.searchRead(
      [{ field: 'state', operator: '=', value: 'sale' }],
      { limit },
    );
  }

  async confirmOrder(id: number) {
    return this.executeKw('action_confirm', [[id]]);
  }
}
```

### 2. Create DTOs

```typescript
// src/sale-order/dto/create-sale-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateSaleOrderDto {
  @ApiProperty({ example: 42 })
  @IsNumber()
  partner_id: number;
}
```

### 3. Create the Controller

```typescript
// src/sale-order/sale-order.controller.ts
import { Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SaleOrderService } from './sale-order.service';

@ApiTags('Sale Orders')
@Controller('sale-orders')
export class SaleOrderController {
  constructor(private readonly saleOrderService: SaleOrderService) {}

  @Get('confirmed')
  findConfirmed(@Query('limit') limit?: number) {
    return this.saleOrderService.findConfirmedOrders(limit);
  }

  @Put(':id/confirm')
  confirm(@Param('id') id: number) {
    return this.saleOrderService.confirmOrder(+id);
  }
}
```

### 4. Create the Module

```typescript
// src/sale-order/sale-order.module.ts
import { Module } from '@nestjs/common';
import { OdooModule } from '../odoo/odoo.module';
import { SaleOrderService } from './sale-order.service';
import { SaleOrderController } from './sale-order.controller';

@Module({
  imports: [OdooModule],
  controllers: [SaleOrderController],
  providers: [SaleOrderService],
  exports: [SaleOrderService],
})
export class SaleOrderModule {}
```

### 5. Register and Export

Add to `AppModule` and export from the public API:

```typescript
// src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OdooModule,
    PartnerModule,
    InvoiceModule,
    ProductModule,
    SaleOrderModule, // Add here
  ],
})
export class AppModule {}
```

```typescript
// src/index.ts
export * from './sale-order/sale-order.module';
export * from './sale-order/sale-order.service';
```

---

## Exported API

| Export | Type | Description |
|---|---|---|
| `OdooModule` | Module | Core module (global) |
| `PartnerModule` | Module | Partner/Contact management |
| `ProductModule` | Module | Product management |
| `InvoiceModule` | Module | Invoice/Bill management |
| `OdooService` | Service | Low-level Odoo XML-RPC operations |
| `BaseOdooService` | Service | Abstract base for custom model services |
| `PartnerService` | Service | Partner CRUD + queries |
| `ProductService` | Service | Product CRUD + inventory queries |
| `InvoiceService` | Service | Invoice CRUD + workflow actions |
| `OdooConfigService` | Service | Odoo connection configuration |
| `OdooServiceFactory` | Factory | Dynamic service creation for any model |
| `XmlRpcClientFactory` | Factory | XML-RPC client creation |
| `OdooException` | Exception | Typed Odoo errors |
| `OdooErrorCode` | Enum | Error code constants |
| All DTOs | Classes | `CreatePartnerDto`, `CreateProductDto`, `CreateInvoiceDto`, etc. |
| All Interfaces | Types | `SearchDomain`, `SearchOptions`, `ReadOptions`, `IOdooClient`, etc. |
