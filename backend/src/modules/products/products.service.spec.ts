import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { ProductsService } from './products.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

const baseProduct = {
  id: 'product-1',
  name: 'Basketball',
  quantity: 10,
  unit: 'pcs',
  sku: 'BB-001',
  unitCostPrice: null,
  totalCostPrice: null,
  oldSellingPrice: null,
  investmentFund: null,
  operationProfit: null,
  netProfit: null,
  payrollFund: null,
  otherCosts: null,
  grossProfit: null,
  priceBeforeTax: null,
  minimum4Percent: null,
  minimum20Percent: null,
  finalSellingPrice: null,
  printed: false,
  status: ProductStatus.PENDING_COSTING,
  createdById: 'user-1',
  approvedById: null,
  costingCompletedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PricingService,
          useValue: { calculatePricing: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: { logAction: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
            notifyUsers: jest.fn(),
            notifyAdmins: jest.fn(),
            notifyByRoles: jest.fn(),
          },
        },
        {
          provide: RealtimeService,
          useValue: {
            emitProductChanged: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('applyCosting rejects when status is not PENDING_COSTING', async () => {
    prisma.product.findUnique.mockResolvedValue({
      ...baseProduct,
      status: ProductStatus.APPROVED,
    });

    await expect(
      service.applyCosting('product-1', 'user-2', { unitCostPrice: 5 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('approve rejects when status is not COSTING_COMPLETED', async () => {
    prisma.product.findUnique.mockResolvedValue(baseProduct);

    await expect(
      service.approve('product-1', 'admin-1', {
        finalSellingPrice: 70,
        printed: true,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('findOne throws NotFoundException when missing', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
