import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'actor@example.com' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('logAction persists audit record with actorEmail and entitySku', async () => {
    await service.logAction({
      userId: 'user-1',
      action: AuditAction.PRODUCT_CREATED,
      entityType: EntityType.Product,
      entityId: 'product-1',
      newValue: { name: 'Test', sku: 'PRD-ABC123' },
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { email: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        actorEmail: 'actor@example.com',
        action: AuditAction.PRODUCT_CREATED,
        entityType: EntityType.Product,
        entityId: 'product-1',
        entitySku: 'PRD-ABC123',
        oldValue: undefined,
        newValue: { name: 'Test', sku: 'PRD-ABC123' },
      },
    });
  });

  it('logAction uses provided actorEmail when passed', async () => {
    await service.logAction({
      userId: 'user-1',
      actorEmail: 'inventory@example.com',
      action: AuditAction.PRODUCT_UPDATED,
      entityType: EntityType.Product,
      entityId: 'product-1',
      entitySku: 'PRD-XYZ',
    });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorEmail: 'inventory@example.com',
          entitySku: 'PRD-XYZ',
        }),
      }),
    );
  });
});
