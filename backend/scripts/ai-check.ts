/**
 * AI 联调自检脚本
 * 用途：拿到免费大模型 API Key 后，快速验证「知识诊断 / 智能批改」是否真正跑通。
 *
 * 运行（在 teachstudy 根目录）：
 *   npm run build:shared        # 首次需先构建共享层
 *   npm run ai:check            # 验证 诊断 + 批改
 *   npm run ai:check -- --all   # 额外验证 组卷 / 志愿 / 标签
 *
 * 说明：脚本直接加载真实 AiService（含 .env 配置与提供方选择逻辑），
 *       不依赖数据库、不启动 HTTP 服务，可独立验证 AI 接入是否可用。
 */
import 'reflect-metadata';
import { INestApplicationContext, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DifficultyLevel, Subject } from '@teachstudy/shared';
import configuration from '../src/config/configuration';
import { AiModule } from '../src/ai/ai.module';
import { AiService } from '../src/ai/ai.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', 'backend/.env'],
    }),
    AiModule,
  ],
})
class AiCheckModule {}

let pass = 0;
let fail = 0;

function ok(msg: string): void {
  pass += 1;
  console.log(`  [PASS] ${msg}`);
}
function bad(msg: string): void {
  fail += 1;
  console.log(`  [FAIL] ${msg}`);
}
function warn(msg: string): void {
  console.log(`  [WARN] ${msg}`);
}
function dump(label: string, value: unknown): void {
  console.log(`  ${label}:`);
  console.log(
    JSON.stringify(value, null, 2)
      .split('\n')
      .map((l) => `      ${l}`)
      .join('\n'),
  );
}

