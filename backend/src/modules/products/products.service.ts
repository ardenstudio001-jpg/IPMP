import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';
import { generateSkuCandidate } from 'src/common/utils/sku.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = {
  category: true,
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async suggestSku(): Promise<{ sku: string }> {
    const sku = await this.resolveUniqueSku();
    return { sku };
  }

  async resolveUniqueSku(providedSku?: string): Promise<string> {
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

  async findBySku(sku: string) {
    return this.prisma.product.findUnique({
      where: { sku },
      include: productInclude,
    });
  }

  async create(userId: string, dto: CreateProductDto) {
    const sku = await this.resolveUniqueSku(dto.sku);
    const product = await this.prisma.product.create({
      data: {
        sku,
        name: dto.name.trim(),
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        procurementType: dto.procurementType,
        productDetails: dto.productDetails,
        description: dto.description,
        unit: dto.unit.trim(),
      },
      include: productInclude,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRODUCT_CREATED,
      entityType: EntityType.Product,
      entityId: product.id,
      entitySku: product.sku,
      newValue: product,
    });

    return product;
  }

  async findAll(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, userId: string, dto: UpdateProductDto) {
    const old = await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.procurementType !== undefined
          ? { procurementType: dto.procurementType }
          : {}),
        ...(dto.productDetails !== undefined
          ? { productDetails: dto.productDetails }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
      },
      include: productInclude,
    });

    await this.auditService.logAction({
      userId,
      action: AuditAction.PRODUCT_UPDATED,
      entityType: EntityType.Product,
      entityId: product.id,
      entitySku: product.sku,
      oldValue: old,
      newValue: product,
    });

    return product;
  }

  async findOrCreateFromListItem(
    userId: string,
    data: {
      sku?: string;
      name: string;
      imageUrl?: string;
      categoryId: string;
      procurementType: CreateProductDto['procurementType'];
      productDetails?: string;
      description?: string;
      unit: string;
    },
  ) {
    if (data.sku?.trim()) {
      const existing = await this.findBySku(data.sku.trim());
      if (existing) {
        return existing;
      }
    }
    return this.create(userId, {
      sku: data.sku,
      name: data.name,
      imageUrl: data.imageUrl,
      categoryId: data.categoryId,
      procurementType: data.procurementType,
      productDetails: data.productDetails,
      description: data.description,
      unit: data.unit,
    });
  }
}
