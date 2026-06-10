import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ListType, Role } from '@prisma/client';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateListDto } from './dto/create-list.dto';
import { ListListsQueryDto } from './dto/list-lists-query.dto';
import { ListsService } from './lists.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PROCUREMENT)
  create(
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
    @Body() dto: CreateListDto,
  ) {
    return this.listsService.create(userId, role, dto);
  }

  @Get()
  findAll(@Query() query: ListListsQueryDto, @GetUser('role') role: Role) {
    return this.listsService.findAll(query, role);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('includeRemoved') includeRemoved: string | undefined,
    @GetUser('role') role: Role,
  ) {
    return this.listsService.findOne(id, includeRemoved === 'true', role);
  }
}
