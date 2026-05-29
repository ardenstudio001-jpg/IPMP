import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}

export interface NotifyUsersParams {
  title: string;
  message: string;
  type: NotificationType;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(params: CreateNotificationParams): Promise<void> {
    await this.prisma.notification.create({
      data: params,
    });
  }

  async notifyUsers(
    userIds: string[],
    payload: NotifyUsersParams,
  ): Promise<void> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return;
    }

    await this.prisma.notification.createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
      })),
    });
  }

  async notifyAdmins(payload: NotifyUsersParams): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });
    await this.notifyUsers(
      admins.map((a) => a.id),
      payload,
    );
  }

  async findForUser(userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }
}
