import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from 'src/common/constants/audit-actions';
import { EntityType } from 'src/common/constants/entity-types';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException('Category name already exists');
    }
    const category = await this.prisma.category.create({
      data: { name: dto.name.trim() },
    });
    await this.auditService.logAction({
      userId,
      action: AuditAction.CATEGORY_CREATED,
      entityType: EntityType.Category,
      entityId: category.id,
      newValue: category,
    });
    return category;
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    const old = await this.findOne(id);
    const name = dto.name.trim();
    if (name !== old.name) {
      const conflict = await this.prisma.category.findUnique({ where: { name } });
      if (conflict) {
        throw new ConflictException('Category name already exists');
      }
    }
    const category = await this.prisma.category.update({
      where: { id },
      data: { name },
    });
    await this.auditService.logAction({
      userId,
      action: AuditAction.CATEGORY_UPDATED,
      entityType: EntityType.Category,
      entityId: id,
      oldValue: old,
      newValue: category,
    });
    return category;
  }
}
