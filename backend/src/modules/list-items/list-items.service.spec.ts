import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ListItemStatus,
  ListType,
  MovementAction,
  PartyRole,
  Role,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { ProductsService } from '../products/products.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ListItemsService } from './list-items.service';

const baseParties = [
  { id: 'p1', listItemId: 'item-1', name: 'ABC Supplier', role: PartyRole.SOURCE, createdAt: new Date() },
  { id: 'p2', listItemId: 'item-1', name: 'Spintex Branch', role: PartyRole.REQUESTED_BY, createdAt: new Date() },
];

const baseItem = {
  id: 'item-1',
  listId: 'list-proc',
  productId: 'prod-1',
  quantity: 2,
  costPrice: null,
  regularPrice: null,
  salesPrice: null,
  minimum20: null,
  minimum4: null,
  finalSellingPrice: null,
  status: ListItemStatus.ACTIVE,
  parentItemId: null,
  removedAt: null,
  removedById: null,
  createdAt: new Date(),
  list: { id: 'list-proc', type: ListType.PROCUREMENT, name: 'Daily', createdAt: new Date(), createdById: 'u1' },
  product: { id: 'prod-1', sku: 'SKU-1', name: 'Pump', category: { id: 'c1', name: 'General', createdAt: new Date() }, procurementType: 'LOCAL', unit: 'pcs', imageUrl: null, productDetails: null, description: null, createdAt: new Date() },
  parties: baseParties,
  parentItem: null,
};

describe('ListItemsService', () => {
  let service: ListItemsService;
  let prisma: {
    listItem: { findUnique: jest.Mock; update: jest.Mock };
    workflowList: { findUnique: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      listItem: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      workflowList: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) =>
        fn({
          listItem: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn().mockResolvedValue({
              ...baseItem,
              status: ListItemStatus.REMOVED,
              parties: baseParties,
            }),
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              ...baseItem,
              status: ListItemStatus.REMOVED,
              parties: baseParties,
            }),
          },
          listItemParty: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
            findMany: jest.fn().mockResolvedValue(baseParties),
          },
          productMovement: { create: jest.fn() },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListItemsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductsService, useValue: {} },
        { provide: PricingService, useValue: { calculatePricing: jest.fn() } },
        { provide: AuditService, useValue: { logAction: jest.fn() } },
        { provide: NotificationsService, useValue: { notifyByRoles: jest.fn() } },
        { provide: RealtimeService, useValue: { emitListItemsChanged: jest.fn() } },
      ],
    }).compile();

    service = module.get(ListItemsService);
  });

  it('denies inventory staff from rollback', async () => {
    prisma.listItem.findUnique.mockResolvedValue({
      ...baseItem,
      list: { ...baseItem.list, type: ListType.PURCHASE },
    });
    await expect(
      service.rollback('item-1', 'user-1', Role.INVENTORY),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects rollback on procurement items', async () => {
    prisma.listItem.findUnique.mockResolvedValue(baseItem);
    await expect(
      service.rollback('item-1', 'user-1', Role.PROCUREMENT),
    ).rejects.toThrow(BadRequestException);
  });

  it('soft-removes purchase item on rollback', async () => {
    prisma.listItem.findUnique.mockResolvedValue({
      ...baseItem,
      list: { ...baseItem.list, type: ListType.PURCHASE },
    });

    const result = await service.rollback('item-1', 'user-1', Role.PROCUREMENT);
    expect(result.status).toBe(ListItemStatus.REMOVED);
    expect(result.sources).toEqual(['ABC Supplier']);
    expect(result.requestedBy).toEqual(['Spintex Branch']);
  });
});
