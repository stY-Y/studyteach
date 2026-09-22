import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VolunteerTier } from '@teachstudy/shared';
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
} from './ai-provider.interface';
import { normalizeBlueprint } from '../paper-blueprint.util';

/**
 * OpenAI 兼容大模型提供方（真实免费/低价模型接入）。
 *
 * 兼容厂商（换 AI_API_BASE / AI_API_KEY / AI_MODEL 即可切换，无需改代码）：
 *  - 智谱 GLM      https://open.bigmodel.cn/api/paas/v4         模型 glm-4-flash（免费）
 *  - 硅基流动      https://api.siliconflow.cn/v1                模型 Qwen/Qwen2.5-7B-Instruct 等（免费）
 *  - 阿里通义      https://dashscope.aliyuncs.com/compatible-mode/v1  模型 qwen-turbo / qwen-plus（新用户免费额度）
 *  - DeepSeek      https://api.deepseek.com/v1                 模型 deepseek-chat（低价）
 *  - Moonshot      https://api.moonshot.cn/v1                  模型 moonshot-v1-8k
 *
 * 使用 Node 原生 fetch，零额外依赖。
 */
@Injectable()
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'http';
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.baseUrl = (config.get<string>('ai.apiBase') ?? '').replace(/\/+$/, '');
    this.apiKey = config.get<string>('ai.apiKey') ?? '';
    this.model = config.get<string>('ai.model') ?? 'glm-4-flash';
  }

  // ================= 通用对话 =================
  private async chat(system: string, user: string, timeoutMs: number): Promise<string> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        'AI 未配置：请在 .env 中设置 AI_API_BASE、AI_API_KEY、AI_MODEL，并将 AI_PROVIDER 改为 http',
      );
    }

    const url = this.baseUrl.endsWith('/chat/completions')
      ? this.baseUrl
      : `${this.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI 请求失败 (HTTP ${resp.status}): ${errText.slice(0, 300)}`);
      }

      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string }; text?: string }>;
      };
      const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';
      if (!content) throw new Error('AI 返回内容为空');
      return String(content).trim();
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'AbortError') {
        throw new Error(`AI 请求超时（>${timeoutMs}ms），请稍后重试`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ================= JSON 解析（兼容 Markdown 代码块） =================
  private parseJson<T>(text: string): T {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error(`AI 未返回合法 JSON：${text.slice(0, 300)}`);
    }
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  }

  private normalizeTier(tier: string): VolunteerTier {
    const map: Record<string, VolunteerTier> = {
      chong: VolunteerTier.CHONG,
      冲: VolunteerTier.CHONG,
      wen: VolunteerTier.WEN,
      稳: VolunteerTier.WEN,
      bao: VolunteerTier.BAO,
      保: VolunteerTier.BAO,
    };
    return map[tier] ?? VolunteerTier.WEN;
  }

  // ================= 各能力实现 =================
  async diagnose(input: DiagnoseInput): Promise<DiagnoseResult> {
    const user = [
      `学科：${input.subject}`,
      `覆盖知识点 ID：${JSON.stringify(input.knowledgePoints)}`,
      `学生作答记录：${JSON.stringify(input.answers)}`,
    ].join('\n');
    const raw = await this.chat(PROMPTS.DIAGNOSE, user, 15000);
    const d = this.parseJson<{
      weakPoints?: Array<{ knowledgePointId: string; mastery: number; reason: string }>;
      learningPath?: string[];
    }>(raw);
    return { weakPoints: d.weakPoints ?? [], learningPath: d.learningPath ?? [] };
  }

  async grade(input: GradeInput): Promise<GradeResult> {
    const user = [
      `题目类型：${input.question.type}`,
      `题目内容：${input.question.content}`,
      `参考答案：${input.question.answer}`,
      `学生作答：${input.answer}`,
    ].join('\n');
    const raw = await this.chat(PROMPTS.GRADE, user, 30000);
    const d = this.parseJson<{
      score?: number;
      errorAnalysis?: string;
      hints?: string[];
    }>(raw);
    return {
      score: typeof d.score === 'number' ? d.score : 0,
      errorAnalysis: d.errorAnalysis ?? '',
      hints: d.hints ?? [],
    };
  }

  async generatePaper(input: PaperGenInput): Promise<PaperGenResult> {
    const user = [
      `学段：${input.stage}`,
      `学科：${input.subject}`,
      `知识点：${JSON.stringify(input.knowledgePoints)}`,
      `难度：${input.difficulty}`,
      `题量：${input.count}`,
    ].join('\n');
    const raw = await this.chat(PROMPTS.PAPER, user, 60000);
    const d = this.parseJson<{ blueprint?: unknown; summary?: string }>(raw);
    return { blueprint: normalizeBlueprint(d.blueprint, input), summary: d.summary ?? '' };
  }

  async matchVolunteer(input: VolunteerInput): Promise<VolunteerResult> {
    const user = `分数：${input.score}\n位次：${input.rank}\n选科：${JSON.stringify(input.subjects)}`;
    const raw = await this.chat(PROMPTS.VOLUNTEER, user, 30000);
    const d = this.parseJson<{
      plans?: Array<{ name: string; tier: string; restrictions: string[] }>;
    }>(raw);
    return {
      plans: (d.plans ?? []).map((p) => ({
        name: p.name,
        tier: this.normalizeTier(p.tier),
        restrictions: p.restrictions ?? [],
      })),
    };
  }

  async extractKnowledgeTags(title: string, content: string): Promise<string[]> {
    const user = `资源标题：${title}\n资源内容摘要：${content.slice(0, 2000)}`;
    const raw = await this.chat(PROMPTS.TAGS, user, 30000);
    const d = this.parseJson<{ tags?: string[] }>(raw);
    return d.tags ?? [];
  }
}

