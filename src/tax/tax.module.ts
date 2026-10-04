import { Module } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  // OdooService comes from the global OdooModule registered by the app
  imports: [AuthModule],
  providers: [TaxService],
  controllers: [TaxController],
  exports: [TaxService],
})
export class TaxModule {}
