import { Module } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';
import { OdooModule } from '../odoo/odoo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [OdooModule, AuthModule],
  providers: [TaxService],
  controllers: [TaxController],
  exports: [TaxService],
})
export class TaxModule {}
