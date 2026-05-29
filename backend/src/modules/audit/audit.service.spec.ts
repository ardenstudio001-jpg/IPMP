import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('logAction persists audit record', async () => {
    await service.logAction({
      userId: 'user-1',
      action: AuditAction.PRODUCT_CREATED,
      entityType: EntityType.Product,
      entityId: 'product-1',
      newValue: { name: 'Test' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: AuditAction.PRODUCT_CREATED,
        entityType: EntityType.Product,
        entityId: 'product-1',
        oldValue: undefined,
        newValue: { name: 'Test' },
      },
    });
  });
});
