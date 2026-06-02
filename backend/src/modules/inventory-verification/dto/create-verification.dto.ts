import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateVerificationDto {
  @IsUUID()
  listItemId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedQuantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualQuantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
