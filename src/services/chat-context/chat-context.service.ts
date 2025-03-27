import { Injectable } from '@nestjs/common';

interface ChatContext {
  clientId: string;
  intent?: string;
  profession?: string;
  location?: string;
  step?: string;
  lastMessage?: string;
  lastBotMessage?: string;
}

@Injectable()
export class ChatContextService {
  private contexts = new Map<string, ChatContext>();

  getContext(clientId: string): ChatContext {
    return this.contexts.get(clientId) || { clientId };
  }

  updateContext(clientId: string, updates: Partial<ChatContext>) {
    const current = this.getContext(clientId);
    this.contexts.set(clientId, { ...current, ...updates });
  }
}
