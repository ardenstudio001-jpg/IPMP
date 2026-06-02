import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateListItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  regularPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salesPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalSellingPrice?: number;

  /** Replace all source names when provided */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  /** Replace all requested-by names when provided */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requestedBy?: string[];

  /** Replace all stock-owner names when provided */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stockOwner?: string[];
}
