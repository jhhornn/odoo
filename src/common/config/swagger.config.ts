import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configures and initializes Swagger documentation
 * @param app NestJS application instance
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Odoo Integration API')
    .setDescription(
      `
Enterprise-grade NestJS module for Odoo ERP integration via XML-RPC.

### Features
- 🚀 **High Performance**: Optimized XML-RPC client
- 🛡️ **Type Safe**: Fully typed DTOs and Responses
- 🔌 **Easy Integration**: Plug-and-play module

### External System Integration
External systems authenticate via \`X-API-Key\` header. Each system has its own key mapped to a specific Odoo company.
      `,
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API key for external system sync',
      },
      'X-API-Key',
    )
    .addTag('Odoo Generic', 'Dynamic operations for any Odoo model')
    .addTag('Partners', 'Customer and Vendor management')
    .addTag('Products', 'Product catalog management')
    .addTag('Invoices', 'Invoice and Payment management')
    .addTag('Payments', 'Payment registration and management')
    .addTag('Odoo Model Metadata', 'Explore Odoo models and fields')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
    },
    customSiteTitle: 'Odoo API Docs',
  });

}
