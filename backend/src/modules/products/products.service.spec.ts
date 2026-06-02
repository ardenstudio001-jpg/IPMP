import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProcurementType } from '@prisma/client';
import { AuditAction } from 'src/common/constants/audit-actions';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProductsService } from './products.service';

const mockProduct = {
  id: 'prod-1',
  sku: 'SKU-001',
  name: 'Pump',
  imageUrl: null,
  categoryId: 'cat-1',
  procurementType: ProcurementType.LOCAL,
  productDetails: null,
  description: null,
  unit: 'pcs',
  createdAt: new Date(),
  category: { id: 'cat-1', name: 'General', createdAt: new Date() },
};

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditService: { logAction: jest.Mock };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };
    auditService = { logAction: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  it('creates a catalog product', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue(mockProduct);

    const result = await service.create('user-1', {
      name: 'Pump',
      categoryId: 'cat-1',
      procurementType: ProcurementType.LOCAL,
      unit: 'pcs',
    });

    expect(result.sku).toBeDefined();
    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.PRODUCT_CREATED }),
    );
  });

  it('throws when product not found', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('throws on duplicate SKU', async () => {
    prisma.product.findUnique.mockResolvedValue(mockProduct);
    await expect(
      service.create('user-1', {
        sku: 'SKU-001',
        name: 'Pump',
        categoryId: 'cat-1',
        procurementType: ProcurementType.LOCAL,
        unit: 'pcs',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
