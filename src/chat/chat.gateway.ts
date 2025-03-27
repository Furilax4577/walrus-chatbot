import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatQueueService } from '../services/chat-queue/chat-queue.service';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map pour suivre les sockets associés à un clientId
  private socketClientMap = new Map<string, string>();

  constructor(private readonly chatQueue: ChatQueueService) {}

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() clientId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(clientId);
    this.socketClientMap.set(client.id, clientId);
    console.log(`👥 Client ${client.id} joined room ${clientId}`);

    // 👋 Message de bienvenue automatique
    const welcomeMessage = `Bonjour 👋 Je suis Albatar, l’assistant Studio Albatros.
  Souhaitez-vous créer un site vitrine, présenter votre activité, ou poser une question ? 😊`;

    const buttons = [
      '🌐 Créer un site vitrine',
      '🎯 Gagner en visibilité',
      '❓ Poser une question',
    ];

    this.sendMessageToClient(clientId, welcomeMessage, buttons);
  }

  @SubscribeMessage('user-message')
  handleUserMessage(
    @MessageBody() data: { clientId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { clientId, message } = data;

    console.log(`📥 Message from ${clientId}: ${message}`);
    this.chatQueue.addMessageJob(clientId, [
      { role: 'user', content: message },
    ]);
  }

  handleDisconnect(client: Socket) {
    const clientId = this.socketClientMap.get(client.id);
    if (clientId) {
      console.log(`❌ Client ${clientId} disconnected (socket ${client.id})`);
      this.socketClientMap.delete(client.id);
    } else {
      console.log(`❌ Unknown client disconnected (socket ${client.id})`);
    }
  }

  sendMessageToClient(clientId: string, message: string, buttons?: string[]) {
    this.server.to(clientId).emit('chat-response', {
      message,
      buttons: buttons ?? [],
    });
  }

  sendErrorToClient(clientId: string, error: string) {
    this.server.to(clientId).emit('chat-error', { error });
  }
}
