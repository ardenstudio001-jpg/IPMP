import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ListType, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ListsService } from './lists.service';

describe('ListsService', () => {
  let service: ListsService;
  let prisma: {
    workflowList: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      workflowList: {
        create: jest.fn().mockResolvedValue({
          id: 'list-1',
          name: 'Daily Procurement',
          type: ListType.PROCUREMENT,
          createdById: 'user-1',
          createdAt: new Date(),
          createdBy: { id: 'user-1', email: 'a@b.com' },
          _count: { items: 0 },
        }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { logAction: jest.fn() } },
        {
          provide: NotificationsService,
          useValue: { notifyByRoles: jest.fn() },
        },
        { provide: RealtimeService, useValue: { emitListsChanged: jest.fn() } },
      ],
    }).compile();

    service = module.get(ListsService);
  });

  it('creates procurement list for procurement role', async () => {
    const list = await service.create('user-1', Role.PROCUREMENT, {
      name: 'Daily Procurement — 2026-06-02',
      type: ListType.PROCUREMENT,
    });
    expect(list.type).toBe(ListType.PROCUREMENT);
  });

  it('blocks inventory from creating lists', async () => {
    await expect(
      service.create('user-1', Role.INVENTORY, {
        name: 'Test',
        type: ListType.ACQUIRED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('filters acquired lists only for inventory', async () => {
    await service.findAll({ page: 1, limit: 20 }, Role.INVENTORY);
    expect(prisma.workflowList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: ListType.ACQUIRED }),
      }),
    );
  });
});
