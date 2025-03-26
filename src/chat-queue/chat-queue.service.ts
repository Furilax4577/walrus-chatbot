import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatQueueService {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('chat', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: 6379,
      },
    });
  }

  async addMessageJob(clientId: string, messages: any[]) {
    await this.queue.add('generate-response', { clientId, messages });
  }
}
