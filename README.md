# Odoo NestJS Integration

Enterprise-grade NestJS module for Odoo ERP integration via XML-RPC.

## Features
- � **High Performance**: Optimized XML-RPC client
- 🛡️ **Type Safe**: Fully typed DTOs and Responses
- 🔌 **Easy Integration**: Plug-and-play module
- 📝 **Beautiful Documentation**: Swagger UI included
- 🧩 **Modular Design**: Extendable architecture

## Installation

```bash
npm install
```

## Running the Application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## API Documentation
Start the application and visit:
`http://localhost:3000/api`

## Extensibility Guide

This project is designed to be easily extensible. Here is how you can add support for a new Odoo module (e.g., **Accounting**).

### 1. Create Module Structure
Create a new directory `src/accounting` with the following structure:
```
src/accounting/
├── dto/
│   ├── index.ts
│   ├── create-account.dto.ts
│   └── update-account.dto.ts
├── accounting.controller.ts
├── accounting.module.ts
└── accounting.service.ts
```

### 2. Create DTOs
Define your Data Transfer Objects in `src/accounting/dto/`. Use `class-validator` and `@nestjs/swagger` decorators.

```typescript
// src/accounting/dto/create-account.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Bank' })
  @IsString()
  name: string;

  @ApiProperty({ example: '101000' })
  @IsString()
  code: string;
}
```

### 3. Implement Service
Create `AccountingService` extending `BaseOdooService` (if available) or using `OdooService`.

```typescript
// src/accounting/accounting.service.ts
import { Injectable } from '@nestjs/common';
import { OdooService } from '../odoo/odoo.service';

@Injectable()
export class AccountingService {
  constructor(private readonly odooService: OdooService) {}

  async create(values: any) {
    return this.odooService.create('account.account', values);
  }
}
```

### 4. Implement Controller
Create `AccountingController` to expose endpoints.

```typescript
// src/accounting/accounting.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Post()
  async create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }
}
```

### 5. Register Module
Register your new module in `src/app.module.ts`.

```typescript
import { AccountingModule } from './accounting/accounting.module';

@Module({
  imports: [
    // ... other modules
    AccountingModule,
  ],
})
export class AppModule {}
```

### 6. Export (Optional)
If you want this to be available in the npm package, export it in `src/index.ts`.

```typescript
export { AccountingModule } from './accounting/accounting.module';
export { AccountingService } from './accounting/accounting.service';
export * from './accounting/dto';
```

## License
MIT
