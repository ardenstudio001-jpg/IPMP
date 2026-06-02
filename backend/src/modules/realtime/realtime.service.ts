import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

export type RealtimeEventType =
  | 'lists.changed'
  | 'list-items.changed'
  | 'verifications.changed'
  | 'notifications.changed';

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload?: Record<string, unknown>;
}

interface BusMessage {
  userId: string;
  event: RealtimeEvent;
}

@Injectable()
export class RealtimeService {
  private readonly bus = new Subject<BusMessage>();

  constructor(private readonly prisma: PrismaService) {}

  subscribe(userId: string): Observable<MessageEvent> {
    return this.bus.asObservable().pipe(
      filter((message) => message.userId === userId),
      map(
        (message) =>
          ({
            data: JSON.stringify(message.event),
          }) as MessageEvent,
      ),
    );
  }

  emitToUsers(userIds: string[], event: RealtimeEvent): void {
    const unique = [...new Set(userIds.filter(Boolean))];
    for (const userId of unique) {
      this.bus.next({ userId, event });
    }
  }

  async emitToRoles(roles: Role[], event: RealtimeEvent): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });
    this.emitToUsers(
      users.map((u) => u.id),
      event,
    );
  }

  async emitListsChanged(
    roles: Role[] = [Role.ADMIN, Role.PROCUREMENT, Role.INVENTORY],
  ): Promise<void> {
    await this.emitToRoles(roles, { type: 'lists.changed' });
  }

  async emitListItemsChanged(
    roles: Role[] = [Role.ADMIN, Role.PROCUREMENT, Role.INVENTORY],
  ): Promise<void> {
    await this.emitToRoles(roles, { type: 'list-items.changed' });
  }

  async emitVerificationsChanged(
    roles: Role[] = [Role.ADMIN, Role.INVENTORY],
  ): Promise<void> {
    await this.emitToRoles(roles, { type: 'verifications.changed' });
  }

  emitNotificationsChanged(userIds: string[]): void {
    this.emitToUsers(userIds, { type: 'notifications.changed' });
  }
}
