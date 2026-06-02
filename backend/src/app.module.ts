import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ListsModule } from './modules/lists/lists.module';
import { ListItemsModule } from './modules/list-items/list-items.module';
import { InventoryVerificationModule } from './modules/inventory-verification/inventory-verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    PricingModule,
    AuditModule,
    NotificationsModule,
    InvitationsModule,
    RealtimeModule,
    CategoriesModule,
    ListsModule,
    ListItemsModule,
    InventoryVerificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
