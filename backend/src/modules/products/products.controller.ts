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
import { ApproveProductDto } from './dto/approve-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateCostingDto } from './dto/update-costing.dto';
import { UpdateFinalSellingPriceDto } from './dto/update-final-selling-price.dto';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.INVENTORY)
  create(@GetUser('id') userId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(userId, dto);
  }

  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id/costing')
  @Roles(Role.PROCUREMENT, Role.ADMIN)
  applyCosting(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: UpdateCostingDto,
  ) {
    return this.productsService.applyCosting(id, userId, dto);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  approve(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: ApproveProductDto,
  ) {
    return this.productsService.approve(id, userId, dto);
  }

  @Patch(':id/final-selling-price')
  @Roles(Role.ADMIN)
  updateFinalSellingPrice(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @Body() dto: UpdateFinalSellingPriceDto,
  ) {
    return this.productsService.updateFinalSellingPrice(id, userId, dto);
  }
}
