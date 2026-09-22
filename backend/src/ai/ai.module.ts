import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

/** AI 抽象层（全局单例） */
@Global()
@Module({
  providers: [AiService, MockAiProvider, OpenAiCompatibleProvider],
  exports: [AiService],
})
export class AiModule {}