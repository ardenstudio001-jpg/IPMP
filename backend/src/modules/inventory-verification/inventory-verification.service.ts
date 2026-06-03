import {
  BadRequestException,
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
  VerificationStatus,
} from '@prisma/client';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';
import { listItemInclude } from 'src/common/selects/list-item.select';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { ListVerificationsQueryDto } from './dto/list-verifications-query.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';

@Injectable()
export class InventoryVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private assertInventoryRole(role: Role) {
    if (role !== Role.ADMIN && role !== Role.INVENTORY) {
      throw new ForbiddenException('Only inventory staff can verify acquired items');
    }
  }

  private deriveStatus(
    expected: number,
    actual: number,
    override?: VerificationStatus,
  ): VerificationStatus {
    if (override && override !== VerificationStatus.PENDING) {
      return override;
    }
    if (actual === expected) {
      return VerificationStatus.MATCHED;
    }
    if (actual === 0 && expected > 0) {
      return VerificationStatus.MISSING;
    }
    if (actual > 0 && actual < expected) {
      return VerificationStatus.PARTIAL;
    }
    return VerificationStatus.PARTIAL;
  }

  private async assertAcquiredItem(listItemId: string) {
    const item = await this.prisma.listItem.findUnique({
      where: { id: listItemId },
      include: { list: true, product: true },
    });
    if (!item) {
      throw new NotFoundException('List item not found');
    }
    if (item.list.type !== ListType.ACQUIRED) {
      throw new BadRequestException('Verification is only for acquired list items');
    }
    if (item.status === ListItemStatus.REMOVED) {
      throw new BadRequestException('Cannot verify a removed item');
    }
    return item;
  }

  async create(userId: string, role: Role, dto: CreateVerificationDto) {
    this.assertInventoryRole(role);
    const item = await this.assertAcquiredItem(dto.listItemId);

    const status = this.deriveStatus(dto.expectedQuantity, dto.actualQuantity);

    const verification = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inventoryVerification.create({
        data: {
          listItemId: dto.listItemId,
          verifiedById: userId,
          expectedQuantity: dto.expectedQuantity,
          actualQuantity: dto.actualQuantity,
          status,
          notes: dto.notes,
        },
        include: {
          listItem: { include: listItemInclude },
          verifiedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (status === VerificationStatus.MATCHED) {
        await tx.listItem.update({
          where: { id: dto.listItemId },
          data: { status: ListItemStatus.VERIFIED },
        });
      }

      return created;
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.VERIFICATION_COMPLETED,
      entityType: EntityType.InventoryVerification,
      entityId: verification.id,
      entitySku: item.product.sku,
      newValue: verification,
    });

    const notifyType =
      status === VerificationStatus.MATCHED
        ? NotificationType.VERIFICATION_PENDING
        : NotificationType.VERIFICATION_MISMATCH;

    if (status !== VerificationStatus.MATCHED) {
      await this.notificationsService.notifyByRoles([Role.ADMIN, Role.INVENTORY], {
        title: 'Verification mismatch',
        message: `Verification for ${item.product.name} (${item.product.sku}): ${status}.`,
        type: NotificationType.VERIFICATION_MISMATCH,
      });
    } else {
      await this.notificationsService.notifyByRoles([Role.ADMIN], {
        title: 'Verification completed',
        message: `${item.product.name} matched expected quantity.`,
        type: notifyType,
      });
    }

    await this.realtimeService.emitVerificationsChanged();
    return verification;
  }

  async update(id: string, userId: string, role: Role, dto: UpdateVerificationDto) {
    this.assertInventoryRole(role);
    const existing = await this.prisma.inventoryVerification.findUnique({
      where: { id },
      include: { listItem: { include: { product: true, list: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Verification not found');
    }

    const expected = existing.expectedQuantity;
    const actual = dto.actualQuantity ?? existing.actualQuantity;
    const status = this.deriveStatus(expected, actual, dto.status);

    const verification = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryVerification.update({
        where: { id },
        data: {
          ...(dto.actualQuantity !== undefined
            ? { actualQuantity: dto.actualQuantity }
            : {}),
          status,
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          verifiedAt: new Date(),
          verifiedById: userId,
        },
        include: {
          listItem: { include: listItemInclude },
          verifiedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (status === VerificationStatus.MATCHED) {
        await tx.listItem.update({
          where: { id: existing.listItemId },
          data: { status: ListItemStatus.VERIFIED },
        });
      }

      return updated;
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.VERIFICATION_COMPLETED,
      entityType: EntityType.InventoryVerification,
      entityId: id,
      entitySku: existing.listItem.product.sku,
      oldValue: existing,
      newValue: verification,
    });

    if (
      status === VerificationStatus.PARTIAL ||
      status === VerificationStatus.MISSING ||
      status === VerificationStatus.DAMAGED
    ) {
      await this.notificationsService.notifyByRoles([Role.ADMIN, Role.PROCUREMENT], {
        title: 'Verification mismatch',
        message: `Updated verification status: ${status}.`,
        type: NotificationType.VERIFICATION_MISMATCH,
      });
    }

    await this.realtimeService.emitVerificationsChanged();
    return verification;
  }

  async findAll(query: ListVerificationsQueryDto, role: Role) {
    if (role === Role.PROCUREMENT) {
      throw new ForbiddenException('Procurement staff cannot view verifications');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryVerificationWhereInput = {};

    if (query.listItemId) {
      where.listItemId = query.listItemId;
    }

    const listItemFilter: Prisma.ListItemWhereInput = {};
    if (query.listId) {
      listItemFilter.listId = query.listId;
    }
    if (role === Role.INVENTORY) {
      listItemFilter.list = { type: ListType.ACQUIRED };
    }
    if (Object.keys(listItemFilter).length > 0) {
      where.listItem = listItemFilter;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryVerification.findMany({
        where,
        include: {
          listItem: { include: listItemInclude },
          verifiedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { verifiedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryVerification.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