async function runChecks(app: INestApplicationContext): Promise<void> {
  const cs = app.get(ConfigService);
  const provider = cs.get<string>('ai.provider');
  const baseUrl = cs.get<string>('ai.apiBase');
  const model = cs.get<string>('ai.model');
  const apiKey = cs.get<string>('ai.apiKey') ?? '';

  // ---------------- 配置概览 ----------------
  console.log('【配置】');
  console.log(`  AI_PROVIDER = ${provider}`);
  console.log(`  AI_API_BASE = ${baseUrl || '(未配置)'}`);
  console.log(`  AI_MODEL    = ${model}`);
  console.log(`  AI_API_KEY  = ${apiKey ? `${apiKey.slice(0, 6)}***（${apiKey.length} 位）` : '(未配置)'}`);
  console.log('');

  if (provider === 'mock') {
    warn('当前为 mock 模式：以下结果来自本地占位实现，不代表真实模型。');
    warn('要验证真实大模型，请把 backend/.env 的 AI_PROVIDER 改为 http，并填好 AI_API_BASE / AI_API_KEY / AI_MODEL。');
    console.log('');
  }
  if (provider !== 'mock' && (!baseUrl || !apiKey)) {
    bad('AI_PROVIDER 已设为非 mock，但 AI_API_BASE 或 AI_API_KEY 为空，无法调用真实模型。');
    return;
  }

  const ai = app.get(AiService);
  const isReal = provider !== 'mock';

  // ---------------- 1. 知识诊断 ----------------
  console.log('【1/2 知识诊断】');
  try {
    const t0 = Date.now();
    const result = await ai.diagnose({
      subject: Subject.MATH,
      knowledgePoints: ['kp_math_01', 'kp_math_02', 'kp_math_03'],
      answers: [
        { questionId: 'q1', answer: 'A' },
        { questionId: 'q2', answer: 'C' },
        { questionId: 'q3', answer: 'B' },
      ],
    });
    const cost = Date.now() - t0;
    console.log(`  耗时 ${cost}ms`);

    if (Array.isArray(result.weakPoints) && result.weakPoints.length > 0) {
      ok(`返回 ${result.weakPoints.length} 个薄弱点`);
    } else {
      bad('weakPoints 为空或不是数组');
    }
    if (Array.isArray(result.learningPath) && result.learningPath.length > 0) {
      ok(`返回 ${result.learningPath.length} 条补漏学习路径`);
    } else {
      bad('learningPath 为空或不是数组');
    }
    dump('诊断结果', result);

    if (isReal) {
      if (cost <= 10000) ok(`满足「10 秒内出结果」要求（${cost}ms）`);
      else warn(`超过 10 秒目标（${cost}ms），可换更快的模型，如 glm-4-flash`);
    }
  } catch (e) {
    bad(`调用失败：${(e as Error).message}`);
  }
  console.log('');

  // ---------------- 2. 智能批改 ----------------
  console.log('【2/2 智能批改】');
  const refAnswer = 'x = 4';
  try {
    const t0 = Date.now();
    const result = await ai.grade({
      question: {
        id: 'demo-q1',
        type: 'short_answer',
        content: '解方程 2x + 3 = 11，并写出解题步骤。',
        answer: refAnswer,
        knowledgePointId: 'kp_math_01',
      },
      answer: 'x = 5',
    });
    const cost = Date.now() - t0;
    console.log(`  耗时 ${cost}ms`);

    if (typeof result.score === 'number') ok(`score 为数字：${result.score}`);
    else bad('score 不是数字');
    if (typeof result.errorAnalysis === 'string' && result.errorAnalysis.length > 0) {
      ok('返回了错因分析');
    } else {
      bad('errorAnalysis 为空');
    }
    if (Array.isArray(result.hints) && result.hints.length > 0) {
      ok(`返回 ${result.hints.length} 条启发式点拨`);
    } else {
      bad('hints 为空或不是数组');
    }
    dump('批改结果', result);

    // 教学规则校验：点拨中不应直接出现完整标准答案
    const hintText = (result.hints ?? []).join(' ');
    if (hintText.includes(refAnswer)) {
      warn(`点拨中疑似出现完整标准答案「${refAnswer}」，请检查提示词的教学规则约束`);
    } else {
      ok('点拨未直接给出完整标准答案（符合启发式点拨规则）');
    }
  } catch (e) {
    bad(`调用失败：${(e as Error).message}`);
  }
  console.log('');

  // ---------------- 3. 附加检查（--all） ----------------
  if (!process.argv.includes('--all')) {
    console.log('（提示：加 --all 可额外验证「智能组卷 / 志愿匹配 / 知识点标签」）');
    console.log('');
    return;
  }

  console.log('【附加 智能组卷】');
  try {
    const r = await ai.generatePaper({
      subject: Subject.MATH,
      knowledgePoints: ['kp_math_01', 'kp_math_02'],
      difficulty: DifficultyLevel.MEDIUM,
      count: 5,
    });
    if (Array.isArray(r.blueprint) && r.blueprint.length > 0) ok(`返回 ${r.blueprint.length} 条选题计划`);
    else bad('blueprint 为空或不是数组');
    const totalCount = r.blueprint.reduce((sum, b) => sum + (b.count ?? 0), 0);
    if (totalCount > 0) ok(`计划总题量 ${totalCount} 道`);
    else bad('计划总题量为 0');
    dump('组卷结果', r);
  } catch (e) {
    bad(`调用失败：${(e as Error).message}`);
  }
  console.log('');

  console.log('【附加 志愿匹配】');
  try {
    const r = await ai.matchVolunteer({ score: 560, rank: 32000, subjects: ['物理', '化学', '生物'] });
    if (Array.isArray(r.plans) && r.plans.length > 0) ok(`返回 ${r.plans.length} 条冲稳保方案`);
    else bad('plans 为空或不是数组');
    dump('志愿方案', r);
  } catch (e) {
    bad(`调用失败：${(e as Error).message}`);
  }
  console.log('');

  console.log('【附加 知识点标签】');
  try {
    const tags = await ai.extractKnowledgeTags(
      '初中数学·一元一次方程导学案',
      '本导学案讲解一元一次方程的定义、解法步骤与移项法则。',
    );
    if (Array.isArray(tags)) ok(`返回 ${tags.length} 个知识点标签`);
    else bad('tags 不是数组');
    dump('知识点标签', tags);
  } catch (e) {
    bad(`调用失败：${(e as Error).message}`);
  }
  console.log('');
}

async function main(): Promise<void> {
  console.log('\n=== teachstudy AI 联调自检 ===\n');
  const app = await NestFactory.createApplicationContext(AiCheckModule, {
    logger: ['error', 'warn'],
  });
  try {
    await runChecks(app);
  } finally {
    await app.close();
  }

  console.log('=== 汇总 ===');
  console.log(`通过 ${pass} 项，失败 ${fail} 项`);
  if (fail > 0) {
    console.log('存在失败项，请根据上面的错误信息排查（常见原因：Key 无效/欠费、模型名不对、Base 地址写错、网络不通）。');
    process.exitCode = 1;
  } else {
    console.log('AI 接入正常，可以启动后端联调了。');
  }
}

void main().catch((e) => {
  console.error('脚本异常：', (e as Error).message);
  process.exitCode = 1;
});