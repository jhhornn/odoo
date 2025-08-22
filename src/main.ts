import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ErrorsInterceptor } from './common/interceptors/error.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestInterceptor } from './common/interceptors/request.interceptor';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<ConfigService>(ConfigService);
  const appPort = configService.get('app.port');
  const appGlobalPrefix = configService.get('app.api.version');
  const appHost = `${configService.get('app.host')}/${appGlobalPrefix}`;
  const appHostname = configService.get('app.hostname');
  // const environment = configService.get('environment');
  // const corsOptions = configService.get('cors');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Odoo XML-RPC API')
    .setDescription('API documentation for Odoo XML-RPC endpoints')
    .addServer(appHost)
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

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     validationError: {
  //       target: false,
  //       value: false,
  //     },
  //     exceptionFactory: (validationErrors: ValidationError[] = []) =>
  //       new UnprocessableEntityException(
  //         validationErrors.reduce(
  //           (errorObj, validationList) => ({
  //             ...errorObj,
  //             [validationList.property]: validationList,
  //           }),
  //           {},
  //         ),
  //       ),
  //   }),
  // );

  app.useGlobalInterceptors(
    new ErrorsInterceptor(),
    new RequestInterceptor(),
    new ResponseInterceptor(),
  );

  // app.enableCors();
  app.setGlobalPrefix(appGlobalPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
  });
  await app.listen(appPort, appHostname);

  console.log(`🚀 Application is running on: http://localhost:${appPort}`);
  console.log(`📚 Swagger documentation: http://localhost:${appPort}/api`);
}

bootstrap();
