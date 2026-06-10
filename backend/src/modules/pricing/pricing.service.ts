import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PricingSetting } from '@prisma/client';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';
import {
  decimalToString,
  roundMoney,
  toDecimal,
} from 'src/common/utils/decimal.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePricingSettingDto } from './dto/create-pricing-setting.dto';
import { PricingCalculationResult } from './interfaces/pricing-calculation-result.interface';

export interface CalculatePricingInput {
  unitCostPrice: number;
  quantity: number;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getActiveSettings(): Promise<PricingSetting> {
    const settings = await this.prisma.pricingSetting.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!settings) {
      throw new BadRequestException(
        'No active pricing settings found. Please configure pricing settings.',
      );
    }

    return settings;
  }

  async calculatePricing(
    input: CalculatePricingInput,
  ): Promise<PricingCalculationResult> {
    const settings = await this.getActiveSettings();
    const unitCost = toDecimal(input.unitCostPrice);
    const quantity = toDecimal(input.quantity);

    const cp = roundMoney(unitCost.mul(quantity));
    const ifAmount = roundMoney(cp.mul(settings.investmentFundRate));
    const op = roundMoney(cp.mul(settings.operationProfitRate));
    const np = roundMoney(op.mul(settings.netProfitRateOfOP));
    const opMinusNp = op.sub(np);
    const payroll = roundMoney(opMinusNp.mul(settings.payrollRateOfOPMinusNP));
    const other = roundMoney(opMinusNp.mul(settings.otherCostsRateOfOPMinusNP));
    const gp2 = roundMoney(ifAmount.add(op));
    const pbt = roundMoney(cp.add(gp2));
    const minimum20Percent = roundMoney(
      pbt.add(pbt.mul(settings.salesTaxRate20)),
    );
    const minimum4Percent = roundMoney(
      pbt.add(pbt.mul(settings.salesTaxRate4)),
    );

    return {
      totalCostPrice: cp,
      investmentFund: ifAmount,
      operationProfit: op,
      netProfit: np,
      payrollFund: payroll,
      otherCosts: other,
      grossProfit: gp2,
      priceBeforeTax: pbt,
      minimum20Percent,
      minimum4Percent,
    };
  }

  async findAll() {
    return await this.prisma.pricingSetting.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return this.getActiveSettings();
  }

  async createSettings(userId: string, dto: CreatePricingSettingDto) {
    const previousActive = await this.prisma.pricingSetting.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.pricingSetting.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      return tx.pricingSetting.create({
        data: {
          ...dto,
          isActive: true,
          createdById: userId,
        },
      });
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRICING_SETTINGS_UPDATED,
      entityType: EntityType.PricingSetting,
      entityId: created.id,
      oldValue: previousActive
        ? this.serializeSetting(previousActive)
        : undefined,
      newValue: this.serializeSetting(created),
    });

    return created;
  }

  async activateSettings(userId: string, id: string) {
    const existing = await this.prisma.pricingSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Pricing settings not found');
    }

    const activated = await this.prisma.$transaction(async (tx) => {
      await tx.pricingSetting.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      return tx.pricingSetting.update({
        where: { id },
        data: { isActive: true },
      });
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRICING_SETTINGS_UPDATED,
      entityType: EntityType.PricingSetting,
      entityId: id,
      oldValue: this.serializeSetting(existing),
      newValue: this.serializeSetting(activated),
    });

    return activated;
  }

  private serializeSetting(setting: PricingSetting) {
    return {
      id: setting.id,
      name: setting.name,
      isActive: setting.isActive,
      investmentFundRate: decimalToString(setting.investmentFundRate),
      operationProfitRate: decimalToString(setting.operationProfitRate),
      netProfitRateOfOP: decimalToString(setting.netProfitRateOfOP),
      payrollRateOfOPMinusNP: decimalToString(setting.payrollRateOfOPMinusNP),
      otherCostsRateOfOPMinusNP: decimalToString(
        setting.otherCostsRateOfOPMinusNP,
      ),
      salesTaxRate20: decimalToString(setting.salesTaxRate20),
      salesTaxRate4: decimalToString(setting.salesTaxRate4),
    };
  }
}
