import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, Min } from 'class-validator';

export class ApproveProductDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalSellingPrice: number;

  @IsBoolean()
  printed: boolean;
}
