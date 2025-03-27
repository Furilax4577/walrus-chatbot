import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  openaiApiKey: process.env.OPENAI_API_KEY || 'sk-xxx',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
}));
