import { VerificationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateVerificationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualQuantity?: number;

  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
