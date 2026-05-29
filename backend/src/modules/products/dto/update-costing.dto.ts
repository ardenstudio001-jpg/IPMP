import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateCostingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCostPrice: number;
}
