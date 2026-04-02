import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GroqLlmProvider } from './providers/groq-llm.provider';
import { LLM_PROVIDER } from './providers/llm-provider.interface';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: LLM_PROVIDER,
      useClass: GroqLlmProvider,
    },
  ],
})
export class AiModule {}
