import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  // OdooService comes from the global OdooModule registered by the app
  imports: [AuthModule],
  providers: [InvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceModule {}
