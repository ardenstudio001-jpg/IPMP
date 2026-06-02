import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PricingModule } from '../pricing/pricing.module';
import { ProductsModule } from '../products/products.module';
import { ListItemsController } from './list-items.controller';
import { ListItemsService } from './list-items.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    ProductsModule,
    PricingModule,
    AuditModule,
    NotificationsModule,
    PrismaModule,
  ],
  controllers: [ListItemsController],
  providers: [ListItemsService],
  exports: [ListItemsService],
})
export class ListItemsModule {}
