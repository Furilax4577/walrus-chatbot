import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatQueueService } from 'src/chat-queue/chat-queue.service';
import { ChatGateway } from './chat.gateway';

@Module({
  providers: [ChatQueueService, ChatGateway],
  controllers: [ChatController],
})
export class ChatModule {}
