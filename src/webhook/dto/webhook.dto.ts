import {
  IsString,
  IsUrl,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WEBHOOK_EVENT_TYPES, WebhookEventType } from '../../common/constants';

export class RegisterWebhookDto {
  @ApiProperty({ example: 'billing-service' })
  @IsString()
  serviceName: string;

  @ApiProperty({ example: 'https://billing.example.com/webhooks' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url: string;

  @ApiProperty({
    example: ['partner.created', 'partner.updated', 'invoice.created'],
    enum: WEBHOOK_EVENT_TYPES,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEBHOOK_EVENT_TYPES, { each: true })
  eventTypes: WebhookEventType[];
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ example: 'https://billing.example.com/webhooks/v2' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url?: string;

  @ApiPropertyOptional({
    example: ['partner.created'],
    enum: WEBHOOK_EVENT_TYPES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(WEBHOOK_EVENT_TYPES, { each: true })
  eventTypes?: WebhookEventType[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
