import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AddListItemDto } from './dto/add-list-item.dto';
import { MoveToAcquiredDto } from './dto/move-to-acquired.dto';
import { MoveToPurchaseDto } from './dto/move-to-purchase.dto';
import { UpdateListItemDto } from './dto/update-list-item.dto';
import { ListItemsService } from './list-items.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ListItemsController {
  constructor(private readonly listItemsService: ListItemsService) {}

  @Post('lists/:listId/items')
  @Roles(Role.ADMIN, Role.PROCUREMENT)
  addToList(
    @Param('listId') listId: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
    @Body() dto: AddListItemDto,
  ) {
    return this.listItemsService.addToList(listId, userId, role, dto);
  }

  @Get('list-items/:id')
  findOne(
    @Param('id') id: string,
    @GetUser('role') role: Role,
  ) {
    return this.listItemsService.findOne(id, role);
  }

  @Get('list-items/:id/lineage')
  getLineage(@Param('id') id: string, @GetUser('role') role: Role) {
    return this.listItemsService.getLineage(id, role);
  }

  @Patch('list-items/:id')
  @Roles(Role.ADMIN, Role.PROCUREMENT, Role.INVENTORY)
  update(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
    @Body() dto: UpdateListItemDto,
  ) {
    return this.listItemsService.update(id, userId, role, dto);
  }

  @Post('list-items/move-to-purchase')
  @Roles(Role.ADMIN, Role.PROCUREMENT)
  moveToPurchase(
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
    @Body() dto: MoveToPurchaseDto,
  ) {
    return this.listItemsService.moveToPurchase(userId, role, dto);
  }

  @Post('list-items/move-to-acquired')
  @Roles(Role.ADMIN, Role.PROCUREMENT)
  moveToAcquired(
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
    @Body() dto: MoveToAcquiredDto,
  ) {
    return this.listItemsService.moveToAcquired(userId, role, dto);
  }

  @Post('list-items/:id/rollback')
  @Roles(Role.ADMIN, Role.PROCUREMENT)
  rollback(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
  ) {
    return this.listItemsService.rollback(id, userId, role);
  }
}
