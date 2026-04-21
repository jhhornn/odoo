import { Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { PartnerController } from './partner.controller';
import { OdooModule } from '../odoo/odoo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [OdooModule, AuthModule],
  providers: [PartnerService],
  controllers: [PartnerController],
  exports: [PartnerService],
})
export class PartnerModule {}
