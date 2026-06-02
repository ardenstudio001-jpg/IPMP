import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { ListVerificationsQueryDto } from './dto/list-verifications-query.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { InventoryVerificationService } from './inventory-verification.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-verifications')
export class InventoryVerificationController {
  constructor(
    private readonly verificationService: InventoryVerificationService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.INVENTORY)
  create(
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
    @Body() dto: CreateVerificationDto,
  ) {
    return this.verificationService.create(userId, role, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.INVENTORY)
  findAll(
    @Query() query: ListVerificationsQueryDto,
    @GetUser('role') role: Role,
  ) {
    return this.verificationService.findAll(query, role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.INVENTORY)
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
    @Body() dto: UpdateVerificationDto,
  ) {
    return this.verificationService.update(id, userId, role, dto);
  }
}
