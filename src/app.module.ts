import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { ChatQueueService } from './services/chat-queue/chat-queue.service';
import { OpenaiService } from './services/openai/openai.service';
import { ConfigModule } from '@nestjs/config';
import appConfig from './app.config';

@Module({
  imports: [
    ChatModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, ChatQueueService, OpenaiService],
})
export class AppModule {}
