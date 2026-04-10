import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ErrorsInterceptor } from './common/interceptors/error.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { setupSwagger } from './common/config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ErrorsInterceptor());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors();
  app.setGlobalPrefix('api/v1');
  setupSwagger(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Server running on: http://localhost:${port}/api/v1`);
  logger.log(`API Documentation: http://localhost:${port}/doc`);
}

bootstrap();
