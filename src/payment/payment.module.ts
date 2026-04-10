import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { OdooModule } from '../odoo/odoo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [OdooModule, AuthModule],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
