import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Odoo XML-RPC API')
    .setDescription(
      `
      A comprehensive NestJS API that interfaces with Odoo's XML-RPC endpoints.
      
      ## Features
      - Complete CRUD operations for any Odoo model
      - Dynamic model support via URL parameters
      - RESTful design with proper HTTP methods
      - Full TypeScript support with validation
      
      ## Authentication
      Configure your Odoo credentials in the environment variables:
      - ODOO_URL: Your Odoo instance URL
      - ODOO_DATABASE: Database name
      - ODOO_USERNAME: Username/email
      - ODOO_PASSWORD: Password
      
      ## Usage Examples
      
      ### Get Partners
      \`GET /odoo/res.partner/7,14?fields=name,email\`
      
      ### Create Invoice
      \`POST /odoo/account.move\`
      \`\`\`json
      {
        "values": {
          "move_type": "out_invoice",
          "partner_id": 7,
          "invoice_line_ids": [
            [0, 0, {
              "name": "Service",
              "quantity": 1,
              "price_unit": 100.00
            }]
          ]
        }
      }
      \`\`\`
      
      ### Search Companies
      \`POST /odoo/res.partner/search-read\`
      \`\`\`json
      {
        "domain": [{"field": "is_company", "operator": "=", "value": true}],
        "fields": ["name", "email"],
        "limit": 10
      }
      \`\`\`
    `,
    )
    .setVersion('1.0')
    .addTag('Odoo API', 'Generic endpoints for any Odoo model')
    .addTag('Partners', 'Partner-specific endpoints')
    .addTag('Invoices', 'Invoice-specific endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

bootstrap();
