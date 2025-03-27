import { Module } from '@nestjs/common';
import { ChatController } from '../controllers/chat/chat.controller';
import { ChatQueueService } from 'src/services/chat-queue/chat-queue.service';
import { ChatGateway } from './chat.gateway';

@Module({
  providers: [ChatQueueService, ChatGateway],
  controllers: [ChatController],
})
export class ChatModule {}
