import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      findFirst: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
      },
      user: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('markAsRead throws when notification not owned by user', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(
      service.markAsRead('user-1', 'notification-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('markAsRead updates notification when found', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-1',
      userId: 'user-1',
    });
    prisma.notification.update.mockResolvedValue({
      id: 'notification-1',
      isRead: true,
    });

    const result = await service.markAsRead('user-1', 'notification-1');

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: { isRead: true },
    });
    expect(result.isRead).toBe(true);
  });
});
