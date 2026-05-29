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
import { CreatePricingSettingDto } from './dto/create-pricing-setting.dto';
import { PricingService } from './pricing.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('settings/active')
  findActive() {
    return this.pricingService.findActive();
  }

  @Get('settings')
  @Roles(Role.ADMIN)
  findAll() {
    return this.pricingService.findAll();
  }

  @Post('settings')
  @Roles(Role.ADMIN)
  create(@GetUser('id') userId: string, @Body() dto: CreatePricingSettingDto) {
    return this.pricingService.createSettings(userId, dto);
  }

  @Patch('settings/:id/activate')
  @Roles(Role.ADMIN)
  activate(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.pricingService.activateSettings(userId, id);
  }
}
