import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ErrorsInterceptor } from './common/interceptors/error.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { setupSwagger } from './common/config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ErrorsInterceptor());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Server running on: http://localhost:${port}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`API Documentation: http://localhost:${port}/doc`);
  }
}

bootstrap();
