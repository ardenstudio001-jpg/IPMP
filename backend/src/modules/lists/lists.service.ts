import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListItemStatus,
  ListType,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';
import { listItemInclude } from 'src/common/selects/list-item.select';
import { formatListItem } from 'src/common/utils/list-item-format.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateListDto } from './dto/create-list.dto';
import { ListListsQueryDto } from './dto/list-lists-query.dto';

const listInclude = {
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
  _count: { select: { items: true } },
} satisfies Prisma.WorkflowListInclude;

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(userId: string, userRole: Role, dto: CreateListDto) {
    if (userRole === Role.INVENTORY) {
      throw new ForbiddenException('Inventory staff cannot create lists');
    }

    const list = await this.prisma.workflowList.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        createdById: userId,
      },
      include: listInclude,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.LIST_CREATED,
      entityType: EntityType.WorkflowList,
      entityId: list.id,
      newValue: list,
    });

    if (dto.type === ListType.PROCUREMENT) {
      await this.notificationsService.notifyByRoles(
        [Role.ADMIN, Role.PROCUREMENT],
        {
          title: 'Procurement list created',
          message: `List "${list.name}" was created.`,
          type: NotificationType.PROCUREMENT_LIST_CREATED,
        },
      );
    }

    await this.realtimeService.emitListsChanged();
    return list;
  }

  async findAll(query: ListListsQueryDto, userRole: Role) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkflowListWhereInput = {};
    if (query.type) {
      where.type = query.type;
    }
    if (userRole === Role.INVENTORY) {
      where.type = ListType.ACQUIRED;
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.workflowList.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.workflowList.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, includeRemoved = false, userRole?: Role) {
    const list = await this.prisma.workflowList.findUnique({
      where: { id },
      include: {
        ...listInclude,
        items: {
          where: includeRemoved
            ? undefined
            : { status: { not: ListItemStatus.REMOVED } },
          include: listItemInclude,
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    if (userRole === Role.INVENTORY && list.type !== ListType.ACQUIRED) {
      throw new ForbiddenException(
        'Inventory staff can only access acquired lists',
      );
    }
    return {
      ...list,
      items: list.items.map(formatListItem),
    };
  }
}
