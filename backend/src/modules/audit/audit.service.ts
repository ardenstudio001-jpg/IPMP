import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EntityType } from 'src/common/constants/entity-types';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';

export interface LogActionParams {
  userId: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  entitySku?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}

function extractSkuFromJson(
  value: Prisma.InputJsonValue | undefined,
): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const sku = (value as Record<string, unknown>).sku;
  return typeof sku === 'string' && sku.trim() ? sku.trim() : undefined;
}

function resolveEntitySku(params: LogActionParams): string | undefined {
  if (params.entitySku?.trim()) {
    return params.entitySku.trim();
  }
  if (params.entityType !== EntityType.Product) {
    return undefined;
  }
  return (
    extractSkuFromJson(params.newValue) ?? extractSkuFromJson(params.oldValue)
  );
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(params: LogActionParams): Promise<void> {
    let actorEmail = params.actorEmail?.trim();
    if (!actorEmail) {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true },
      });
      actorEmail = user?.email ?? 'unknown';
    }

    const entitySku = resolveEntitySku(params);

    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        actorEmail,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entitySku,
        oldValue: params.oldValue,
        newValue: params.newValue,
      },
    });
  }

  async findAll(query: ListAuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { actorEmail: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entitySku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
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
}
