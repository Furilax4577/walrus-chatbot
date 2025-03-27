import { Controller, Post, Body } from '@nestjs/common';
import { ChatQueueService } from 'src/services/chat-queue/chat-queue.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatQueue: ChatQueueService) {}

  @Post()
  async chat(@Body() body: { clientId: string; messages: any[] }) {
    await this.chatQueue.addMessageJob(body.clientId, body.messages);
    return { status: 'queued' };
  }
}
