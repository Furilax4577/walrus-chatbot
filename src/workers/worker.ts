import { Worker } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { ChatGateway } from '../chat/chat.gateway';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OpenaiService } from 'src/services/openai/openai.service';

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

export async function startChatWorker(gateway: ChatGateway) {
  loadKnowledgeFile();

  const app = await NestFactory.createApplicationContext(AppModule);
  const openaiService = app.get(OpenaiService);

  const worker = new Worker(
    'chat',
    async (job) => {
      const { clientId, messages } = job.data;
      console.log(`🤖 Traitement pour client ${clientId}`);

      try {
        const lastUserMessage = messages[messages.length - 1]?.content ?? '';
        const contextChunks = getRelevantChunks(lastUserMessage);

        if (contextChunks.length === 0) {
          const message =
            "Nous n'avons pas trouvé de réponse automatique à votre question. Votre message a été transmis à notre équipe, nous reviendrons vers vous rapidement.";
          gateway.sendMessageToClient(clientId, message);
          return message;
        }

        const augmentedMessages = [
          {
            role: 'system',
            content: `Tu es un assistant pour le client ${clientId}. Voici des informations utiles :\n\n${contextChunks.join('\n\n')}\n\nTu dois répondre :\n- en français uniquement\n- en Markdown clair (titres, listes, gras, liens…)\n- de façon concise (3 à 6 phrases max)\n- et si besoin, poser une question pour mieux affiner la réponse.`,
          },
          ...messages,
        ];

        const message =
          await openaiService.generateChatResponse(augmentedMessages);
        gateway.sendMessageToClient(clientId, message);
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
