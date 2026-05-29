import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePricingSettingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  investmentFundRate: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  operationProfitRate: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  netProfitRateOfOP: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  payrollRateOfOPMinusNP: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  otherCostsRateOfOPMinusNP: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  salesTaxRate20: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  salesTaxRate4: number;

  @IsOptional()
  @IsString()
  name?: string;
}
