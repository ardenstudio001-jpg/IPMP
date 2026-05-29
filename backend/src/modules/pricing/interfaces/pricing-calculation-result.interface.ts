import { Decimal } from '@prisma/client/runtime/client';

export interface PricingCalculationResult {
  totalCostPrice: Decimal;
  investmentFund: Decimal;
  operationProfit: Decimal;
  netProfit: Decimal;
  payrollFund: Decimal;
  otherCosts: Decimal;
  grossProfit: Decimal;
  priceBeforeTax: Decimal;
  minimum20Percent: Decimal;
  minimum4Percent: Decimal;
}
