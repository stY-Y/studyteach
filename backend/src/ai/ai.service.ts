import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  DiagnoseInput,
  DiagnoseResult,
  GradeInput,
  GradeResult,
  PaperGenInput,
  PaperGenResult,
  VolunteerInput,
  VolunteerResult,
} from './providers/ai-provider.interface';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

/**
 * AI 统一门面：知识诊断 / 智能批改 / 智能组卷 / 志愿匹配 / 知识点标签。
 * 业务模块只依赖本服务，切换 AI 提供方不影响业务代码。
 *
 * AI_PROVIDER 取值：
 *  - mock：本地占位（零联网，开箱即用）
 *  - http：接入 OpenAI 兼容免费/低价大模型（智谱/通义/硅基流动/DeepSeek 等）
 */
@Injectable()
export class AiService {
  private readonly provider: AiProvider;

  constructor(
    config: ConfigService,
    mockProvider: MockAiProvider,
    httpProvider: OpenAiCompatibleProvider,
  ) {
    const name = config.get<string>('ai.provider') ?? 'mock';
    this.provider = this.resolveProvider(name, mockProvider, httpProvider);
  }

  private resolveProvider(
    name: string,
    mock: MockAiProvider,
    http: OpenAiCompatibleProvider,
  ): AiProvider {
    switch (name) {
      case 'mock':
        return mock;
      case 'http':
      case 'openai':
        return http;
      default:
        throw new Error(`尚未实现的 AI 提供方: ${name}（请在 src/ai/providers 下扩展并注册）`);
    }
  }

  diagnose(input: DiagnoseInput): Promise<DiagnoseResult> {
    return this.provider.diagnose(input);
  }

  grade(input: GradeInput): Promise<GradeResult> {
    return this.provider.grade(input);
  }

  generatePaper(input: PaperGenInput): Promise<PaperGenResult> {
    return this.provider.generatePaper(input);
  }

  matchVolunteer(input: VolunteerInput): Promise<VolunteerResult> {
    return this.provider.matchVolunteer(input);
  }

  extractKnowledgeTags(title: string, content: string): Promise<string[]> {
    return this.provider.extractKnowledgeTags(title, content);
  }
}