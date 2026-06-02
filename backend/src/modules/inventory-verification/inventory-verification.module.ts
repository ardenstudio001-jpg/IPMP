import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryVerificationController } from './inventory-verification.controller';
import { InventoryVerificationService } from './inventory-verification.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuditModule, NotificationsModule, PrismaModule],
  controllers: [InventoryVerificationController],
  providers: [InventoryVerificationService],
})
export class InventoryVerificationModule {}
