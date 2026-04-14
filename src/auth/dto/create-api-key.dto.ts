import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsArray,
  IsOptional,
  IsDateString,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'octohealth', description: 'External system name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'systemName must be alphanumeric (with hyphens/underscores)',
  })
  systemName: string;

  @ApiProperty({
    example: ['read', 'write'],
    required: false,
    description: 'Permission scopes',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  scopes?: string[];

  @ApiProperty({
    example: 'default',
    required: false,
    description: 'Rate limit tier',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  rateLimitTier?: string;

  @ApiProperty({
    example: '2025-12-31T23:59:59Z',
    required: false,
    description: 'Expiration date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
