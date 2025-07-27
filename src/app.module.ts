import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OdooModule } from './odoo/odoo.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OdooModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
