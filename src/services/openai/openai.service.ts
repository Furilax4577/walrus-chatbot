import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class OpenaiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateChatResponse(messages: any[]) {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });

    return completion.choices[0]?.message?.content || '';
  }
}
