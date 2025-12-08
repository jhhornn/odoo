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
      `,
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Odoo Generic', 'Dynamic operations for any Odoo model')
    .addTag('Partners', 'Customer and Vendor management')
    .addTag('Products', 'Product catalog management')
    .addTag('Invoices', 'Invoice and Payment management')
    .addTag('Odoo Model Metadata', 'Explore Odoo models and fields')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
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

  console.log(`📚 API Documentation: http://localhost:${process.env.PORT || 3000}/api`);
}
