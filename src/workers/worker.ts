import { Worker } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { ChatGateway } from '../chat/chat.gateway';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OpenaiService } from 'src/services/openai/openai.service';
import { ChatContextService } from 'src/services/chat-context/chat-context.service';

interface KnowledgeChunk {
  id: string;
  text: string;
  tokens: number;
}

let knowledgeChunks: KnowledgeChunk[] = [];

function loadKnowledgeFile() {
  const filePath = path.resolve(__dirname, '../../data/rag_chunks.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    knowledgeChunks = JSON.parse(raw);
    console.log(`📚 ${knowledgeChunks.length} chunks de connaissance chargés.`);
  } catch (error) {
    console.error(
      '❌ Erreur lors du chargement du fichier RAG :',
      error.message,
    );
  }
}

function getRelevantChunks(userInput: string, limit = 3): string[] {
  const input = userInput.toLowerCase();
  const scores = knowledgeChunks.map((chunk) => {
    let score = 0;
    input.split(/\s+/).forEach((word) => {
      if (chunk.text.toLowerCase().includes(word)) score++;
    });
    return { chunk: chunk.text, score };
  });

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}

// 🔁 Fonction utilitaire pour envoyer un message + maj contexte + boutons
function replyToClient(
  clientId: string,
  message: string,
  gateway: ChatGateway,
  contextService: ChatContextService,
  buttons: string[] = [],
) {
  contextService.updateContext(clientId, { lastBotMessage: message });
  gateway.sendMessageToClient(clientId, message, buttons);
}

export async function startChatWorker(gateway: ChatGateway) {
  loadKnowledgeFile();

  const app = await NestFactory.createApplicationContext(AppModule);
  const openaiService = app.get(OpenaiService);
  const contextService = app.get(ChatContextService);

  const worker = new Worker(
    'chat',
    async (job) => {
      const { clientId, messages } = job.data;
      console.log(`🤖 Traitement pour client ${clientId}`);

      try {
        const lastUserMessage = messages[messages.length - 1]?.content ?? '';
        const context = contextService.getContext(clientId);

        contextService.updateContext(clientId, {
          lastMessage: lastUserMessage,
        });

        const contextChunks = getRelevantChunks(lastUserMessage);

        if (contextChunks.length === 0) {
          const fallbackPrompt = [
            {
              role: 'system',
              content: `Tu es un assistant conversationnel de Studio Albatros. Tu n'as pas trouvé d'information dans la base de connaissance, mais tu dois rester chaleureux et utile. Pose une question ou propose un rendez-vous pour continuer.`,
            },
            ...messages,
          ];

          let fallbackMessage =
            await openaiService.generateChatResponse(fallbackPrompt);

          // Éviter les redites
          if (fallbackMessage === context.lastBotMessage) {
            fallbackMessage =
              'Souhaitez-vous que l’on échange par téléphone ou préférez-vous prendre directement rendez-vous ? 😊';
          }

          replyToClient(clientId, fallbackMessage, gateway, contextService);
          return fallbackMessage;
        }

        const systemPrompt = {
          role: 'system',
          content: `Tu es un assistant pour le client Studio Albatros.

Client : ${context.profession ?? 'non précisé'}, basé à ${context.location ?? 'inconnu'}.
Objectif : ${context.intent ?? 'non identifié'}.

Voici des infos utiles :
${contextChunks.join('\n\n')}

Réponds toujours :
- en français uniquement
- en Markdown clair (titres, listes, gras, liens…)
- de façon concise (3 à 6 phrases max)
- avec un ton chaleureux et professionnel
- en posant une question ou en proposant une action concrète (ex : rendez-vous, exemple, devis).`,
        };

        const augmentedMessages = [systemPrompt, ...messages];

        let message =
          await openaiService.generateChatResponse(augmentedMessages);

        if (message === context.lastBotMessage) {
          message +=
            '\n\nSouhaitez-vous que l’on fixe un créneau ensemble ? 😊';
        }

        // Détection simple des suggestions
        const buttons: string[] = [];
        if (message.toLowerCase().includes('rendez-vous'))
          buttons.push('📅 Prendre rendez-vous');
        if (message.toLowerCase().includes('exemple'))
          buttons.push('🎨 Voir un exemple');
        if (message.toLowerCase().includes('devis'))
          buttons.push('💬 Demander un devis');

        replyToClient(clientId, message, gateway, contextService, buttons);
        return message;
      } catch (error) {
        gateway.sendErrorToClient(clientId, error.message);
        throw new Error(
          `Erreur de traitement pour ${clientId} : ${error.message}`,
        );
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: 6379,
      },
    },
  );

  worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} terminé : ${result}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`🛑 Job ${job?.id} échoué :`, err.message);
  });
}
