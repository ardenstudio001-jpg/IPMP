import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  Product,
  ProductStatus,
  Role,
} from '@prisma/client';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';
import { decimalToString, toDecimal } from 'src/common/utils/decimal.util';
import { generateSkuCandidate } from 'src/common/utils/sku.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PricingService } from '../pricing/pricing.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ApproveProductDto } from './dto/approve-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { RejectProductDto } from './dto/reject-product.dto';
import { UpdateCostingDto } from './dto/update-costing.dto';
import { UpdateFinalSellingPriceDto } from './dto/update-final-selling-price.dto';
import { UpdatePrintedDto } from './dto/update-printed.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productSelect = {
  id: true,
  name: true,
  quantity: true,
  unit: true,
  sku: true,
  unitCostPrice: true,
  totalCostPrice: true,
  oldSellingPrice: true,
  investmentFund: true,
  operationProfit: true,
  netProfit: true,
  payrollFund: true,
  otherCosts: true,
  grossProfit: true,
  priceBeforeTax: true,
  minimum4Percent: true,
  minimum20Percent: true,
  finalSellingPrice: true,
  printed: true,
  status: true,
  createdById: true,
  approvedById: true,
  costingCompletedById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async broadcastProduct(
    product: Prisma.ProductGetPayload<{ select: typeof productSelect }>,
  ) {
    const formatted = this.formatProduct(product);
    await this.realtimeService.emitProductChanged(
      formatted as Record<string, unknown>,
    );
    return formatted;
  }

  async suggestSku(): Promise<{ sku: string }> {
    const sku = await this.resolveUniqueSku();
    return { sku };
  }

  private async resolveUniqueSku(providedSku?: string): Promise<string> {
    const trimmed = providedSku?.trim();
    if (trimmed) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: trimmed },
      });
      if (existing) {
        throw new ConflictException('SKU already exists');
      }
      return trimmed;
    }

    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = generateSkuCandidate();
      const existing = await this.prisma.product.findUnique({
        where: { sku: candidate },
      });
      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('Unable to generate a unique SKU');
  }

  async create(userId: string, dto: CreateProductDto) {
    const sku = await this.resolveUniqueSku(dto.sku);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        quantity: dto.quantity,
        unit: dto.unit,
        sku,
        oldSellingPrice: dto.oldSellingPrice
          ? toDecimal(dto.oldSellingPrice)
          : undefined,
        status: ProductStatus.PENDING_COSTING,
        createdById: userId,
      },
      select: productSelect,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRODUCT_CREATED,
      entityType: EntityType.Product,
      entityId: product.id,
      newValue: this.serializeProduct(product),
    });

    await this.notificationsService.notifyByRoles(
      [Role.PROCUREMENT, Role.ADMIN],
      {
        title: 'New product pending costing',
        message: `${product.name} was added and is ready for costing.`,
        type: NotificationType.PRODUCT_CREATED,
      },
    );

    return this.broadcastProduct(product);
  }

  async findAll(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: productSelect,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map((p) => this.formatProduct(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: productSelect,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProduct(product);
  }

  async applyCosting(id: string, userId: string, dto: UpdateCostingDto) {
    const product = await this.getProductOrThrow(id);

    if (product.status !== ProductStatus.PENDING_COSTING) {
      throw new BadRequestException(
        'Costing can only be applied to products pending costing',
      );
    }

    const pricing = await this.pricingService.calculatePricing({
      unitCostPrice: dto.unitCostPrice,
      quantity: product.quantity,
    });

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        unitCostPrice: toDecimal(dto.unitCostPrice),
        totalCostPrice: pricing.totalCostPrice,
        investmentFund: pricing.investmentFund,
        operationProfit: pricing.operationProfit,
        netProfit: pricing.netProfit,
        payrollFund: pricing.payrollFund,
        otherCosts: pricing.otherCosts,
        grossProfit: pricing.grossProfit,
        priceBeforeTax: pricing.priceBeforeTax,
        minimum20Percent: pricing.minimum20Percent,
        minimum4Percent: pricing.minimum4Percent,
        status: ProductStatus.COSTING_COMPLETED,
        costingCompletedById: userId,
      },
      select: productSelect,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.COSTING_COMPLETED,
      entityType: EntityType.Product,
      entityId: id,
      oldValue: this.serializeProduct(product),
      newValue: this.serializeProduct(updated),
    });

    await this.notificationsService.notifyAdmins({
      title: 'Costing completed',
      message: `Costing for ${updated.name} has been completed and is ready for approval.`,
      type: NotificationType.COSTING_COMPLETED,
    });

    return this.broadcastProduct(updated);
  }

  async approve(id: string, userId: string, dto: ApproveProductDto) {
    const product = await this.getProductOrThrow(id);

    if (product.status !== ProductStatus.COSTING_COMPLETED) {
      throw new BadRequestException(
        'Only products with completed costing can be approved',
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        finalSellingPrice: toDecimal(dto.finalSellingPrice),
        printed: dto.printed,
        status: ProductStatus.APPROVED,
        approvedById: userId,
      },
      select: productSelect,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRODUCT_APPROVED,
      entityType: EntityType.Product,
      entityId: id,
      oldValue: this.serializeProduct(product),
      newValue: this.serializeProduct(updated),
    });

    await this.notificationsService.createNotification({
      userId: product.createdById,
      title: 'Product approved',
      message: `Selling price for ${updated.name} has been approved: ${decimalToString(updated.finalSellingPrice)}`,
      type: NotificationType.PRODUCT_APPROVED,
    });

    return this.broadcastProduct(updated);
  }

  async updateFinalSellingPrice(
    id: string,
    userId: string,
    dto: UpdateFinalSellingPriceDto,
  ) {
    const product = await this.getProductOrThrow(id);

    if (product.status !== ProductStatus.APPROVED) {
      throw new BadRequestException(
        'Final selling price can only be updated on approved products',
      );
    }

    const oldPrice = decimalToString(product.finalSellingPrice);
    const newPrice = dto.finalSellingPrice.toFixed(2);

    if (oldPrice === newPrice) {
      const current = await this.prisma.product.findUnique({
        where: { id },
        select: productSelect,
      });
      return this.formatProduct(current!);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        finalSellingPrice: toDecimal(dto.finalSellingPrice),
      },
      select: productSelect,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.SELLING_PRICE_CHANGED,
      entityType: EntityType.Product,
      entityId: id,
      oldValue: { finalSellingPrice: oldPrice },
      newValue: { finalSellingPrice: newPrice },
    });

    const recipientIds = [
      product.createdById,
      product.costingCompletedById,
    ].filter((id): id is string => Boolean(id));

    await this.notificationsService.notifyUsers(recipientIds, {
      title: 'Selling price changed',
      message: `Final selling price for ${updated.name} changed from ${oldPrice ?? 'N/A'} to ${newPrice}`,
      type: NotificationType.SELLING_PRICE_CHANGED,
    });

    return this.broadcastProduct(updated);
  }

  async update(
    id: string,
    userId: string,
    userRole: Role,
    dto: UpdateProductDto,
  ) {
    const product = await this.getProductOrThrow(id);

    if (userRole === Role.INVENTORY) {
      if (dto.unitCostPrice !== undefined) {
        throw new ForbiddenException(
          'Inventory users cannot edit unit cost price',
        );
      }
      if (
        product.status !== ProductStatus.PENDING_COSTING &&
        product.status !== ProductStatus.REJECTED
      ) {
        throw new BadRequestException(
          'Inventory can only edit products pending costing or rejected',
        );
      }
    }

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });
      if (existing) {
        throw new ConflictException('SKU already exists');
      }
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.oldSellingPrice !== undefined) {
      updateData.oldSellingPrice = toDecimal(dto.oldSellingPrice);
    }

    if (dto.unitCostPrice !== undefined && userRole === Role.ADMIN) {
      const quantity = dto.quantity ?? product.quantity;
      const pricing = await this.pricingService.calculatePricing({
        unitCostPrice: dto.unitCostPrice,
        quantity,
      });

      updateData.unitCostPrice = toDecimal(dto.unitCostPrice);
      updateData.totalCostPrice = pricing.totalCostPrice;
      updateData.investmentFund = pricing.investmentFund;
      updateData.operationProfit = pricing.operationProfit;
      updateData.netProfit = pricing.netProfit;
      updateData.payrollFund = pricing.payrollFund;
      updateData.otherCosts = pricing.otherCosts;
      updateData.grossProfit = pricing.grossProfit;
      updateData.priceBeforeTax = pricing.priceBeforeTax;
      updateData.minimum20Percent = pricing.minimum20Percent;
      updateData.minimum4Percent = pricing.minimum4Percent;

      if (product.status === ProductStatus.PENDING_COSTING) {
        updateData.status = ProductStatus.COSTING_COMPLETED;
        updateData.costingCompletedBy = { connect: { id: userId } };
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      select: productSelect,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRODUCT_UPDATED,
      entityType: EntityType.Product,
      entityId: id,
      oldValue: this.serializeProduct(product),
      newValue: this.serializeProduct(updated),
    });

    return this.broadcastProduct(updated);
  }

  async reject(id: string, userId: string, dto: RejectProductDto) {
    const product = await this.getProductOrThrow(id);

    if (
      product.status !== ProductStatus.COSTING_COMPLETED &&
      product.status !== ProductStatus.PENDING_COSTING
    ) {
      throw new BadRequestException(
        'Only products pending approval can be rejected',
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.REJECTED },
      select: productSelect,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRODUCT_REJECTED,
      entityType: EntityType.Product,
      entityId: id,
      oldValue: this.serializeProduct(product),
      newValue: {
        ...this.serializeProduct(updated),
        reason: dto.reason,
      },
    });

    await this.notificationsService.createNotification({
      userId: product.createdById,
      title: 'Product rejected',
      message: dto.reason
        ? `Product ${updated.name} was rejected: ${dto.reason}`
        : `Product ${updated.name} was rejected`,
      type: NotificationType.SYSTEM,
    });

    return this.broadcastProduct(updated);
  }

  async updatePrinted(id: string, userId: string, dto: UpdatePrintedDto) {
    const product = await this.getProductOrThrow(id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { printed: dto.printed },
      select: productSelect,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRODUCT_UPDATED,
      entityType: EntityType.Product,
      entityId: id,
      oldValue: { printed: product.printed },
      newValue: { printed: dto.printed },
    });

    return this.broadcastProduct(updated);
  }

  async getStats() {
    const [total, pendingCosting, approved, rejected] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({
        where: { status: ProductStatus.PENDING_COSTING },
      }),
      this.prisma.product.count({
        where: { status: ProductStatus.APPROVED },
      }),
      this.prisma.product.count({
        where: { status: ProductStatus.REJECTED },
      }),
    ]);

    return { total, pendingCosting, approved, rejected };
  }

  private async getProductOrThrow(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private serializeProduct(
    product:
      | Product
      | Prisma.ProductGetPayload<{ select: typeof productSelect }>,
  ) {
    return {
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      unit: product.unit,
      sku: product.sku,
      status: product.status,
      unitCostPrice: decimalToString(product.unitCostPrice),
      totalCostPrice: decimalToString(product.totalCostPrice),
      oldSellingPrice: decimalToString(product.oldSellingPrice),
      investmentFund: decimalToString(product.investmentFund),
      operationProfit: decimalToString(product.operationProfit),
      netProfit: decimalToString(product.netProfit),
      payrollFund: decimalToString(product.payrollFund),
      otherCosts: decimalToString(product.otherCosts),
      grossProfit: decimalToString(product.grossProfit),
      priceBeforeTax: decimalToString(product.priceBeforeTax),
      minimum4Percent: decimalToString(product.minimum4Percent),
      minimum20Percent: decimalToString(product.minimum20Percent),
      finalSellingPrice: decimalToString(product.finalSellingPrice),
      printed: product.printed,
      createdById: product.createdById,
      approvedById: product.approvedById,
      costingCompletedById: product.costingCompletedById,
    };
  }

  private formatProduct(
    product: Prisma.ProductGetPayload<{ select: typeof productSelect }>,
  ) {
    return {
      ...product,
      unitCostPrice: decimalToString(product.unitCostPrice),
      totalCostPrice: decimalToString(product.totalCostPrice),
      oldSellingPrice: decimalToString(product.oldSellingPrice),
      investmentFund: decimalToString(product.investmentFund),
      operationProfit: decimalToString(product.operationProfit),
      netProfit: decimalToString(product.netProfit),
      payrollFund: decimalToString(product.payrollFund),
      otherCosts: decimalToString(product.otherCosts),
      grossProfit: decimalToString(product.grossProfit),
      priceBeforeTax: decimalToString(product.priceBeforeTax),
      minimum4Percent: decimalToString(product.minimum4Percent),
      minimum20Percent: decimalToString(product.minimum20Percent),
      finalSellingPrice: decimalToString(product.finalSellingPrice),
    };
  }
}
