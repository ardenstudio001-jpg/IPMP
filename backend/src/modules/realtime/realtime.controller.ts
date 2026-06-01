import { Controller, Sse, UseGuards } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RealtimeService } from './realtime.service';

@UseGuards(JwtAuthGuard)
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse('stream')
  stream(@GetUser('id') userId: string): Observable<MessageEvent> {
    return this.realtimeService.subscribe(userId);
  }
}
