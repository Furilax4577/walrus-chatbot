import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { startChatWorker } from './workers/worker';
import { ChatGateway } from './chat/chat.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  // On attend l'initialisation complète du contexte pour récupérer ChatGateway
  const chatGateway = app.get(ChatGateway);

  // On lance le worker en lui passant le gateway pour communiquer via WebSocket
  startChatWorker(chatGateway);

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    '🚀 NestJS Chatbot API is running on http://localhost:' +
      (process.env.PORT ?? 3000),
  );
}
bootstrap();
