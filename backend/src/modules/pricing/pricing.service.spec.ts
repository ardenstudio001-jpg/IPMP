import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/client';
import { AuditService } from '../audit/audit.service';
import { PricingService } from './pricing.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockSettings = {
  id: 'settings-1',
  investmentFundRate: new Decimal(0.06),
  operationProfitRate: new Decimal(0.35),
  netProfitRateOfOP: new Decimal(0.15),
  payrollRateOfOPMinusNP: new Decimal(0.81),
  otherCostsRateOfOPMinusNP: new Decimal(0.19),
  salesTaxRate20: new Decimal(0.2),
  salesTaxRate4: new Decimal(0.04),
  name: 'Default',
  isActive: true,
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PricingService', () => {
  let service: PricingService;
  let prisma: {
    pricingSetting: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      pricingSetting: {
        findFirst: jest.fn().mockResolvedValue(mockSettings),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuditService,
          useValue: { logAction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calculatePricing applies formula with active settings', async () => {
    const result = await service.calculatePricing({
      unitCostPrice: 10,
      quantity: 5,
    });

    expect(result.totalCostPrice.toNumber()).toBe(50);
    expect(result.investmentFund.toNumber()).toBe(3);
    expect(result.operationProfit.toNumber()).toBe(17.5);
    expect(result.netProfit.toNumber()).toBe(2.63);
    expect(result.minimum20Percent.toNumber()).toBe(84.6);
    expect(result.minimum4Percent.toNumber()).toBe(73.32);
  });

  it('getActiveSettings throws when none active', async () => {
    prisma.pricingSetting.findFirst.mockResolvedValue(null);
    await expect(service.getActiveSettings()).rejects.toThrow(
      BadRequestException,
    );
  });
});
