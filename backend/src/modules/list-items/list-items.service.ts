import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListItemStatus,
  ListType,
  MovementAction,
  NotificationType,
  PartyRole,
  Prisma,
  Role,
} from '@prisma/client';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';
import {
  listItemInclude,
  ListItemWithRelations,
} from 'src/common/selects/list-item.select';
import { toDecimal } from 'src/common/utils/decimal.util';
import { formatListItem } from 'src/common/utils/list-item-format.util';
import {
  buildPartyCreateRows,
  partiesForCopy,
  PartyNameGroups,
} from 'src/common/utils/list-item-party.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { ProductsService } from '../products/products.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AddListItemDto } from './dto/add-list-item.dto';
import { MoveToAcquiredDto } from './dto/move-to-acquired.dto';
import { MoveToPurchaseDto } from './dto/move-to-purchase.dto';
import { UpdateListItemDto } from './dto/update-list-item.dto';

type PricingFields = {
  minimum20?: Prisma.Decimal;
  minimum4?: Prisma.Decimal;
};

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class ListItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly pricingService: PricingService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private assertProcurementRole(role: Role) {
    if (role !== Role.ADMIN && role !== Role.PROCUREMENT) {
      throw new ForbiddenException(
        'Only procurement staff can perform this action',
      );
    }
  }

  private async replacePartiesForRoles(
    tx: PrismaTx,
    listItemId: string,
    groups: Partial<PartyNameGroups>,
  ) {
    const rolesToReplace: PartyRole[] = [];
    if (groups.sources !== undefined) rolesToReplace.push(PartyRole.SOURCE);
    if (groups.requestedBy !== undefined)
      rolesToReplace.push(PartyRole.REQUESTED_BY);
    if (groups.stockOwner !== undefined)
      rolesToReplace.push(PartyRole.STOCK_OWNER);

    if (rolesToReplace.length === 0) return;

    await tx.listItemParty.deleteMany({
      where: { listItemId, role: { in: rolesToReplace } },
    });

    const rows = buildPartyCreateRows(listItemId, groups);
    if (rows.length > 0) {
      await tx.listItemParty.createMany({ data: rows });
    }
  }

  private async createParties(
    tx: PrismaTx,
    listItemId: string,
    groups: Partial<PartyNameGroups>,
  ) {
    const rows = buildPartyCreateRows(listItemId, groups);
    if (rows.length > 0) {
      await tx.listItemParty.createMany({ data: rows });
    }
  }

  private async copyParties(
    tx: PrismaTx,
    sourceItemId: string,
    targetItemId: string,
    mode: 'same_roles' | 'to_acquired',
  ) {
    const sourceParties = await tx.listItemParty.findMany({
      where: { listItemId: sourceItemId },
    });
    const groups = partiesForCopy(sourceParties, mode);
    await this.createParties(tx, targetItemId, groups);
  }

  private async resolvePricing(
    costPrice: number | undefined,
    quantity: number,
  ): Promise<PricingFields> {
    if (costPrice === undefined || costPrice === null) {
      return {};
    }
    const result = await this.pricingService.calculatePricing({
      unitCostPrice: costPrice,
      quantity,
    });
    return {
      minimum20: result.minimum20Percent,
      minimum4: result.minimum4Percent,
    };
  }

  private buildItemPricingData(
    dto: {
      costPrice?: number;
      regularPrice?: number;
      salesPrice?: number;
      finalSellingPrice?: number;
      quantity: number;
    },
    calculated: PricingFields,
  ) {
    return {
      costPrice:
        dto.costPrice !== undefined ? toDecimal(dto.costPrice) : undefined,
      regularPrice:
        dto.regularPrice !== undefined
          ? toDecimal(dto.regularPrice)
          : undefined,
      salesPrice:
        dto.salesPrice !== undefined ? toDecimal(dto.salesPrice) : undefined,
      finalSellingPrice:
        dto.finalSellingPrice !== undefined
          ? toDecimal(dto.finalSellingPrice)
          : undefined,
      minimum20: calculated.minimum20,
      minimum4: calculated.minimum4,
    };
  }

  private async getActiveItem(id: string) {
    const item = await this.prisma.listItem.findUnique({
      where: { id },
      include: listItemInclude,
    });
    if (!item) {
      throw new NotFoundException('List item not found');
    }
    if (item.status === ListItemStatus.REMOVED) {
      throw new BadRequestException('List item has been removed');
    }
    return item;
  }

  private async reloadItem(tx: PrismaTx, id: string) {
    return tx.listItem.findUniqueOrThrow({
      where: { id },
      include: listItemInclude,
    });
  }

  async addToList(
    listId: string,
    userId: string,
    role: Role,
    dto: AddListItemDto,
  ) {
    this.assertProcurementRole(role);

    const list = await this.prisma.workflowList.findUnique({
      where: { id: listId },
    });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    if (list.type !== ListType.PROCUREMENT) {
      throw new BadRequestException(
        'Items can only be added directly to procurement lists',
      );
    }

    let productId = dto.productId;
    if (productId) {
      await this.productsService.findOne(productId);
    } else {
      const product = await this.productsService.findOrCreateFromListItem(
        userId,
        {
          sku: dto.sku,
          name: dto.name,
          imageUrl: dto.imageUrl,
          categoryId: dto.categoryId,
          procurementType: dto.procurementType,
          productDetails: dto.productDetails,
          description: dto.description,
          unit: dto.unit,
        },
      );
      productId = product.id;
    }

    const calculated = await this.resolvePricing(dto.costPrice, dto.quantity);
    const pricingData = this.buildItemPricingData(dto, calculated);

    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.listItem.create({
        data: {
          listId,
          productId,
          quantity: dto.quantity,
          status: ListItemStatus.ACTIVE,
          ...pricingData,
        },
      });

      await this.createParties(tx, created.id, {
        sources: dto.sources,
        requestedBy: dto.requestedBy,
        stockOwner: dto.stockOwner,
      });

      await tx.productMovement.create({
        data: {
          productId,
          toListId: listId,
          listItemId: created.id,
          action: MovementAction.CREATED,
          movedById: userId,
        },
      });

      return this.reloadItem(tx, created.id);
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.LIST_ITEM_ADDED,
      entityType: EntityType.ListItem,
      entityId: item.id,
      entitySku: item.product.sku,
      newValue: formatListItem(item),
    });

    await this.realtimeService.emitListItemsChanged();
    return formatListItem(item);
  }

  async update(id: string, userId: string, role: Role, dto: UpdateListItemDto) {
    const old = await this.getActiveItem(id);

    if (role === Role.INVENTORY) {
      if (old.list.type !== ListType.ACQUIRED) {
        throw new ForbiddenException(
          'Inventory staff can only update acquired list items',
        );
      }
      const inventoryAllowed: (keyof UpdateListItemDto)[] = ['quantity'];
      const disallowed = (
        Object.keys(dto) as (keyof UpdateListItemDto)[]
      ).filter(
        (key) => dto[key] !== undefined && !inventoryAllowed.includes(key),
      );
      if (disallowed.length > 0) {
        throw new ForbiddenException(
          `Inventory staff cannot update: ${disallowed.join(', ')}`,
        );
      }
    } else {
      this.assertProcurementRole(role);
    }

    const quantity = dto.quantity ?? old.quantity;
    const costPrice =
      dto.costPrice !== undefined
        ? dto.costPrice
        : old.costPrice
          ? Number(old.costPrice)
          : undefined;

    const calculated = await this.resolvePricing(costPrice, quantity);
    const pricingData = this.buildItemPricingData(
      {
        costPrice: dto.costPrice,
        regularPrice: dto.regularPrice,
        salesPrice: dto.salesPrice,
        finalSellingPrice: dto.finalSellingPrice,
        quantity,
      },
      calculated,
    );

    const item = await this.prisma.$transaction(async (tx) => {
      await tx.listItem.update({
        where: { id },
        data: {
          ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
          ...pricingData,
        },
      });

      await this.replacePartiesForRoles(tx, id, {
        sources: dto.sources,
        requestedBy: dto.requestedBy,
        stockOwner: dto.stockOwner,
      });

      return this.reloadItem(tx, id);
    });

    const action =
      dto.costPrice !== undefined
        ? AuditAction.LIST_ITEM_PRICING_UPDATED
        : AuditAction.LIST_ITEM_UPDATED;

    await this.auditService.logAction({
      userId,
      action,
      entityType: EntityType.ListItem,
      entityId: item.id,
      entitySku: item.product.sku,
      oldValue: formatListItem(old),
      newValue: formatListItem(item),
    });

    if (dto.costPrice !== undefined) {
      await this.notificationsService.notifyByRoles(
        [Role.ADMIN, Role.PROCUREMENT],
        {
          title: 'List item pricing updated',
          message: `Pricing updated for ${item.product.name} (${item.product.sku}).`,
          type: NotificationType.LIST_ITEM_PRICING_UPDATED,
        },
      );
    }

    await this.realtimeService.emitListItemsChanged();
    return formatListItem(item);
  }

  async moveToPurchase(userId: string, role: Role, dto: MoveToPurchaseDto) {
    this.assertProcurementRole(role);

    let purchaseListId = dto.purchaseListId;
    if (!purchaseListId) {
      if (!dto.newPurchaseList?.name) {
        throw new BadRequestException(
          'Provide purchaseListId or newPurchaseList.name',
        );
      }
      const list = await this.prisma.workflowList.create({
        data: {
          name: dto.newPurchaseList.name.trim(),
          type: ListType.PURCHASE,
          createdById: userId,
        },
      });
      purchaseListId = list.id;
    } else {
      const list = await this.prisma.workflowList.findUnique({
        where: { id: purchaseListId },
      });
      if (!list || list.type !== ListType.PURCHASE) {
        throw new BadRequestException('Invalid purchase list');
      }
    }

    const createdItems = await this.prisma.$transaction(async (tx) => {
      const results: ListItemWithRelations[] = [];
      for (const sourceId of dto.sourceItemIds) {
        const source = await tx.listItem.findUnique({
          where: { id: sourceId },
          include: { list: true, parties: true },
        });
        if (!source || source.status !== ListItemStatus.ACTIVE) {
          throw new BadRequestException(`Invalid source item: ${sourceId}`);
        }
        if (source.list.type !== ListType.PROCUREMENT) {
          throw new BadRequestException('Source must be on a procurement list');
        }

        const copy = await tx.listItem.create({
          data: {
            listId: purchaseListId,
            productId: source.productId,
            quantity: source.quantity,
            costPrice: source.costPrice,
            regularPrice: source.regularPrice,
            salesPrice: source.salesPrice,
            minimum20: source.minimum20,
            minimum4: source.minimum4,
            finalSellingPrice: source.finalSellingPrice,
            parentItemId: source.id,
            status: ListItemStatus.ACTIVE,
          },
        });

        await this.copyParties(tx, source.id, copy.id, 'same_roles');

        await tx.productMovement.create({
          data: {
            productId: source.productId,
            fromListId: source.listId,
            toListId: purchaseListId,
            listItemId: copy.id,
            action: MovementAction.MOVED_FORWARD,
            movedById: userId,
          },
        });

        results.push(await this.reloadItem(tx, copy.id));
      }
      return results;
    });

    for (const item of createdItems) {
      await this.auditService.logAction({
        userId,
        action: AuditAction.LIST_ITEM_MOVED,
        entityType: EntityType.ListItem,
        entityId: item.id,
        entitySku: item.product.sku,
        newValue: {
          from: 'PROCUREMENT',
          to: 'PURCHASE',
          item: formatListItem(item),
        },
      });
    }

    await this.notificationsService.notifyByRoles(
      [Role.ADMIN, Role.PROCUREMENT],
      {
        title: 'Items moved to purchase list',
        message: `${createdItems.length} item(s) added to purchase list.`,
        type: NotificationType.ITEM_MOVED_TO_PURCHASE,
      },
    );
    await this.notificationsService.notifyByRoles(
      [Role.ADMIN, Role.PROCUREMENT],
      {
        title: 'Purchase list ready',
        message: 'A purchase list has been updated with new items.',
        type: NotificationType.PURCHASE_LIST_READY,
      },
    );

    await this.realtimeService.emitListItemsChanged();
    return createdItems.map(formatListItem);
  }

  async moveToAcquired(userId: string, role: Role, dto: MoveToAcquiredDto) {
    this.assertProcurementRole(role);

    let acquiredListId = dto.acquiredListId;
    if (!acquiredListId) {
      if (!dto.newAcquiredList?.name) {
        throw new BadRequestException(
          'Provide acquiredListId or newAcquiredList.name',
        );
      }
      const list = await this.prisma.workflowList.create({
        data: {
          name: dto.newAcquiredList.name.trim(),
          type: ListType.ACQUIRED,
          createdById: userId,
        },
      });
      acquiredListId = list.id;
    } else {
      const list = await this.prisma.workflowList.findUnique({
        where: { id: acquiredListId },
      });
      if (!list || list.type !== ListType.ACQUIRED) {
        throw new BadRequestException('Invalid acquired list');
      }
    }

    const createdItems = await this.prisma.$transaction(async (tx) => {
      const results: ListItemWithRelations[] = [];
      for (const sourceId of dto.sourceItemIds) {
        const source = await tx.listItem.findUnique({
          where: { id: sourceId },
          include: { list: true, parties: true },
        });
        if (!source || source.status !== ListItemStatus.ACTIVE) {
          throw new BadRequestException(`Invalid source item: ${sourceId}`);
        }
        if (source.list.type !== ListType.PURCHASE) {
          throw new BadRequestException('Source must be on a purchase list');
        }

        const copy = await tx.listItem.create({
          data: {
            listId: acquiredListId,
            productId: source.productId,
            quantity: source.quantity,
            costPrice: source.costPrice,
            regularPrice: source.regularPrice,
            salesPrice: source.salesPrice,
            minimum20: source.minimum20,
            minimum4: source.minimum4,
            finalSellingPrice: source.finalSellingPrice,
            parentItemId: source.id,
            status: ListItemStatus.ACTIVE,
          },
        });

        await this.copyParties(tx, source.id, copy.id, 'to_acquired');

        await tx.productMovement.create({
          data: {
            productId: source.productId,
            fromListId: source.listId,
            toListId: acquiredListId,
            listItemId: copy.id,
            action: MovementAction.MOVED_FORWARD,
            movedById: userId,
          },
        });

        results.push(await this.reloadItem(tx, copy.id));
      }
      return results;
    });

    for (const item of createdItems) {
      await this.auditService.logAction({
        userId,
        action: AuditAction.LIST_ITEM_MOVED,
        entityType: EntityType.ListItem,
        entityId: item.id,
        entitySku: item.product.sku,
        newValue: {
          from: 'PURCHASE',
          to: 'ACQUIRED',
          item: formatListItem(item),
        },
      });
    }

    await this.notificationsService.notifyByRoles(
      [Role.ADMIN, Role.INVENTORY],
      {
        title: 'Acquired list ready',
        message: `${createdItems.length} item(s) moved to acquired list.`,
        type: NotificationType.ACQUIRED_LIST_READY,
      },
    );
    await this.notificationsService.notifyByRoles(
      [Role.ADMIN, Role.PROCUREMENT],
      {
        title: 'Items moved to acquired',
        message: `${createdItems.length} item(s) acquired.`,
        type: NotificationType.ITEM_MOVED_TO_ACQUIRED,
      },
    );

    await this.realtimeService.emitListItemsChanged();
    return createdItems.map(formatListItem);
  }

  async rollback(id: string, userId: string, role: Role) {
    this.assertProcurementRole(role);
    const item = await this.getActiveItem(id);

    if (item.list.type === ListType.PROCUREMENT) {
      throw new BadRequestException('Cannot rollback procurement list items');
    }

    const action =
      item.list.type === ListType.PURCHASE
        ? MovementAction.MOVED_BACKWARD
        : MovementAction.REMOVED;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.listItem.update({
        where: { id },
        data: {
          status: ListItemStatus.REMOVED,
          removedAt: new Date(),
          removedById: userId,
        },
      });

      await tx.productMovement.create({
        data: {
          productId: item.productId,
          fromListId: item.listId,
          listItemId: item.id,
          action,
          movedById: userId,
        },
      });

      return this.reloadItem(tx, id);
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.LIST_ITEM_ROLLBACK,
      entityType: EntityType.ListItem,
      entityId: id,
      entitySku: item.product.sku,
      oldValue: formatListItem(item),
      newValue: formatListItem(updated),
    });

    await this.realtimeService.emitListItemsChanged();
    return formatListItem(updated);
  }

  async getLineage(id: string, userRole: Role) {
    const item = await this.prisma.listItem.findUnique({
      where: { id },
      include: listItemInclude,
    });
    if (!item) {
      throw new NotFoundException('List item not found');
    }
    if (userRole === Role.INVENTORY && item.list.type !== ListType.ACQUIRED) {
      throw new ForbiddenException(
        'Inventory staff can only view acquired list lineage',
      );
    }

    const ancestors: ReturnType<typeof formatListItem>[] = [];
    let currentParentId = item.parentItemId;
    while (currentParentId) {
      const parent = await this.prisma.listItem.findUnique({
        where: { id: currentParentId },
        include: listItemInclude,
      });
      if (!parent) break;
      ancestors.unshift(formatListItem(parent));
      currentParentId = parent.parentItemId;
    }

    const children = await this.prisma.listItem.findMany({
      where: { parentItemId: id },
      include: listItemInclude,
      orderBy: { createdAt: 'asc' },
    });

    return {
      item: formatListItem(item),
      ancestors,
      descendants: children.map(formatListItem),
    };
  }

  async findOne(id: string, userRole: Role) {
    const item = await this.getActiveItem(id);
    if (userRole === Role.INVENTORY && item.list.type !== ListType.ACQUIRED) {
      throw new ForbiddenException(
        'Inventory staff can only access acquired list items',
      );
    }
    return formatListItem(item);
  }
}
