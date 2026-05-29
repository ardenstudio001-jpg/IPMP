import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateFinalSellingPriceDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalSellingPrice: number;
}
