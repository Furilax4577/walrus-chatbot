import { Test, TestingModule } from '@nestjs/testing';
import { ChatQueueService } from './chat-queue.service';

describe('ChatQueueService', () => {
  let service: ChatQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatQueueService],
    }).compile();

    service = module.get<ChatQueueService>(ChatQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
