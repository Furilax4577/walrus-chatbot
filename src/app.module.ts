import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { ChatQueueService } from './chat-queue/chat-queue.service';

@Module({
  imports: [ChatModule],
  controllers: [AppController],
  providers: [AppService, ChatQueueService],
})
export class AppModule {}