/** 各能力系统提示词（要求只输出 JSON，保证可解析） */
const PROMPTS = {
  DIAGNOSE: [
    '你是乡村公益助学平台的 AI 学习诊断引擎。',
    '根据学生的检测题作答，精准定位知识薄弱点，并生成个性化补漏学习路径。',
    '只输出 JSON，不要输出任何解释、Markdown 代码块以外的文字。',
    'JSON 结构：{"weakPoints":[{"knowledgePointId":"知识点ID","mastery":0.0到1.0之间的数字,"reason":"薄弱原因"}],"learningPath":["补漏步骤1","补漏步骤2"]}',
  ].join('\n'),

  GRADE: [
    '你是智能批改引擎，负责批改主客观题，输出错因分析与启发式思路点拨。',
    '【教学规则】绝不直接给出完整标准答案，只做启发式点拨，引导学生自主思考。',
    '只输出 JSON，不要输出其它文字。',
    'JSON 结构：{"score":0.0到1.0之间的数字,"errorAnalysis":"错因分析","hints":["启发式点拨1","点拨2"]}',
  ].join('\n'),

  PAPER: [
    '你是智能组卷引擎，负责制定选题计划：确定考哪些知识点、用什么题型、什么难度、各出几道。',
    '具体题目由系统按你的计划从题库抽取，你只需要给出计划。',
    '只输出 JSON，不要输出其它文字。',
    'JSON 结构：{"blueprint":[{"knowledgePointId":"知识点ID","questionType":"single_choice","difficulty":"easy","count":3}],"summary":"组卷说明"}',
    '要求：blueprint 各条目的 count 之和等于题量；questionType 取值 single_choice/multiple_choice/true_false/fill_blank/short_answer/essay；difficulty 取值 easy/medium/hard；knowledgePointId 必须来自给定知识点列表。',
  ].join('\n'),

  VOLUNTEER: [
    '你是高考志愿填报助手，根据分数、位次、选科生成「冲稳保」梯度志愿方案，并标注所有报考限制条件。',
    '只输出 JSON，不要输出其它文字。',
    'JSON 结构：{"plans":[{"name":"院校名称","tier":"chong或wen或bao","restrictions":["报考限制条件"]}]}',
  ].join('\n'),

  TAGS: [
    '你是教育内容标签引擎，从资源标题与内容中提取最相关的知识点 ID（对应平台知识图谱）。',
    '只输出 JSON，不要输出其它文字。',
    'JSON 结构：{"tags":["知识点ID1","知识点ID2"]}',
  ].join('\n'),
};