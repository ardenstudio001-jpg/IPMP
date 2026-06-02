import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuditModule, NotificationsModule, PrismaModule],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
