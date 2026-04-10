import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { OdooModule } from '../odoo/odoo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [OdooModule, AuthModule],
  providers: [ProductService],
  controllers: [ProductController],
  exports: [ProductService],
})
export class ProductModule {}
