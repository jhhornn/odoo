import { Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { PartnerController } from './partner.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  // OdooService comes from the global OdooModule registered by the app
  imports: [AuthModule],
  providers: [PartnerService],
  controllers: [PartnerController],
  exports: [PartnerService],
})
export class PartnerModule {}
